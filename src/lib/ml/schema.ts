/**
 * Shared, versioned feature schema for SignBridge ML pipelines (TypeScript).
 *
 * Must strictly match ml/signbridge/schema.py.
 */

export const SCHEMA_VERSION = "2.0.0";
export const NUM_FRAMES = 32;

export const NUM_HAND_LANDMARKS = 21;
export const NUM_POSE_LANDMARKS = 12;
export const NUM_FACE_LANDMARKS = 20;
export const TOTAL_LANDMARKS = NUM_HAND_LANDMARKS * 2 + NUM_POSE_LANDMARKS + NUM_FACE_LANDMARKS; // 74
export const COORDS_PER_LANDMARK = 3;
export const FEATURES_PER_FRAME = TOTAL_LANDMARKS * COORDS_PER_LANDMARK; // 222
export const TOTAL_FEATURE_DIM = NUM_FRAMES * FEATURES_PER_FRAME; // 7104

/** MediaPipe Pose landmark indices to keep (upper body & torso reference) */
export const POSE_LANDMARK_INDICES = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 23, 24] as const;

/** MediaPipe Face Mesh landmark indices to keep (non-manual grammatical markers) */
export const FACE_BROW_INDICES = [70, 63, 105, 300, 293, 336] as const;
export const FACE_EYE_INDICES = [159, 145, 386, 374] as const;
export const FACE_NOSE_INDICES = [1, 168] as const;
export const FACE_MOUTH_INDICES = [0, 17, 61, 291, 37, 267, 84, 314] as const;

export const FACE_LANDMARK_INDICES = [
  ...FACE_BROW_INDICES,
  ...FACE_EYE_INDICES,
  ...FACE_NOSE_INDICES,
  ...FACE_MOUTH_INDICES,
] as const;

export type Point3D = { x: number; y: number; z: number };

export type RawFrameLandmarks = {
  leftHand?: Point3D[] | null;
  rightHand?: Point3D[] | null;
  pose?: Point3D[] | null;
  face?: Point3D[] | null;
};

/**
 * Normalizes a single frame of landmarks into a 222-element Float32Array.
 * Matches ml/signbridge/schema.py normalize_frame_landmarks.
 */
export function normalizeFrame(raw: RawFrameLandmarks): Float32Array {
  const result = new Float32Array(FEATURES_PER_FRAME);
  const points: Point3D[] = new Array(TOTAL_LANDMARKS);

  // Initialize with zeros
  for (let i = 0; i < TOTAL_LANDMARKS; i++) {
    points[i] = { x: 0, y: 0, z: 0 };
  }

  // 1. Left Hand (0..20)
  if (raw.leftHand && raw.leftHand.length >= NUM_HAND_LANDMARKS) {
    for (let i = 0; i < NUM_HAND_LANDMARKS; i++) {
      points[i] = raw.leftHand[i] ?? { x: 0, y: 0, z: 0 };
    }
  }

  // 2. Right Hand (21..41)
  if (raw.rightHand && raw.rightHand.length >= NUM_HAND_LANDMARKS) {
    for (let i = 0; i < NUM_HAND_LANDMARKS; i++) {
      points[NUM_HAND_LANDMARKS + i] = raw.rightHand[i] ?? { x: 0, y: 0, z: 0 };
    }
  }

  // 3. Upper Pose (42..53)
  if (raw.pose && raw.pose.length > 0) {
    for (let i = 0; i < POSE_LANDMARK_INDICES.length; i++) {
      const idx = POSE_LANDMARK_INDICES[i]!;
      points[NUM_HAND_LANDMARKS * 2 + i] = raw.pose[idx] ?? { x: 0, y: 0, z: 0 };
    }
  }

  // 4. Face (54..73)
  if (raw.face && raw.face.length > 0) {
    for (let i = 0; i < FACE_LANDMARK_INDICES.length; i++) {
      const idx = FACE_LANDMARK_INDICES[i]!;
      points[NUM_HAND_LANDMARKS * 2 + NUM_POSE_LANDMARKS + i] = raw.face[idx] ?? {
        x: 0,
        y: 0,
        z: 0,
      };
    }
  }

  // Determine origin and scale
  // Pose left_shoulder is index 42, right_shoulder is index 43
  const leftShoulder = points[42]!;
  const rightShoulder = points[43]!;
  const hasLeftShoulder = leftShoulder.x !== 0 || leftShoulder.y !== 0 || leftShoulder.z !== 0;
  const hasRightShoulder = rightShoulder.x !== 0 || rightShoulder.y !== 0 || rightShoulder.z !== 0;

  let originX = 0;
  let originY = 0;
  let originZ = 0;
  let scale = 0.05;

  if (hasLeftShoulder && hasRightShoulder) {
    originX = (leftShoulder.x + rightShoulder.x) / 2;
    originY = (leftShoulder.y + rightShoulder.y) / 2;
    originZ = (leftShoulder.z + rightShoulder.z) / 2;
    const dist = Math.hypot(
      leftShoulder.x - rightShoulder.x,
      leftShoulder.y - rightShoulder.y,
      leftShoulder.z - rightShoulder.z,
    );
    scale = Math.max(0.1, dist);
  } else {
    // Fallback to wrist
    let wrist: Point3D | null = null;
    const leftWrist = points[0]!;
    const rightWrist = points[21]!;
    if (leftWrist.x !== 0 || leftWrist.y !== 0 || leftWrist.z !== 0) {
      wrist = leftWrist;
    } else if (rightWrist.x !== 0 || rightWrist.y !== 0 || rightWrist.z !== 0) {
      wrist = rightWrist;
    }

    if (!wrist) {
      return result; // Empty frame
    }

    originX = wrist.x;
    originY = wrist.y;
    originZ = wrist.z;

    let maxDist = 0.05;
    for (let i = 0; i < TOTAL_LANDMARKS; i++) {
      const p = points[i]!;
      if (p.x !== 0 || p.y !== 0 || p.z !== 0) {
        const d = Math.hypot(p.x - originX, p.y - originY, p.z - originZ);
        if (d > maxDist) maxDist = d;
      }
    }
    scale = Math.max(0.05, maxDist);
  }

  // Populate normalized coordinates
  for (let i = 0; i < TOTAL_LANDMARKS; i++) {
    const p = points[i]!;
    if (p.x !== 0 || p.y !== 0 || p.z !== 0) {
      const base = i * COORDS_PER_LANDMARK;
      result[base] = (p.x - originX) / scale;
      result[base + 1] = (p.y - originY) / scale;
      result[base + 2] = (p.z - originZ) / scale;
    }
  }

  return result;
}

/**
 * Resamples a sequence of normalized frames to exactly NUM_FRAMES (32)
 * and returns a flattened Float32Array of length 7104.
 */
export function resampleSequence(frames: Float32Array[], targetFrames = NUM_FRAMES): Float32Array {
  const result = new Float32Array(targetFrames * FEATURES_PER_FRAME);
  if (frames.length === 0) return result;

  const n = frames.length;
  for (let i = 0; i < targetFrames; i++) {
    const srcIdx = Math.min(n - 1, Math.round((i * (n - 1)) / Math.max(1, targetFrames - 1)));
    const srcFrame = frames[srcIdx]!;
    result.set(srcFrame, i * FEATURES_PER_FRAME);
  }
  return result;
}
