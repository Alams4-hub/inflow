// Decides whether someone working on a coding problem is making progress or stuck.
// It only looks at what they do (runs, results, edits), not at their face.

export type RunResult = {
  passed: number;
  total: number;
  error: string | null; // a crash like "ZeroDivisionError: division by zero"
  failing: string[]; // names of the tests that failed
};

export type ProgressState = "not-started" | "progressing" | "stuck" | "solved";

export type ProgressStatus = { state: ProgressState; reason: string };

export const STUCK_AFTER_MS = 90_000; // no progress for 90 seconds counts as stuck

// A short "fingerprint" of a result. Same fingerprint twice = same problem as before.
export function signature(r: RunResult): string {
  return r.error ?? `failing:${r.failing.join(",")}`;
}

export class CodeTracker {
  private lastSignature: string | null = null;
  private repeatCount = 0; // how many runs in a row gave the same result
  private bestPassed = 0;
  private lastProgressAt: number | null = null;
  private solved = false;

  // Call when a run finishes. Returns true if this run counts as progress.
  recordRun(now: number, result: RunResult): boolean {
    const sig = signature(result);
    const passedMore = result.passed > this.bestPassed;
    const newProblem = this.lastSignature !== null && sig !== this.lastSignature;
    const firstRun = this.lastSignature === null;

    this.repeatCount = sig === this.lastSignature ? this.repeatCount + 1 : 1;
    this.lastSignature = sig;
    this.bestPassed = Math.max(this.bestPassed, result.passed);
    this.solved = result.error === null && result.passed === result.total;

    const progress = firstRun || passedMore || newProblem || this.solved;
    if (progress) this.lastProgressAt = now;
    return progress;
  }

  status(now: number): ProgressStatus {
    if (this.lastProgressAt === null) return { state: "not-started", reason: "No runs yet" };
    if (this.solved) return { state: "solved", reason: "All tests pass" };
    if (this.repeatCount >= 2) {
      return { state: "stuck", reason: `Same result ${this.repeatCount} runs in a row` };
    }
    const quietFor = now - this.lastProgressAt;
    if (quietFor >= STUCK_AFTER_MS) {
      return { state: "stuck", reason: `No progress for ${Math.round(quietFor / 1000)}s` };
    }
    return { state: "progressing", reason: "Trying new things" };
  }
}
