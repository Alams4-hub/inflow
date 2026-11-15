import type { TestCase } from "./problem";

// Shows a JavaScript value the way Python would print it (True, None, 'text', [1, 2]).
export function pyRepr(v: unknown): string {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "string") return `'${v}'`;
  if (Array.isArray(v)) return `[${v.map(pyRepr).join(", ")}]`;
  if (typeof v === "object") {
    return `{${Object.entries(v as Record<string, unknown>).map(([k, x]) => `'${k}': ${pyRepr(x)}`).join(", ")}}`;
  }
  return String(v);
}

// One line describing what a test checks, e.g. "second_largest([3, 1, 2]) should be 2".
export function describeTest(test: TestCase, functionName: string): { call: string; expected: string } {
  if ("assert" in test) {
    const body = test.assert.replace(/^assert\s+/, "");
    const i = body.lastIndexOf("==");
    return i === -1 ? { call: body, expected: "True" } : { call: body.slice(0, i).trim(), expected: body.slice(i + 2).trim() };
  }
  return { call: `${functionName}(${test.args.map(pyRepr).join(", ")})`, expected: pyRepr(test.expected) };
}
