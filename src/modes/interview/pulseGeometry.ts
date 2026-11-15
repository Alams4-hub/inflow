// Small geometry helpers for the interview charts. Kept separate so they can be tested.

export type Point = { x: number; y: number };

// Maps a value from one range onto another (e.g. seconds onto pixels).
export function linear(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
  const span = d1 - d0 || 1;
  return (v) => r0 + ((v - d0) / span) * (r1 - r0);
}

// A smooth curve through every point (Catmull-Rom turned into SVG curves).
export function smoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

// The same curve, closed down to `floor` so it can be filled.
export function areaPath(points: Point[], floor: number): string {
  if (points.length < 2) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${smoothPath(points)} L${last.x.toFixed(1)},${floor} L${first.x.toFixed(1)},${floor} Z`;
}

// A bpm range for the y axis that always includes your usual rate, with a little room.
export function bpmDomain(bpms: number[], reference: number | null): [number, number] {
  const all = reference === null ? bpms : [...bpms, reference];
  if (all.length === 0) return [60, 100];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = Math.max(4, (hi - lo) * 0.15);
  return [Math.floor(lo - pad), Math.ceil(hi + pad)];
}

const MAX_READING_GAP = 3; // seconds; a longer gap between heart readings shows as "no reading"

// Stretches of time covered by heart readings, each colored by its zone.
export function heartSpans(heart: { t: number; bpm: number }[], duration: number): { from: number; to: number; bpm: number }[] {
  const spans: { from: number; to: number; bpm: number }[] = [];
  heart.forEach((p, i) => {
    const next = heart[i + 1];
    const to = next && next.t - p.t <= MAX_READING_GAP ? next.t : Math.min(p.t + 1, duration);
    if (to > p.t) spans.push({ from: Math.max(0, p.t), to: Math.min(duration, to), bpm: p.bpm });
  });
  return spans.filter((sp) => sp.to > sp.from);
}

// Share of the answer (0 to 1) that had a heart reading.
export function heartCoverage(heart: { t: number; bpm: number }[], duration: number): number {
  if (duration <= 0) return 0;
  return heartSpans(heart, duration).reduce((sum, sp) => sum + (sp.to - sp.from), 0) / duration;
}
