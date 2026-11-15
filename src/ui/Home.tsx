import type { CSSProperties } from "react";
import { color } from "./tokens";

type Props = {
  onChoose: (mode: "code" | "interview") => void;
  bpm?: number | null; // purely visual: the orb swells once per measured heartbeat
};

// Problem solving: a busy line that goes quiet, with one small mark where the coach steps in.
const CODE_ART =
  "M4 60 C24 60 26 30 40 30 S58 84 72 84 S90 22 104 22 S122 74 136 74 S152 46 164 46 S180 64 196 60 L300 60";
// Communication: a spoken answer, as soft bars of loudness.
const TALK_BARS = [10, 18, 30, 22, 38, 46, 30, 18, 26, 42, 52, 40, 24, 14, 20, 34, 28, 16, 10, 6];

const CHOICES = [
  {
    id: "code" as const,
    title: "Train your problem solving",
    body: "Fix real code. InFlow watches your progress and your pulse, stays quiet while you work it out, and only steps in when you're truly stuck.",
    action: "Start coding",
  },
  {
    id: "interview" as const,
    title: "Train your communication",
    body: "Answer interview questions out loud. Afterwards, see where your nerves helped you and where they made you rush, pause, or say um.",
    action: "Start an interview",
  },
];

function ChoiceArt({ id }: { id: "code" | "interview" }) {
  if (id === "code") {
    return (
      <svg className="choice-art" viewBox="0 0 300 110" aria-hidden>
        <ellipse cx={150} cy={58} rx={150} ry={44} fill={color.lavender} fillOpacity={0.3} />
        <path className="draw-line" pathLength={1} d={CODE_ART} fill="none" stroke={color.tide} strokeWidth={3} strokeLinecap="round" />
        <circle cx={196} cy={60} r={7} fill={color.apricot} />
        <circle cx={196} cy={60} r={14} fill={color.apricot} fillOpacity={0.3} />
      </svg>
    );
  }
  return (
    <svg className="choice-art" viewBox="0 0 300 110" aria-hidden>
      <ellipse cx={150} cy={58} rx={150} ry={44} fill={color.apricot} fillOpacity={0.22} />
      {TALK_BARS.map((h, i) => (
        <line
          key={i}
          className="row-in"
          x1={18 + i * 14}
          x2={18 + i * 14}
          y1={58 - h / 1.1}
          y2={58 + h / 1.1}
          stroke={i > 8 && i < 13 ? color.high : color.tide}
          strokeOpacity={i > 8 && i < 13 ? 0.75 : 0.55 + (i % 3) * 0.12}
          strokeWidth={7}
          strokeLinecap="round"
          style={{ animationDelay: `${0.6 + i * 0.04}s` }}
        />
      ))}
    </svg>
  );
}

export default function Home({ onChoose, bpm = null }: Props) {
  const live = bpm !== null;
  return (
    <div>
      <section className="home-hero">
        <div>
          <h1 className="home-title fade-up" style={{ animationDelay: "0.2s" }}>
            Practice under pressure, with a coach that knows when to stay quiet.
          </h1>
          <p className="home-lede fade-up" style={{ animationDelay: "0.45s" }}>
            Struggling is how you learn. InFlow reads your pulse through your camera and steps in only when struggle stops helping.
          </p>
        </div>

        {/* Three soft layers of light. Once your pulse is found, the orb swells with each beat. */}
        <div className={`home-orb${live ? " orb-live" : ""}`} aria-hidden style={{ "--beat-duration": live ? `${60 / bpm}s` : "1s" } as CSSProperties}>
          <div className={`home-orb-core${live ? " swelling" : ""}`}>
            <div className="orb-layer" style={{ background: color.lavender, opacity: 0.55, transform: "translate(-6%, 4%) scale(0.96)" }} />
            <div className="orb-layer" style={{ background: color.apricot, opacity: 0.5, transform: "translate(7%, -5%) scale(0.86)" }} />
            <div
              className="orb-layer"
              style={{ background: `radial-gradient(circle at 38% 34%, ${color.tideSoft}, ${color.tide} 78%)`, opacity: 0.82, transform: "scale(0.62)" }}
            />
          </div>
        </div>
      </section>

      <div className="home-ways">
        {CHOICES.map((c, i) => (
          <button key={c.id} className="choice fade-up" onClick={() => onChoose(c.id)} style={{ animationDelay: `${0.7 + i * 0.15}s` }}>
            <span>
              <span className="choice-title" style={{ display: "block" }}>
                {c.title}
              </span>
              <span className="choice-body" style={{ display: "block" }}>
                {c.body}
              </span>
              <span className="choice-action">{c.action}</span>
            </span>
            <ChoiceArt id={c.id} />
          </button>
        ))}
      </div>
    </div>
  );
}
