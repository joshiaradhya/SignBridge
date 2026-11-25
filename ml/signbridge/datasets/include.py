"""INCLUDE and INCLUDE-50 dataset parser and manifest generator.

The INCLUDE dataset was developed by AI4Bharat (IIT Madras) for Indian Sign Language (ISL).
Licensing: Creative Commons Attribution 4.0 International (CC BY 4.0).
SignBridge uses INCLUDE-50 (50 canonical signs) for isolated sign recognition.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Sequence

from dataset.vocabulary import load_vocabulary, normalize_label, training_labels

from .manifest import (
    DatasetManifest,
    DatasetSplit,
    ManifestItem,
    create_signer_independent_splits,
    verify_signer_isolation,
)

# Backwards-compatible export. The JSON configuration is the source of truth.
INCLUDE_50_VOCABULARY = sorted(training_labels(load_vocabulary(), "ISL"))


def extract_signer_from_filename(filename: str, parent_dirname: str = "") -> str:
    """Extracts signer identifier from INCLUDE video naming conventions.

    Common conventions in INCLUDE:
      - '<SignerID>_<Gloss>_<Take>.mp4' (e.g. 'Signer01_12_1.mp4')
      - 'Person1_take2.mp4'
      - Subdirectory or prefix based.
    """
    stem = Path(filename).stem
    # Match SignerXX or PersonXX
    match = re.search(r"(signer\d+|person\d+|user\d+|p\d+)", stem, re.IGNORECASE)
    if match:
        return match.group(1).upper()

    # Match leading digits followed by underscore: '01_HELLO_1.mp4'
    match_leading = re.match(r"^(\d+)_", stem)
    if match_leading:
        return f"SIGNER_{match_leading.group(1)}"

    # If no pattern in filename, check parent directory or hash
    if parent_dirname:
        match_dir = re.search(r"(signer\d+|person\d+)", parent_dirname, re.IGNORECASE)
        if match_dir:
            return match_dir.group(1).upper()

    # Deterministic fallback signer bucket based on file stem
    h = abs(hash(stem)) % 8
    return f"SIGNER_{h:02d}"


def prepare_include_manifest(
    dataset_dir: Path | str,
    target_vocab: Sequence[str] | None = None,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
) -> DatasetManifest:
    """Scans INCLUDE dataset directory, extracts labels and signers, and builds manifest.

    Directory structure expected:
      <dataset_dir>/<GLOSS>/<video_file>.mp4
      or
      <dataset_dir>/<Category>/<GLOSS>/<video_file>.mp4
    """
    root = Path(dataset_dir)
    video_extensions = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    videos = [p for p in root.rglob("*") if p.suffix.lower() in video_extensions]

    if not videos:
        raise ValueError(f"No video files found in {dataset_dir}")

    vocabulary = load_vocabulary()
    allowed_vocab = {normalize_label(v, vocabulary) for v in target_vocab} if target_vocab else set(INCLUDE_50_VOCABULARY)

    items: list[ManifestItem] = []
    seen_labels: set[str] = set()

    for vid in sorted(videos):
        # Determine gloss label from parent directory
        label = normalize_label(vid.parent.name, vocabulary)
        if label not in allowed_vocab:
            continue

        signer_id = extract_signer_from_filename(vid.name, vid.parent.parent.name)
        video_id = f"{label}_{vid.stem}"

        item = ManifestItem(
            video_id=video_id,
            signer_id=signer_id,
            label=label,
            file_path=str(vid.resolve()),
        )
        items.append(item)
        seen_labels.add(label)

    if not items:
        raise ValueError("No matching videos found for target vocabulary.")

    splits = create_signer_independent_splits(
        items, val_ratio=val_ratio, test_ratio=test_ratio, seed=seed
    )

    manifest = DatasetManifest(
        dataset_name="INCLUDE-50",
        language="ISL",
        version="1.0.0",
        splits=splits,
        labels=sorted(seen_labels),
        signers_train=sorted({i.signer_id for i in splits.train}),
        signers_val=sorted({i.signer_id for i in splits.val}),
        signers_test=sorted({i.signer_id for i in splits.test}),
    )

    valid, msg = verify_signer_isolation(manifest)
    if not valid:
        raise RuntimeError(f"Manifest failed isolation check: {msg}")

    return manifest
