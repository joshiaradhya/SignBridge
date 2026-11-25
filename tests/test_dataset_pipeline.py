import csv
import json
import tempfile
import unittest
from pathlib import Path

from dataset.prepare_dataset import inspect_metadata
from dataset.vocabulary import load_vocabulary, normalize_label, training_labels


class TestDatasetVocabulary(unittest.TestCase):
    def test_model_vocabularies_are_configured(self):
        vocabulary = load_vocabulary()
        self.assertEqual(len(training_labels(vocabulary, "ISL")), 50)
        self.assertEqual(len(training_labels(vocabulary, "ASL")), 40)
        self.assertEqual(normalize_label("thank_you", vocabulary), "THANK YOU")
        self.assertIn("A", vocabulary["curriculum"]["ASL"]["alphabet"])
        self.assertIn("A", vocabulary["curriculum"]["ISL"]["alphabet"])
        root = Path(__file__).parent.parent
        for language in ("ASL", "ISL"):
            metadata = json.loads((root / "public" / "models" / f"{language.lower()}-metadata.json").read_text())
            self.assertEqual(metadata["labels"], vocabulary["trained_classes"][language]["labels"])

    def test_metadata_inspection_filters_before_download(self):
        vocabulary = load_vocabulary()
        with tempfile.TemporaryDirectory() as temp:
            metadata = Path(temp) / "samples.csv"
            with metadata.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=["gloss", "video file"])
                writer.writeheader()
                writer.writerows([
                    {"gloss": "thank_you", "video file": "thanks.mp4"},
                    {"gloss": "NOT-A-SIGN", "video file": "skip.mp4"},
                    {"gloss": "", "video file": "invalid.mp4"},
                ])
            result = inspect_metadata(metadata, training_labels(vocabulary, "ASL"), vocabulary)
        self.assertEqual(result["retained"], {"THANK YOU": 1})
        self.assertEqual(result["excluded"], {"NOT-A-SIGN": 1})
        self.assertEqual(result["malformed_rows"], 1)
