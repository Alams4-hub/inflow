// Estimates heart rate from the average color of a skin patch over time.
// Each heartbeat pushes a little more blood into the face, which slightly changes
// the skin's color. We use the POS method ("Plane Orthogonal to Skin", Wang et al., 2017):
// it combines red, green, and blue so that changes affecting all colors at once
// (head movement, lighting flicker) cancel out, while the pulse color change remains.
//
// Why POS and not CHROM (what InFlow used before): darker skin absorbs more light, so the
// pulse color change is fainter. In InFlow's own tests with simulated darker skin and normal
// camera noise, CHROM got the rate right 7 times out of 20; POS got it right 16 times.
// See heartRate.test.ts, "different skin tones".

export type Sample = { t: number; r: number; g: number; b: number }; // t in ms, colors 0-255

const MIN_BPM = 45;
const MAX_BPM = 180;

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function std(xs: number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}

// Subtract a moving average (about 1 second) to remove slow drift.
function removeDrift(xs: number[], half: number): number[] {
  return xs.map((x, i) => {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(xs.length - 1, i + half); j++) {
      sum += xs[j];
      count++;
    }
    return x - sum / count;
  });
}

export type BpmEstimate = {
  bpm: number;
  quality: number; // 0 to 1: how much the winning rate stands out in this one window
  wave: number[]; // the cleaned pulse signal, for drawing a live waveform
};

export function estimateBpm(samples: Sample[]): BpmEstimate | null {
  if (samples.length < 64) return null; // need a few seconds of data first

  const n = samples.length;
  const durationSec = (samples[n - 1].t - samples[0].t) / 1000;
  if (durationSec < 5) return null;
  const fps = n / durationSec;
  const half = Math.max(1, Math.round(fps / 2));

  // 1. Normalize each color by its average, so skin tone and brightness don't matter.
  const mr = mean(samples.map((s) => s.r));
  const mg = mean(samples.map((s) => s.g));
  const mb = mean(samples.map((s) => s.b));
  if (mr === 0 || mg === 0 || mb === 0) return null;

  // 2. POS: two color combinations that are both blind to plain brightness changes,
  //    then mixed so whatever noise they share cancels and the pulse adds up.
  const s1 = removeDrift(samples.map((s) => s.g / mg - s.b / mb), half);
  const s2 = removeDrift(samples.map((s) => s.g / mg + s.b / mb - 2 * (s.r / mr)), half);
  const sd2 = std(s2);
  const alpha = sd2 > 0 ? std(s1) / sd2 : 0;
  const signal = s1.map((v, i) => v + alpha * s2[i]);

  // 3. Taper the edges of the window so its start and end don't create fake rhythms.
  const tapered = signal.map((v, i) => v * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))));

  // 4. Measure how strong each possible heart rate is in the signal.
  //    This works even if camera frames don't arrive at perfectly even times.
  const t0 = samples[0].t;
  let bestBpm = 0;
  let bestPower = 0;
  let totalPower = 0;
  for (let bpm = MIN_BPM; bpm <= MAX_BPM; bpm += 0.5) {
    const freq = bpm / 60;
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i++) {
      const angle = 2 * Math.PI * freq * ((samples[i].t - t0) / 1000);
      re += tapered[i] * Math.cos(angle);
      im += tapered[i] * Math.sin(angle);
    }
    const power = re * re + im * im;
    totalPower += power;
    if (power > bestPower) {
      bestPower = power;
      bestBpm = bpm;
    }
  }

  // 5. Quality = how much the winning rate stands out from the rest (0 to 1).
  const steps = (MAX_BPM - MIN_BPM) / 0.5 + 1;
  const quality = totalPower > 0 ? Math.min(1, (bestPower / totalPower) * (steps / 20)) : 0;

  // 6. A lightly smoothed copy of the pulse signal, for drawing on screen.
  const wave = signal.map((_, i) => {
    const a = signal[Math.max(0, i - 1)];
    const b = signal[i];
    const c = signal[Math.min(n - 1, i + 1)];
    return (a + b + c) / 3;
  });

  return { bpm: Math.round(bestBpm), quality, wave };
}
