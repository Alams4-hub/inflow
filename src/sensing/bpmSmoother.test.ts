import { describe, expect, it } from "vitest";
import { BpmSmoother } from "./bpmSmoother";

const GOOD = 0.8;
const BAD = 0.2;

describe("BpmSmoother", () => {
  it("has no value before any good reading", () => {
    const s = new BpmSmoother();
    expect(s.value()).toBeNull();
    expect(s.push(70, BAD)).toBeNull();
  });

  it("shows the first good reading right away", () => {
    expect(new BpmSmoother().push(72, GOOD)).toBe(72);
  });

  it("ignores low-quality readings", () => {
    const s = new BpmSmoother();
    s.push(72, GOOD);
    expect(s.push(140, BAD)).toBe(72);
  });

  it("is not thrown off by single wild guesses", () => {
    const s = new BpmSmoother();
    const raw = [72, 74, 110, 71, 73, 45, 72, 75, 130, 70, 73];
    const shown = raw.map((bpm) => s.push(bpm, GOOD)!);
    for (const v of shown) {
      expect(v).toBeGreaterThanOrEqual(70);
      expect(v).toBeLessThanOrEqual(76);
    }
  });

  it("never changes by more than 8 BPM in one update", () => {
    const s = new BpmSmoother();
    let prev = s.push(70, GOOD)!;
    for (const bpm of [120, 125, 130, 60, 55, 140]) {
      const next = s.push(bpm, GOOD)!;
      expect(Math.abs(next - prev)).toBeLessThanOrEqual(8);
      prev = next;
    }
  });

  it("still follows a real rise (like after exercise) within about 10 seconds", () => {
    const s = new BpmSmoother();
    for (let i = 0; i < 5; i++) s.push(70, GOOD);
    let shown = 70;
    for (let i = 0; i < 10; i++) shown = s.push(105, GOOD)!;
    expect(shown).toBeGreaterThanOrEqual(100);
  });

  it("follows a real drop back down too", () => {
    const s = new BpmSmoother();
    for (let i = 0; i < 5; i++) s.push(110, GOOD);
    let shown = 110;
    for (let i = 0; i < 10; i++) shown = s.push(75, GOOD)!;
    expect(shown).toBeLessThanOrEqual(80);
  });

  it("starts fresh after reset", () => {
    const s = new BpmSmoother();
    s.push(90, GOOD);
    s.reset();
    expect(s.value()).toBeNull();
    expect(s.push(65, GOOD)).toBe(65);
  });
});
