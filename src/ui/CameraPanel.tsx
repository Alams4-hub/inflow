import type { RefObject } from "react";
import type { SensingState } from "../sensing/useSensing";

type Props = SensingState & { videoRef: RefObject<HTMLVideoElement | null> };

// Draws the live pulse signal as a line. Each bump is a heartbeat.
function PulseWave({ wave }: { wave: number[] }) {
  if (wave.length < 2) return <div style={{ height: 48 }} />;
  const min = Math.min(...wave);
  const max = Math.max(...wave);
  const range = max - min || 1;
  const points = wave
    .map((v, i) => `${(i / (wave.length - 1)) * 300},${44 - ((v - min) / range) * 40}`)
    .join(" ");
  return (
    <svg viewBox="0 0 300 48" style={{ width: "100%", height: 48 }} aria-label="Live pulse wave">
      <polyline points={points} fill="none" stroke="#2dd4bf" strokeWidth={2} />
    </svg>
  );
}

export default function CameraPanel({ videoRef, bpm, rawBpm, confidence, wave, status, box }: Props) {
  const confident = bpm !== null && confidence >= 0.6;
  return (
    <div>
      <div style={{ position: "relative", width: "100%" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", transform: "scaleX(-1)", display: "block", borderRadius: 8 }}
        />
        {/* Forehead box. The video is mirrored, so the box is mirrored too. */}
        <div
          style={{
            position: "absolute",
            left: `${(1 - box.x - box.w) * 100}%`,
            top: `${box.y * 100}%`,
            width: `${box.w * 100}%`,
            height: `${box.h * 100}%`,
            border: `2px solid ${confident ? "#2dd4bf" : "#fbbf24"}`,
            borderRadius: 6,
          }}
        />
      </div>
      <p style={{ color: "#64748b", margin: "8px 0 0" }}>{status}</p>
      <h3 style={{ margin: "4px 0" }}>Heart rate: {bpm === null ? "measuring..." : `${bpm} BPM`}</h3>
      <PulseWave wave={wave} />
      <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
        Latest guess {rawBpm ?? "-"} BPM · confidence {Math.round(confidence * 100)}%
        {!confident && " · hold still and face a light"}
      </p>
    </div>
  );
}
