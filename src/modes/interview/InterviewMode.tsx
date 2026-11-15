import { useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from "react";
import type { BpmPoint, GazePoint } from "../../sensing/useSensing";
import { heartZone, type Zone } from "../../sensing/zones";
import { nervesVerdict, speechStats, type NervesVerdict, type SpeechStats, type Word } from "./speechStats";
import {
  answerNote,
  awayShare,
  buildTimeline,
  compareAttempts,
  fallbackFeedback,
  referenceRate,
  type Piece,
  type Timeline,
} from "./answerTimeline";
import {
  answerCoach,
  interviewFeedback,
  nextQuestion,
  speak,
  startRecording,
  transcribe,
  type Coaching,
  type InterviewerTone,
  type QA,
} from "./interviewApi";
import type { CoachLine } from "../../ui/PulseStrip";
import { InterviewPulse, PulseScore, StoryArc } from "./ReportVisuals";
import InterviewSetup from "./InterviewSetup";
import { color } from "../../ui/tokens";

type Props = {
  heart: BpmPoint[];
  baseline: number | null;
  gazeRef: MutableRefObject<GazePoint[]>;
  onCoach: (line: CoachLine) => void;
};

// One try at answering a question.
type Attempt = {
  transcript: string;
  stats: SpeechStats;
  zone: Zone;
  verdict: NervesVerdict;
  timeline: Timeline;
  note: string;
  audioUrl: string; // your recorded answer, for replay (also this attempt's unique id)
  away: number | null; // share of time you looked away from the screen
};

type CoachState = Coaching | { error: string } | "loading";

// A question and every try at it (you can answer again from the report).
type Answer = { question: string; attempts: Attempt[] };

type Phase = "setup" | "asking" | "speaking" | "ready" | "recording" | "processing" | "done";
type LevelRef = MutableRefObject<(() => number) | null>;

const QUESTION_COUNT = 3;
const latest = (a: Answer) => a.attempts[a.attempts.length - 1];
// Wall-clock time. Only called from event handlers, never while rendering.
const now = () => Date.now();

// ---------- Live visuals ----------

// The interviewer's orb. It swells with the actual loudness of the ElevenLabs voice.
function VoiceOrb({ levelRef, active }: { levelRef: LevelRef; active: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    let smooth = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const level = levelRef.current?.() ?? 0;
      smooth += (level - smooth) * 0.25;
      if (el.current) {
        el.current.style.transform = `scale(${1 + smooth * 0.4})`;
        el.current.style.filter = `drop-shadow(0 0 ${6 + smooth * 30}px color-mix(in srgb, ${color.apricot} ${30 + smooth * 50}%, transparent))`;
      }
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [levelRef]);
  return (
    <div className="voice-orb" aria-hidden>
      {/* Three soft layers; they drift in shape while the interviewer talks, and swell with the real voice. */}
      <div ref={el} className={active ? "orb-idle" : undefined} style={{ position: "absolute", inset: 0, opacity: active ? 1 : 0.4, transition: "opacity 0.5s ease" }}>
        <div className="orb-layer" style={{ background: color.lavender, opacity: 0.7, transform: "translate(-7%, 5%)" }} />
        <div className="orb-layer" style={{ background: color.apricot, opacity: 0.6, transform: "translate(8%, -4%) scale(0.88)" }} />
        <div className="orb-layer" style={{ background: `radial-gradient(circle at 38% 34%, ${color.tideSoft}, ${color.tide} 80%)`, transform: "scale(0.66)" }} />
      </div>
    </div>
  );
}

// Your voice, drawn live as it scrolls by. Each slice is colored by your heart zone at that moment,
// so you can watch your pulse and your speaking together.
function LiveRibbon({ levelRef, colorRef, startedAt }: { levelRef: LevelRef; colorRef: MutableRefObject<string>; startedAt: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const STEP = 5; // px between slices
    const samples: { level: number; color: string }[] = [];
    let frame = 0;
    let smooth = 0;
    let tick = 0;

    const draw = () => {
      frame = requestAnimationFrame(draw);
      const width = c.clientWidth;
      const height = c.clientHeight;
      if (c.width !== width * dpr) {
        c.width = width * dpr;
        c.height = height * dpr;
      }
      smooth += ((levelRef.current?.() ?? 0) - smooth) * 0.35;
      // Add a slice every other frame (~30 per second).
      if (tick++ % 2 === 0) {
        samples.push({ level: smooth, color: colorRef.current });
        const max = Math.ceil(width / STEP) + 1;
        if (samples.length > max) samples.splice(0, samples.length - max);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const mid = height / 2;
      ctx.lineCap = "round";
      ctx.lineWidth = 3.5;
      samples.forEach((s, i) => {
        const x = width - (samples.length - 1 - i) * STEP;
        const half = Math.max(1.5, s.level * (height / 2 - 4));
        ctx.globalAlpha = 0.15 + 0.85 * (i / samples.length); // older slices fade out
        ctx.strokeStyle = s.color;
        ctx.beginPath();
        ctx.moveTo(x, mid - half);
        ctx.lineTo(x, mid + half);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;

      if (clock.current) {
        const secs = Math.floor((Date.now() - startedAt) / 1000);
        clock.current.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
      }
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [levelRef, colorRef, startedAt]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
      <canvas ref={canvas} aria-hidden style={{ flex: 1, height: 110, minWidth: 0 }} />
      <span ref={clock} style={{ fontFamily: "var(--serif)", fontVariantNumeric: "lining-nums tabular-nums", fontSize: 34, color: color.ink, width: 72, textAlign: "right" }}>
        0:00
      </span>
    </div>
  );
}

// ---------- Report ----------

// How each heart zone marks the words said in it. Calm words stay plain.
const MARKS: Record<string, { tint: string; height: string } | undefined> = {
  Alert: { tint: `color-mix(in srgb, ${color.alert} 60%, transparent)`, height: "3px" },
  High: { tint: `color-mix(in srgb, ${color.high} 24%, transparent)`, height: "100%" },
};

function markStyle(zone: "Alert" | "High", delay: string): CSSProperties {
  const mark = MARKS[zone]!;
  return { "--mark": mark.tint, "--mark-h": mark.height, "--delay": delay } as CSSProperties;
}

// The transcript, marked by what your heart was doing as you said each part.
// Marks sweep in left to right, in the order you said things.
// During replay, `time` (seconds) lights up the word being played.
function MarkedTranscript({ pieces, size = 19, time = -1 }: { pieces: Piece[]; size?: number; time?: number }) {
  if (pieces.length === 0) return <p style={{ color: color.muted, margin: 0 }}>(nothing was picked up)</p>;
  const isNow = (start: number, end: number) => time >= start && time < end + 0.15;
  return (
    <p style={{ fontSize: size, lineHeight: 1.75, margin: 0, maxWidth: "62ch" }}>
      {pieces.map((piece, i) => {
        const delay = `${Math.min(i * 90, 1600)}ms`;
        if (piece.type === "pause") {
          return (
            <span key={i} style={{ color: color.muted, fontSize: size * 0.74, whiteSpace: "nowrap" }}>
              {" "}
              <span aria-hidden>···</span> {piece.seconds}s silence <span aria-hidden>···</span>{" "}
            </span>
          );
        }
        if (piece.type === "filler") {
          return (
            <span key={i}>
              {" "}
              <span
                className={isNow(piece.start, piece.end) ? "now-word" : undefined}
                style={{ color: color.alertInk, fontStyle: "italic" }}
                title="Filler sound"
              >
                {piece.text}
              </span>{" "}
            </span>
          );
        }
        const up = piece.zone === "Alert" || piece.zone === "High";
        return (
          <span key={i}>
            {" "}
            <span
              className={up ? "heart-mark" : undefined}
              title={up ? `Heart rate ${piece.zone.toLowerCase()} here` : undefined}
              style={up ? markStyle(piece.zone as "Alert" | "High", delay) : undefined}
            >
              {piece.words.map((w, j) => (
                <span key={j}>
                  {j > 0 && " "}
                  <span
                    className={[isNow(w.start, w.end) ? "now-word" : "", w.hedge ? "hedge-word" : ""].join(" ").trim() || undefined}
                    title={w.hedge ? "Sounds unsure" : undefined}
                  >
                    {w.text}
                  </span>
                </span>
              ))}
            </span>{" "}
          </span>
        );
      })}
    </p>
  );
}

function count(n: number, word: string): string {
  return n === 0 ? `no ${word}s` : `${n} ${word}${n === 1 ? "" : "s"}`;
}

function statsLine(t: Attempt): string {
  const { stats } = t;
  if (stats.words === 0) return "";
  if (stats.pace === "Too short to tell") return stats.seconds < 2 ? "Under 2 seconds of speaking" : `${stats.seconds} seconds of speaking`;
  const parts = [
    `${stats.seconds} seconds`,
    `${stats.wordsPerMinute} words a minute`,
    count(stats.fillers, "filler sound"),
    count(t.timeline.hedges, "unsure phrase"),
    count(stats.longPauses.length, "long pause"),
  ];
  if (t.away !== null) parts.push(`looked away ${Math.round(t.away * 100)}% of the time`);
  return parts.join(", ");
}

function CoachingNotes({ coaching }: { coaching: CoachState }) {
  if (coaching === "loading") return <p style={{ color: color.muted, marginTop: 16 }}>Working out a stronger way to say this...</p>;
  if ("error" in coaching) {
    return <p style={{ color: color.high, marginTop: 16, fontSize: 14 }}>Couldn't get coaching for this answer. Details: {coaching.error}</p>;
  }
  return (
    <div className="fade-up" style={{ marginTop: 18, maxWidth: "62ch" }}>
      <StoryArc coaching={coaching} />
      {coaching.worked && (
        <p style={{ margin: "0 0 6px" }}>
          <strong>What worked.</strong> {coaching.worked}
        </p>
      )}
      <p style={{ margin: "0 0 14px" }}>
        <strong>Fix.</strong> {coaching.fix}
      </p>
      <figure className="stronger">
        <figcaption style={{ color: color.tide, fontWeight: 700, fontSize: 15, marginBottom: 6 }}>A stronger way to say it</figcaption>
        <blockquote className="voice" style={{ margin: 0, fontSize: "1.35rem", lineHeight: 1.5 }}>{coaching.stronger}</blockquote>
      </figure>
    </div>
  );
}

// Plays your recorded answer back and reports the playback time, for lighting up words.
function useReplay(url: string) {
  const [time, setTime] = useState(-1);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  const toggle = () => {
    if (audio.current && !audio.current.paused) {
      audio.current.pause();
      setTime(-1);
      return;
    }
    const player = new Audio(url);
    audio.current = player;
    const tick = () => {
      if (player.paused || player.ended) return setTime(-1);
      setTime(player.currentTime);
      requestAnimationFrame(tick);
    };
    player.onplay = () => requestAnimationFrame(tick);
    void player.play();
  };
  return { time, playing: time >= 0, toggle };
}

function AnswerCard({ a, n, onRetry, coachings }: { a: Answer; n: number; onRetry?: () => void; coachings: Record<string, CoachState> }) {
  const now = latest(a);
  const replay = useReplay(now.audioUrl);
  const first = a.attempts[0];
  const tries = a.attempts.length;
  const changes = tries > 1 ? compareAttempts(a.attempts[tries - 2], now) : [];
  return (
    <section className="answer-block">
      <div style={{ color: color.muted, fontSize: 15, marginBottom: 4 }}>
        Question {n}
        {tries > 1 ? `, try ${tries}` : ""}
      </div>
      <div className="answer-question">{a.question}</div>

      {tries > 1 && (
        <p className="fade-up" style={{ margin: "0 0 14px", color: color.tide, fontWeight: 600 }}>
          {changes.length ? `Compared with your last try: ${changes.join(", ")}.` : "About the same as your last try."}
        </p>
      )}

      <PulseScore timeline={now.timeline} time={replay.time} id={`q${n}t${tries}`} />
      <MarkedTranscript pieces={now.timeline.pieces} time={replay.time} size={20} />
      <p className="voice" style={{ margin: "20px 0 4px", fontSize: "1.3rem", lineHeight: 1.4, color: color.tide }}>{now.note}</p>
      <div style={{ color: color.muted, fontSize: 14 }}>{statsLine(now)}</div>

      {tries > 1 && (
        <details style={{ marginTop: 12, color: color.muted }}>
          <summary>Your first try</summary>
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            <MarkedTranscript pieces={first.timeline.pieces} size={16} />
          </div>
        </details>
      )}

      <CoachingNotes coaching={coachings[now.audioUrl] ?? "loading"} />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
        {now.stats.words > 0 && (
          <button className="secondary" onClick={replay.toggle} aria-pressed={replay.playing}>
            {replay.playing ? "Stop replay" : "Replay my answer"}
          </button>
        )}
        {onRetry && (
          <button className="secondary" onClick={onRetry}>
            Try this answer again
          </button>
        )}
      </div>
    </section>
  );
}

// Explains the marks, using the same marks.
function MarkKey() {
  return (
    <p style={{ color: color.muted, marginTop: 4, fontSize: 17, maxWidth: "70ch" }}>
      Your words are marked by what your heart was doing when you said them: plain when calm,{" "}
      <span className="heart-mark" style={markStyle("Alert", "0ms")}>
        underlined when it rose
      </span>
      ,{" "}
      <span className="heart-mark" style={markStyle("High", "0ms")}>
        highlighted when it ran high
      </span>
      . <span className="hedge-word">Dotted</span> words sound unsure, and{" "}
      <span style={{ color: color.alertInk, fontStyle: "italic" }}>amber</span> ones are filler sounds.
    </p>
  );
}

// ---------- Main ----------

export default function InterviewMode({ heart, baseline, gazeRef, onCoach }: Props) {
  const [role, setRole] = useState("General job interview");
  const [tone, setTone] = useState<InterviewerTone>("friendly");
  const [phase, setPhase] = useState<Phase>("setup");
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<Answer[]>([]);
  // Gemini's notes for each attempt, by attempt id. Kept apart from `answers`
  // so a late reply can never be overwritten by a newer copy of the answers list.
  const [coachings, setCoachings] = useState<Record<string, CoachState>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voice, setVoice] = useState<"elevenlabs" | "browser" | null>(null);
  const [retryIndex, setRetryIndex] = useState<number | null>(null);
  const [answerStart, setAnswerStart] = useState(0);

  // Keep the latest values in refs, so async steps and animation loops read current data.
  const heartRef = useRef(heart);
  const baselineRef = useRef(baseline);
  const onCoachRef = useRef(onCoach);
  const answersRef = useRef(answers);
  const zoneColorRef = useRef<string>(color.calibrating);
  useEffect(() => {
    heartRef.current = heart;
    baselineRef.current = baseline;
    onCoachRef.current = onCoach;
    answersRef.current = answers;
    // Live heart zone, for coloring the voice ribbon while you answer.
    const last = heart[heart.length - 1];
    const fresh = last && Date.now() - last.t < 4000 ? last.bpm : null;
    zoneColorRef.current = heartZone(fresh, referenceRate(baseline, heart)).color;
  });
  const stopRef = useRef<(() => Promise<Blob>) | null>(null);
  const micLevelRef: LevelRef = useRef(null);
  const voiceLevelRef: LevelRef = useRef(null);

  const say = async (q: string) => {
    setQuestion(q);
    setPhase("speaking");
    onCoachRef.current({ text: "Listen to the question, then answer when you're ready.", tone: "quiet" });
    setVoice(await speak(q, (level) => (voiceLevelRef.current = level)));
    setPhase("ready");
  };

  const ask = async (history: QA[]) => {
    setPhase("asking");
    setError(null);
    onCoachRef.current({
      text: history.length ? "The interviewer is thinking about what you said..." : "The interviewer is picking your first question...",
      tone: "info",
    });
    await say(await nextQuestion(role, history, tone));
  };

  const start = () => {
    setAnswers([]);
    setFeedback(null);
    setRetryIndex(null);
    void ask([]);
  };

  const retry = (index: number) => {
    setRetryIndex(index);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    void say(answersRef.current[index].question);
  };

  const startAnswer = async () => {
    try {
      const recording = await startRecording();
      stopRef.current = recording.stop;
      micLevelRef.current = recording.level;
      setAnswerStart(now());
      setPhase("recording");
      onCoachRef.current({ text: "Listening. I won't interrupt. Take your time.", tone: "quiet" });
    } catch {
      setError("InFlow needs your microphone. Allow it and try again.");
    }
  };

  const refreshFeedback = async (all: Answer[]) => {
    setFeedback(null);
    const text = await interviewFeedback(
      role,
      all.map((a) => {
        const t = latest(a);
        return {
          question: a.question,
          answer: t.transcript,
          seconds: t.stats.seconds,
          words: t.stats.words,
          pace: t.stats.pace,
          wordsPerMinute: t.stats.wordsPerMinute,
          fillers: t.stats.fillers,
          longPauses: t.stats.longPauses.length,
          unsurePhrases: t.timeline.hedges,
          lookedAwayPercent: t.away === null ? null : Math.round(t.away * 100),
          nerves: t.verdict,
          heartPeakedAt: t.timeline.peak?.snippet ?? null,
        };
      }),
      fallbackFeedback(all.map(latest)),
    );
    setFeedback(text);
  };

  // Ask Gemini for notes on one attempt, then drop them into place when they arrive.
  const coachAttempt = (q: string, attempt: Attempt) => {
    const id = attempt.audioUrl;
    setCoachings((prev) => ({ ...prev, [id]: "loading" }));
    void answerCoach({
      question: q,
      transcript: attempt.transcript,
      seconds: attempt.stats.seconds,
      wordsPerMinute: attempt.stats.wordsPerMinute,
      fillers: attempt.stats.fillerWords,
      unsurePhrases: attempt.timeline.hedges,
      lookedAwayPercent: attempt.away === null ? null : Math.round(attempt.away * 100),
      longPauses: attempt.stats.longPauses.length,
      heartPeakedAt: attempt.timeline.peak?.snippet ?? null,
      nerves: attempt.verdict,
    }).then((coaching) => setCoachings((prev) => ({ ...prev, [id]: coaching })));
  };

  const finishAnswer = async () => {
    if (!stopRef.current) return;
    setPhase("processing");
    const stop = stopRef.current;
    stopRef.current = null;
    micLevelRef.current = null;
    const audio = await stop();
    const startedAt = answerStart;
    const endedAt = now();

    let transcript: string;
    let words: Word[];
    try {
      const result = await transcribe(audio);
      transcript = result.text;
      words = result.words;
    } catch (err) {
      console.error(err);
      const reason = err instanceof Error ? err.message : String(err);
      const hint = /401|403|permission|unauthorized/i.test(reason)
        ? " Your ElevenLabs key probably doesn't have Speech to Text permission."
        : /abort/i.test(reason)
          ? " It took too long. Try a shorter answer."
          : "";
      setError(`Couldn't turn your answer into text.${hint} Details: ${reason.slice(0, 300)}`);
      setPhase("ready");
      return;
    }

    // Compare to your resting rate, or to your typical rate this session if it isn't learned yet.
    const stats = speechStats(words);
    const heartNow = heartRef.current;
    const reference = referenceRate(baselineRef.current, heartNow);
    const during = heartNow.filter((p) => p.t >= startedAt && p.t <= endedAt).map((p) => p.bpm);
    const avg = during.length ? during.reduce((a, b) => a + b, 0) / during.length : null;
    const zone = heartZone(avg, reference);
    const verdict = nervesVerdict(zone.label, stats);
    const timeline = buildTimeline(words, heartNow, startedAt, reference);
    const attempt: Attempt = {
      transcript,
      stats,
      zone,
      verdict,
      timeline,
      note: answerNote(stats, timeline, verdict),
      audioUrl: URL.createObjectURL(audio),
      away: awayShare(gazeRef.current, startedAt, endedAt),
    };

    const prev = answersRef.current;
    if (retryIndex !== null) {
      // Another try at a question from the report.
      const all = prev.map((a, i) => (i === retryIndex ? { ...a, attempts: [...a.attempts, attempt] } : a));
      setAnswers(all);
      coachAttempt(question, attempt);
      setRetryIndex(null);
      setPhase("done");
      onCoachRef.current({ text: "Here's how that try compares to the last one.", tone: "info" });
      void refreshFeedback(all);
      return;
    }

    const all = [...prev, { question, attempts: [attempt] }];
    setAnswers(all);
    coachAttempt(question, attempt);
    if (all.length >= QUESTION_COUNT) {
      setPhase("done");
      onCoachRef.current({ text: "Interview done. Pick any answer and try it again.", tone: "info" });
      void refreshFeedback(all);
    } else {
      await ask(all.map((a) => ({ question: a.question, answer: latest(a).transcript })));
    }
  };

  if (phase === "setup") {
    return <InterviewSetup role={role} onRole={setRole} tone={tone} onTone={setTone} questionCount={QUESTION_COUNT} onStart={start} />;
  }

  if (phase === "done") {
    return (
      <div>
        <h2 className="report-title">Interview report</h2>
        {answers.some((a) => latest(a).timeline.hasHeart) ? (
          <MarkKey />
        ) : (
          <p style={{ color: color.muted, marginTop: 4 }}>No heart readings this time, so only your delivery is shown.</p>
        )}
        <InterviewPulse segments={answers.map((a, i) => ({ n: i + 1, timeline: latest(a).timeline }))} />
        {feedback === null ? (
          <p className="coach-take" style={{ color: color.muted }}>Writing your coach's take...</p>
        ) : (
          <p key={feedback} className="coach-take fade-up">
            {feedback}
          </p>
        )}
        {answers.map((a, i) => (
          <AnswerCard key={i} a={a} n={i + 1} onRetry={() => retry(i)} coachings={coachings} />
        ))}
        <button onClick={() => setPhase("setup")} style={{ marginTop: 16 }}>
          New interview
        </button>
      </div>
    );
  }

  const progress = retryIndex !== null ? `Trying question ${retryIndex + 1} again` : `Question ${answers.length + 1} of ${QUESTION_COUNT}`;
  return (
    <div>
      <div className="question-progress">
        {retryIndex === null && (
          <span className="progress-dots" aria-hidden>
            {Array.from({ length: QUESTION_COUNT }, (_, i) => (
              <span key={i} className={i < answers.length ? "done" : i === answers.length ? "now" : undefined} />
            ))}
          </span>
        )}
        {progress}
      </div>
      <div className="question-stage">
        <VoiceOrb levelRef={voiceLevelRef} active={phase === "speaking" || phase === "asking"} />
        <h2 key={question} className="question-text fade-up">
          {phase === "asking" ? (answers.length ? "Thinking about what you said..." : "Picking your first question...") : question}
        </h2>
      </div>
      {voice === "browser" && (
        <p style={{ color: color.muted, fontSize: 14 }}>Using the browser's voice because ElevenLabs didn't respond.</p>
      )}
      {error && <p style={{ color: color.high }}>{error}</p>}

      {phase === "ready" && (
        <button onClick={startAnswer} style={{ fontSize: 18, padding: "16px 34px" }}>
          Start answering
        </button>
      )}
      {phase === "recording" && (
        <div className="answer-well fade-up">
          <LiveRibbon levelRef={micLevelRef} colorRef={zoneColorRef} startedAt={answerStart} />
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 14, flexWrap: "wrap" }}>
            <button className="danger" onClick={finishAnswer} style={{ fontSize: 18, padding: "14px 30px" }}>
              I'm done answering
            </button>
            <span className="voice" style={{ color: color.muted, fontSize: "1.15rem" }}>
              Your voice, colored by your heart rate. Aim for about a minute.
            </span>
          </div>
        </div>
      )}
      {phase === "processing" && (
        <p className="voice fade-up" style={{ fontSize: "1.4rem", color: color.muted }}>
          Listening back to your answer...
        </p>
      )}

      {retryIndex === null && answers.length > 0 && (
        <div style={{ marginTop: 56 }}>
          <h3 style={{ marginBottom: 0 }}>So far</h3>
          {answers.map((a, i) => (
            <div key={i} className="fade-up">
              <AnswerCard a={a} n={i + 1} coachings={coachings} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
