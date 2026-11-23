#!/usr/bin/env node

/**
 * Creates a review packet for a proposed sign image. This script intentionally
 * does not call an image model: an API/provider has to be explicitly selected
 * by the deployment owner, and approval is always a separate human step.
 *
 * Example:
 * node scripts/sign-asset-review.mjs --lesson asl-fingerspell-a-m --language ASL \
 *   --sign A --reference https://www.lifeprint.com/asl101/fingerspelling/abc.htm \
 *   --gesture gesture-a.json
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, token, index, all) => {
    if (!token.startsWith("--")) return pairs;
    pairs.push([token.slice(2), all[index + 1]]);
    return pairs;
  }, []),
);

const required = ["lesson", "language", "sign", "reference", "gesture"];
const missing = required.filter((key) => !args[key]);
if (missing.length || !["ASL", "ISL"].includes(args.language)) {
  console.error(
    `Usage requires ${required.map((key) => `--${key}`).join(", ")} (language: ASL or ISL).`,
  );
  process.exit(1);
}

const gesture = JSON.parse(await readFile(resolve(args.gesture), "utf8"));
const requiredGestureFields = [
  "handshape",
  "fingers",
  "thumb",
  "palmOrientation",
  "location",
  "movement",
  "dominantHand",
];
const missingGestureFields = requiredGestureFields.filter((key) => !gesture[key]);
if (missingGestureFields.length) {
  console.error(`Gesture file is missing: ${missingGestureFields.join(", ")}`);
  process.exit(1);
}

const language = args.language.toLowerCase();
const sign = args.sign.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const outputDir = resolve(args.output ?? `public/assets/signs/${language}/${args.lesson}/${sign}`);
await mkdir(outputDir, { recursive: true });

const packet = {
  lessonId: args.lesson,
  language: args.language,
  sign: args.sign,
  referenceSource: args.reference,
  referenceAsset: args["reference-asset"] ?? null,
  gesture,
  generation: {
    status: "not-generated",
    provider: null,
    prompt: `Educational ${args.language} signing reference for ${args.sign}. Preserve this verified gesture exactly: ${JSON.stringify(gesture)}. Photorealistic hands, studio lighting, plain high-contrast background, no labels, no extra fingers, no altered thumb placement.`,
  },
  verification: {
    status: "review-required",
    checklist: [
      "finger count",
      "extended/bent fingers",
      "thumb placement",
      "palm orientation",
      "wrist orientation",
      "location",
      "movement frames",
    ],
    reviewer: null,
    reviewedAt: null,
  },
  history: [{ at: new Date().toISOString(), action: "review-packet-created" }],
};

await writeFile(resolve(outputDir, "metadata.json"), `${JSON.stringify(packet, null, 2)}\n`);
console.log(`Created review packet: ${resolve(outputDir, "metadata.json")}`);
