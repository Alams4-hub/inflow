import { useEffect, useRef, useState } from "react";
import type { BpmPoint } from "../../sensing/useSensing";
import { heartZone, type Zone } from "../../sensing/zones";
import { nervesVerdict, speechStats, type NervesVerdict, type SpeechStats } from "./speechStats";
import { interviewFeedback, nextQuestion, speak, startRecording, transcribe, type QA } from "./interviewApi";
import type { CoachLine } from "../../ui/PulseStrip";
import { color } from "../../ui/tokens";

type Props = { heart: BpmPoint[]; baseline: number | null; onCoach: (line: CoachLine) => void };

type Answer = {
  question: string;
  transcript: string;
  stats: SpeechStats;
  zone: Zone;
  verdict: NervesVerdict;
};

type Phase = "setup" | "asking" | "speaking" | "ready" | "recording" | "processing" | "done";

const QUESTION_COUNT = 3;
const GOOD = color.calm;
const OK = color.alert;
const BAD = color.high;

const VERDICT_COLORS: Record<NervesVerdict, string> = {
  "Nerves helped": GOOD,
  Steady: GOOD,
  "Nerves hurt": BAD,
  "No heart reading": color.calibrating,
};

function Badge({ text, color }: { text: string; color: string }) {
  // color is a 6-digit hex; "1f" adds a light transparent background in the same color.
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        background: `${color}1f`,
        color,
        fontSize: 13,
        fontWeight: 600,
        margin: "0 6px 6px 0",
      }}
    >
      {text}
    </span>
  );
}

// Glowing orb that pulses while the interviewer is talking.
function VoiceOrb({ active }: { active: boolean }) {
  return (
    <div
      className={active ? "orb" : undefined}
      aria-hidden
      style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        flexShrink: 0,
        background: `radial-gradient(circle at 35% 35%, ${color.tideSoft}, ${color.tide})`,
        opacity: active ? 1 : 0.35,
        transition: "opacity 0.4s ease",
      }}
    />
  );
}

// Five bars that move with your real voice volume while you answer.
const BAR_SHAPE = [0.55, 0.85, 1, 0.8, 0.6];
function MicBars({ level }: { level: number }) {
  return (
    <div aria-hidden style={{ display: "flex", alignItems: "center", gap: 4, height: 32 }}>
      {BAR_SHAPE.map((shape, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: `${Math.max(12, level * shape * 100)}%`,
            borderRadius: 3,
            background: color.high,
            transition: "height 80ms linear",
          }}
        />
      ))}
    </div>
  );
}

function AnswerCard({ a, n }: { a: Answer; n: number }) {
  const paceColor = a.stats.pace === "Good" ? GOOD : a.stats.pace === "Too short to tell" ? color.calibrating : OK;
  const fillerColor = a.stats.fillers <= 2 ? GOOD : a.stats.fillers <= 5 ? OK : BAD;
  const pauseColor = a.stats.longPauses.length === 0 ? GOOD : a.stats.longPauses.length <= 2 ? OK : BAD;
  return (
    <div style={{ padding: "14px 16px", background: color.surface, border: `1px solid ${color.line}`, borderRadius: 14, marginBottom: 12 }}>
      <div style={{ color: color.muted, fontSize: 13 }}>Question {n}</div>
      <div style={{ marginBottom: 10, fontSize: 17 }}>{a.question}</div>
      <Badge text={a.verdict} color={VERDICT_COLORS[a.verdict]} />
      <Badge text={`Heart: ${a.zone.label}`} color={a.zone.color} />
      <Badge text={`Pace: ${a.stats.pace}`} color={paceColor} />
      <Badge text={`Filler sounds: ${a.stats.fillers}`} color={fillerColor} />
      <Badge text={`Long pauses: ${a.stats.longPauses.length}`} color={pauseColor} />
      <details style={{ marginTop: 8 }}>
        <summary>What you said</summary>
        <p>{a.transcript || "(nothing was picked up)"}</p>
      </details>
    </div>
  );
}

