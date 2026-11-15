import { useEffect, useRef, useState } from "react";
import { estimateBpm, type Sample } from "./sensing/heartRate";
import { createFaceTracker, lockBox, type Box } from "./sensing/faceTracker";
import { BpmSmoother } from "./sensing/bpmSmoother";

// Used only if face tracking fails to load: a fixed box where the forehead usually is.
const FALLBACK_BOX: Box = { x: 0.4, y: 0.18, w: 0.2, h: 0.12 };
const WINDOW_MS = 12_000; // use the last 12 seconds of video

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [bpm, setBpm] = useState<number | null>(null);
  const [quality, setQuality] = useState(0);
  const [box, setBox] = useState<Box>(FALLBACK_BOX);
  const [status, setStatus] = useState("Loading face tracking...");

  useEffect(() => {
    let stream: MediaStream | undefined;
    let frameId = 0;
    let lastEstimate = 0;
    let stopped = false;
    let tracker: Awaited<ReturnType<typeof createFaceTracker>> | null = null;
    let roi: Box = FALLBACK_BOX;
    const samples: Sample[] = [];
    const smoother = new BpmSmoother();

    // Small hidden canvas used to read pixel colors from the forehead box.
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 16;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const loop = () => {
      const video = videoRef.current;
      if (ctx && video && video.readyState >= 2) {
        let faceFound = true;

        if (tracker) {
          const face = tracker.detect(video);
          if (face) {
            roi = lockBox(roi, face.forehead);
            setStatus("Tracking your face");
          } else {
            faceFound = false;
            setStatus("No face found. Look at the camera.");
          }
        }

        if (faceFound) {
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          ctx.drawImage(video, roi.x * vw, roi.y * vh, roi.w * vw, roi.h * vh, 0, 0, canvas.width, canvas.height);

          // Average red, green, and blue of the forehead box (pixels are stored as R,G,B,A).
          const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let red = 0;
          let green = 0;
          let blue = 0;
          for (let i = 0; i < data.length; i += 4) {
            red += data[i];
            green += data[i + 1];
            blue += data[i + 2];
          }
          const pixels = data.length / 4;

          const now = performance.now();
          samples.push({ t: now, r: red / pixels, g: green / pixels, b: blue / pixels });
          while (samples.length > 0 && now - samples[0].t > WINDOW_MS) samples.shift();

          // Update the estimate (and the box drawn on screen) once per second.
          if (now - lastEstimate > 1000) {
            lastEstimate = now;
            setBox(roi);
            const result = estimateBpm(samples);
            if (result) {
              const steady = smoother.push(result.bpm, result.quality);
              if (steady !== null) setBpm(steady);
              setQuality(result.quality);
            }
          }
        }
      }
      frameId = requestAnimationFrame(loop);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        frameId = requestAnimationFrame(loop);
      })
      .catch(console.error);

    createFaceTracker()
      .then((t) => {
        if (stopped) t.close();
        else tracker = t;
      })
      .catch((err) => {
        console.error(err);
        setStatus("Face tracking failed. Put your forehead in the box.");
      });

    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((t) => t.stop());
      tracker?.close();
    };
  }, []);

  const goodSignal = quality >= 0.4;

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <div style={{ position: "relative", width: 480 }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", transform: "scaleX(-1)", display: "block" }}
        />
        {/* Forehead box. The video is mirrored, so the box is mirrored too. */}
        <div
          style={{
            position: "absolute",
            left: `${(1 - box.x - box.w) * 100}%`,
            top: `${box.y * 100}%`,
            width: `${box.w * 100}%`,
            height: `${box.h * 100}%`,
            border: `2px solid ${goodSignal ? "#2dd4bf" : "#fbbf24"}`,
            borderRadius: 6,
          }}
        />
      </div>
      <p style={{ color: "#64748b" }}>{status}</p>
      <h2>Heart rate: {bpm ?? "measuring..."} {bpm !== null && "BPM"}</h2>
      <p>
        {bpm === null
          ? "Hold still for about 10 seconds."
          : goodSignal
            ? `Signal good (${quality.toFixed(2)})`
            : `Weak signal (${quality.toFixed(2)}): hold still and face a light`}
      </p>
    </div>
  );
}
