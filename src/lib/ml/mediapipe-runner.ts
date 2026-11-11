/**
 * MediaPipe Tasks Vision browser runner for synchronized Hands, Pose, and Face landmarker extraction.
 */

import {
  normalizeFrame,
  type Point3D,
  type RawFrameLandmarks,
} from "./schema";

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const HAND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export type MultiLandmarker = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestampMs: number,
  ) => Float32Array;
  close: () => void;
};

let landmarkerPromise: Promise<MultiLandmarker | null> | null = null;

export function loadMultiLandmarker(): Promise<MultiLandmarker | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_CDN);

        const makeOpts = (modelPath: string) => ({
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: "GPU" as const,
          },
          runningMode: "VIDEO" as const,
        });

        // Initialize hand landmarker
        let handLandmarker: any;
        try {
          handLandmarker = await vision.HandLandmarker.createFromOptions(
            fileset,
            { ...makeOpts(HAND_MODEL), numHands: 2, minHandDetectionConfidence: 0.4 },
          );
        } catch {
          handLandmarker = await vision.HandLandmarker.createFromOptions(
            fileset,
            {
              ...makeOpts(HAND_MODEL),
              baseOptions: { modelAssetPath: HAND_MODEL, delegate: "CPU" as const },
              numHands: 2,
              minHandDetectionConfidence: 0.4,
            },
          );
        }

        // Initialize pose landmarker
        let poseLandmarker: any = null;
        try {
          poseLandmarker = await vision.PoseLandmarker.createFromOptions(
            fileset,
            { ...makeOpts(POSE_MODEL), minPoseDetectionConfidence: 0.4 },
          );
        } catch {
          // Pose optional if network / GPU restricted
          console.warn("[MediaPipe] Pose landmarker initialization fell back.");
        }

        // Initialize face landmarker
        let faceLandmarker: any = null;
        try {
          faceLandmarker = await vision.FaceLandmarker.createFromOptions(
            fileset,
            { ...makeOpts(FACE_MODEL), numFaces: 1, minFaceDetectionConfidence: 0.4 },
          );
        } catch {
          console.warn("[MediaPipe] Face landmarker initialization fell back.");
        }

        return {
          detectForVideo: (video: HTMLVideoElement, timestampMs: number) => {
            const raw: RawFrameLandmarks = {};

            // 1. Hands
            if (handLandmarker && video.videoWidth > 0) {
              const res = handLandmarker.detectForVideo(video, timestampMs);
              if (res && res.landmarks && res.landmarks.length > 0) {
                // Determine left vs right by handedness
                for (let h = 0; h < res.landmarks.length; h++) {
                  const category = res.handedness?.[h]?.[0]?.categoryName;
                  if (category === "Left") {
                    raw.leftHand = res.landmarks[h] as Point3D[];
                  } else {
                    raw.rightHand = res.landmarks[h] as Point3D[];
                  }
                }
                // Fallback: if handedness missing, assign index 0 to left, 1 to right
                if (!raw.leftHand && !raw.rightHand) {
                  raw.leftHand = res.landmarks[0] as Point3D[];
                  if (res.landmarks.length > 1) {
                    raw.rightHand = res.landmarks[1] as Point3D[];
                  }
                }
              }
            }

            // 2. Pose
            if (poseLandmarker && video.videoWidth > 0) {
              try {
                const pRes = poseLandmarker.detectForVideo(video, timestampMs);
                if (pRes && pRes.landmarks && pRes.landmarks[0]) {
                  raw.pose = pRes.landmarks[0] as Point3D[];
                }
              } catch {
                // Ignore transient frame timestamp skips
              }
            }

            // 3. Face
            if (faceLandmarker && video.videoWidth > 0) {
              try {
                const fRes = faceLandmarker.detectForVideo(video, timestampMs);
                if (fRes && fRes.faceLandmarks && fRes.faceLandmarks[0]) {
                  raw.face = fRes.faceLandmarks[0] as Point3D[];
                }
              } catch {
                // Ignore transient frame skips
              }
            }

            return normalizeFrame(raw);
          },
          close: () => {
            handLandmarker?.close();
            poseLandmarker?.close();
            faceLandmarker?.close();
          },
        };
      } catch (e) {
        console.error("[MediaPipe] Failed to initialize vision tasks:", e);
        return null;
      }
    })();
    landmarkerPromise.catch(() => {
      landmarkerPromise = null;
    });
  }
  return landmarkerPromise;
}
