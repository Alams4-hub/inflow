// Talks to our /api/coach function. If it fails or is slow, falls back to
// built-in text so the app never gets stuck waiting.
import type { Problem } from "../modes/code/problem";
import type { RunOutput } from "../modes/code/pythonRunner";
import type { SessionEvent, SessionSummary } from "../session/session";

const TIMEOUT_MS = 8000;

async function post(body: unknown): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
    return await post({ kind: "summary", session: { summary, events } });
  } catch (err) {
    console.warn("Using built-in summary:", err);
    if (summary.solved && summary.nudges === 0) return "You solved it on your own. Struggling through it is exactly how it sticks.";
    if (summary.solved) return "You solved it with a little help. Next time, try testing unusual inputs (like negative numbers) before running.";
    return "You didn't finish this one yet. Come back to it fresh. The struggle you put in still counts.";
  }
}
