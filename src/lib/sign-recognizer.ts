/**
 * Client-only landmark capture. Recognition is supplied by language-specific trained
 * models so camera motion is never treated as a sign label.
 */
import type { HandLandmarker } from "@mediapipe/tasks-vision";

export type Landmark = { x: number; y: number; z: number };
export type Segment = Landmark[][];

let landmarkerPromise: Promise<HandLandmarker> | null = null;

export function loadLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm",
      );
      const options = {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU" as const,
        },
        numHands: 2,
        runningMode: "VIDEO" as const,
        minHandDetectionConfidence: 0.4,
        minTrackingConfidence: 0.4,
      };
      try {
        return await vision.HandLandmarker.createFromOptions(fileset, options);
      } catch {
        // Some browsers/drivers have no usable WebGL context — fall back to CPU.
        return vision.HandLandmarker.createFromOptions(fileset, {
          ...options,
          baseOptions: { ...options.baseOptions, delegate: "CPU" as const },
        });
      }
    })();
    landmarkerPromise.catch(() => {
      landmarkerPromise = null;
    });
  }
  return landmarkerPromise;
}


export function motionEnergy(a: Landmark[], b: Landmark[]) {
  let sum = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    const p = a[i]!;
    const q = b[i]!;
    sum += Math.hypot(p.x - q.x, p.y - q.y);
  }
  return sum / Math.min(a.length, b.length);
}
