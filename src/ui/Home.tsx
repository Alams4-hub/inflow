import { color } from "./tokens";

type Props = { onChoose: (mode: "code" | "interview") => void };

// A calm heartbeat shape for the opening line (two beats, then flat).
const HERO_LINE =
  "M0 60 L140 60 L160 60 L172 30 L184 92 L196 44 L208 60 L330 60 L350 60 L362 30 L374 92 L386 44 L398 60 L560 60 L700 60";

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

export default function Home({ onChoose }: Props) {
  return (
    <div>
      <svg viewBox="0 0 700 120" style={{ width: "100%", maxWidth: 700, height: "auto", display: "block" }} aria-hidden>
        <path className="draw-line" pathLength={1} d={HERO_LINE} fill="none" stroke={color.tide} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <h1 className="fade-up" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700, maxWidth: "20ch", margin: "8px 0 12px", animationDelay: "0.4s" }}>
        Practice under pressure, with a coach that knows when to stay quiet.
      </h1>
      <p className="fade-up" style={{ fontSize: 18, color: color.muted, animationDelay: "0.6s" }}>
        Struggling is how you learn. InFlow reads your pulse through your camera and steps in only when struggle stops helping.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 28 }}>
        {CHOICES.map((c, i) => (
          <button
            key={c.id}
            className="choice fade-up"
            onClick={() => onChoose(c.id)}
            style={{
              animationDelay: `${0.8 + i * 0.15}s`,
              textAlign: "left",
              background: color.surface,
              color: color.ink,
              border: `1px solid ${color.line}`,
              borderRadius: 20,
              padding: "22px 24px",
              fontWeight: 400,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{c.title}</div>
            <div style={{ color: color.muted, marginBottom: 16 }}>{c.body}</div>
            <div style={{ color: color.tide, fontWeight: 600 }}>{c.action}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
