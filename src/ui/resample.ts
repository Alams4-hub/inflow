// Picks evenly spaced values so every wave has the same number of points
// (the browser can only smoothly morph between waves with matching point counts).
export function resample(values: number[], n: number): number[] {
  if (values.length === 0) return [];
  return Array.from({ length: n }, (_, i) => values[Math.round((i / (n - 1)) * (values.length - 1))]);
}