export default function InterviewMode({ heart, baseline, onCoach }: Props) {
  const [role, setRole] = useState("Software engineering internship");
  const [phase, setPhase] = useState<Phase>("setup");
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voice, setVoice] = useState<"elevenlabs" | "browser" | null>(null);

  // Keep the latest heart data in a ref, so async steps read current values.
  const heartRef = useRef(heart);
  const baselineRef = useRef(baseline);
  const onCoachRef = useRef(onCoach);
  useEffect(() => {
    heartRef.current = heart;
    baselineRef.current = baseline;
    onCoachRef.current = onCoach;
  });
  const stopRef = useRef<(() => Promise<Blob>) | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const answerStartRef = useRef(0);

  const ask = async (history: QA[]) => {
    setPhase("asking");
    setError(null);
    onCoachRef.current({ text: "The interviewer is thinking of a question...", tone: "info" });
    const q = await nextQuestion(role, history);
    setQuestion(q);
    setPhase("speaking");
    onCoachRef.current({ text: "Listen to the question, then answer when you're ready.", tone: "quiet" });
    setVoice(await speak(q));
    setPhase("ready");
  };

  const start = () => {
    setAnswers([]);
    setFeedback(null);
    void ask([]);
  };

  const startAnswer = async () => {
    try {
      const recording = await startRecording();
      stopRef.current = recording.stop;
      answerStartRef.current = Date.now();
      // Update the mic bars from your real voice volume while recording.
      const tick = () => {
        if (!stopRef.current) return;
        setMicLevel(recording.level());
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      setPhase("recording");
      onCoachRef.current({ text: "Listening. I won't interrupt. Take your time.", tone: "quiet" });
    } catch {
      setError("InFlow needs your microphone. Allow it and try again.");
    }
  };

  const finishAnswer = async () => {
    if (!stopRef.current) return;
    setPhase("processing");
    const stop = stopRef.current;
    stopRef.current = null; // also stops the mic bars
    setMicLevel(0);
    const audio = await stop();
    const startedAt = answerStartRef.current;
    const endedAt = Date.now();

    let transcript: string;
    let stats: SpeechStats;
    try {
      const result = await transcribe(audio);
      transcript = result.text;
      stats = speechStats(result.words);
    } catch (err) {
      console.error(err);
      setError("Couldn't transcribe that answer. Check the ElevenLabs key, then try the question again.");
      setPhase("ready");
      return;
    }

    // Average heart rate while answering, shown as a zone compared to resting.
    const during = heartRef.current.filter((p) => p.t >= startedAt && p.t <= endedAt).map((p) => p.bpm);
    const avg = during.length ? during.reduce((a, b) => a + b, 0) / during.length : null;
    const zone = heartZone(avg, baselineRef.current);

    const answer: Answer = { question, transcript, stats, zone, verdict: nervesVerdict(zone.label, stats) };
    const all = [...answers, answer];
    setAnswers(all);

    if (all.length >= QUESTION_COUNT) {
      setPhase("done");
      onCoachRef.current({ text: "Interview done. Here's where your nerves helped and where they hurt.", tone: "info" });
      const text = await interviewFeedback(
        role,
        all.map((a) => ({ question: a.question, answer: a.transcript, pace: a.stats.pace, wordsPerMinute: a.stats.wordsPerMinute, fillers: a.stats.fillers, longPauses: a.stats.longPauses.length, nerves: a.verdict })),
      );
      setFeedback(text);
    } else {
      await ask(all.map((a) => ({ question: a.question, answer: a.transcript })));
    }
  };

  if (phase === "setup") {
    return (
      <div>
        <h2>Train your communication</h2>
        <p style={{ color: color.muted }}>
          InFlow plays the interviewer. It asks {QUESTION_COUNT} questions out loud, listens to your answers, and asks follow-ups.
          Afterwards you see where your nerves helped you and where they hurt.
        </p>
        <label htmlFor="role" style={{ display: "block", color: color.muted, marginTop: 16 }}>
          Role you're practicing for
        </label>
        <input id="role" value={role} onChange={(e) => setRole(e.target.value)} style={{ width: "min(420px, 100%)", marginTop: 4 }} />
        <div>
          <button onClick={start} style={{ marginTop: 16 }}>
            Start interview
          </button>
        </div>
        <p style={{ color: color.muted, fontSize: 14, marginTop: 16 }}>
          Your spoken answers are sent to ElevenLabs to turn them into text. Video stays on your laptop.
        </p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div>
        <h2>Interview report</h2>
        {answers.map((a, i) => (
          <AnswerCard key={i} a={a} n={i + 1} />
        ))}
        <h3>Coach's feedback</h3>
        <p>{feedback ?? "Writing your feedback..."}</p>
        <button onClick={() => setPhase("setup")} style={{ marginTop: 8 }}>
          Practice again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ color: color.muted }}>
        Question {answers.length + 1} of {QUESTION_COUNT}
      </div>
      <div style={{ display: "flex", gap: 20, alignItems: "center", margin: "8px 0 16px" }}>
        <VoiceOrb active={phase === "speaking" || phase === "asking"} />
        <h2 key={question} className="fade-up" style={{ minHeight: 64, fontSize: "1.75rem", maxWidth: "36ch", margin: 0 }}>
          {phase === "asking" ? "Thinking of a question..." : question}
        </h2>
      </div>
      {voice === "browser" && (
        <p style={{ color: color.muted, fontSize: 14 }}>Using the browser's voice because ElevenLabs didn't respond.</p>
      )}
      {error && <p style={{ color: BAD }}>{error}</p>}

      {phase === "ready" && (
        <button onClick={startAnswer} style={{ fontSize: 17, padding: "12px 24px" }}>
          Start answering
        </button>
      )}
      {phase === "recording" && (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <MicBars level={micLevel} />
          <button className="danger" onClick={finishAnswer} style={{ fontSize: 17, padding: "12px 24px" }}>
            I'm done answering
          </button>
        </div>
      )}
      {phase === "processing" && <p>Listening back to your answer...</p>}

      {answers.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>So far</h3>
          {answers.map((a, i) => (
            <div key={i} className="fade-up">
              <AnswerCard a={a} n={i + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
