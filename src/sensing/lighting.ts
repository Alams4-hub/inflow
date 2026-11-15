// Checks whether the light on your face is good enough to read a pulse.
// The pulse is a tiny color change. With less light, camera noise drowns it out,
// and that hits darker skin first because it reflects less light to begin with.
// So instead of quietly showing a bad reading, InFlow tells you how to fix the light.

// Brightness of the skin patch, 0 (black) to 255 (white), from average R, G, B.
export function brightness(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Tip to show, or null if the light is fine. `quality` is the latest signal quality (0 to 1).
export function lightingTip(r: number, g: number, b: number, quality: number): string | null {
  const level = brightness(r, g, b);
  if (level > 235) return "Too much light on your face. Move away from the direct light.";
  // Dim light only matters if it's actually hurting the reading.
  if (level < 55 && quality < 0.45) return "Your face is in shadow. Face a window or a lamp for a steadier reading.";
  if (level < 90 && quality < 0.3) return "More light on your face would steady the reading. Face a window or a lamp.";
  return null;
}
