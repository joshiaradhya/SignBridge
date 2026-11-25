"""Cached landmark extraction for a cleaned manifest."""
from __future__ import annotations

from pathlib import Path

from ml.signbridge.datasets import DatasetManifest
from ml.signbridge.extraction import process_manifest_to_npz


def extract(cleaned_manifest: Path, output: Path, limit_per_class: int = 0) -> dict[str, object]:
    if output.exists() and output.stat().st_mtime >= cleaned_manifest.stat().st_mtime:
        return {"status": "reused", "features": str(output)}
    return process_manifest_to_npz(DatasetManifest.load(cleaned_manifest), output, limit_per_class=limit_per_class)
