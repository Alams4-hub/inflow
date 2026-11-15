// Runs Python in the browser with Pyodide (Python compiled to WebAssembly).
// Nothing is sent to a server: the user's code runs on their own laptop.
import type { RunResult } from "../../progress/codeTracker";
import type { TestCase } from "./problem";

const PYODIDE_URL = "https://cdn.jsdelivr.net/npm/pyodide@314.0.8/";

export type TestDetail = { name: string; passed: boolean; got: string; expected: string };
export type RunOutput = RunResult & { details: TestDetail[]; printed: string };

// Only the small part of Pyodide we use.
type Pyodide = {
  runPython(code: string): unknown;
  globals: { get(name: string): (...args: unknown[]) => unknown };
  setStdout(options: { batched: (text: string) => void }): void;
};

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<Pyodide>;
  }
}

// Python code that runs the user's function against each test and reports back as JSON.
const HARNESS = `
import json, ast

def __inflow_check(t, fn, ns):
    # Returns (passed, got_text, expected_text). Supports two test styles:
    #   {"args": [...], "expected": ...}      call the function with args
    #   {"assert": "assert f(x) == y"}        an assert line (MBPP style)
    if "assert" in t:
        node = ast.parse(t["assert"]).body[0]
        cmp = node.test
        if isinstance(cmp, ast.Compare) and len(cmp.ops) == 1 and isinstance(cmp.ops[0], ast.Eq):
            expected = eval(compile(ast.Expression(cmp.comparators[0]), "<test>", "eval"), ns)
            got = eval(compile(ast.Expression(cmp.left), "<test>", "eval"), ns)
            return got == expected, repr(got), repr(expected)
        exec(t["assert"], ns)
        return True, "ok", "ok"
    got = fn(*t["args"])
    return got == t["expected"], repr(got), repr(t["expected"])

def __inflow_run(user_code, fn_name, tests_json):
    tests = json.loads(tests_json)
    ns = {}
    try:
        exec(user_code, ns)
    except Exception as e:
        return json.dumps({"error": f"{type(e).__name__}: {e}", "details": []})
    fn = ns.get(fn_name)
    if fn is None:
        return json.dumps({"error": f"NameError: function '{fn_name}' not found", "details": []})
    details = []
    for t in tests:
        expected_text = repr(t.get("expected"))
        try:
            ok, got_text, expected_text = __inflow_check(t, fn, ns)
        except Exception as e:
            ok = False
            got_text = f"{type(e).__name__}: {e}"
        details.append({"name": t["name"], "passed": ok, "got": got_text, "expected": expected_text})
    return json.dumps({"error": None, "details": details})
`;

let pyodidePromise: Promise<Pyodide> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
}

// Loads Python once, then reuses it.
export function loadPython(): Promise<Pyodide> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      if (!window.loadPyodide) await loadScript(`${PYODIDE_URL}pyodide.js`);
      if (!window.loadPyodide) throw new Error("Pyodide did not load");
      const py = await window.loadPyodide({ indexURL: PYODIDE_URL });
      py.runPython(HARNESS);
      return py;
    })();
  }
  return pyodidePromise;
}

export async function runTests(code: string, functionName: string, tests: TestCase[]): Promise<RunOutput> {
  const py = await loadPython();
  let printed = "";
  py.setStdout({ batched: (text) => (printed += text + "\n") });

  const run = py.globals.get("__inflow_run");
  const json = String(run(code, functionName, JSON.stringify(tests)));
  const out = JSON.parse(json) as { error: string | null; details: TestDetail[] };

  const passed = out.details.filter((d) => d.passed).length;
  return {
    passed,
    total: tests.length,
    error: out.error,
    failing: out.details.filter((d) => !d.passed).map((d) => d.name),
    details: out.details,
    printed,
  };
}
