#!/usr/bin/env python3
"""Kaggle master interface. `smoke` is intentional; `train --full-train` spends GPU quota."""
from __future__ import annotations

import argparse
import json
import platform
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dataset.kaggle.config import KagglePaths
from dataset.kaggle.download import discover_inputs


def resources(paths: KagglePaths) -> dict[str, object]:
    report: dict[str, object] = {"python": sys.version, "cpu": platform.processor(), "disk_free_bytes": shutil.disk_usage(paths.work_root).free}
    try:
        import psutil
        report["ram_available_bytes"] = psutil.virtual_memory().available
    except ImportError:
        pass
    try:
        import torch
        report.update({"torch": torch.__version__, "cuda": torch.cuda.is_available(), "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None})
    except ImportError:
        report["torch"] = None
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("stage", choices=["inspect", "filter", "prepare", "landmarks", "smoke", "train", "evaluate", "export", "all"])
    parser.add_argument("--language", choices=["ISL", "ASL"], required=True)
    parser.add_argument("--metadata", type=Path)
    parser.add_argument("--archive", type=Path)
    parser.add_argument("--source-dir", type=Path)
    parser.add_argument("--features", type=Path)
    parser.add_argument("--checkpoint", type=Path)
    parser.add_argument("--full-train", action="store_true")
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--batch-size", type=int, default=16)
    args = parser.parse_args(); paths = KagglePaths(); paths.ensure(); out = paths.language_dir(args.language); out.mkdir(parents=True, exist_ok=True)
    print(json.dumps(resources(paths), indent=2))
    if args.stage == "inspect":
        print(json.dumps(discover_inputs(paths.input_root), indent=2)); return
    if args.stage in {"filter", "all"}:
        if not args.metadata: raise SystemExit("--metadata is required for filter")
        from dataset.kaggle.filter_dataset import filter_attached_dataset
        print(json.dumps(filter_attached_dataset(args.language, args.metadata, args.archive, out / "raw"), indent=2))
        if args.stage == "filter": return
    if args.stage in {"prepare", "all"}:
        if not args.source_dir: raise SystemExit("--source-dir is required for prepare")
        from dataset.kaggle.preprocess import prepare
        print(json.dumps(prepare(args.language, args.source_dir, args.metadata, out), indent=2))
        if args.stage == "prepare": return
    features = args.features or out / "landmarks.npz"
    if args.stage in {"landmarks", "all"}:
        from dataset.kaggle.extract_landmarks import extract
        print(json.dumps(extract(out / "manifest.cleaned.json", features, 2 if args.stage == "all" else 0), indent=2))
        if args.stage == "landmarks": return
    if args.stage in {"smoke", "all"}:
        from dataset.kaggle.train import smoke_test
        print(json.dumps(smoke_test(features), indent=2)); return
    if args.stage == "train":
        if not args.full_train: raise SystemExit("Refusing quota-expensive training. Run smoke first, then pass --full-train deliberately.")
        from dataset.kaggle.train import train_full
        train_full(features, out / "training", args.language, args.epochs, args.batch_size); return
    if args.stage == "evaluate":
        if not args.checkpoint: raise SystemExit("--checkpoint is required")
        from dataset.kaggle.evaluate import evaluate
        print(json.dumps(evaluate(args.checkpoint, features, out / "evaluation"), indent=2)); return
    if args.stage == "export":
        if not args.checkpoint: raise SystemExit("--checkpoint is required")
        from dataset.kaggle.export import export
        print(json.dumps(export(args.checkpoint, args.language, Path("/kaggle/working/signbridge_export")), indent=2))


if __name__ == "__main__": main()
