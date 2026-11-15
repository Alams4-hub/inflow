import type { CSSProperties } from "react";
import type { SensingState } from "../sensing/useSensing";
import { signalLabel } from "../sensing/bpmSmoother";
import { bpmRange, heartZone } from "../sensing/zones";
import { color } from "./tokens";
import { resample } from "./resample";

export type CoachLine = { text: string; tone: "quiet" | "stepping-in" | "info" };

type Props = SensingState & {
  attachVideo: (el: HTMLVideoElement | null) => void;
  coach: CoachLine;
};

const SIGNAL_COLORS = { Strong: color.calm, Okay: color.alert, Weak: color.high } as const;
const WAVE_POINTS = 100; // fixed point count, so the browser can smoothly morph one wave into the next

// The live pulse, drawn as a wave across the strip. Each bump is a heartbeat.
function Wave({ wave, stroke }: { wave: number[]; stroke: string }) {
  const W = 600;
  const H = 56;
  const pts = resample(wave, WAVE_POINTS);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const d =
    pts.length < 2
      ? `M 0 ${H / 2} ` + Array.from({ length: WAVE_POINTS - 1 }, (_, i) => `L ${((i + 1) / (WAVE_POINTS - 1)) * W} ${H / 2}`).join(" ")
      : pts.map((v, i) => `${i === 0 ? "M" : "L"} ${(i / (WAVE_POINTS - 1)) * W} ${H - 6 - ((v - min) / range) * (H - 12)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: H }} aria-label="Your live pulse">
      <path className="wave-path" d={d} fill="none" stroke={pts.length < 2 ? color.line : stroke} strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ d: `path("${d}")` } as CSSProperties} />
    </svg>
  );
}

export default function PulseStrip({ attachVideo, bpm, confidence, wave, status, baseline, calibration, coach }: Props) {
  const zone = heartZone(bpm, baseline);
  const signal = signalLabel(confidence);
  const ringColor = bpm === null ? color.line : SIGNAL_COLORS[signal];
  const coachColor = coach.tone === "stepping-in" ? color.alert : coach.tone === "info" ? color.muted : color.tide;
  const beatColor = zone.label === "Calibrating" ? color.tide : zone.color;

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "96px minmax(0, 1fr) auto",
        gap: 20,
        alignItems: "center",
        padding: "16px 20px",
        background: color.surface,
        border: `1px solid ${color.line}`,
        borderRadius: 20,
      }}
      aria-label="InFlow live status"
    >
      {/* Round camera window. It beats once per measured heartbeat; the ring color shows signal strength. */}
      <div
        className={bpm !== null ? "beating" : undefined}
        style={
          {
            width: 96,
            height: 96,
            borderRadius: "50%",
            "--beat-duration": bpm ? `${60 / bpm}s` : "1s",
            "--beat-color": beatColor,
          } as CSSProperties
        }
      >
        <video
          ref={attachVideo}
          autoPlay
          playsInline
          muted
          style={{
            width: 96,
            height: 96,
            objectFit: "cover",
            borderRadius: "50%",
            transform: "scaleX(-1)",
            border: `4px solid ${ringColor}`,
            display: "block",
            background: color.surface2,
            transition: "border-color 0.6s ease",
          }}
        />
      </div>

      <div style={{ minWidth: 0 }}>
        <Wave wave={wave} stroke={beatColor} />
        <p key={coach.text} className="fade-up" style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 600, color: coachColor }} aria-live="polite">
          {coach.text}
        </p>
      </div>

      <div style={{ textAlign: "right", minWidth: 150 }}>
        <div key={bpm === null ? "reading" : bpmRange(bpm)} className="fade-up" style={{ fontSize: 28, fontWeight: 700, color: zone.color, lineHeight: 1.1 }}>
          {bpm === null ? "Reading..." : bpmRange(bpm)}
        </div>
        <div style={{ color: color.muted, fontSize: 14 }}>
          {bpm === null
            ? status
            : `BPM, ${zone.label === "Calibrating" ? `learning your resting rate (${Math.round(calibration * 100)}%)` : zone.label.toLowerCase()}`}
        </div>
        <div style={{ fontSize: 13, color: bpm === null ? color.muted : SIGNAL_COLORS[signal], marginTop: 2 }}>
          {bpm === null ? "Hold still and face a light" : `${signal} signal`}
        </div>
      </div>
    </section>
  );
}
