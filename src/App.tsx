import { useState } from "react";
import { useSensing } from "./sensing/useSensing";
import PulseStrip, { type CoachLine } from "./ui/PulseStrip";
import Home from "./ui/Home";
import CodeSession from "./modes/code/CodeSession";
import InterviewMode from "./modes/interview/InterviewMode";
import { color } from "./ui/tokens";

type Mode = "home" | "code" | "interview";

const MODES: { id: Exclude<Mode, "home">; label: string; idle: string }[] = [
  { id: "code", label: "Problem solving", idle: "Run your code when you're ready. I'll stay quiet while you work." },
  { id: "interview", label: "Communication", idle: "I'll ask the questions. Take your time with each answer." },
];

const HOME_LINE: CoachLine = { text: "I'm learning your resting heart rate while you choose.", tone: "quiet" };

export default function App() {
  const sensing = useSensing();
  const [mode, setMode] = useState<Mode>("home");
  const [coach, setCoach] = useState<CoachLine>(HOME_LINE);

  const go = (next: Mode) => {
    setMode(next);
    setCoach(next === "home" ? HOME_LINE : { text: MODES.find((m) => m.id === next)!.idle, tone: "quiet" });
  };

  return (
    <>
      <header style={{ display: "flex", alignItems: "center", gap: 24, padding: "20px 0", flexWrap: "wrap" }}>
        <button
          onClick={() => go("home")}
          style={{ background: "none", border: "none", padding: 0, fontSize: 26, fontWeight: 700, color: color.tide, letterSpacing: "-0.01em" }}
        >
          InFlow
        </button>
        <nav role="tablist" aria-label="What to train" style={{ display: "flex", gap: 4, background: color.surface2, padding: 4, borderRadius: 999 }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => go(m.id)}
              style={{
                background: mode === m.id ? color.surface : "transparent",
                color: mode === m.id ? color.ink : color.muted,
                border: "none",
                padding: "8px 16px",
                transition: "background 0.2s ease, color 0.2s ease",
              }}
            >
              {m.label}
            </button>
          ))}
        </nav>
      </header>

      <PulseStrip {...sensing} coach={coach} />

      <main style={{ marginTop: 28 }}>
        {mode === "home" && <Home onChoose={go} />}
        {mode === "code" && <CodeSession sensing={sensing} onCoach={setCoach} />}
        {mode === "interview" && <InterviewMode heart={sensing.history} baseline={sensing.baseline} onCoach={setCoach} />}
      </main>
    </>
  );
}
