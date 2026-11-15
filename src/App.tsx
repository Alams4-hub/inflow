import { useState } from "react";
import { useSensing } from "./sensing/useSensing";
import PulseStrip, { type CoachLine } from "./ui/PulseStrip";
import Home from "./ui/Home";
import CodeSession from "./modes/code/CodeSession";
import InterviewMode from "./modes/interview/InterviewMode";

type Mode = "home" | "code" | "interview";

const MODES: { id: Exclude<Mode, "home">; label: string; idle: string }[] = [
  { id: "code", label: "Problem solving", idle: "Run your code when you're ready. I'll stay quiet while you work." },
  { id: "interview", label: "Communication", idle: "I'll ask the questions. Take your time with each answer." },
];

const HOME_LINE: CoachLine = { text: "I'm learning your resting heart rate while you choose.", tone: "quiet" };

// The wordmark and the two ways to train. The selected one sits on a small drawn wave.
export function AppHeader({ mode, onGo }: { mode: Mode; onGo: (mode: Mode) => void }) {
  return (
    <header className="app-header">
      <button className="wordmark" onClick={() => onGo("home")}>
        <span className="wordmark-dot" aria-hidden />
        InFlow
      </button>
      <nav role="tablist" aria-label="What to train" className="tabs">
        {MODES.map((m) => (
          <button key={m.id} role="tab" aria-selected={mode === m.id} onClick={() => onGo(m.id)}>
            {m.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

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
      <AppHeader mode={mode} onGo={go} />

      <PulseStrip {...sensing} coach={coach} />

      <main style={{ marginTop: 12 }}>
        {mode === "home" && <Home onChoose={go} bpm={sensing.bpm} />}
        {mode === "code" && <CodeSession sensing={sensing} onCoach={setCoach} />}
        {mode === "interview" && <InterviewMode heart={sensing.history} baseline={sensing.baseline} gazeRef={sensing.gazeRef} onCoach={setCoach} />}
      </main>
    </>
  );
}
