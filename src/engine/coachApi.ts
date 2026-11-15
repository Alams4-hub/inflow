// Talks to our /api/coach function. If it fails or is slow, falls back to
// built-in text so the app never gets stuck waiting.
import type { Problem } from "../modes/code/problem";
import type { RunOutput } from "../modes/code/pythonRunner";
import type { SessionEvent, SessionSummary } from "../session/session";
import { localTakeaway } from "./takeaway";

const TIMEOUT_MS = 8000;

async function post(body: unknown, timeoutMs = TIMEOUT_MS): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Coach API error ${res.status}`);
    const data = (await res.json()) as { text?: string };
    if (!data.text) throw new Error("No text");
    return data.text;
  } finally {
    clearTimeout(timer);
  }
}

export function describeResults(result: RunOutput | null): string {
  if (!result) return "Not run yet.";
  if (result.error) return `Crashed: ${result.error}`;
  return result.details
    .map((d) => `${d.passed ? "PASS" : "FAIL"} ${d.name}: expected ${d.expected}, got ${d.got}`)
    .join("\n");
}

export async function getNudge(
  problem: Problem,
  level: number,
  code: string,
  result: RunOutput | null,
): Promise<{ text: string; fromAi: boolean }> {
  try {
    const text = await post({ kind: "nudge", level, problem: problem.prompt, code, results: describeResults(result) });
    return { text, fromAi: true };
  } catch (err) {
    console.warn("Using built-in hint:", err);
    return { text: problem.fallbackHints[Math.min(level, 4) - 1], fromAi: false };
  }
}

export async function getSessionTakeaway(summary: SessionSummary, events: SessionEvent[]): Promise<string> {
  try {
    // A recap isn't urgent like a hint, so give Gemini more time.
    return await post({ kind: "summary", session: { summary, events } }, 25000);
  } catch (err) {
    console.warn("Using built-in summary:", err);
    return localTakeaway(summary, events);
  }
}
