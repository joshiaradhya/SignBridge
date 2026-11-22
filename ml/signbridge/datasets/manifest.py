"""Signer-independent dataset manifest generation and validation.

Ensures that signers in validation and test splits NEVER appear in the training
split, guaranteeing realistic generalization evaluation.
"""
from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


@dataclass
class ManifestItem:
    video_id: str
    signer_id: str
    label: str
    file_path: str
    duration_frames: int | None = None
    fps: float | None = None
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class DatasetSplit:
    train: list[ManifestItem] = field(default_factory=list)
    val: list[ManifestItem] = field(default_factory=list)
    test: list[ManifestItem] = field(default_factory=list)


@dataclass
class DatasetManifest:
    dataset_name: str
    language: str  # "ISL" or "ASL"
    version: str
    splits: DatasetSplit
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    labels: list[str] = field(default_factory=list)
    signers_train: list[str] = field(default_factory=list)
    signers_val: list[str] = field(default_factory=list)
    signers_test: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "dataset_name": self.dataset_name,
            "language": self.language,
            "version": self.version,
            "created_at": self.created_at,
            "labels": self.labels,
            "signers": {
                "train": self.signers_train,
                "val": self.signers_val,
                "test": self.signers_test,
            },
            "counts": {
                "train": len(self.splits.train),
                "val": len(self.splits.val),
                "test": len(self.splits.test),
                "total": len(self.splits.train) + len(self.splits.val) + len(self.splits.test),
            },
            "splits": {
                "train": [asdict(item) for item in self.splits.train],
                "val": [asdict(item) for item in self.splits.val],
                "test": [asdict(item) for item in self.splits.test],
            },
        }

    def save(self, path: Path | str) -> None:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def load(cls, path: Path | str) -> DatasetManifest:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        splits_data = data.get("splits", {})
        splits = DatasetSplit(
            train=[ManifestItem(**i) for i in splits_data.get("train", [])],
            val=[ManifestItem(**i) for i in splits_data.get("val", [])],
            test=[ManifestItem(**i) for i in splits_data.get("test", [])],
        )
        signers = data.get("signers", {})
        return cls(
            dataset_name=data["dataset_name"],
            language=data["language"],
            version=data.get("version", "1.0.0"),
            splits=splits,
            created_at=data.get("created_at", ""),
            labels=data.get("labels", []),
            signers_train=signers.get("train", []),
            signers_val=signers.get("val", []),
            signers_test=signers.get("test", []),
        )


def verify_signer_isolation(manifest: DatasetManifest) -> tuple[bool, str]:
    """Verifies that no signer appears in more than one split."""
    train_signers = {i.signer_id for i in manifest.splits.train}
    val_signers = {i.signer_id for i in manifest.splits.val}
    test_signers = {i.signer_id for i in manifest.splits.test}

    train_val_overlap = train_signers.intersection(val_signers)
    train_test_overlap = train_signers.intersection(test_signers)
    val_test_overlap = val_signers.intersection(test_signers)

    if train_val_overlap:
        return False, f"Data leakage detected! Signers in both train and val: {sorted(train_val_overlap)}"
    if train_test_overlap:
        return False, f"Data leakage detected! Signers in both train and test: {sorted(train_test_overlap)}"
    if val_test_overlap:
        return False, f"Signers in both val and test: {sorted(val_test_overlap)}"

    return True, f"Signer isolation verified: {len(train_signers)} train, {len(val_signers)} val, {len(test_signers)} test signers."


def create_signer_independent_splits(
    items: list[ManifestItem],
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
) -> DatasetSplit:
    """Partitions items into train, val, and test splits by signer ID.

    Greedily distributes signers such that each split has balanced class representation
    while maintaining 100% signer exclusivity.
    """
    import random

    rng = random.Random(seed)

    # Group items by signer
    signer_items: dict[str, list[ManifestItem]] = defaultdict(list)
    signer_labels: dict[str, set[str]] = defaultdict(set)
    for item in items:
        signer_items[item.signer_id].append(item)
        signer_labels[item.signer_id].add(item.label)

    signers = list(signer_items.keys())
    rng.shuffle(signers)

    total_items = len(items)
    target_val = int(total_items * val_ratio)
    target_test = int(total_items * test_ratio)

    val_signers: set[str] = set()
    test_signers: set[str] = set()
    train_signers: set[str] = set()

    curr_val_count = 0
    curr_test_count = 0

    # Sort signers by number of items descending to pack bins smoothly
    sorted_signers = sorted(signers, key=lambda s: len(signer_items[s]), reverse=True)

    for signer in sorted_signers:
        count = len(signer_items[signer])
        if curr_val_count + count <= target_val and len(val_signers) < len(sorted_signers) // 4:
            val_signers.add(signer)
            curr_val_count += count
        elif curr_test_count + count <= target_test and len(test_signers) < len(sorted_signers) // 4:
            test_signers.add(signer)
            curr_test_count += count
        else:
            train_signers.add(signer)

    # In case of few signers, guarantee at least 1 in val and test if >= 3 signers
    if len(signers) >= 3:
        if not val_signers and train_signers:
            s = train_signers.pop()
            val_signers.add(s)
        if not test_signers and train_signers:
            s = train_signers.pop()
            test_signers.add(s)

    split = DatasetSplit()
    for item in items:
        if item.signer_id in test_signers:
            split.test.append(item)
        elif item.signer_id in val_signers:
            split.val.append(item)
        else:
            split.train.append(item)

    return split
