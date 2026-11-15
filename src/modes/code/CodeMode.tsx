import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { loadPython, runTests, type RunOutput } from "./pythonRunner";
import type { Problem } from "./problem";
import { describeTest } from "./testDisplay";
import { color } from "../../ui/tokens";

type Props = {
  problem: Problem;
  onRun: (result: RunOutput, code: string) => void;
  onEdit: () => void;
};

export default function CodeMode({ problem, onRun, onEdit }: Props) {
  const [code, setCode] = useState(problem.starterCode);
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunOutput | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [runCount, setRunCount] = useState(0); // new keys each run, so the rows animate in again

  // Start loading Python as soon as the page opens, so the first run is fast.
  useEffect(() => {
    loadPython()
      .then(() => setReady(true))
      .catch((err: unknown) => setLoadError(String(err)));
  }, []);

  const run = async () => {
    setRunning(true);
    try {
      const output = await runTests(code, problem.functionName, problem.tests);
      setResult(output);
      setRunCount((n) => n + 1);
      onRun(output, code);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <h2>{problem.title}</h2>
      <p style={{ color: color.muted }}>{problem.prompt}</p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(240px, 2fr)", gap: 16, alignItems: "start" }}>
      <div style={{ border: `1px solid ${color.line}`, borderRadius: 14, overflow: "hidden", background: color.surface }}>
      <Editor
        height="320px"
        defaultLanguage="python"
        theme="light"
        value={code}
        onChange={(value) => {
          setCode(value ?? "");
          onEdit();
        }}
        options={{ fontSize: 15, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 12 } }}
      />
      </div>

      {/* Tests panel: always visible, so you know what's being checked before you run. */}
      <div style={{ background: color.surface, border: `1px solid ${color.line}`, borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Tests your code needs to pass</div>
        {problem.tests.map((t, i) => {
          const { call, expected } = describeTest(t, problem.functionName);
          const detail = result?.details.find((d) => d.name === t.name);
          const state = !detail ? "not-run" : detail.passed ? "pass" : "fail";
          const mark = state === "pass" ? "✓" : state === "fail" ? "✗" : "○";
          const markColor = state === "pass" ? color.calm : state === "fail" ? color.high : color.muted;
          return (
            <div
              key={`${runCount}-${t.name}`}
              className={result ? "row-in" : undefined}
              style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: i === 0 ? "none" : `1px solid ${color.surface2}`, animationDelay: `${(i + 1) * 90}ms` }}
            >
              <span style={{ color: markColor, fontWeight: 700, width: 14 }} aria-label={state}>
                {mark}
              </span>
              <div style={{ minWidth: 0, fontSize: 14 }}>
                <code style={{ wordBreak: "break-word" }}>{call}</code>
                <div style={{ color: color.muted }}>
                  should be <code>{expected}</code>
                  {state === "fail" && detail && (
                    <span style={{ color: color.high }}>
                      , you got <code>{detail.got}</code>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </div>

      <button
        onClick={run}
        disabled={!ready || running}
        style={{ marginTop: 16 }}
      >
        {loadError ? "Python failed to load" : !ready ? "Loading Python..." : running ? "Running..." : "Run tests"}
      </button>

      {result && (
        <div style={{ marginTop: 16 }}>
          {result.error ? (
            <div className="row-in" style={{ color: color.high }}>
              Your code couldn't run: {result.error}
            </div>
          ) : (
            <div className="row-in" style={{ fontWeight: 600 }}>
              {result.passed} of {result.total} tests passing
            </div>
          )}
          {result.printed && (
            <pre style={{ background: color.surface2, padding: 12, borderRadius: 10, color: color.ink }}>{result.printed}</pre>
          )}
        </div>
      )}
    </div>
  );
}
