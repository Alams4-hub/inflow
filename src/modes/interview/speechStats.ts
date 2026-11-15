// Measures how someone spoke, from a transcript with word timings.
// (The word timings come from ElevenLabs speech-to-text.)

export type Word = { text: string; start: number; end: number; type?: string }; // seconds

export type SpeechStats = {
  words: number;
  seconds: number;
  wordsPerMinute: number;
  fillers: number;
  fillerWords: string[];
  longPauses: { at: number; seconds: number }[]; // silences over 2 seconds
  pace: "Too slow" | "Good" | "Too fast" | "Too short to tell";
};

// Only clear filler sounds. "like" is left out because it's often used normally.
const FILLERS = new Set(["um", "uh", "er", "ah", "erm", "hmm", "uhm", "umm", "uhh"]);
const LONG_PAUSE_SEC = 2;

// "like" only counts when it's set off by commas ("and, like, learning"), which is how
// ElevenLabs writes it when it's a filler. "I like Python" doesn't count.
export function isFiller(raw: string, before = ""): boolean {
  const w = clean(raw);
  if (FILLERS.has(w)) return true;
  return w === "like" && /,\s*$/.test(raw) && (before === "" || /,\s*$/.test(before));
}

function clean(word: string): string {
  return word.toLowerCase().replace(/[^a-z']/g, "");
}

export function speechStats(all: Word[]): SpeechStats {
  // Keep real words only (the API also returns spacing and sound events).
  const words = all.filter((w) => (w.type ?? "word") === "word" && clean(w.text) !== "");
  if (words.length === 0) {
    return { words: 0, seconds: 0, wordsPerMinute: 0, fillers: 0, fillerWords: [], longPauses: [], pace: "Too short to tell" };
  }

  const seconds = words[words.length - 1].end - words[0].start;
  const fillerWords = words.filter((w, i) => isFiller(w.text, words[i - 1]?.text ?? "")).map((w) => clean(w.text));
  const longPauses: SpeechStats["longPauses"] = [];
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap > LONG_PAUSE_SEC) longPauses.push({ at: words[i - 1].end, seconds: Math.round(gap * 10) / 10 });
  }

  // Count speaking pace without filler sounds.
  const realWords = words.length - fillerWords.length;
  const wordsPerMinute = seconds > 0 ? Math.round((realWords / seconds) * 60) : 0;
  // Typical comfortable interview pace is roughly 110-170 words per minute.
  const pace: SpeechStats["pace"] =
    seconds < 5 ? "Too short to tell" : wordsPerMinute < 110 ? "Too slow" : wordsPerMinute > 170 ? "Too fast" : "Good";

  return { words: words.length, seconds: Math.round(seconds), wordsPerMinute, fillers: fillerWords.length, fillerWords, longPauses, pace };
}

export type NervesVerdict = "Nerves helped" | "Nerves hurt" | "Steady" | "No heart reading" | "Too short to judge";

// Fewer words than this and there isn't enough of an answer to judge.
export const MIN_WORDS_TO_JUDGE = 12;

// Did nerves help or hurt this answer?
// High heart rate + messy delivery = hurt. High heart rate + clean delivery = helped (you stayed sharp).
export function nervesVerdict(zone: string, stats: SpeechStats): NervesVerdict {
  if (stats.words < MIN_WORDS_TO_JUDGE) return "Too short to judge";
  if (zone === "Calibrating") return "No heart reading";
  const messy = stats.pace === "Too fast" || stats.fillers >= 4 || stats.longPauses.length >= 2;
  if (zone === "High" || zone === "Alert") return messy ? "Nerves hurt" : "Nerves helped";
  return "Steady";
}
