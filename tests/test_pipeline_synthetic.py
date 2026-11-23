"""Synthetic end-to-end test for SignBridge ML pipeline without heavy external dependencies."""

import json
import unittest
from pathlib import Path

from ml.signbridge.schema import (
    FEATURES_PER_FRAME,
    NUM_FRAMES,
    SCHEMA_METADATA,
    SCHEMA_VERSION,
    TOTAL_FEATURE_DIM,
    TOTAL_LANDMARKS,
    normalize_frame_landmarks,
    resample_sequence,
)
from ml.signbridge.datasets.manifest import (
    DatasetManifest,
    ManifestItem,
    create_signer_independent_splits,
    verify_signer_isolation,
)


class TestPipelineSynthetic(unittest.TestCase):
    def test_schema_metadata_matches_public_models(self):
        root = Path(__file__).parent.parent
        isl_meta_path = root / "public" / "models" / "isl-metadata.json"
        asl_meta_path = root / "public" / "models" / "asl-metadata.json"

        self.assertTrue(isl_meta_path.exists(), "isl-metadata.json must exist in public/models/")
        self.assertTrue(asl_meta_path.exists(), "asl-metadata.json must exist in public/models/")

        with open(isl_meta_path, "r", encoding="utf-8") as f:
            isl_meta = json.load(f)

        with open(asl_meta_path, "r", encoding="utf-8") as f:
            asl_meta = json.load(f)

        # Check that metadata parameters match Schema v2.0.0
        self.assertEqual(isl_meta["schemaVersion"], SCHEMA_VERSION)
        self.assertEqual(isl_meta["frames"], NUM_FRAMES)
        self.assertEqual(isl_meta["featuresPerFrame"], FEATURES_PER_FRAME)
        self.assertEqual(isl_meta["inputShape"], [1, NUM_FRAMES, FEATURES_PER_FRAME])
        self.assertEqual(isl_meta["language"], "ISL")
        self.assertEqual(len(isl_meta["labels"]), 50)

        self.assertEqual(asl_meta["schemaVersion"], SCHEMA_VERSION)
        self.assertEqual(asl_meta["frames"], NUM_FRAMES)
        self.assertEqual(asl_meta["featuresPerFrame"], FEATURES_PER_FRAME)
        self.assertEqual(asl_meta["inputShape"], [1, NUM_FRAMES, FEATURES_PER_FRAME])
        self.assertEqual(asl_meta["language"], "ASL")
        self.assertEqual(len(asl_meta["labels"]), 40)

    def test_synthetic_end_to_end_normalization_and_manifest(self):
        # 1. Simulate 4 signers performing signs
        items = []
        signers = ["SIGNER_01", "SIGNER_02", "SIGNER_03", "SIGNER_04"]
        classes = ["HELLO", "THANK YOU", "WATER", "HELP"]

        for signer in signers:
            for cls in classes:
                items.append(
                    ManifestItem(
                        video_id=f"{signer}_{cls}_take1",
                        signer_id=signer,
                        label=cls,
                        file_path=f"/dummy/{signer}/{cls}.mp4",
                    )
                )

        # 2. Build signer-independent manifest
        splits = create_signer_independent_splits(items, val_ratio=0.25, test_ratio=0.25, seed=42)
        manifest = DatasetManifest(
            dataset_name="SyntheticISL",
            language="ISL",
            version="2.0.0",
            splits=splits,
            labels=classes,
            signers_train=sorted({i.signer_id for i in splits.train}),
            signers_val=sorted({i.signer_id for i in splits.val}),
            signers_test=sorted({i.signer_id for i in splits.test}),
        )

        valid, msg = verify_signer_isolation(manifest)
        self.assertTrue(valid, msg)

        # 3. Simulate video frame capture: 20 raw frames
        raw_frames = []
        for f_idx in range(20):
            # 74 landmarks per frame
            frame = [[0.0, 0.0, 0.0] for _ in range(TOTAL_LANDMARKS)]
            # Left & Right shoulders (indices 42 and 43)
            frame[42] = [0.4, 0.5, 0.0]
            frame[43] = [0.6, 0.5, 0.0]
            # Hands moving over time
            frame[0] = [0.4 + (f_idx * 0.01), 0.7 - (f_idx * 0.005), 0.1]
            frame[21] = [0.6 - (f_idx * 0.01), 0.7 - (f_idx * 0.005), 0.1]
            # Normalize frame
            norm_frame = normalize_frame_landmarks(frame)
            flat_features = [coord for pt in norm_frame for coord in pt]
            self.assertEqual(len(flat_features), FEATURES_PER_FRAME)
            raw_frames.append(flat_features)

        # 4. Resample 20 frames -> exactly 32 frames
        sequence = resample_sequence(raw_frames, target_frames=NUM_FRAMES)
        self.assertEqual(len(sequence), NUM_FRAMES)

        flattened_total = [c for frame in sequence for c in frame]
        self.assertEqual(len(flattened_total), TOTAL_FEATURE_DIM)


if __name__ == "__main__":
    unittest.main()
