"""Metadata-first selection of attached Kaggle datasets."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from dataset.prepare_dataset import inspect_metadata, selective_extract
from dataset.vocabulary import load_vocabulary, training_labels


def filter_attached_dataset(language: str, metadata: Path, archive: Path | None, output: Path) -> dict[str, Any]:
    vocabulary = load_vocabulary()
    labels = training_labels(vocabulary, language)
    report = inspect_metadata(metadata, labels, vocabulary)
    report["missing_target_classes"] = sorted(labels.difference(report["retained"]))
    if archive:
        import csv

        with metadata.open(encoding="utf-8-sig", newline="") as handle:
            from dataset.prepare_dataset import row_file, row_label
            wanted = {row_file(row) for row in csv.DictReader(handle) if row_label(row, vocabulary) in labels}
        report["extraction"] = selective_extract(archive, output, wanted, labels, vocabulary)
    return report
