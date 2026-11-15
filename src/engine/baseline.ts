// Learns a person's resting heart rate during the first part of a session.
// Stress is then measured as "how far above YOUR normal", not a fixed number,
// since resting heart rates differ a lot between people.

export const BASELINE_READINGS = 20; // about 20 seconds of steady readings

export class Baseline {
  private readings: number[] = [];
  private value: number | null = null;

  add(bpm: number): void {
    if (this.value !== null) return;
    this.readings.push(bpm);
    if (this.readings.length >= BASELINE_READINGS) {
      const sorted = [...this.readings].sort((a, b) => a - b);
      this.value = sorted[Math.floor(sorted.length / 2)];
    }
  }

  get(): number | null {
    return this.value;
  }

  // Progress from 0 to 1, for a "calibrating..." bar.
  progress(): number {
    return this.value !== null ? 1 : this.readings.length / BASELINE_READINGS;
  }

  // How far above baseline, as a fraction (0.1 = 10% higher). Null until calibrated.
  stress(bpm: number | null): number | null {
    if (this.value === null || bpm === null) return null;
    return (bpm - this.value) / this.value;
  }
}
