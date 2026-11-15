// The start screen for communication practice: what you're practicing for and how tough the interviewer is.
import { useState, type CSSProperties } from "react";
import { color } from "../../ui/tokens";
import { buildTimeline } from "./answerTimeline";
import { isTalk, type InterviewerTone } from "./interviewApi";
import { PulseScore } from "./ReportVisuals";

const OTHER = "__other__";

const ROLE_GROUPS: { label: string; roles: string[] }[] = [
  {
    label: "Job interviews",
    roles: [
      "General job interview",
      "Software engineering",
      "Data and analytics",
      "Product management",
      "UX and design",
      "Consulting",
      "Finance and banking",
      "Healthcare and nursing",
      "Teaching",
      "Sales and customer success",
      "Retail or service job",
    ],
  },
  { label: "School", roles: ["College admissions interview", "Scholarship interview", "Research position with a professor"] },
  { label: "Speaking", roles: ["Class presentation", "Pitch your project", "Speech or toast"] },
];

const TONES: { id: InterviewerTone; label: string; about: string }[] = [
  { id: "friendly", label: "Friendly", about: "Warm and encouraging. Good for a first run." },
  { id: "neutral", label: "Neutral", about: "Professional, like most real interviews." },
  { id: "tough", label: "Tough", about: "Skeptical. Pushes on anything vague." },
];

// A made-up answer, drawn the way your own answers will be, so you know what you'll get.
const SAMPLE = (() => {
  const t0 = 1_000_000;
  const words = (text: string, from: number) =>
    text.split(" ").map((w, i) => ({ text: w, start: from + i / 2.6, end: from + i / 2.6 + 0.3, type: "word" }));
  const heart = Array.from({ length: 24 }, (_, s) => ({ t: t0 + s * 1000, bpm: 72 + 15 * Math.exp(-((s - 11) ** 2) / 12) }));
  return buildTimeline(
    [
      ...words("So I led a team project where our app kept crashing the night before the demo and", 0),
      ...words("um I had to decide whether to cut a feature or keep debugging", 7),
      ...words("I cut it, and we demoed on time.", 15.5),
    ],
    heart,
    t0,
    72,
  );
})();

type Props = {
  role: string;
  onRole: (role: string) => void;
  tone: InterviewerTone;
  onTone: (tone: InterviewerTone) => void;
  questionCount: number;
  onStart: () => void;
};

export default function InterviewSetup({ role, onRole, tone, onTone, questionCount, onStart }: Props) {
  const known = ROLE_GROUPS.some((g) => g.roles.includes(role));
  const [choice, setChoice] = useState(known ? role : OTHER);
  const [custom, setCustom] = useState(known ? "" : role);
  const talk = isTalk(role);
  const ready = role.trim().length > 0;

  const pick = (value: string) => {
    setChoice(value);
    onRole(value === OTHER ? custom : value);
  };

  return (
    <div className="setup-grid">
      <div>
        <h2 className="setup-title">Train your communication</h2>
        <p style={{ color: color.muted, fontSize: "1.2rem", lineHeight: 1.5, maxWidth: "44ch", margin: "0 0 40px" }}>
          InFlow asks {questionCount} questions out loud, follows up on what you actually say, and shows you where your nerves
          helped and where they hurt.
        </p>

        <label htmlFor="role" className="field-label">
          What are you practicing for?
        </label>
        <select id="role" value={choice} onChange={(e) => pick(e.target.value)} className="role-select">
          {ROLE_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={OTHER}>Something else...</option>
        </select>
        {choice === OTHER && (
          <input
            autoFocus
            aria-label="Describe what you're practicing for"
            placeholder="For example: nursing school interview"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              onRole(e.target.value);
            }}
            className="fade-up"
            style={{ display: "block", width: "min(440px, 100%)", marginTop: 8 }}
          />
        )}

        <div className="field-label" style={{ marginTop: 32 }} id="tone-label">
          {talk ? "Audience" : "Interviewer"}
        </div>
        <div role="radiogroup" aria-labelledby="tone-label" className="segmented">
          {TONES.map((t) => (
            <button key={t.id} role="radio" aria-checked={tone === t.id} className={tone === t.id ? "on" : undefined} onClick={() => onTone(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <p key={tone} className="fade-up voice" style={{ color: color.muted, fontSize: "1.15rem", margin: "12px 0 0" }}>
          {TONES.find((t) => t.id === tone)?.about}
        </p>

        <button onClick={onStart} disabled={!ready} style={{ marginTop: 40, fontSize: 18, padding: "16px 34px" }}>
          {talk ? "Start practice talk" : "Start interview"}
        </button>
        <p style={{ color: color.muted, fontSize: 14, marginTop: 18, maxWidth: "46ch" }}>
          Your spoken answers go to ElevenLabs to be turned into text. Your video stays on your laptop.
        </p>
      </div>

      <figure className="setup-sample" aria-label="Example of what your report shows">
        <figcaption className="voice" style={{ fontSize: "1.6rem", lineHeight: 1.2, marginBottom: 4 }}>What you'll see after each answer</figcaption>
        <div style={{ color: color.muted, fontSize: 15, marginBottom: 10 }}>A sample answer, with the heart rate behind it.</div>
        <PulseScore timeline={SAMPLE} id="sample" />
        <p style={{ margin: 0, fontSize: 17, lineHeight: 1.75 }}>
          So I led a team project where our app kept crashing the night before the demo and <span style={{ color: color.alertInk, fontStyle: "italic" }}>um</span>{" "}
          <span className="heart-mark" style={{ "--mark": `color-mix(in srgb, ${color.high} 24%, transparent)`, "--mark-h": "100%", "--delay": "1.2s" } as CSSProperties}>
            I had to decide whether to cut a feature
          </span>{" "}
          or keep debugging. I cut it, and we demoed on time.
        </p>
      </figure>
    </div>
  );
}
