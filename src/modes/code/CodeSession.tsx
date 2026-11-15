import { useEffect, useRef, useState } from "react";
import type { SensingState } from "../../sensing/useSensing";
import type { CoachLine } from "../../ui/PulseStrip";
import Report from "../../ui/Report";
import Picker from "../../ui/Picker";
import CodeMode from "./CodeMode";
import { FIX_PROBLEMS, MBPP_PROBLEMS, PROBLEMS, type Problem } from "./problem";
import type { RunOutput } from "./pythonRunner";
import { CodeTracker } from "../../progress/codeTracker";
import { Coach, LEVEL_NAMES } from "../../engine/coach";
import { getNudge, getSessionTakeaway } from "../../engine/coachApi";
import { summarize, type SessionEvent, type SessionSummary } from "../../session/session";
import { compareToLast, saveToHistory } from "../../session/history";
import { color } from "../../ui/tokens";

type Props = { sensing: SensingState; onCoach: (line: CoachLine) => void };

type Nudge = { level: number; text: string; fromAi: boolean };
type Finished = {
  summary: SessionSummary;
  events: SessionEvent[];
  takeaway: string | null;
  comparison: string | null;
  history: SessionSummary[];
};

export default function CodeSession({ sensing, onCoach }: Props) {
  const [problem, setProblem] = useState<Problem>(PROBLEMS[0]);

  // Session pieces live in refs so the 1-second check always sees the latest values.
  const sensingRef = useRef(sensing);
  const onCoachRef = useRef(onCoach);
  const problemRef = useRef(problem);
  useEffect(() => {
    sensingRef.current = sensing;
    onCoachRef.current = onCoach;
    problemRef.current = problem;
  });
  const trackerRef = useRef(new CodeTracker());
  const coachRef = useRef(new Coach());
  const eventsRef = useRef<SessionEvent[]>([]);
  const lastResultRef = useRef<RunOutput | null>(null);
  const codeRef = useRef(problem.starterCode);
  const wasStuckRef = useRef(false);

  const [sessionKey, setSessionKey] = useState(0); // changing this resets the editor
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);

  const log = (e: SessionEvent) => eventsRef.current.push(e);

  // A session starts when this screen opens, and again on "Practice again".
  useEffect(() => {
    eventsRef.current = [{ t: Date.now(), type: "start" }];
  }, [sessionKey]);

  const restart = (next: Problem = problemRef.current) => {
    trackerRef.current = new CodeTracker();
    coachRef.current = new Coach();
    lastResultRef.current = null;
    codeRef.current = next.starterCode;
    wasStuckRef.current = false;
    setProblem(next);
    setNudge(null);
    setFinished(null);
    setSessionKey((k) => k + 1);
    onCoachRef.current({ text: "Run your code when you're ready. I'll stay quiet while you work.", tone: "quiet" });
  };

  const endSession = (solved: boolean) => {
    log({ t: Date.now(), type: "end", solved });
    const events = [...eventsRef.current];
    const s = sensingRef.current;
    const summary = summarize(problemRef.current.title, events, s.history, s.baseline);
    const history = saveToHistory(summary);
    setFinished({ summary, events, takeaway: null, comparison: compareToLast(summary, history), history });
    onCoachRef.current({ text: solved ? "Solved. Here's how the session went." : "Session ended. Here's how it went.", tone: "info" });
    getSessionTakeaway(summary, events).then((takeaway) =>
      setFinished((f) => (f && f.summary.id === summary.id ? { ...f, takeaway } : f)),
    );
  };

  // Every second: check progress and let the coach decide whether to step in.
  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => {
      const now = Date.now();
      const { bpm, baseline } = sensingRef.current;
      const progress = trackerRef.current.status(now);
      const stuck = progress.state === "stuck";
      if (stuck && !wasStuckRef.current) log({ t: now, type: "stuck", reason: progress.reason });
      if (!stuck && wasStuckRef.current) log({ t: now, type: "unstuck" });
      wasStuckRef.current = stuck;

      const stress = bpm !== null && baseline !== null ? (bpm - baseline) / baseline : null;
      const d = coachRef.current.decide({ now, progress: progress.state, progressReason: progress.reason, stress });
      onCoachRef.current({ text: d.reason, tone: d.action === "nudge" ? "stepping-in" : "quiet" });

      if (d.action === "nudge") {
        const level = d.level;
        getNudge(problemRef.current, level, codeRef.current, lastResultRef.current).then(({ text, fromAi }) => {
          log({ t: Date.now(), type: "nudge", level, text });
          setNudge({ level, text, fromAi });
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [finished]);

  const onRun = (result: RunOutput, code: string) => {
    const now = Date.now();
    codeRef.current = code;
    lastResultRef.current = result;
    log({ t: now, type: "run", passed: result.passed, total: result.total, error: result.error });
    trackerRef.current.recordRun(now, result);
    if (result.error === null && result.passed === result.total) endSession(true);
  };

  if (finished) {
    return (
      <Report
        summary={finished.summary}
        events={finished.events}
        heart={sensing.history}
        takeaway={finished.takeaway}
        comparison={finished.comparison}
        history={finished.history}
        onRestart={() => restart()}
      />
    );
  }

  return (
    <div>
      <div className="code-toolbar">
        <span style={{ color: color.muted }}>Practice problem</span>
        <Picker
          label="Practice problem"
          searchable
          width={380}
          value={problem.id}
          onChange={(id) => restart(PROBLEMS.find((p) => p.id === id) ?? PROBLEMS[0])}
          groups={[
            { label: "Fix the bug", note: `${FIX_PROBLEMS.length} problems`, options: FIX_PROBLEMS.map((p) => ({ value: p.id, label: p.title })) },
            {
              label: "Write it yourself",
              note: `${MBPP_PROBLEMS.length} from MBPP`,
              options: MBPP_PROBLEMS.map((p) => ({ value: p.id, label: p.title })),
            },
          ]}
        />
        <button
          className="secondary"
          onClick={() => {
            const others = MBPP_PROBLEMS.filter((p) => p.id !== problemRef.current.id);
            restart(others[Math.floor(Math.random() * others.length)]);
          }}
        >
          Random problem
        </button>
        <span style={{ flex: 1 }} />
        <button className="secondary" onClick={() => endSession(false)}>
          End session and see report
        </button>
      </div>

      {nudge && (
        <div
          key={nudge.level}
          role="status"
          className="nudge slide-down"
        >
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 14, color: color.alertInk, fontWeight: 600, marginBottom: 6 }}>
              InFlow is stepping in with a {LEVEL_NAMES[nudge.level]}
              {nudge.fromAi ? "" : " (built-in hint)"}
            </div>
            <div className="voice" style={{ fontSize: "1.5rem", lineHeight: 1.35 }}>{nudge.text}</div>
          </div>
          <button className="secondary" onClick={() => setNudge(null)}>
            Got it
          </button>
        </div>
      )}

      <CodeMode key={`${problem.id}-${sessionKey}`} problem={problem} onRun={onRun} onEdit={() => {}} />

      {problem.source === "MBPP" && (
        <p style={{ color: color.muted, fontSize: 13, marginTop: 24 }}>
          This problem is from MBPP (Mostly Basic Python Problems) by Google Research, Austin et al., 2021.
        </p>
      )}
    </div>
  );
}
