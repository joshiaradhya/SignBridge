import type { Segment } from "./sign-recognizer";

const MODEL_URL = "/models/isl-v1.json";
const FRAMES = 32;
const LANDMARKS_PER_FRAME = 42;

type BrowserModel = {
  version: string;
  language: "ISL";
  frames: number;
  landmarksPerFrame: number;
  labels: string[];
  centroids: number[][];
  thresholds?: Record<string, number>;
};

let modelPromise: Promise<BrowserModel | null> | null = null;

/** Loads the small, locally-hosted ISL classifier produced by ml/train_isl.py. */
export function loadIslModel() {
  if (!modelPromise) {
    modelPromise = fetch(MODEL_URL)
      .then((response) => (response.ok ? response.json() : null))
      .then((model: BrowserModel | null) =>
        model?.language === "ISL" && model.centroids.length === model.labels.length ? model : null,
      )
      .catch(() => null);
  }
  return modelPromise;
}

function normaliseFrame(frame: Segment[number]) {
  const points = frame.slice(0, LANDMARKS_PER_FRAME);
  const wrist = points[0] ?? { x: 0, y: 0, z: 0 };
  const scale = Math.max(
    0.05,
    ...points.map((point) => Math.hypot(point.x - wrist.x, point.y - wrist.y, point.z - wrist.z)),
  );
  const values: number[] = [];
  for (let i = 0; i < LANDMARKS_PER_FRAME; i += 1) {
    const point = points[i];
    values.push(
      point ? (point.x - wrist.x) / scale : 0,
      point ? (point.y - wrist.y) / scale : 0,
      point ? (point.z - wrist.z) / scale : 0,
    );
  }
  return values;
}

/** Matches training and browser preprocessing: 32 normalised hand-landmark frames. */
export function vectoriseSegment(segment: Segment, frames = FRAMES) {
  if (!segment.length) return [];
  const vector: number[] = [];
  for (let i = 0; i < frames; i += 1) {
    const source = segment[Math.min(segment.length - 1, Math.round((i * (segment.length - 1)) / Math.max(1, frames - 1)))]!;
    vector.push(...normaliseFrame(source));
  }
  return vector;
}

function cosineDistance(a: number[], b: number[]) {
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    dot += a[i]! * b[i]!;
    aNorm += a[i]! ** 2;
    bNorm += b[i]! ** 2;
  }
  return 1 - dot / Math.max(1e-8, Math.sqrt(aNorm * bNorm));
}

export async function classifyIslSegment(segment: Segment) {
  const model = await loadIslModel();
  if (!model || segment.length < 8) return null;

  const vector = vectoriseSegment(segment, model.frames);
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  model.centroids.forEach((centroid, index) => {
    const distance = cosineDistance(vector, centroid);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  if (bestIndex < 0) return null;

  const label = model.labels[bestIndex]!;
  const confidence = Math.max(0, Math.min(0.99, 1 - bestDistance));
  const threshold = model.thresholds?.[label] ?? 0.7;
  return confidence >= threshold ? { label, confidence } : null;
}
