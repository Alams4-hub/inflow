import { describe, expect, it } from "vitest";
import { foreheadFromPoints, lockBox, skinRegionsFromPoints, type Box } from "./faceTracker";

describe("foreheadFromPoints", () => {
  const face = [
    { x: 0.3, y: 0.2 },
    { x: 0.7, y: 0.2 },
    { x: 0.5, y: 0.8 },
  ];

  it("puts the forehead near the top middle of the face", () => {
    const box = foreheadFromPoints(face);
    expect(box.x).toBeCloseTo(0.42);
    expect(box.w).toBeCloseTo(0.16);
    expect(box.y).toBeGreaterThan(0.2); // below the top of the face
    expect(box.y + box.h).toBeLessThan(0.2 + 0.6 * 0.25); // above the eyebrows
  });

  it("stays inside the face", () => {
    const box = foreheadFromPoints(face);
    expect(box.x).toBeGreaterThanOrEqual(0.3);
    expect(box.x + box.w).toBeLessThanOrEqual(0.7);
  });

  it("scales with face size (closer to the camera = bigger box)", () => {
    const far = foreheadFromPoints(face);
    const close = foreheadFromPoints(face.map((p) => ({ x: 0.5 + (p.x - 0.5) * 2, y: 0.5 + (p.y - 0.5) * 1.5 })));
    expect(close.w).toBeGreaterThan(far.w);
  });
});

describe("lockBox", () => {
  const current: Box = { x: 0.4, y: 0.2, w: 0.2, h: 0.1 };

  it("ignores tiny movements (keeps the old box)", () => {
    const detected = { ...current, x: 0.405, y: 0.202 };
    expect(lockBox(current, detected)).toBe(current);
  });

  it("follows a real head movement", () => {
    const detected = { ...current, x: 0.5 };
    expect(lockBox(current, detected)).toBe(detected);
  });

  it("follows when the face gets much closer or farther", () => {
    const detected = { ...current, w: 0.26 };
    expect(lockBox(current, detected)).toBe(detected);
  });
});

describe("skinRegionsFromPoints", () => {
  const face = [
    { x: 0.3, y: 0.2 },
    { x: 0.7, y: 0.2 },
    { x: 0.5, y: 0.8 },
  ];
  const [forehead, left, right] = skinRegionsFromPoints(face);

  it("returns the forehead plus two cheeks", () => {
    expect(skinRegionsFromPoints(face)).toHaveLength(3);
    expect(forehead).toEqual(foreheadFromPoints(face));
  });

  it("puts the cheeks below the forehead, around the middle of the face", () => {
    expect(left.y).toBeGreaterThan(forehead.y + forehead.h);
    expect(left.y).toBeGreaterThan(0.2 + 0.6 * 0.45);
    expect(left.y + left.h).toBeLessThan(0.2 + 0.6 * 0.75);
  });

  it("places the cheeks on opposite sides, the same size, without overlapping", () => {
    expect(left.x + left.w).toBeLessThan(right.x);
    expect(left.w).toBeCloseTo(right.w);
    expect(left.y).toBeCloseTo(right.y);
  });

  it("keeps every region inside the face", () => {
    for (const r of skinRegionsFromPoints(face)) {
      expect(r.x).toBeGreaterThanOrEqual(0.3);
      expect(r.x + r.w).toBeLessThanOrEqual(0.7);
      expect(r.y).toBeGreaterThanOrEqual(0.2);
      expect(r.y + r.h).toBeLessThanOrEqual(0.8);
    }
  });
});
