#!/usr/bin/env python3
"""Selective, idempotent SignBridge dataset preparation.

The provider's metadata is filtered before any archive is extracted.  This
command intentionally has no baked-in dataset URL: both official sources have
access/licence terms and their delivery URLs can change.  Supply an authorised
CSV and a local archive or source directory instead.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import shutil
import sys
import time
import zipfile
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dataset.vocabulary import DEFAULT_CONFIG, load_vocabulary, normalize_label, source_for_language, training_labels
from ml.signbridge.datasets import DatasetManifest, prepare_asl_citizen_manifest, prepare_include_manifest
from ml.signbridge.extraction import process_manifest_to_npz

VIDEO_SUFFIXES = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


def bytes_on_disk(path: Path) -> int:
    return sum(item.stat().st_size for item in path.rglob("*") if item.is_file()) if path.exists() else 0


def fingerprint(path: Path) -> str:
    """Content digest for duplicate detection without loading a video into RAM."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def row_label(row: dict[str, str], vocab: dict[str, Any]) -> str:
    lower = {str(k).lower().strip(): str(v or "") for k, v in row.items()}
    return normalize_label(lower.get("gloss") or lower.get("label") or lower.get("class") or "", vocab)


def row_file(row: dict[str, str]) -> str:
    lower = {str(k).lower().strip(): str(v or "") for k, v in row.items()}
    return lower.get("video file") or lower.get("filename") or lower.get("video_path") or lower.get("path") or ""


def inspect_metadata(metadata: Path, labels: set[str], vocab: dict[str, Any]) -> dict[str, Any]:
    retained: Counter[str] = Counter()
    excluded: Counter[str] = Counter()
    malformed = 0
    with metadata.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            label, name = row_label(row, vocab), row_file(row)
            if not label or not name:
                malformed += 1
            elif label in labels:
                retained[label] += 1
            else:
                excluded[label] += 1
    return {"metadata": str(metadata), "retained": dict(sorted(retained.items())), "excluded": dict(sorted(excluded.items())), "malformed_rows": malformed, "retained_samples": sum(retained.values()), "excluded_samples": sum(excluded.values())}


def selected_members(archive: zipfile.ZipFile, wanted_names: set[str], labels: set[str], vocab: dict[str, Any]) -> Iterable[zipfile.ZipInfo]:
    for member in archive.infolist():
        name = member.filename
        if member.is_dir() or Path(name).suffix.lower() not in VIDEO_SUFFIXES:
            continue
        canonical = normalize_label(Path(name).parent.name, vocab)
        if name in wanted_names or Path(name).name in wanted_names or canonical in labels:
            yield member


def selective_extract(archive_path: Path, destination: Path, wanted_names: set[str], labels: set[str], vocab: dict[str, Any]) -> dict[str, int]:
    destination.mkdir(parents=True, exist_ok=True)
    extracted = skipped = 0
    with zipfile.ZipFile(archive_path) as archive:
        for member in selected_members(archive, wanted_names, labels, vocab):
            target = destination / member.filename
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists() and target.stat().st_size == member.file_size:
                skipped += 1
                continue
            with archive.open(member) as source, target.open("wb") as output:
                shutil.copyfileobj(source, output, length=1024 * 1024)
            extracted += 1
    return {"extracted": extracted, "skipped": skipped}


def clean_manifest(manifest: DatasetManifest, output: Path) -> dict[str, Any]:
    """Remove missing, duplicate, empty, unreadable and out-of-vocabulary samples."""
    import cv2

    seen: set[str] = set()
    cleaned: dict[str, list[Any]] = {"train": [], "val": [], "test": []}
    removed: Counter[str] = Counter()
    original = 0
    original_labels: set[str] = set()
    saved_bytes = 0
    for split_name in cleaned:
        for item in getattr(manifest.splits, split_name):
            original += 1
            original_labels.add(item.label)
            path = Path(item.file_path)
            if not item.label.strip() or not path.exists() or path.stat().st_size == 0:
                removed["missing_or_empty"] += 1; continue
            digest = fingerprint(path)
            if digest in seen:
                removed["duplicate"] += 1; saved_bytes += path.stat().st_size; continue
            capture = cv2.VideoCapture(str(path))
            valid = capture.isOpened() and int(capture.get(cv2.CAP_PROP_FRAME_COUNT)) > 0
            capture.release()
            if not valid:
                removed["unreadable"] += 1; saved_bytes += path.stat().st_size; continue
            seen.add(digest); cleaned[split_name].append(item)
    manifest.splits.train, manifest.splits.val, manifest.splits.test = cleaned["train"], cleaned["val"], cleaned["test"]
    manifest.labels = sorted({i.label for values in cleaned.values() for i in values})
    manifest.signers_train = sorted({i.signer_id for i in cleaned["train"]})
    manifest.signers_val = sorted({i.signer_id for i in cleaned["val"]})
    manifest.signers_test = sorted({i.signer_id for i in cleaned["test"]})
    manifest.save(output)
    return {"original_classes": len(original_labels), "original_samples": original, "retained_classes": len(manifest.labels), "retained_samples": sum(map(len, cleaned.values())), "removed": dict(removed), "storage_saved_bytes": saved_bytes, "manifest": str(output)}


