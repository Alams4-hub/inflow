// Everything that happens in a session, saved as a list of timestamped events.
// The report and the history page are both built by reading this list.

import type { BpmPoint } from "../sensing/useSensing";

export type SessionEvent =
  | { t: number; type: "start" }
  | { t: number; type: "run"; passed: number; total: number; error: string | null }
  | { t: number; type: "stuck"; reason: string }
  | { t: number; type: "unstuck" }
  | { t: number; type: "nudge"; level: number; text: string }
  | { t: number; type: "end"; solved: boolean };

export type SessionSummary = {
  id: string;
  problem: string;
  startedAt: number;
  durationMs: number;
  solved: boolean;
  runs: number;
  nudges: number;
  highestHelpLevel: number;
  timeStuckMs: number;
  bestPassed: number;
  totalTests: number;
  heart: { baseline: number | null; min: number; max: number; avg: number } | null;
};

export function summarize(
  problem: string,
  events: SessionEvent[],
  heart: BpmPoint[],
  baseline: number | null,
): SessionSummary {
  const start = events.find((e) => e.type === "start")?.t ?? events[0]?.t ?? 0;
  const end = events.find((e) => e.type === "end");
  const endT = end?.t ?? events[events.length - 1]?.t ?? start;

  const runs = events.filter((e) => e.type === "run");
  const nudges = events.filter((e) => e.type === "nudge");

  // Add up time between each "stuck" and the next "unstuck" (or the end).
  let timeStuckMs = 0;
  let stuckAt: number | null = null;
  for (const e of events) {
    if (e.type === "stuck" && stuckAt === null) stuckAt = e.t;
    if ((e.type === "unstuck" || e.type === "end") && stuckAt !== null) {
      timeStuckMs += e.t - stuckAt;
      stuckAt = null;
    }
  }
  if (stuckAt !== null) timeStuckMs += endT - stuckAt;

  const inSession = heart.filter((p) => p.t >= start && p.t <= endT).map((p) => p.bpm);
  const heartSummary =
    inSession.length === 0
      ? null
      : {
          baseline,
          min: Math.min(...inSession),
          max: Math.max(...inSession),
          avg: Math.round(inSession.reduce((a, b) => a + b, 0) / inSession.length),
        };

  return {
    id: String(start),
    problem,
    startedAt: start,
    durationMs: endT - start,
    solved: end?.type === "end" ? end.solved : false,
    runs: runs.length,
    nudges: nudges.length,
    highestHelpLevel: nudges.reduce((m, n) => Math.max(m, n.type === "nudge" ? n.level : 0), 0),
    timeStuckMs,
    bestPassed: runs.reduce((m, r) => Math.max(m, r.type === "run" ? r.passed : 0), 0),
    totalTests: runs.find((r) => r.type === "run")?.total ?? 0,
    heart: heartSummary,
  };
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}
