import { describe, expect, it } from "vitest";
import { Coach, COOLDOWN_MS, MAX_LEVEL, WAIT_IF_CALM_MS, WAIT_IF_STRESSED_MS, type CoachInput } from "./coach";
import { Baseline, BASELINE_READINGS } from "./baseline";

const input = (now: number, progress: CoachInput["progress"], stress: number | null = 0): CoachInput => ({
  now,
  progress,
  progressReason: "test",
  stress,
});

describe("Coach", () => {
  it("stays quiet before the first run", () => {
    expect(new Coach().decide(input(0, "not-started")).action).toBe("quiet");
  });

  it("stays quiet while making progress, even when stressed (productive struggle)", () => {
    const c = new Coach();
    const d = c.decide(input(0, "progressing", 0.3));
    expect(d.action).toBe("quiet");
    expect(d.reason).toContain("making progress");
  });

  it("does not step in the moment you get stuck", () => {
    const c = new Coach();
    expect(c.decide(input(0, "stuck", 0.1)).action).toBe("quiet");
    expect(c.decide(input(WAIT_IF_STRESSED_MS - 1, "stuck", 0.1)).action).toBe("quiet");
  });

  it("steps in sooner when stuck AND stressed", () => {
    const c = new Coach();
    c.decide(input(0, "stuck", 0.1));
    const d = c.decide(input(WAIT_IF_STRESSED_MS, "stuck", 0.1));
    expect(d).toMatchObject({ action: "nudge", level: 1 });
  });

  it("waits longer when stuck but calm", () => {
    const c = new Coach();
    c.decide(input(0, "stuck", 0));
    expect(c.decide(input(WAIT_IF_STRESSED_MS, "stuck", 0)).action).toBe("quiet");
    expect(c.decide(input(WAIT_IF_CALM_MS, "stuck", 0))).toMatchObject({ action: "nudge", level: 1 });
  });

  it("still helps with no heart rate at all (behavior alone)", () => {
    const c = new Coach();
    c.decide(input(0, "stuck", null));
    expect(c.decide(input(WAIT_IF_CALM_MS, "stuck", null))).toMatchObject({ action: "nudge", level: 1 });
  });

  it("waits between nudges and climbs the help ladder", () => {
    const c = new Coach();
    c.decide(input(0, "stuck", 0.1));
    let t = WAIT_IF_STRESSED_MS;
    expect(c.decide(input(t, "stuck", 0.1))).toMatchObject({ action: "nudge", level: 1 });
    expect(c.decide(input(t + COOLDOWN_MS - 1, "stuck", 0.1)).action).toBe("quiet");
    t += COOLDOWN_MS;
    expect(c.decide(input(t, "stuck", 0.1))).toMatchObject({ action: "nudge", level: 2 });
  });

  it("never goes past the last level", () => {
    const c = new Coach();
    c.decide(input(0, "stuck", 0.1));
    let t = WAIT_IF_STRESSED_MS;
    for (let i = 0; i < MAX_LEVEL + 3; i++) {
      c.decide(input(t, "stuck", 0.1));
      t += COOLDOWN_MS;
    }
    expect(c.currentLevel()).toBe(MAX_LEVEL);
  });

  it("resets the ladder after real progress", () => {
    const c = new Coach();
    c.decide(input(0, "stuck", 0.1));
    c.decide(input(WAIT_IF_STRESSED_MS, "stuck", 0.1));
    expect(c.currentLevel()).toBe(1);
    c.decide(input(WAIT_IF_STRESSED_MS + 1000, "progressing", 0.1));
    expect(c.currentLevel()).toBe(0);
  });

  it("restarts the stuck clock after progress", () => {
    const c = new Coach();
    c.decide(input(0, "stuck", 0.1));
    c.decide(input(10_000, "progressing", 0.1));
    c.decide(input(11_000, "stuck", 0.1));
    expect(c.decide(input(11_000 + WAIT_IF_STRESSED_MS - 1, "stuck", 0.1)).action).toBe("quiet");
  });
});

describe("Baseline", () => {
  it("has no value until enough readings", () => {
    const b = new Baseline();
    for (let i = 0; i < BASELINE_READINGS - 1; i++) b.add(70);
    expect(b.get()).toBeNull();
    expect(b.stress(80)).toBeNull();
  });

  it("uses the middle reading as resting heart rate", () => {
    const b = new Baseline();
    for (let i = 0; i < BASELINE_READINGS; i++) b.add(i % 2 === 0 ? 68 : 72);
    expect(b.get()).toBeGreaterThanOrEqual(68);
    expect(b.get()).toBeLessThanOrEqual(72);
  });

  it("measures stress as percent above resting", () => {
    const b = new Baseline();
    for (let i = 0; i < BASELINE_READINGS; i++) b.add(70);
    expect(b.stress(77)).toBeCloseTo(0.1);
    expect(b.stress(70)).toBe(0);
  });

  it("does not change after calibration", () => {
    const b = new Baseline();
    for (let i = 0; i < BASELINE_READINGS; i++) b.add(70);
    b.add(120);
    expect(b.get()).toBe(70);
  });
});

describe("Coach messages", () => {
  it("never shows exact heart-rate percentages", () => {
    const c = new Coach();
    const reasons: string[] = [];
    c.decide(input(0, "stuck", 0.123));
    for (let t = 0; t <= 120_000; t += 1000) reasons.push(c.decide(input(t, "stuck", 0.123)).reason);
    reasons.push(c.decide(input(130_000, "progressing", 0.123)).reason);
    for (const r of reasons) expect(r).not.toMatch(/%/);
  });

  it("mentions a raised heart rate when stepping in while stressed", () => {
    const c = new Coach();
    c.decide(input(0, "stuck", 0.1));
    const d = c.decide(input(WAIT_IF_STRESSED_MS, "stuck", 0.1));
    expect(d.reason).toContain("heart rate is up");
  });
});
