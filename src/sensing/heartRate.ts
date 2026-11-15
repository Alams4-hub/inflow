// Estimates heart rate from the average green value of a skin patch over time.
// Each heartbeat pushes a little more blood into the face, which changes how much
// green light the skin absorbs. We look for the strongest rhythm between 42 and 180 BPM.

export type Sample = { t: number; g: number }; // t = time in ms, g = average green value

const MIN_BPM = 42;
const MAX_BPM = 180;

export function estimateBpm(samples: Sample[]): { bpm: number; quality: number } | null {
  if (samples.length < 64) return null; // need a few seconds of data first

  const n = samples.length;
  const durationSec = (samples[n - 1].t - samples[0].t) / 1000;
  if (durationSec < 5) return null;

  // 1. Remove slow drift (lighting changes, small head moves) by subtracting
  //    a moving average of about 1 second.
  const fps = n / durationSec;
  const half = Math.max(1, Math.round(fps / 2));
  const detrended: number[] = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) {
      sum += samples[j].g;
      count++;
    }
    detrended.push(samples[i].g - sum / count);
  }

  // 2. Measure how strong each possible heart rate is in the signal.
  //    This works even if the camera frames don't arrive at perfectly even times.
  const t0 = samples[0].t;
  let bestBpm = 0;
  let bestPower = 0;
  let totalPower = 0;
  for (let bpm = MIN_BPM; bpm <= MAX_BPM; bpm += 0.5) {
    const freq = bpm / 60; // beats per second
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i++) {
      const angle = 2 * Math.PI * freq * ((samples[i].t - t0) / 1000);
      re += detrended[i] * Math.cos(angle);
      im += detrended[i] * Math.sin(angle);
    }
    const power = re * re + im * im;
    totalPower += power;
    if (power > bestPower) {
      bestPower = power;
      bestBpm = bpm;
    }
  }

  // 3. Quality = how much the winning rate stands out from the rest (0 to 1).
  const steps = (MAX_BPM - MIN_BPM) / 0.5 + 1;
  const quality = totalPower > 0 ? Math.min(1, (bestPower / totalPower) * (steps / 20)) : 0;

  return { bpm: Math.round(bestBpm), quality };
}