// Turns jumpy one-second heart-rate guesses into a steady number, like a smartwatch does.
//
// How we know a reading is real: a real pulse gives guesses that AGREE with each other
// second after second. Random noise gives guesses scattered anywhere from 45 to 180.
// Confidence is based on how spread out the recent guesses are: tightly grouped = high,
// scattered = low. It changes smoothly instead of jumping between a few fixed values.

export type SmoothedBpm = {
  bpm: number | null; // shown heart rate, or null if we're not confident yet
  confidence: number; // 0 to 1
};

export type SignalLabel = "Strong" | "Okay" | "Weak";

export function signalLabel(confidence: number): SignalLabel {
  if (confidence >= 0.7) return "Strong";
  if (confidence >= 0.45) return "Okay";
  return "Weak";
}

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export class BpmSmoother {
  private recent: number[] = [];
  private current: number | null = null;
  private goodStreak = 0; // seconds in a row with enough confidence
  private weakStreak = 0; // seconds in a row without enough confidence
  private readonly size: number;
  private readonly maxStep: number;
  private readonly spreadForZero: number;
  private readonly minConfidence: number;

  // spreadForZero: if guesses are typically this many BPM away from the middle, confidence is 0.
  constructor(size = 8, maxStep = 6, spreadForZero = 12, minConfidence = 0.45) {
    this.size = size;
    this.maxStep = maxStep;
    this.spreadForZero = spreadForZero;
    this.minConfidence = minConfidence;
  }

  push(bpm: number): SmoothedBpm {
    this.recent.push(bpm);
    if (this.recent.length > this.size) this.recent.shift();

    const mid = median(this.recent);
    // Typical distance from the middle guess (median absolute deviation).
    const spread = median(this.recent.map((b) => Math.abs(b - mid)));
    // Need at least 3 guesses before trusting anything.
    const confidence = this.recent.length < 3 ? 0 : Math.max(0, Math.min(1, 1 - spread / this.spreadForZero));

    if (confidence >= this.minConfidence) {
      this.goodStreak += 1;
      this.weakStreak = 0;
    } else {
      this.goodStreak = 0;
      this.weakStreak += 1;
    }

    if (this.current === null) {
      // Show a first number only after 2 good seconds in a row (noise can line up by chance once).
      if (this.goodStreak >= 2) this.current = mid;
    } else if (this.weakStreak >= 5) {
      // Signal lost for 5 seconds (e.g. you moved away): stop showing a number.
      this.current = null;
    } else if (confidence >= this.minConfidence) {
      // Move toward the middle guess, but not too fast in one step.
      this.current += Math.max(-this.maxStep, Math.min(this.maxStep, mid - this.current));
    }
    return { bpm: this.current === null ? null : Math.round(this.current), confidence };
  }

  reset(): void {
    this.recent = [];
    this.current = null;
    this.goodStreak = 0;
    this.weakStreak = 0;
  }
}
