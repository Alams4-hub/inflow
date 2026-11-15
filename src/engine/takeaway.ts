// A recap of one coding session, built only from what actually happened in it.
// Used when Gemini can't be reached, so two different sessions never get the same words.
import type { SessionEvent, SessionSummary } from "../session/session";

function seconds(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} seconds` : `${Math.floor(s / 60)} min ${s % 60 ? `${s % 60} s` : ""}`.trim();
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function localTakeaway(summary: SessionSummary, events: SessionEvent[]): string {
  const start = summary.startedAt;
  const runs = events.filter((e): e is Extract<SessionEvent, { type: "run" }> => e.type === "run");
  const firstStuck = events.find((e) => e.type === "stuck");
  const crashes = runs.filter((r) => r.error).length;
  const total = summary.totalTests;

  // The longest stretch of runs that made no progress.
  let flat = 0;
  let longestFlat = 0;
  runs.forEach((r, i) => {
    flat = i > 0 && r.passed <= runs[i - 1].passed ? flat + 1 : 0;
    longestFlat = Math.max(longestFlat, flat);
  });

  const parts: string[] = [];

  // What happened.
  if (summary.solved) {
    parts.push(
      summary.nudges === 0
        ? `You solved it on your own in ${seconds(summary.durationMs)} and ${plural(summary.runs, "run")}.`
        : `You solved it in ${seconds(summary.durationMs)} with ${plural(summary.nudges, "nudge")} from me.`,
    );
  } else if (summary.runs === 0) {
    parts.push(`You spent ${seconds(summary.durationMs)} on this without running your code once.`);
  } else {
    parts.push(`You got ${summary.bestPassed} of ${total} tests passing in ${plural(summary.runs, "run")} before stopping.`);
  }

  // Where it got hard.
  if (firstStuck) {
    parts.push(
      `You hit a wall about ${seconds(firstStuck.t - start)} in and stayed stuck for ${seconds(summary.timeStuckMs)}${
        longestFlat >= 2 ? `, running the same thing ${longestFlat + 1} times without a new test passing` : ""
      }.`,
    );
  } else if (summary.runs > 0 && !summary.solved) {
    parts.push("You never got truly stuck, so this one is close.");
  }

  // What your heart did, compared with your usual rate.
  const heart = summary.heart;
  if (heart && heart.baseline) {
    const rise = Math.round(((heart.max - heart.baseline) / heart.baseline) * 100);
    if (rise >= 15) parts.push(`Your heart rate climbed about ${rise}% above your usual at its peak.`);
    else if (rise >= 5) parts.push(`Your heart rate rose a little (about ${rise}%) but you stayed steady.`);
    else parts.push("Your heart rate stayed close to your usual the whole time.");
  }

  // One tip that fits this session.
  if (crashes >= 2) parts.push(`Next time: ${plural(crashes, "run")} crashed, so read the error line first before changing anything.`);
  else if (longestFlat >= 2) parts.push("Next time: when the same test keeps failing, trace it by hand with that exact input before you run again.");
  else if (summary.runs <= 1 && summary.solved) parts.push("Next time: try a harder problem.");
  else if (!summary.solved) parts.push("Next time: start with the first failing test and make just that one pass.");
  else if (summary.highestHelpLevel >= 3) parts.push("Next time: try to get one more test passing before reading the hint.");

  return parts.join(" ");
}
