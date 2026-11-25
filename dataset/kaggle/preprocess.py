"""Build and clean signer-independent manifests from filtered Kaggle files."""
from __future__ import annotations

from pathlib import Path

from dataset.prepare_dataset import build_manifest, clean_manifest
from dataset.vocabulary import load_vocabulary, training_labels


def prepare(language: str, source_dir: Path, metadata: Path | None, output_dir: Path) -> dict[str, object]:
    vocabulary = load_vocabulary()
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = output_dir / "manifest.json"
    cleaned_path = output_dir / "manifest.cleaned.json"
    manifest = build_manifest(language, source_dir, metadata, training_labels(vocabulary, language), manifest_path)
    return clean_manifest(manifest, cleaned_path)
