"""Unit tests for dataset manifest and signer isolation."""

import unittest
from ml.signbridge.datasets.manifest import (
    DatasetManifest,
    DatasetSplit,
    ManifestItem,
    create_signer_independent_splits,
    verify_signer_isolation,
)


class TestManifest(unittest.TestCase):
    def setUp(self):
        # Create synthetic dataset items with 6 distinct signers and 4 signs
        self.items = []
        signers = [f"SIGNER_{i:02d}" for i in range(6)]
        labels = ["HELLO", "THANK YOU", "WATER", "PLEASE"]
        for s in signers:
            for l in labels:
                for rep in range(2):
                    self.items.append(
                        ManifestItem(
                            video_id=f"{s}_{l}_{rep}",
                            signer_id=s,
                            label=l,
                            file_path=f"/dummy/{s}/{l}_{rep}.mp4",
                        )
                    )

    def test_signer_independent_splits(self):
        splits = create_signer_independent_splits(
            self.items, val_ratio=0.2, test_ratio=0.2, seed=42
        )
        manifest = DatasetManifest(
            dataset_name="SyntheticTest",
            language="ISL",
            version="1.0.0",
            splits=splits,
            labels=["HELLO", "THANK YOU", "WATER", "PLEASE"],
        )

        valid, msg = verify_signer_isolation(manifest)
        self.assertTrue(valid, msg)

        # Confirm non-empty splits
        self.assertGreater(len(splits.train), 0)
        self.assertGreater(len(splits.val), 0)
        self.assertGreater(len(splits.test), 0)

        # Confirm zero signer overlap
        train_signers = {i.signer_id for i in splits.train}
        val_signers = {i.signer_id for i in splits.val}
        test_signers = {i.signer_id for i in splits.test}

        self.assertEqual(len(train_signers.intersection(val_signers)), 0)
        self.assertEqual(len(train_signers.intersection(test_signers)), 0)
        self.assertEqual(len(val_signers.intersection(test_signers)), 0)

    def test_leakage_detection(self):
        splits = DatasetSplit(
            train=[ManifestItem("v1", "SIGNER_A", "HELLO", "/path1.mp4")],
            val=[ManifestItem("v2", "SIGNER_A", "HELLO", "/path2.mp4")],  # Same signer!
            test=[ManifestItem("v3", "SIGNER_B", "HELLO", "/path3.mp4")],
        )
        manifest = DatasetManifest(
            dataset_name="LeakyTest",
            language="ISL",
            version="1.0.0",
            splits=splits,
        )
        valid, msg = verify_signer_isolation(manifest)
        self.assertFalse(valid)
        self.assertIn("SIGNER_A", msg)


if __name__ == "__main__":
    unittest.main()
