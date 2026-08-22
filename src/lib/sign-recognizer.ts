/**
 * Client-only sign recognition over a small known vocabulary.
 * MediaPipe HandLandmarker tracks the hand locally (no video ever leaves the device);
 * a segment of landmarks between movement pauses is matched by simple geometry rules.
 */
import type { HandLandmarker } from "@mediapipe/tasks-vision";

export type Landmark = { x: number; y: number; z: number };
export type Segment = Landmark[][];

export const VOCABULARY = [
  "HELLO",
  "THANK YOU",
  "PLEASE",
  "YES",
  "NO",
  "YOU",
  "GOOD",
  "SORRY",
  "HELP",
] as const;

let landmarkerPromise: Promise<HandLandmarker> | null = null;

export function loadLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm",
      );
      return vision.HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        },
        numHands: 1,
        runningMode: "VIDEO",
      });
    })();
  }
  return landmarkerPromise;
}

const TIPS = [8, 12, 16, 20];
const PIPS = [6, 10, 14, 18];

function extendedFingers(frame: Landmark[]) {
  let count = 0;
  for (let i = 0; i < TIPS.length; i += 1) {
    const tip = frame[TIPS[i]!];
    const pip = frame[PIPS[i]!];
    if (tip && pip && tip.y < pip.y - 0.02) count += 1;
  }
  return count;
}

function thumbUp(frame: Landmark[]) {
  const tip = frame[4];
  const mcp = frame[2];
  return !!tip && !!mcp && tip.y < mcp.y - 0.05;
}

function centroid(frame: Landmark[]) {
  let x = 0;
  let y = 0;
  for (const p of frame) {
    x += p.x;
    y += p.y;
  }
  return { x: x / frame.length, y: y / frame.length };
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

/** Match a buffered segment against the vocabulary. Returns null when nothing is confident. */
export function classifySegment(segment: Segment): { label: string; confidence: number } | null {
  if (segment.length < 5) return null;
  const first = segment[0]!;
  const last = segment[segment.length - 1]!;
  const mid = segment[Math.floor(segment.length / 2)]!;

  const startC = centroid(first);
  const endC = centroid(last);
  const dy = endC.y - startC.y;
  const dx = endC.x - startC.x;

  const fingersStart = extendedFingers(first);
  const fingersMid = extendedFingers(mid);
  const fingersEnd = extendedFingers(last);
  const openish = (fingersStart + fingersMid + fingersEnd) / 3;

  let horizontalSwings = 0;
  let prevDir = 0;
  for (let i = 1; i < segment.length; i += 1) {
    const d = centroid(segment[i]!).x - centroid(segment[i - 1]!).x;
    const dir = d > 0.004 ? 1 : d < -0.004 ? -1 : 0;
    if (dir !== 0 && prevDir !== 0 && dir !== prevDir) horizontalSwings += 1;
    if (dir !== 0) prevDir = dir;
  }

  const high = startC.y < 0.45;

  const score = (base: number) => Math.min(0.97, base + Math.min(segment.length, 25) / 250);

  // Flat hand starting at chin/mouth height and moving down + out -> THANK YOU
  if (openish > 3.2 && high && dy > 0.06) return { label: "THANK YOU", confidence: score(0.72) };
  // Open hand high with a side-to-side wave -> HELLO
  if (openish > 3.2 && high && horizontalSwings >= 2) return { label: "HELLO", confidence: score(0.75) };
  // Open hand low, circular / small motion on the chest -> PLEASE
  if (openish > 3.2 && !high && Math.abs(dy) < 0.08 && Math.abs(dx) < 0.1)
    return { label: "PLEASE", confidence: score(0.66) };
  // Fist bobbing up and down -> YES
  if (openish < 0.8 && !thumbUp(last) && Math.abs(dy) > 0.03)
    return { label: "YES", confidence: score(0.68) };
  // Thumbs up -> GOOD
  if (openish < 0.8 && thumbUp(last)) return { label: "GOOD", confidence: score(0.7) };
  // Fist circling on the chest -> SORRY
  if (openish < 0.8 && Math.abs(dy) <= 0.03) return { label: "SORRY", confidence: score(0.64) };
  // Index + middle closing onto the thumb -> NO
  if (openish >= 1.5 && openish <= 2.6 && fingersEnd < fingersStart)
    return { label: "NO", confidence: score(0.65) };
  // Single index finger pointing forward -> YOU
  if (openish >= 0.8 && openish < 1.6) return { label: "YOU", confidence: score(0.66) };
  // Flat hand lifting a thumbs-up fist -> HELP
  if (openish > 2.6 && dy < -0.06) return { label: "HELP", confidence: score(0.63) };

  return null;
}
