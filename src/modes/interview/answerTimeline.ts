// Lines up what you said with what your heart was doing at that moment.
// Word timings come from ElevenLabs (seconds from the start of the recording);
// heart readings come from the webcam (Date.now() times, about one per second).
import type { BpmPoint } from "../../sensing/useSensing";
import { heartZone, type Zone } from "../../sensing/zones";
import { isFiller, MIN_WORDS_TO_JUDGE, type NervesVerdict, type SpeechStats, type Word } from "./speechStats";

export type ZoneLabel = Zone["label"];

// One spoken word with its timing (seconds from the start of the recording).
export type TimedWord = { text: string; start: number; end: number; hedge: boolean };

// A stretch of the transcript, ready to draw.
export type Piece =
  | { type: "run"; text: string; zone: ZoneLabel; words: TimedWord[] } // words said in the same heart zone
  | { type: "filler"; text: string; start: number; end: number } // "um", "uh"...
  | { type: "pause"; seconds: number }; // a silence over 2 seconds

// Phrases that make an answer sound unsure. "I think" is left out because it's often fine.
const HEDGES = [["i", "guess"], ["kind", "of"], ["sort", "of"], ["you", "know"], ["i", "mean"], ["maybe"], ["probably"], ["basically"], ["kinda"], ["sorta"]];

// Marks which words are part of a hedge phrase.
export function findHedges(words: string[]): boolean[] {
  const cleanWords = words.map(clean);
  const marks = cleanWords.map(() => false);
  for (let i = 0; i < cleanWords.length; i++) {
    for (const phrase of HEDGES) {
      if (phrase.every((w, k) => cleanWords[i + k] === w)) phrase.forEach((_, k) => (marks[i + k] = true));
    }
  }
  return marks;
}

// How many hedge phrases (not words) are in a list of hedge marks.
export function countHedges(marks: boolean[]): number {
  return marks.filter((m, i) => m && !marks[i - 1]).length;
}

const LONG_PAUSE_SEC = 2;
const MAX_GAP_MS = 3000; // a heart reading further than this from a word doesn't count for it

