import { describe, expect, it } from "vitest";
import { CodeTracker, STUCK_AFTER_MS, signature, type RunResult } from "./codeTracker";

const fail = (passed: number, failing: string[]): RunResult => ({ passed, total: 4, error: null, failing });
const crash = (error: string): RunResult => ({ passed: 0, total: 4, error, failing: [] });
const pass: RunResult = { passed: 4, total: 4, error: null, failing: [] };

describe("signature", () => {
  it("uses the error when there is a crash", () => {
    expect(signature(crash("NameError: x"))).toBe("NameError: x");
  });
  it("uses the failing test names otherwise", () => {
    expect(signature(fail(2, ["a", "b"]))).toBe("failing:a,b");
  });
});

describe("CodeTracker", () => {
  it("starts as not started", () => {
    expect(new CodeTracker().status(0).state).toBe("not-started");
  });

  it("counts the first run as progress", () => {
    const t = new CodeTracker();
    expect(t.recordRun(0, fail(1, ["a", "b", "c"]))).toBe(true);
    expect(t.status(1000).state).toBe("progressing");
  });

  it("is stuck after the same result twice in a row", () => {
    const t = new CodeTracker();
    t.recordRun(0, fail(2, ["c", "d"]));
    t.recordRun(10_000, fail(2, ["c", "d"]));
    const s = t.status(11_000);
    expect(s.state).toBe("stuck");
    expect(s.reason).toContain("2 runs");
  });

  it("is stuck after the same crash twice", () => {
    const t = new CodeTracker();
    t.recordRun(0, crash("ZeroDivisionError: division by zero"));
    t.recordRun(5_000, crash("ZeroDivisionError: division by zero"));
    expect(t.status(6_000).state).toBe("stuck");
  });

  it("counts passing more tests as progress", () => {
    const t = new CodeTracker();
    t.recordRun(0, fail(1, ["b", "c", "d"]));
    expect(t.recordRun(10_000, fail(3, ["d"]))).toBe(true);
    expect(t.status(11_000).state).toBe("progressing");
  });

  it("counts a different error as progress (they're trying something new)", () => {
    const t = new CodeTracker();
    t.recordRun(0, crash("NameError: name 'x' is not defined"));
    expect(t.recordRun(5_000, crash("TypeError: bad operand"))).toBe(true);
    expect(t.status(6_000).state).toBe("progressing");
  });

  it("gets un-stuck as soon as they make progress again", () => {
    const t = new CodeTracker();
    t.recordRun(0, fail(2, ["c", "d"]));
    t.recordRun(5_000, fail(2, ["c", "d"]));
    expect(t.status(6_000).state).toBe("stuck");
    t.recordRun(20_000, fail(3, ["d"]));
    expect(t.status(21_000).state).toBe("progressing");
  });

  it("is stuck after 90 seconds with no progress, even without re-running", () => {
    const t = new CodeTracker();
    t.recordRun(0, fail(2, ["c", "d"]));
    expect(t.status(STUCK_AFTER_MS - 1).state).toBe("progressing");
    expect(t.status(STUCK_AFTER_MS).state).toBe("stuck");
  });

  it("does not count going backwards to a known result as progress", () => {
    const t = new CodeTracker();
    t.recordRun(0, fail(3, ["d"]));
    t.recordRun(5_000, fail(3, ["d"]));
    expect(t.status(6_000).state).toBe("stuck");
  });

  it("reports solved when all tests pass", () => {
    const t = new CodeTracker();
    t.recordRun(0, fail(2, ["c", "d"]));
    t.recordRun(5_000, pass);
    expect(t.status(6_000).state).toBe("solved");
  });

  it("stays solved, never stuck, once solved", () => {
    const t = new CodeTracker();
    t.recordRun(0, pass);
    expect(t.status(STUCK_AFTER_MS * 3).state).toBe("solved");
  });
});
