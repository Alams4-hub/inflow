import { describe, expect, it } from "vitest";
import { BpmSmoother, signalLabel } from "./bpmSmoother";

// Seeded random numbers so tests are repeatable.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe("BpmSmoother", () => {
  it("shows nothing until it has a few guesses", () => {
    const s = new BpmSmoother();
    expect(s.push(72).bpm).toBeNull();
    expect(s.push(73).bpm).toBeNull();
  });

  it("shows a number once guesses agree for 2 seconds in a row", () => {
    const s = new BpmSmoother();
    s.push(72);
    s.push(74);
    expect(s.push(71).bpm).toBeNull(); // first good second
    const r = s.push(73); // second good second
    expect(r.bpm).not.toBeNull();
    expect(r.confidence).toBeGreaterThan(0.7);
  });

  it("stops showing a number after the signal is lost for 5 seconds", () => {
    const s = new BpmSmoother();
    for (let i = 0; i < 8; i++) s.push(72);
    const random = rng(11);
    let shown: number | null = 72;
    for (let i = 0; i < 12; i++) shown = s.push(45 + Math.round(random() * 135)).bpm;
    expect(shown).toBeNull();
  });

  it("is not confident when guesses are random noise", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const random = rng(seed);
      const s = new BpmSmoother();
      let last = { bpm: null as number | null, confidence: 1 };
      for (let i = 0; i < 30; i++) last = s.push(45 + Math.round(random() * 135));
      expect(last.bpm).toBeNull();
      expect(last.confidence).toBeLessThan(0.45);
    }
  });

  it("gives smooth confidence values, not just a few fixed steps", () => {
    const random = rng(9);
    const s = new BpmSmoother();
    const values = new Set<number>();
    for (let i = 0; i < 40; i++) {
      values.add(Number(s.push(72 + Math.round((random() - 0.5) * 14)).confidence.toFixed(2)));
    }
    expect(values.size).toBeGreaterThan(5);
  });

  it("is more confident when guesses are tighter", () => {
    const tight = new BpmSmoother();
    const loose = new BpmSmoother();
    let t = 0;
    let l = 0;
    [72, 73, 71, 72, 74, 72, 73, 71].forEach((b) => (t = tight.push(b).confidence));
    [72, 80, 65, 75, 68, 78, 70, 62].forEach((b) => (l = loose.push(b).confidence));
    expect(t).toBeGreaterThan(l);
  });

  it("ignores single wild guesses", () => {
    const s = new BpmSmoother();
    for (const bpm of [72, 74, 73, 110, 71, 73, 45, 72, 75, 130, 70, 73]) {
      const shown = s.push(bpm).bpm;
      if (shown !== null) {
        expect(shown).toBeGreaterThanOrEqual(69);
        expect(shown).toBeLessThanOrEqual(77);
      }
    }
  });

  it("moves with small natural changes (doesn't look frozen)", () => {
    const s = new BpmSmoother();
    const seen = new Set<number>();
    for (const bpm of [70, 71, 72, 73, 74, 75, 76, 77, 78, 77, 76, 75]) {
      const shown = s.push(bpm).bpm;
      if (shown !== null) seen.add(shown);
    }
    expect(seen.size).toBeGreaterThan(3);
  });

  it("never jumps more than 6 BPM in one update", () => {
    const s = new BpmSmoother();
    let prev: number | null = null;
    for (const bpm of [70, 70, 70, 100, 100, 100, 100, 100, 100, 100]) {
      const shown = s.push(bpm).bpm;
      if (prev !== null && shown !== null) expect(Math.abs(shown - prev)).toBeLessThanOrEqual(6);
      prev = shown;
    }
  });

  it("follows a real rise (like after exercise) within about 12 seconds", () => {
    const s = new BpmSmoother();
    for (let i = 0; i < 8; i++) s.push(70);
    let shown: number | null = null;
    for (let i = 0; i < 12; i++) shown = s.push(105).bpm;
    expect(shown).toBeGreaterThanOrEqual(100);
  });

  it("starts fresh after reset", () => {
    const s = new BpmSmoother();
    for (let i = 0; i < 5; i++) s.push(90);
    s.reset();
    expect(s.push(65).bpm).toBeNull();
    expect(s.push(66).bpm).toBeNull();
  });
});

describe("signalLabel", () => {
  it("turns confidence into a simple word", () => {
    expect(signalLabel(0.9)).toBe("Strong");
    expect(signalLabel(0.5)).toBe("Okay");
    expect(signalLabel(0.2)).toBe("Weak");
  });
});