def build_manifest(language: str, source_dir: Path, metadata: Path | None, labels: set[str], out: Path) -> DatasetManifest:
    if language == "ISL":
        manifest = prepare_include_manifest(source_dir, target_vocab=sorted(labels))
    else:
        if metadata is None:
            raise ValueError("ASL-Citizen requires --metadata for signer-aware splitting.")
        manifest = prepare_asl_citizen_manifest(metadata, source_dir, target_vocab=sorted(labels))
    manifest.save(out)
    return manifest


def report(output: Path, language: str, manifest_path: Path | None, cleaned_path: Path | None, source_dir: Path | None, started: float) -> dict[str, Any]:
    data: dict[str, Any] = {"language": language, "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "elapsed_seconds": round(time.time() - started, 2), "source_bytes": bytes_on_disk(source_dir) if source_dir else 0}
    for key, path in (("manifest", manifest_path), ("cleaned_manifest", cleaned_path)):
        if path and path.exists():
            manifest = DatasetManifest.load(path)
            data[key] = {"classes": len(manifest.labels), "samples": sum(len(getattr(manifest.splits, split)) for split in ("train", "val", "test")), "splits": {split: len(getattr(manifest.splits, split)) for split in ("train", "val", "test")}}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return data


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["inspect", "acquire", "clean", "extract", "report", "all"])
    parser.add_argument("--language", choices=["ISL", "ASL"], required=True)
    parser.add_argument("--metadata", type=Path)
    parser.add_argument("--archive", type=Path, help="Authorised provider ZIP; only selected videos are extracted.")
    parser.add_argument("--source-dir", type=Path, default=Path("data/raw"))
    parser.add_argument("--work-dir", type=Path, default=Path("data/processed"))
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--limit-per-class", type=int, default=0, help="Small smoke test only; never use for final evaluation.")
    parser.add_argument("--incremental", action="store_true", help="Reuse valid extracted files and cached landmarks (the default behaviour).")
    args = parser.parse_args()
    started = time.time(); vocab = load_vocabulary(args.config); labels = training_labels(vocab, args.language)
    work = args.work_dir / args.language.lower(); work.mkdir(parents=True, exist_ok=True)
    manifest_path, cleaned_path = work / "manifest.json", work / "manifest.cleaned.json"

    inspection: dict[str, Any] | None = None
    if args.command in {"inspect", "acquire", "all"} and args.metadata:
        inspection = inspect_metadata(args.metadata, labels, vocab)
        (work / "inspection.json").write_text(json.dumps(inspection, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(inspection, indent=2))
    if args.command == "inspect": return
    if args.command in {"acquire", "all"}:
        if not args.archive:
            raise SystemExit("--archive is required for selective extraction. No full dataset download is attempted.")
        wanted = {row_file(row) for row in csv.DictReader(args.metadata.open(encoding="utf-8-sig", newline="")) if row_label(row, vocab) in labels} if args.metadata else set()
        print(selective_extract(args.archive, args.source_dir, wanted, labels, vocab))
        if args.command == "acquire": return
    if args.command in {"clean", "extract", "all"}:
        manifest = build_manifest(args.language, args.source_dir, args.metadata, labels, manifest_path)
        clean = clean_manifest(manifest, cleaned_path)
        print(json.dumps(clean, indent=2))
        if args.command == "clean": return
    if args.command in {"extract", "all"}:
        manifest = DatasetManifest.load(cleaned_path)
        output = work / "landmarks.npz"
        # Existing valid cache is intentionally reused; --incremental is implicit.
        if output.exists() and output.stat().st_mtime >= cleaned_path.stat().st_mtime:
            print(f"Reusing feature cache: {output}")
        else:
            print(process_manifest_to_npz(manifest, output, limit_per_class=args.limit_per_class))
        if args.command == "extract": return
    print(json.dumps(report(work / "dataset_report.json", args.language, manifest_path, cleaned_path, args.source_dir, started), indent=2))


if __name__ == "__main__":
    main()
