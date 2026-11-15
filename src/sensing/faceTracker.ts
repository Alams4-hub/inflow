import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// A box on the video frame. All values are fractions (0 to 1) of the frame size.
export type Box = { x: number; y: number; w: number; h: number };

export type FaceReading = {
  forehead: Box;
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

      return { forehead: foreheadFromPoints(points), blendshapes };
    },
    close() {
      landmarker.close();
    },
  };
}

// The face mesh's top edge sits near the top of the forehead, and the eyebrows
// are roughly a quarter of the way down. So the forehead is a strip near the top,
// in the middle of the face.
export function foreheadFromPoints(points: { x: number; y: number }[]): Box {
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
  const faceW = maxX - minX;
  const faceH = maxY - minY;
  return {
    x: minX + faceW * 0.3,
    y: minY + faceH * 0.06,
    w: faceW * 0.4,
    h: faceH * 0.14,
  };
}