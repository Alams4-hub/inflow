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

// The live pulse, drawn as three translucent layers of the same signal, slightly out of step,
// like light through water. Each bump is a heartbeat. Every path keeps the same shape of commands,
// so the browser can glide from one reading to the next.
function Waves({ wave, stroke }: { wave: number[]; stroke: string }) {
  const W = 1000;
  const H = 120;
  // A light 5-point smoothing, so the drawing reads as a breath rather than a jagged trace.
  const raw = resample(wave, WAVE_POINTS);
  const pts = raw.map((_, i) => {
    const near = raw.slice(Math.max(0, i - 2), i + 3);
    return near.reduce((a, b) => a + b, 0) / near.length;
  });
  const flat = pts.length < 2;
  const min = flat ? 0 : Math.min(...pts);
  const range = flat ? 1 : Math.max(...pts) - min || 1;
  const norm = (i: number) => (flat ? 0.5 : (pts[Math.min(Math.max(i, 0), WAVE_POINTS - 1)] - min) / range);
  const layer = (shift: number, amp: number, base: number, closed: boolean) => {
    const line = Array.from({ length: WAVE_POINTS }, (_, i) => {
      const x = (i / (WAVE_POINTS - 1)) * W;
      const y = base - norm(i + shift) * amp;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
    return closed ? `${line} L ${W} ${H} L 0 ${H} Z` : line;
  };
  const back = layer(-9, 50, 112, true);
  const mid = layer(5, 64, 116, true);
  const front = layer(0, 80, 118, false);
  const frontFill = `${front} L ${W} ${H} L 0 ${H} Z`;
  const pathStyle = (d: string) => ({ d: `path("${d}")` }) as CSSProperties;
  return (
    <svg className="pulse-waves" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Your live pulse">
      <path className="wave-path" d={back} fill={color.lavender} fillOpacity={0.35} style={pathStyle(back)} />
      <path className="wave-path" d={mid} fill={color.apricot} fillOpacity={0.22} style={pathStyle(mid)} />
      <path className="wave-path" d={frontFill} fill={stroke} fillOpacity={flat ? 0.04 : 0.1} style={pathStyle(frontFill)} />
      <path
        className="wave-path"
        d={front}
        fill="none"
        stroke={flat ? color.line : stroke}
        strokeOpacity={0.7}
        strokeWidth={2}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={pathStyle(front)}
      />
    </svg>
  );
}

export default function PulseStrip({ attachVideo, bpm, confidence, wave, status, baseline, calibration, coach }: Props) {
  const zone = heartZone(bpm, baseline);
  const signal = signalLabel(confidence);
  const ringColor = bpm === null ? color.line : SIGNAL_COLORS[signal];
  const coachColor = coach.tone === "stepping-in" ? color.alertInk : coach.tone === "info" ? color.muted : color.ink;
  const beatColor = zone.label === "Calibrating" ? color.tide : zone.color;
  const beating = bpm !== null;

  return (
    <section className="pulse" aria-label="InFlow live status">
      <Waves wave={wave} stroke={beatColor} />

      {/* Round camera window inside a soft halo. The halo swells once per measured heartbeat;
          the thin ring shows signal strength. */}
      <div
        className="pulse-orb"
        style={{ "--beat-duration": bpm ? `${60 / bpm}s` : "1s", "--halo": beating ? beatColor : color.lavender, "--ring": ringColor } as CSSProperties}
      >
        <span className={`pulse-halo outer${beating ? " breathing late" : ""}`} aria-hidden />
        <span className={`pulse-halo${beating ? " breathing" : ""}`} aria-hidden />
        <video ref={attachVideo} autoPlay playsInline muted className="pulse-video" />
      </div>

      <div className="pulse-voice">
        <p key={coach.text} className="pulse-line voice fade-up" style={{ color: coachColor }} aria-live="polite">
          {coach.text}
        </p>
      </div>

      <div className="pulse-reading">
        <div key={bpm === null ? "reading" : bpmRange(bpm)} className="pulse-range fade-up" style={{ color: bpm === null ? color.muted : zone.color }}>
          {bpm === null ? "Reading" : bpmRange(bpm)}
          {bpm !== null && <small>BPM</small>}
        </div>
        <div className="pulse-zone">
          <span className="zone-dot" style={{ background: bpm === null ? color.line : zone.color }} aria-hidden />
          <span>
            {bpm === null
              ? status
              : zone.label === "Calibrating"
                ? `Learning your resting rate (${Math.round(calibration * 100)}%)`
                : zone.label}
          </span>
        </div>
        <div className="pulse-signal" style={{ color: bpm !== null && signal === "Weak" ? color.high : undefined }}>
          {bpm === null ? "Hold still and face a light" : signal === "Weak" && status !== "Reading your pulse" ? status : `${signal} signal`}
        </div>
      </div>
    </section>
  );
}
