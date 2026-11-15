// One place for InFlow's colors, so every screen matches. Mirrors the CSS variables in index.css.
// Palette: dusk. Blush paper, mulberry ink, apricot and lavender light.
export const color = {
  paper: "#F5ECEB", // page background (blush)
  surface: "#FFF9F8",
  surface2: "#EDDDDD", // soft wells and tracks ("mist")
  line: "#DCC6C7",
  ink: "#2B1C2A", // main text (deep aubergine)
  muted: "#6A5463", // secondary text
  tide: "#7A2F5B", // InFlow's brand color (mulberry)
  tideSoft: "#EFD7E2",
  apricot: "#F3B08A", // warm light, decoration only
  lavender: "#C9B4D6", // cool light, decoration only
  calm: "#2B7F58", // green zone
  alert: "#B9740F", // amber zone
  alertInk: "#8C560A", // amber for small text
  high: "#C03B36", // red zone
  calibrating: "#9A8892",
} as const;
