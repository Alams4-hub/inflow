import { describe, expect, it } from "vitest";
import { heartCoverage, heartSpans } from "./pulseGeometry";

describe("heartSpans", () => {
  it("joins readings that are close together", () => {
    const spans = heartSpans([{ t: 0, bpm: 70 }, { t: 1, bpm: 72 }, { t: 2, bpm: 75 }], 10);
    expect(spans[0]).toEqual({ from: 0, to: 1, bpm: 70 });
    expect(spans).toHaveLength(3);
  });

  it("leaves a gap where readings stopped for a while", () => {
    const spans = heartSpans([{ t: 0, bpm: 70 }, { t: 8, bpm: 72 }], 10);
    expect(spans[0].to).toBe(1); // didn't stretch across the 8-second gap
  });
});

describe("heartCoverage", () => {
  it("is the share of the answer that had a reading", () => {
    const heart = Array.from({ length: 5 }, (_, i) => ({ t: i, bpm: 70 }));
    expect(heartCoverage(heart, 10)).toBeCloseTo(0.5);
  });

  it("is zero with no readings", () => {
    expect(heartCoverage([], 10)).toBe(0);
  });
});
