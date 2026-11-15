import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// A box on the video frame. All values are fractions (0 to 1) of the frame size.
export type Box = { x: number; y: number; w: number; h: number };

export type FaceReading = {
  regions: Box[]; // skin areas to read the pulse from: forehead, left cheek, right cheek
  blendshapes: Record<string, number>; // e.g. browDownLeft: 0.42 (used later for tension)
};

// Must match the installed @mediapipe/tasks-vision version.
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export async function createFaceTracker() {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  const landmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: true,
  });

  let lastTime = 0;

  return {
    detect(video: HTMLVideoElement): FaceReading | null {
      // MediaPipe needs timestamps that always go up.
      const now = Math.max(performance.now(), lastTime + 1);
      lastTime = now;

      const result = landmarker.detectForVideo(video, now);
      const points = result.faceLandmarks[0];
      if (!points || points.length === 0) return null;

      const blendshapes: Record<string, number> = {};
      for (const c of result.faceBlendshapes[0]?.categories ?? []) {
        blendshapes[c.categoryName] = c.score;
      }

      return { regions: skinRegionsFromPoints(points), blendshapes };
    },
    close() {
      landmarker.close();
    },
  };
}

type Bounds = { minX: number; minY: number; faceW: number; faceH: number };

function faceBounds(points: { x: number; y: number }[]): Bounds {
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, faceW: maxX - minX, faceH: maxY - minY };
}

// The face mesh's top edge sits near the top of the forehead, and the eyebrows
// are roughly a quarter of the way down. So the forehead is a strip near the top,
// in the middle of the face.
export function foreheadFromPoints(points: { x: number; y: number }[]): Box {
  const { minX, minY, faceW, faceH } = faceBounds(points);
  return { x: minX + faceW * 0.3, y: minY + faceH * 0.06, w: faceW * 0.4, h: faceH * 0.14 };
}

// Cheeks sit below the eyes and to the sides of the nose (about halfway down the face).
// Reading cheeks as well as the forehead gives much more skin, so a stronger pulse signal,
// and still works when a hat or hair covers the forehead.
export function skinRegionsFromPoints(points: { x: number; y: number }[]): Box[] {
  const { minX, minY, faceW, faceH } = faceBounds(points);
  const cheekY = minY + faceH * 0.52;
  const cheekH = faceH * 0.16;
  const cheekW = faceW * 0.22;
  return [
    foreheadFromPoints(points),
    { x: minX + faceW * 0.12, y: cheekY, w: cheekW, h: cheekH },
    { x: minX + faceW * 0.66, y: cheekY, w: cheekW, h: cheekH },
  ];
}

// Keep the box locked in place unless the head really moved.
// Tiny box shifts every frame change the pixels and add fake rhythm to the signal.
export function lockBox(current: Box, detected: Box): Box {
  const dx = detected.x + detected.w / 2 - (current.x + current.w / 2);
  const dy = detected.y + detected.h / 2 - (current.y + current.h / 2);
  const moved = Math.hypot(dx, dy) > 0.03;
  const resized = Math.abs(detected.w - current.w) / current.w > 0.15;
  return moved || resized ? detected : current;
}
