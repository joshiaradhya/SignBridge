/**
 * Unified Sign Language Classifier for SignBridge.
 *
 * Coordinates ONNX Runtime Web model loading, feature sequence normalization,
 * language-specific routing (ISL vs ASL), and seamless fallback to the legacy
 * centroid model if the ONNX binary has not yet been exported.
 */

import { resampleSequence } from "./schema";
import {
  loadModelMetadata,
  loadOnnxSession,
  runSignInference,
  type ModelMetadata,
  type PredictionResult,
} from "./onnx-runner";
import { classifyIslSegment } from "../isl-model";
import type { Segment } from "../sign-recognizer";

export type SupportedLanguage = "ISL" | "ASL";

const MODEL_CONFIGS: Record<SupportedLanguage, { metaUrl: string; fallbackUrl?: string }> = {
  ISL: {
    metaUrl: "/models/isl-metadata.json",
    fallbackUrl: "/models/isl-v1.json",
  },
  ASL: {
    metaUrl: "/models/asl-metadata.json",
  },
};

/**
 * Checks model availability in public/models/
 */
export async function getModelStatus(): Promise<{
  islOnnx: boolean;
  aslOnnx: boolean;
  islLegacy: boolean;
}> {
  const [islMeta, aslMeta, islLegacy] = await Promise.all([
    loadModelMetadata(MODEL_CONFIGS.ISL.metaUrl),
    loadModelMetadata(MODEL_CONFIGS.ASL.metaUrl),
    fetch(MODEL_CONFIGS.ISL.fallbackUrl || "")
      .then((r) => r.ok)
      .catch(() => false),
  ]);

  return {
    islOnnx: !!islMeta,
    aslOnnx: !!aslMeta,
    islLegacy,
  };
}

/**
 * Classifies a sequence of recorded normalized frames for either ISL or ASL.
 *
 * @param language "ISL" or "ASL"
 * @param normalizedFrames Array of 222-float arrays recorded during gesture
 * @param legacyHandSegment Optional hand landmark frames for legacy centroid fallback
 */
export async function classifySignAttempt(
  language: SupportedLanguage,
  normalizedFrames: Float32Array[],
  legacyHandSegment?: Segment,
): Promise<PredictionResult | null> {
  const config = MODEL_CONFIGS[language];
  if (!config) return null;

  // 1. Try modern BiLSTM ONNX model
  try {
    const meta = await loadModelMetadata(config.metaUrl);
    if (meta) {
      const session = await loadOnnxSession(meta.onnxUrl);
      if (session && normalizedFrames.length >= 8) {
        const sequenceVector = resampleSequence(normalizedFrames, meta.frames || 32);
        const onnxResult = await runSignInference(session, meta, sequenceVector);
        if (onnxResult) {
          return onnxResult;
        }
      }
    }
  } catch (err) {
    console.warn(`[SignClassifier] ONNX inference attempt failed for ${language}:`, err);
  }

  // 2. Fallback: If ISL and legacy centroid model exists
  if (language === "ISL" && legacyHandSegment && legacyHandSegment.length >= 8) {
    const legacyResult = await classifyIslSegment(legacyHandSegment);
    if (legacyResult) {
      return {
        label: legacyResult.label,
        confidence: legacyResult.confidence,
      };
    }
  }

  return null;
}