function clean(word: string): string {
  return word.toLowerCase().replace(/[^a-z']/g, "");
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// What to compare against: your resting rate if InFlow has learned it,
// otherwise your typical rate so far this session (needs at least 10 readings).
export function referenceRate(baseline: number | null, heart: BpmPoint[]): number | null {
  if (baseline !== null) return baseline;
  return heart.length >= 10 ? median(heart.map((p) => p.bpm)) : null;
}

// Heart rate closest to a moment in time, or null if there's no reading nearby.
export function bpmAt(heart: BpmPoint[], t: number): number | null {
  let best: BpmPoint | null = null;
  for (const p of heart) {
    if (!best || Math.abs(p.t - t) < Math.abs(best.t - t)) best = p;
  }
  return best && Math.abs(best.t - t) <= MAX_GAP_MS ? best.bpm : null;
}

export type Timeline = {
  pieces: Piece[];
  heart: { t: number; bpm: number }[]; // readings during the answer, in seconds from its start
  duration: number; // seconds from the start of the recording to the last word
  reference: number | null; // the rate this answer is compared against
  hedges: number; // phrases like "I guess" or "kind of"
  peak: { snippet: string; bpm: number; zone: ZoneLabel } | null; // where your heart rate was highest
  hasHeart: boolean;
};

export function buildTimeline(all: Word[], heart: BpmPoint[], startedAt: number, reference: number | null): Timeline {
  const words = all.filter((w) => (w.type ?? "word") === "word" && clean(w.text) !== "");
  const pieces: Piece[] = [];
  const beats: (number | null)[] = [];
  let hasHeart = false;

  const hedges = findHedges(words.map((w) => w.text));
  words.forEach((w, i) => {
    if (i > 0) {
      const gap = w.start - words[i - 1].end;
      if (gap > LONG_PAUSE_SEC) pieces.push({ type: "pause", seconds: Math.round(gap * 10) / 10 });
    }
    const bpm = bpmAt(heart, startedAt + ((w.start + w.end) / 2) * 1000);
    beats.push(bpm);
    const zone = heartZone(bpm, reference).label;
    if (zone !== "Calibrating") hasHeart = true;

    const text = w.text.trim();
    if (isFiller(w.text, words[i - 1]?.text ?? "")) {
      pieces.push({ type: "filler", text, start: w.start, end: w.end });
      return;
    }
    const timed: TimedWord = { text, start: w.start, end: w.end, hedge: hedges[i] };
    const last = pieces[pieces.length - 1];
    if (last && last.type === "run" && last.zone === zone) {
      last.text += ` ${text}`;
      last.words.push(timed);
    } else pieces.push({ type: "run", text, zone, words: [timed] });
  });

  // Peak: the highest reading, but only worth pointing at if it's above calm.
  let peak: Timeline["peak"] = null;
  let top = -1;
  beats.forEach((bpm, i) => {
    if (bpm !== null && bpm > top) {
      top = bpm;
      const zone = heartZone(bpm, reference).label;
      const snippet = words
        .slice(Math.max(0, i - 2), i + 3) // a few words either side, so the quote reads as a phrase
        .map((w) => w.text.trim())
        .join(" ")
        .replace(/[.,!?;:]+$/, "");
      peak = { snippet, bpm, zone };
    }
  });
  const p = peak as Timeline["peak"];
  if (p && p.zone !== "Alert" && p.zone !== "High") peak = null;

  const duration = words.length ? words[words.length - 1].end : 0;
  const heartDuring = heart
    .map((point) => ({ t: (point.t - startedAt) / 1000, bpm: point.bpm }))
    .filter((point) => point.t >= -1 && point.t <= duration + 1);

  return { pieces, heart: heartDuring, duration, reference, peak, hasHeart, hedges: countHedges(hedges) };
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// The specific problems with how an answer was delivered, in plain words.
export function deliveryIssues(stats: SpeechStats, hedges = 0): string[] {
  const issues: string[] = [];
  if (hedges >= 2) issues.push(`${plural(hedges, "unsure phrase")} like "I guess"`);
  if (stats.pace === "Too fast") issues.push(`you sped up to ${stats.wordsPerMinute} words a minute`);
  if (stats.pace === "Too slow") issues.push(`your pace dropped to ${stats.wordsPerMinute} words a minute`);
  if (stats.fillers >= 2) issues.push(plural(stats.fillers, "filler sound"));
  if (stats.longPauses.length >= 1) issues.push(plural(stats.longPauses.length, "long pause"));
  return issues;
}

function joinIssues(issues: string[]): string {
  if (issues.length <= 1) return issues.join("");
  return `${issues.slice(0, -1).join(", ")} and ${issues[issues.length - 1]}`;
}

// Where a filler sound landed, in your own words: the filler and the words you said right after it.
// Picks the filler followed by the longest stretch of real words (usually the point you were reaching for).
export function fillerMoment(timeline: Timeline): { filler: string; next: string } | null {
  let best: { filler: string; next: string } | null = null;
  timeline.pieces.forEach((p, i) => {
    if (p.type !== "filler") return;
    const after = timeline.pieces[i + 1];
    if (!after || after.type !== "run") return;
    const next = after.text.split(/\s+/).slice(0, 3).join(" ").replace(/[.,!?;:]+$/, "");
    if (next && (!best || next.length > best.next.length)) best = { filler: p.text.replace(/[.,!?;:]+$/, "").toLowerCase(), next };
  });
  return best;
}

// One sentence about this answer, built from what actually happened in it.
export function answerNote(stats: SpeechStats, timeline: Timeline, verdict: NervesVerdict): string {
  const base = baseNote(stats, timeline, verdict);
  // Point at the actual moment a filler slipped in, so it's about what you said, not a count.
  const moment = stats.fillers >= 2 && stats.words >= MIN_WORDS_TO_JUDGE ? fillerMoment(timeline) : null;
  return moment ? `${base} One "${moment.filler}" came right before "${moment.next}". Try a silent pause there instead.` : base;
}

function baseNote(stats: SpeechStats, timeline: Timeline, verdict: NervesVerdict): string {
  if (stats.words === 0) return "I didn't catch any words. Check that your mic is picking you up.";
  if (stats.words < MIN_WORDS_TO_JUDGE) {
    return `That was ${plural(stats.words, "word")}. A question like this needs a real story: aim for about a minute.`;
  }
  const issues = deliveryIssues(stats, timeline.hedges);
  const peak = timeline.peak;
  if (peak && verdict === "Nerves hurt") {
    return `Your pulse jumped around "${peak.snippet}", and the answer got rough: ${joinIssues(issues)}.`;
  }
  if (peak && verdict === "Nerves helped") {
    return issues.length
      ? `Your pulse climbed around "${peak.snippet}" and you mostly held it together, apart from ${joinIssues(issues)}.`
      : `Your pulse climbed around "${peak.snippet}", but you kept a clean delivery. The nerves were working for you.`;
  }
  if (verdict === "Steady") {
    return issues.length ? `You stayed calm, but ${joinIssues(issues)}.` : "You stayed calm and spoke cleanly the whole way through.";
  }
  return issues.length ? `No heart reading for this one. On delivery: ${joinIssues(issues)}.` : "No heart reading for this one, but the delivery was clean.";
}

// Used if Gemini can't be reached, so the report still says something true.
export function fallbackFeedback(answers: { stats: SpeechStats; verdict: NervesVerdict }[]): string {
  if (answers.length === 0) return "";
  if (answers.every((a) => a.stats.words < MIN_WORDS_TO_JUDGE)) {
    return "Every answer was too short to judge. Run it again and give each question about a minute: what happened, what you did, and how it turned out.";
  }
  const hurt = answers.findIndex((a) => a.verdict === "Nerves hurt");
  if (hurt >= 0) {
    return `Start with question ${hurt + 1}. Your heart rate went up and your delivery slipped with it: ${joinIssues(deliveryIssues(answers[hurt].stats))}. Say that answer out loud two more times.`;
  }
  const worst = answers
    .map((a, i) => ({ i, n: deliveryIssues(a.stats).length }))
    .sort((a, b) => b.n - a.n)[0];
  if (worst.n > 0) {
    return `Nerves didn't throw you off. The thing to fix is question ${worst.i + 1}: ${joinIssues(deliveryIssues(answers[worst.i].stats))}.`;
  }
  return "Clean run. Next time, pick a harder role or ask for tougher follow-ups.";
}

// Share of your words (0 to 1) said while your heart rate was up (Alert or High).
export function heartUpShare(timeline: Timeline): number {
  let up = 0;
  let total = 0;
  for (const p of timeline.pieces) {
    if (p.type !== "run") continue;
    const n = p.text.split(/\s+/).filter(Boolean).length;
    total += n;
    if (p.zone === "Alert" || p.zone === "High") up += n;
  }
  return total ? up / total : 0;
}

type AttemptLike = { stats: SpeechStats; timeline: Timeline; away?: number | null };

// What changed between two tries at the same question, in plain words. Only real changes are listed.
export function compareAttempts(before: AttemptLike, after: AttemptLike): string[] {
  const changes: string[] = [];
  const b = before.stats;
  const a = after.stats;
  if (a.seconds - b.seconds >= 10) changes.push(`you spoke for ${a.seconds}s instead of ${b.seconds}s`);
  if (a.fillers !== b.fillers) changes.push(`filler sounds ${b.fillers} → ${a.fillers}`);
  if (after.timeline.hedges !== before.timeline.hedges) changes.push(`unsure phrases ${before.timeline.hedges} → ${after.timeline.hedges}`);
  if (before.away != null && after.away != null && Math.abs(after.away - before.away) >= 0.1) {
    changes.push(`looking away ${Math.round(before.away * 100)}% → ${Math.round(after.away * 100)}%`);
  }
  if (a.longPauses.length !== b.longPauses.length) changes.push(`long pauses ${b.longPauses.length} → ${a.longPauses.length}`);
  const goodPace = (s: SpeechStats) => s.pace === "Good";
  if (b.pace !== "Too short to tell" && a.pace !== "Too short to tell" && goodPace(a) !== goodPace(b)) {
    changes.push(`pace ${b.wordsPerMinute} → ${a.wordsPerMinute} words a minute`);
  }
  if (before.timeline.hasHeart && after.timeline.hasHeart) {
    const pb = Math.round(heartUpShare(before.timeline) * 100);
    const pa = Math.round(heartUpShare(after.timeline) * 100);
    if (Math.abs(pa - pb) >= 10) changes.push(`words said with your heart rate up ${pb}% → ${pa}%`);
  }
  return changes;
}

// Share of time (0 to 1) you looked away from the screen between two moments. Null if there's no data.
export function awayShare(gaze: { t: number; onScreen: boolean }[], from: number, to: number): number | null {
  const inside = gaze.filter((g) => g.t >= from && g.t <= to);
  if (inside.length < 10) return null;
  return inside.filter((g) => !g.onScreen).length / inside.length;
}
