import { color } from "../ui/tokens";

// Shows heart rate as a range and a color zone instead of an exact number.
// Webcam heart rate is an estimate, so a range is more honest than "72 BPM",
// and the zone (compared to YOUR resting rate) is what actually matters.

export type Zone = { label: "Calibrating" | "Calm" | "Alert" | "High"; color: string };

export const ZONE_COLORS = {
  Calibrating: color.calibrating,
  Calm: color.calm,
  Alert: color.alert,
  High: color.high,
} as const;

// e.g. 72 -> "70–80" (rounded to a 10-BPM band)
export function bpmRange(bpm: number): string {
  const low = Math.floor(bpm / 10) * 10;
  return `${low}–${low + 10}`;
}

// Compares heart rate to the person's own resting rate.
// Up to 5% above resting = Calm, 5-15% = Alert, more than 15% = High.
export function heartZone(bpm: number | null, baseline: number | null): Zone {
  if (bpm === null || baseline === null) return { label: "Calibrating", color: ZONE_COLORS.Calibrating };
  const rise = (bpm - baseline) / baseline;
  if (rise < 0.05) return { label: "Calm", color: ZONE_COLORS.Calm };
  if (rise < 0.15) return { label: "Alert", color: ZONE_COLORS.Alert };
  return { label: "High", color: ZONE_COLORS.High };
}
