/**
 * ONNX Runtime Web session runner for browser-side sign language inference.
 *
 * Dynamically imports onnxruntime-web to ensure safety under TanStack Start SSR.
 */

export type ModelMetadata = {
  version: string;
  schemaVersion: string;
  language: "ISL" | "ASL";
  modelType: string;
  frames: number;
  featuresPerFrame: number;
  inputShape: number[];
  inputName: string;
  outputName: string;
  numClasses: number;
  labels: string[];
  thresholds?: Record<string, number>;
  onnxUrl: string;
};

export type PredictionResult = {
  label: string;
  confidence: number;
  allProbabilities?: Record<string, number>;
};

// Cache loaded sessions and metadata
const sessionCache = new Map<string, any>();
const metadataCache = new Map<string, ModelMetadata>();

/** Fetches model metadata JSON from public/models/ */
export async function loadModelMetadata(
  metaUrl: string,
): Promise<ModelMetadata | null> {
  if (metadataCache.has(metaUrl)) {
    return metadataCache.get(metaUrl)!;
  }
  try {
    const res = await fetch(metaUrl);
    if (!res.ok) return null;
    const data = (await res.json()) as ModelMetadata;
    metadataCache.set(metaUrl, data);
    return data;
  } catch {
    return null;
  }
}

/** Loads or retrieves cached ONNX InferenceSession */
export async function loadOnnxSession(modelUrl: string): Promise<any | null> {
  if (typeof window === "undefined") return null; // Safe guard against SSR
  if (sessionCache.has(modelUrl)) {
    return sessionCache.get(modelUrl);
  }

  try {
    const ort = await import("onnxruntime-web");
    // Use WebAssembly backend with SIMD where supported
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd = true;

    const session = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ["wasm"],
    });
    sessionCache.set(modelUrl, session);
    return session;
  } catch (err) {
    console.warn(`[SignBridge ONNX] Failed to load ONNX model from ${modelUrl}:`, err);
    return null;
  }
}

/** Computes numerically stable softmax over logits */
function softmax(logits: Float32Array): Float32Array {
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < logits.length; i++) {
    if (logits[i]! > max) max = logits[i]!;
  }
  let sum = 0;
  const probs = new Float32Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    probs[i] = Math.exp(logits[i]! - max);
    sum += probs[i]!;
  }
  const invSum = 1.0 / Math.max(1e-8, sum);
  for (let i = 0; i < logits.length; i++) {
    probs[i] = probs[i]! * invSum;
  }
  return probs;
}

/**
 * Executes inference on a resampled sequence tensor (32 frames * 222 features = 7104 floats).
 */
export async function runSignInference(
  session: any,
  meta: ModelMetadata,
  sequenceData: Float32Array,
): Promise<PredictionResult | null> {
  if (!session || !meta) return null;

  try {
    const ort = await import("onnxruntime-web");
    const shape = meta.inputShape || [1, meta.frames, meta.featuresPerFrame];
    const tensor = new ort.Tensor("float32", sequenceData, shape);

    const inputKey = meta.inputName || "input";
    const outputKey = meta.outputName || "logits";

    const feeds: Record<string, any> = { [inputKey]: tensor };
    const results = await session.run(feeds);
    const outputTensor = results[outputKey];
    if (!outputTensor) return null;

    const logits = outputTensor.data as Float32Array;
    const probs = softmax(logits);

    let bestIdx = -1;
    let bestProb = -1;
    for (let i = 0; i < probs.length; i++) {
      if (probs[i]! > bestProb) {
        bestProb = probs[i]!;
        bestIdx = i;
      }
    }

    if (bestIdx < 0 || bestIdx >= meta.labels.length) return null;

    const label = meta.labels[bestIdx]!;
    const threshold = meta.thresholds?.[label] ?? 0.6;

    if (bestProb < threshold) {
      return null; // Gated out by acceptance threshold
    }

    return {
      label,
      confidence: Math.round(bestProb * 100) / 100,
    };
  } catch (err) {
    console.error("[SignBridge ONNX] Inference execution failed:", err);
    return null;
  }
}
