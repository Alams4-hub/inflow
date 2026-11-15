import { useCallback, useEffect, useRef, useState } from "react";
import { estimateBpm, type Sample } from "./heartRate";
import { createFaceTracker, lockBox, type Box } from "./faceTracker";
import { BpmSmoother } from "./bpmSmoother";
import { Baseline } from "../engine/baseline";

// Used only if face tracking fails to load: a fixed box where the forehead usually is.
const FALLBACK_REGIONS: Box[] = [{ x: 0.4, y: 0.18, w: 0.2, h: 0.12 }];
const REGION_PX_W = 32; // each skin region is shrunk to 32x16 pixels before averaging
const REGION_PX_H = 16;
const WINDOW_MS = 12_000; // use the last 12 seconds of video

export type BpmPoint = { t: number; bpm: number }; // t = Date.now() time

export type SensingState = {
  bpm: number | null; // steady heart rate (null until readings agree)
  rawBpm: number | null; // latest one-second guess
  confidence: number; // 0 to 1: how much recent guesses agree
  wave: number[]; // cleaned pulse signal for the live waveform
  history: BpmPoint[]; // steady heart rate once per second, for the session report
  baseline: number | null; // resting heart rate, learned in the first ~20 good seconds
  calibration: number; // 0 to 1 progress toward knowing the resting heart rate
  status: string;
  regions: Box[]; // skin areas being read (drawn as boxes on the video)
};

const MAX_HISTORY = 60 * 60; // keep up to one hour of readings

// Runs the camera, face tracking, and heart-rate estimation.
// Returns `attachVideo` to put on a <video> element, plus the latest readings.
// The camera keeps running even if the video element moves to a different screen.
export function useSensing() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) el.srcObject = streamRef.current;
  }, []);
  const [state, setState] = useState<SensingState>({
    bpm: null,
    rawBpm: null,
    confidence: 0,
    wave: [],
    history: [],
    baseline: null,
    calibration: 0,
    status: "Loading face tracking...",
    regions: FALLBACK_REGIONS,
  });

  useEffect(() => {
    let stream: MediaStream | undefined;
    let frameId = 0;
    let lastEstimate = 0;
    let lastDetect = 0;
    let lastVideoTime = -1;
    let stopped = false;
    let errorShown = false;
    let tracker: Awaited<ReturnType<typeof createFaceTracker>> | null = null;
    let regions: Box[] = FALLBACK_REGIONS;
    let faceVisible = true;
    const samples: Sample[] = [];
    const smoother = new BpmSmoother();
    const baseline = new Baseline();

    const update = (patch: Partial<SensingState>) => setState((s) => ({ ...s, ...patch }));
    let lastStatus = "";
    // Only update the status text when it actually changes (avoids extra re-renders).
    const showStatus = (text: string) => {
      if (text !== lastStatus) {
        lastStatus = text;
        update({ status: text });
      }
    };

    // Small hidden canvas used to read pixel colors. Each skin region gets its own strip.
    const canvas = document.createElement("canvas");
    canvas.width = REGION_PX_W;
    canvas.height = REGION_PX_H * 3;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const step = () => {
      const video = videoRef.current;
      if (!ctx || !video || video.readyState < 2) return;
      const now = performance.now();

      // Only sample when the camera has produced a new frame (about 30 times a second).
      const newFrame = video.currentTime !== lastVideoTime;
      lastVideoTime = video.currentTime;

      // Face tracking is expensive, so run it about 6 times a second, not every frame.
      if (tracker && now - lastDetect > 150) {
        lastDetect = now;
        const face = tracker.detect(video);
        faceVisible = face !== null;
        if (face) {
          // Keep all boxes still unless the head really moved (checked using the forehead box).
          const moved = lockBox(regions[0], face.regions[0]) !== regions[0];
          if (moved || regions.length !== face.regions.length) regions = face.regions;
        }
        showStatus(face ? "Reading your pulse" : "Can't see your face. Look at the camera.");
      }

      if (!newFrame || !faceVisible) return;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      regions.forEach((r, i) => {
        ctx.drawImage(video, r.x * vw, r.y * vh, r.w * vw, r.h * vh, 0, i * REGION_PX_H, REGION_PX_W, REGION_PX_H);
      });

      // Average red, green, and blue over all skin regions (pixels are stored as R,G,B,A).
      const { data } = ctx.getImageData(0, 0, REGION_PX_W, REGION_PX_H * regions.length);
      let red = 0;
      let green = 0;
      let blue = 0;
      for (let i = 0; i < data.length; i += 4) {
        red += data[i];
        green += data[i + 1];
        blue += data[i + 2];
      }
      const pixels = data.length / 4;
      samples.push({ t: now, r: red / pixels, g: green / pixels, b: blue / pixels });
      while (samples.length > 0 && now - samples[0].t > WINDOW_MS) samples.shift();

      // Update the estimate (and the box drawn on screen) once per second.
      if (now - lastEstimate > 1000) {
        lastEstimate = now;
        const result = estimateBpm(samples);
        if (result) {
          const steady = smoother.push(result.bpm);
          if (steady.bpm !== null) baseline.add(steady.bpm);
          const wave = result.wave.slice(5, -3).slice(-150); // about the last 5 seconds, without the edges
          setState((s) => ({
            ...s,
            baseline: baseline.get(),
            calibration: baseline.progress(),
            regions,
            bpm: steady.bpm,
            rawBpm: result.bpm,
            confidence: steady.confidence,
            wave,
            history:
              steady.bpm === null
                ? s.history
                : [...s.history, { t: Date.now(), bpm: steady.bpm }].slice(-MAX_HISTORY),
          }));
        } else {
          update({ regions });
        }
      }
    };

    const loop = () => {
      // Schedule the next frame first, so one error can't stop the whole loop.
      frameId = requestAnimationFrame(loop);
      try {
        step();
      } catch (err) {
        if (!errorShown) {
          errorShown = true;
          console.error("InFlow sensing error:", err);
          showStatus("Something went wrong. Check the console.");
        }
      }
    };

    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((s) => {
        stream = s;
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        frameId = requestAnimationFrame(loop);
      })
      .catch((err: unknown) => {
        console.error(err);
        showStatus("InFlow needs your camera. Allow it and refresh.");
      });

    createFaceTracker()
      .then((t) => {
        if (stopped) t.close();
        else tracker = t;
      })
      .catch((err: unknown) => {
        console.error(err);
        showStatus("Face tracking didn't load. Sit centered, facing the camera.");
      });

    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((t) => t.stop());
      tracker?.close();
    };
  }, []);

  return { attachVideo, ...state };
}
