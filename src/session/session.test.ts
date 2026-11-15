import { beforeEach, describe, expect, it } from "vitest";
import { formatDuration, summarize, type SessionEvent } from "./session";
import { compareToLast, loadHistory, saveToHistory } from "./history";

const events: SessionEvent[] = [
  { t: 0, type: "start" },
  { t: 10_000, type: "run", passed: 2, total: 4, error: null },
  { t: 20_000, type: "run", passed: 2, total: 4, error: null },
  { t: 20_000, type: "stuck", reason: "Same result 2 runs in a row" },
  { t: 45_000, type: "nudge", level: 1, text: "You're close." },
  { t: 60_000, type: "run", passed: 3, total: 4, error: null },
  { t: 60_000, type: "unstuck" },
  { t: 90_000, type: "run", passed: 4, total: 4, error: null },
  { t: 90_000, type: "end", solved: true },
];

describe("summarize", () => {
  const s = summarize("Second largest", events, [
    { t: 5_000, bpm: 70 },
    { t: 30_000, bpm: 80 },
    { t: 200_000, bpm: 150 }, // after the session: ignored
  ], 70);

  it("counts runs and nudges", () => {
    expect(s.runs).toBe(4);
    expect(s.nudges).toBe(1);
    expect(s.highestHelpLevel).toBe(1);
  });

  it("measures total time and time stuck", () => {
    expect(s.durationMs).toBe(90_000);
    expect(s.timeStuckMs).toBe(40_000);
  });

  it("records solved and best score", () => {
    expect(s.solved).toBe(true);
    expect(s.bestPassed).toBe(4);
    expect(s.totalTests).toBe(4);
  });

  it("summarizes heart rate only during the session", () => {
    expect(s.heart).toEqual({ baseline: 70, min: 70, max: 80, avg: 75 });
  });

  it("counts stuck time until the end if never unstuck", () => {
    const t = summarize("x", [
      { t: 0, type: "start" },
      { t: 10_000, type: "stuck", reason: "r" },
      { t: 30_000, type: "end", solved: false },
    ], [], null);
    expect(t.timeStuckMs).toBe(20_000);
    expect(t.solved).toBe(false);
    expect(t.heart).toBeNull();
  });
});

describe("formatDuration", () => {
  it("formats seconds and minutes", () => {
    expect(formatDuration(42_000)).toBe("42s");
    expect(formatDuration(125_000)).toBe("2m 5s");
  });
});

describe("history", () => {
  // Simple in-memory stand-in for the browser's localStorage.
  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;
  });

  const base = summarize("x", events, [], null);

  it("saves newest first", () => {
    saveToHistory({ ...base, id: "a" });
    saveToHistory({ ...base, id: "b" });
    expect(loadHistory().map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("does not duplicate the same session", () => {
    saveToHistory({ ...base, id: "a" });
    saveToHistory({ ...base, id: "a" });
    expect(loadHistory()).toHaveLength(1);
  });

  it("compares time stuck with the previous session", () => {
    const history = saveToHistory({ ...base, id: "old", timeStuckMs: 60_000 });
    const current = { ...base, id: "new", timeStuckMs: 20_000 };
    expect(compareToLast(current, history)).toBe("40s less time stuck than last session.");
  });

  it("says nothing when there's no previous session", () => {
    expect(compareToLast({ ...base, id: "only" }, [])).toBeNull();
  });
});
