"""Reproducible, signer-disjoint splits for the INCLUDE training dataset.

The source videos must remain outside the repository.  Add a ``metadata.csv``
beside the extracted dataset when filenames do not encode a signer identifier.
The CSV must contain ``video_path``, ``label``, and ``signer_id`` columns.
"""
from __future__ import annotations

import csv
import hashlib
import json
import random
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Literal


VIDEO_SUFFIXES = {".avi", ".mkv", ".mov", ".mp4", ".webm"}
Split = Literal["train", "validation", "test"]


@dataclass(frozen=True)
class ManifestItem:
    video_path: str
    label: str
    signer_id: str
    split: Split


@dataclass(frozen=True)
class DatasetManifest:
    """A portable manifest that contains paths relative to the dataset root."""

    dataset: str
    items: list[ManifestItem]

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(
                {"dataset": self.dataset, "items": [asdict(item) for item in self.items]},
                indent=2,
                sort_keys=True,
            )
            + "\n",
            encoding="utf-8",
        )


def _normalise_path(value: str) -> str:
    return value.replace("\\", "/").lstrip("./")


def _metadata(dataset_dir: Path) -> dict[str, tuple[str, str]]:
    for filename in ("metadata.csv", "manifest.csv", "annotations.csv"):
        candidate = dataset_dir / filename
        if not candidate.exists():
            continue
        with candidate.open(newline="", encoding="utf-8-sig") as handle:
            reader = csv.DictReader(handle)
            required = {"video_path", "label", "signer_id"}
            if not reader.fieldnames or not required.issubset(reader.fieldnames):
                raise ValueError(f"{candidate} must contain: video_path, label, signer_id")
            rows: dict[str, tuple[str, str]] = {}
            for row in reader:
                path = _normalise_path(row["video_path"])
                label = row["label"].strip().upper()
                signer = row["signer_id"].strip()
                if not path or not label or not signer:
                    raise ValueError(f"{candidate} contains an empty video_path, label, or signer_id")
                rows[path] = (label, signer)
            return rows
    return {}


def _signer_from_filename(path: Path) -> str | None:
    """Recognise only explicit signer tokens; do not invent identity labels."""
    match = re.search(r"(?:^|[_-])(?:signer|subject|person|user)[_-]?([a-z0-9]+)(?:[_-]|$)", path.stem, re.I)
    return match.group(1).upper() if match else None


def _choose_split(signer_id: str, val_ratio: float, test_ratio: float, seed: int) -> Split:
    # A stable hash makes re-runs reproducible without exposing paths or identities.
    digest = hashlib.sha256(f"{seed}:{signer_id}".encode()).digest()
    bucket = int.from_bytes(digest[:8], "big") / 2**64
    if bucket < test_ratio:
        return "test"
    if bucket < test_ratio + val_ratio:
        return "validation"
    return "train"


def prepare_include_manifest(
    dataset_dir: Path,
    *,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
) -> DatasetManifest:
    """Create a signer-disjoint manifest from an extracted INCLUDE dataset.

    A class directory is used as the label when metadata is not provided.  A
    signer id must be supplied in metadata or explicitly encoded in the file
    name (for example ``HELLO_signer_03.mp4``).  This strict rule prevents the
    same signer appearing in training and evaluation by accident.
    """
    if not 0 <= val_ratio < 1 or not 0 <= test_ratio < 1 or val_ratio + test_ratio >= 1:
        raise ValueError("val_ratio and test_ratio must be non-negative and sum to less than 1")
    if not dataset_dir.is_dir():
        raise FileNotFoundError(f"Dataset directory does not exist: {dataset_dir}")

    metadata = _metadata(dataset_dir)
    videos = sorted(path for path in dataset_dir.rglob("*") if path.suffix.lower() in VIDEO_SUFFIXES)
    if not videos:
        raise FileNotFoundError(
            f"No videos found in {dataset_dir}. Extract INCLUDE-50 there before building the manifest."
        )

    records: list[tuple[str, str, str]] = []
    missing_signers: list[str] = []
    for video in videos:
        relative = _normalise_path(str(video.relative_to(dataset_dir)))
        annotated = metadata.get(relative)
        label = annotated[0] if annotated else video.parent.name.strip().upper()
        signer_id = annotated[1] if annotated else _signer_from_filename(video)
        if not signer_id:
            missing_signers.append(relative)
            continue
        records.append((relative, label, signer_id))

    if missing_signers:
        preview = ", ".join(missing_signers[:3])
        raise ValueError(
            "Cannot create a signer-independent split because signer ids are missing. "
            "Add metadata.csv with video_path,label,signer_id columns. Examples: " + preview
        )

    # Shuffle records only to avoid accidental ordering dependencies before the
    # stable, signer-based split assignment below.
    random.Random(seed).shuffle(records)
    items = [
        ManifestItem(
            video_path=path,
            label=label,
            signer_id=signer_id,
            split=_choose_split(signer_id, val_ratio, test_ratio, seed),
        )
        for path, label, signer_id in records
    ]
    manifest = DatasetManifest(dataset="INCLUDE", items=items)
    valid, message = verify_signer_isolation(manifest)
    if not valid:
        raise ValueError(message)
    return manifest


def verify_signer_isolation(manifest: DatasetManifest) -> tuple[bool, str]:
    """Verify that no signer occurs in more than one split."""
    assignments: dict[str, set[Split]] = {}
    for item in manifest.items:
        assignments.setdefault(item.signer_id, set()).add(item.split)
    leaked = sorted(signer for signer, splits in assignments.items() if len(splits) > 1)
    if leaked:
        return False, f"Signer leakage across splits: {', '.join(leaked[:10])}"
    counts = {split: sum(item.split == split for item in manifest.items) for split in ("train", "validation", "test")}
    return True, f"Signer isolation verified ({len(assignments)} signers; {counts})"
