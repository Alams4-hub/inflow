import { describe, expect, it } from "vitest";
import { bpmRange, heartZone } from "./zones";

describe("bpmRange", () => {
  it("shows a 10-BPM band instead of an exact number", () => {
    expect(bpmRange(72)).toBe("70–80");
    expect(bpmRange(69)).toBe("60–70");
    expect(bpmRange(100)).toBe("100–110");
  });
});

describe("heartZone", () => {
  it("is calibrating until there is a resting rate", () => {
    expect(heartZone(80, null).label).toBe("Calibrating");
    expect(heartZone(null, 70).label).toBe("Calibrating");
  });

  it("is calm near your resting rate", () => {
    expect(heartZone(70, 70).label).toBe("Calm");
    expect(heartZone(73, 70).label).toBe("Calm");
    expect(heartZone(60, 70).label).toBe("Calm");
  });

  it("is alert when moderately above resting", () => {
    expect(heartZone(75, 70).label).toBe("Alert");
    expect(heartZone(80, 70).label).toBe("Alert");
  });

  it("is high when well above resting", () => {
    expect(heartZone(81, 70).label).toBe("High");
    expect(heartZone(110, 70).label).toBe("High");
  });
});

import { resample } from "../ui/resample";

describe("resample (for the flowing wave)", () => {
  it("always returns the requested number of points", () => {
    expect(resample([1, 2, 3], 100)).toHaveLength(100);
    expect(resample(Array.from({ length: 300 }, (_, i) => i), 100)).toHaveLength(100);
  });
  it("keeps the first and last values", () => {
    const r = resample([5, 6, 7, 8, 9], 10);
    expect(r[0]).toBe(5);
    expect(r[9]).toBe(9);
  });
  it("returns nothing for no input", () => {
    expect(resample([], 100)).toEqual([]);
  });
});
