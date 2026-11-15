import { describe, expect, it } from "vitest";
import { brightness, lightingTip } from "./lighting";

describe("lightingTip", () => {
  it("says nothing when the reading is good, even on darker skin", () => {
    // Darker skin in good light can measure as fairly low brightness. That alone isn't a problem.
    expect(lightingTip(95, 62, 48, 0.7)).toBeNull();
  });

  it("asks for more light when the face is dark and the signal is weak", () => {
    expect(lightingTip(40, 28, 22, 0.2)).toMatch(/window or a lamp/);
  });

  it("asks for less light when the face is washed out", () => {
    expect(lightingTip(250, 245, 240, 0.9)).toMatch(/Too much light/);
  });

  it("stays quiet in normal light", () => {
    expect(lightingTip(170, 120, 95, 0.25)).toBeNull();
  });
});

describe("brightness", () => {
  it("weights green most, like the eye does", () => {
    expect(brightness(0, 255, 0)).toBeGreaterThan(brightness(255, 0, 0));
  });
});
