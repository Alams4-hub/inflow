import { describe, expect, it } from "vitest";
import { estimateBpm, type Sample } from "./heartRate";

// Seeded random numbers, so every test run uses the exact same "random" noise.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

type FakeVideo = {
  bpm: number;
  seconds?: number;
  fps?: number;
  jitterMs?: number; // frames arriving unevenly
  noise?: number; // random camera noise per color
  skin?: [number, number, number]; // base R, G, B
  motionBpm?: number; // head movement that brightens/dims all colors together
  motionAmp?: number;
  drift?: number; // slow lighting change over the whole clip (fraction)
  stepAt?: number; // seconds: sudden lighting change (someone turns on a lamp)
  seed?: number;
};

// Builds fake forehead color samples with a known heart rate.
// Real skin's pulse shows up most in green, less in blue and red.
function fakeVideo(o: FakeVideo): Sample[] {
  const random = rng(o.seed ?? 1);
  const seconds = o.seconds ?? 12;
  const frameMs = 1000 / (o.fps ?? 30);
  const [r0, g0, b0] = o.skin ?? [170, 120, 100];
  const out: Sample[] = [];
  for (let t = 0; t < seconds * 1000; t += frameMs + ((o.jitterMs ?? 0) * (random() * 2 - 1))) {
    const s = t / 1000;
    const pulse = Math.sin(2 * Math.PI * (o.bpm / 60) * s);
    let light = 1 + (o.drift ?? 0) * (s / seconds);
    if (o.motionBpm) light *= 1 + (o.motionAmp ?? 0.01) * Math.sin(2 * Math.PI * (o.motionBpm / 60) * s);
    if (o.stepAt !== undefined && s > o.stepAt) light *= 1.08;
    const n = () => (o.noise ?? 0.5) * (random() - 0.5);
    out.push({
      t,
      r: (r0 + 0.33 * pulse) * light + n(),
      g: (g0 + 0.77 * pulse) * light + n(),
      b: (b0 + 0.53 * pulse) * light + n(),
    });
  }
  return out;
}

describe("estimateBpm: not enough data", () => {
  it("returns null with no samples", () => {
    expect(estimateBpm([])).toBeNull();
  });

  it("returns null with under 5 seconds of video", () => {
    expect(estimateBpm(fakeVideo({ bpm: 72, seconds: 3 }))).toBeNull();
  });

  it("returns null when the frame is completely black", () => {
    const black = fakeVideo({ bpm: 72 }).map((s) => ({ ...s, r: 0, g: 0, b: 0 }));
    expect(estimateBpm(black)).toBeNull();
  });
});

describe("estimateBpm: clean signal", () => {
  it.each([50, 60, 72, 85, 100, 120, 150, 170])("finds %i BPM within 2 BPM", (bpm) => {
    const result = estimateBpm(fakeVideo({ bpm, jitterMs: 5 }));
    expect(result).not.toBeNull();
    expect(Math.abs(result!.bpm - bpm)).toBeLessThanOrEqual(2);
    expect(result!.quality).toBeGreaterThan(0.6);
  });
});

describe("estimateBpm: real-world problems", () => {
  it.each([
    [72, 50],
    [80, 110],
    [65, 95],
    [100, 60],
    [90, 140],
  ])("true %i BPM is not fooled by head movement at %i BPM", (bpm, motionBpm) => {
    const result = estimateBpm(fakeVideo({ bpm, motionBpm, motionAmp: 0.015, jitterMs: 5 }));
    expect(Math.abs(result!.bpm - bpm)).toBeLessThanOrEqual(2);
  });

  it("handles slow lighting drift (10% brighter over the clip)", () => {
    const result = estimateBpm(fakeVideo({ bpm: 75, drift: 0.1 }));
    expect(Math.abs(result!.bpm - 75)).toBeLessThanOrEqual(2);
  });

  it("handles a sudden lighting change halfway through", () => {
    const result = estimateBpm(fakeVideo({ bpm: 68, stepAt: 6 }));
    expect(Math.abs(result!.bpm - 68)).toBeLessThanOrEqual(3);
  });

  it.each([15, 24, 30, 60])("works at %i frames per second", (fps) => {
    const result = estimateBpm(fakeVideo({ bpm: 78, fps, jitterMs: 3 }));
    expect(Math.abs(result!.bpm - 78)).toBeLessThanOrEqual(2);
  });

  it.each([
    ["light skin", [220, 175, 150]],
    ["medium skin", [170, 120, 100]],
    ["dark skin", [90, 60, 50]],
  ] as const)("works for %s", (_name, skin) => {
    const result = estimateBpm(fakeVideo({ bpm: 82, skin: [...skin] }));
    expect(Math.abs(result!.bpm - 82)).toBeLessThanOrEqual(2);
  });

  it("handles very uneven frame timing", () => {
    const result = estimateBpm(fakeVideo({ bpm: 90, jitterMs: 12 }));
    expect(Math.abs(result!.bpm - 90)).toBeLessThanOrEqual(2);
  });
});

describe("estimateBpm: quality score", () => {
  it("gives low quality when there is no pulse, only random noise", () => {
    const random = rng(42);
    const noPulse: Sample[] = [];
    for (let t = 0; t < 12000; t += 33) {
      noPulse.push({ t, r: 170 + 2 * (random() - 0.5), g: 120 + 2 * (random() - 0.5), b: 100 + 2 * (random() - 0.5) });
    }
    const result = estimateBpm(noPulse);
    expect(result).not.toBeNull();
    expect(result!.quality).toBeLessThan(0.4);
  });

  it("gives higher quality to a clean signal than a noisy one", () => {
    const clean = estimateBpm(fakeVideo({ bpm: 72, noise: 0.3 }))!;
    const noisy = estimateBpm(fakeVideo({ bpm: 72, noise: 4 }))!;
    expect(clean.quality).toBeGreaterThan(noisy.quality);
  });

  it("always returns quality between 0 and 1", () => {
    for (const noise of [0, 0.5, 2, 10]) {
      const q = estimateBpm(fakeVideo({ bpm: 72, noise }))!.quality;
      expect(q).toBeGreaterThanOrEqual(0);
      expect(q).toBeLessThanOrEqual(1);
    }
  });
});
