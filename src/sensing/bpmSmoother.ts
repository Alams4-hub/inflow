// Turns jumpy one-second heart-rate guesses into a steady number, like a smartwatch does.
// - Ignores low-quality readings.
// - Uses the median of the last few good readings, so one wild guess can't move it.
// - Limits how fast the shown number can change, but still follows real changes.

export class BpmSmoother {
  private recent: number[] = [];
  private current: number | null = null;
  private readonly size: number;
  private readonly maxStep: number;
  private readonly minQuality: number;

  constructor(size = 5, maxStep = 8, minQuality = 0.4) {
    this.size = size;
    this.maxStep = maxStep;
    this.minQuality = minQuality;
  }

  // Add a new raw reading. Returns the smoothed BPM, or null if there's no good reading yet.
  push(bpm: number, quality: number): number | null {
    if (quality < this.minQuality) return this.value();

    this.recent.push(bpm);
    if (this.recent.length > this.size) this.recent.shift();

    const sorted = [...this.recent].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    if (this.current === null) {
      this.current = median;
    } else {
      const change = Math.max(-this.maxStep, Math.min(this.maxStep, median - this.current));
      this.current += change;
    }
    return this.value();
  }

  value(): number | null {
    return this.current === null ? null : Math.round(this.current);
  }

  reset(): void {
    this.recent = [];
    this.current = null;
  }
}
