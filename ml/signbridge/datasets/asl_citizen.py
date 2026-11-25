"""ASL Citizen dataset parser and manifest generator.

The ASL Citizen dataset contains isolated American Sign Language (ASL) signs
recorded by Deaf signers in varied webcam environments.
Licensing: Academic Research Use (Desai et al., Microsoft Research).
"""
from __future__ import annotations

import csv
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
DEFAULT_ASL_VOCABULARY = sorted(training_labels(load_vocabulary(), "ASL"))


def prepare_asl_citizen_manifest(
    metadata_csv: Path | str,
    video_dir: Path | str,
    target_vocab: Sequence[str] | None = None,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
) -> DatasetManifest:
    """Parses ASL Citizen CSV metadata and video folder to build a signer-independent manifest."""
    csv_path = Path(metadata_csv)
    vid_root = Path(video_dir)

    if not csv_path.exists():
        raise FileNotFoundError(f"ASL Citizen metadata CSV not found: {csv_path}")

    vocabulary = load_vocabulary()
    allowed_vocab = {normalize_label(v, vocabulary) for v in target_vocab} if target_vocab else set(DEFAULT_ASL_VOCABULARY)

    items: list[ManifestItem] = []
    seen_labels: set[str] = set()

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Handle column names (case-insensitive)
            row_lower = {k.lower().strip(): v for k, v in row.items()}
            gloss = normalize_label(row_lower.get("gloss") or row_lower.get("label") or "", vocabulary)
            participant = row_lower.get("participant id") or row_lower.get("participant_id") or row_lower.get("signer") or "UNKNOWN"
            video_file = row_lower.get("video file") or row_lower.get("filename") or row_lower.get("video_path") or ""

            if not gloss or not video_file:
                continue

            if gloss not in allowed_vocab:
                continue

            video_path = vid_root / video_file
            if not video_path.exists():
                # Check directly in root if video_file has subdir or vice-versa
                alt_path = vid_root / Path(video_file).name
                if alt_path.exists():
                    video_path = alt_path
                else:
                    continue  # Video file missing on disk

            item = ManifestItem(
                video_id=Path(video_file).stem,
                signer_id=participant.upper(),
                label=gloss,
                file_path=str(video_path.resolve()),
            )
            items.append(item)
            seen_labels.add(gloss)

    if not items:
        raise ValueError("No matching videos found in ASL Citizen dataset.")

    splits = create_signer_independent_splits(
        items, val_ratio=val_ratio, test_ratio=test_ratio, seed=seed
    )

    manifest = DatasetManifest(
        dataset_name="ASL-Citizen",
        language="ASL",
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
