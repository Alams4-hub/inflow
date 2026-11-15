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
      <h2 className="code-title">{problem.title}</h2>
      <p className="code-prompt">{problem.prompt}</p>

      <div className="code-grid">
      <div className="editor-well">
      <Editor
        height="320px"
        defaultLanguage="python"
        theme="light"
        value={code}
        onChange={(value) => {
          setCode(value ?? "");
          onEdit();
        }}
        options={{ fontSize: 15, lineHeight: 24, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 12 }, renderLineHighlight: "none", overviewRulerBorder: false }}
      />
      </div>

      {/* Tests panel: always visible, so you know what's being checked before you run. */}
      <div className="tests-panel">
        <h3>Tests your code needs to pass</h3>
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
              style={{ display: "flex", gap: 14, padding: "12px 0", borderTop: i === 0 ? "none" : `1px solid ${color.line}`, animationDelay: `${(i + 1) * 90}ms` }}
            >
              <span
                style={{
                  color: state === "not-run" ? color.muted : "#fff",
                  background: state === "not-run" ? "transparent" : markColor,
                  border: state === "not-run" ? `1.5px solid ${color.line}` : "none",
                  fontWeight: 700,
                  fontSize: 12,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
                aria-label={state}
              >
                {state === "not-run" ? "" : mark}
              </span>
              <div style={{ minWidth: 0, fontSize: 15 }}>
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
        style={{ marginTop: 24, fontSize: 18, padding: "14px 32px" }}
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
            <div className="row-in voice" style={{ fontSize: "1.5rem" }}>
              {result.passed} of {result.total} tests passing
            </div>
          )}
          {result.printed && (
            <pre style={{ background: color.surface, padding: "14px 18px", borderRadius: 18, color: color.ink }}>{result.printed}</pre>
          )}
        </div>
      )}
    </div>
  );
}
