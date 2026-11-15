import { describe, expect, it } from "vitest";
import { localTakeaway } from "./takeaway";
import type { SessionEvent, SessionSummary } from "../session/session";

const base: SessionSummary = {
  id: "1",
  problem: "x",
  startedAt: 0,
  durationMs: 90_000,
  solved: true,
  runs: 3,
  nudges: 0,
  highestHelpLevel: 0,
  timeStuckMs: 0,
  bestPassed: 4,
  totalTests: 4,
  heart: { baseline: 70, min: 68, max: 72, avg: 70 },
};
const run = (t: number, passed: number, error: string | null = null): SessionEvent => ({ t, type: "run", passed, total: 4, error });

describe("localTakeaway", () => {
  it("says something different for different sessions", () => {
    const quick = localTakeaway(base, [{ t: 0, type: "start" }, run(30_000, 4)]);
    const hard = localTakeaway(
      { ...base, durationMs: 400_000, nudges: 2, highestHelpLevel: 3, timeStuckMs: 120_000, heart: { baseline: 70, min: 70, max: 84, avg: 78 } },
      [{ t: 0, type: "start" }, run(60_000, 2), { t: 100_000, type: "stuck", reason: "" }, run(150_000, 2), run(200_000, 2), run(260_000, 4)],
    );
    expect(quick).not.toBe(hard);
    expect(quick).toMatch(/on your own in 1 min 30 s/);
    expect(hard).toMatch(/stuck for 2 min/);
    expect(hard).toMatch(/20% above your usual/);
    expect(hard).toMatch(/same thing 3 times/);
  });

  it("calls out crashes", () => {
    const text = localTakeaway({ ...base, solved: false, bestPassed: 0 }, [{ t: 0, type: "start" }, run(10_000, 0, "boom"), run(20_000, 0, "boom")]);
    expect(text).toMatch(/2 runs crashed/);
  });

  it("handles a session with no runs", () => {
    expect(localTakeaway({ ...base, solved: false, runs: 0, heart: null }, [{ t: 0, type: "start" }])).toMatch(/without running your code/);
  });
});
