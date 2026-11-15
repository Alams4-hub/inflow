import { describe, expect, it } from "vitest";
import { areaPath, bpmDomain, linear, smoothPath } from "./pulseGeometry";

describe("linear", () => {
  it("maps seconds onto pixels", () => {
    const x = linear(0, 10, 0, 800);
    expect(x(5)).toBe(400);
    expect(x(10)).toBe(800);
  });
  it("doesn't divide by zero on an empty range", () => {
    expect(Number.isFinite(linear(3, 3, 0, 100)(3))).toBe(true);
  });
});

describe("smoothPath", () => {
  it("starts at the first point and ends at the last", () => {
    const d = smoothPath([
      { x: 0, y: 10 },
      { x: 50, y: 20 },
      { x: 100, y: 5 },
    ]);
    expect(d.startsWith("M0.0,10.0")).toBe(true);
    expect(d.endsWith("100.0,5.0")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
  });
  it("handles nothing and one point", () => {
    expect(smoothPath([])).toBe("");
    expect(smoothPath([{ x: 1, y: 2 }])).toBe("M1,2");
  });
});

describe("areaPath", () => {
  it("closes the curve down to the floor", () => {
    const d = areaPath([{ x: 0, y: 10 }, { x: 100, y: 20 }], 90);
    expect(d.endsWith("L100.0,90 L0.0,90 Z")).toBe(true);
  });
});

describe("bpmDomain", () => {
  it("always includes your usual rate", () => {
    const [lo, hi] = bpmDomain([80, 90], 65);
    expect(lo).toBeLessThan(65);
    expect(hi).toBeGreaterThan(90);
  });
  it("has a sensible default with no data", () => {
    expect(bpmDomain([], null)).toEqual([60, 100]);
  });
});
