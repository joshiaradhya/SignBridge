"""Model evaluation, confusion matrix generation, and latency benchmarking."""

from __future__ import annotations

import json
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

from .dataset import SignSequenceDataset

try:
    import numpy as np
    import torch
    from torch.utils.data import DataLoader
    HAS_EVAL_DEPS = True
except ImportError:
    np = None           # type: ignore[assignment]
    torch = None        # type: ignore[assignment]
    HAS_EVAL_DEPS = False


def benchmark_latency(
    model: Any,
    input_shape: tuple[int, int, int] = (1, 32, 222),
    device: str = "cpu",
    num_runs: int = 100,
) -> dict[str, float]:
    """Measures single-sample inference latency in milliseconds."""
    dev = torch.device(device)
    model.eval().to(dev)

    dummy_input = torch.randn(*input_shape, device=dev)

    # Warmup
    with torch.no_grad():
        for _ in range(10):
            _ = model(dummy_input)

    times_ms: list[float] = []
    with torch.no_grad():
        for _ in range(num_runs):
            t0 = time.perf_counter()
            _ = model(dummy_input)
            t1 = time.perf_counter()
            times_ms.append((t1 - t0) * 1000.0)

    times_arr = np.array(times_ms)
    return {
        "mean_ms": round(float(np.mean(times_arr)), 2),
        "median_ms": round(float(np.median(times_arr)), 2),
        "p95_ms": round(float(np.percentile(times_arr, 95)), 2),
        "p99_ms": round(float(np.percentile(times_arr, 99)), 2),
        "fps": round(1000.0 / float(np.mean(times_arr)), 1),
    }


def compute_metrics(
    y_true: list[int],
    y_pred: list[int],
    classes: list[str],
) -> dict[str, Any]:
    """Computes Top-1 accuracy, per-class Precision, Recall, F1 and confusion matrix."""
    num_classes = len(classes)
    conf_matrix = [[0] * num_classes for _ in range(num_classes)]

    for true_idx, pred_idx in zip(y_true, y_pred):
        conf_matrix[true_idx][pred_idx] += 1

    per_class: dict[str, dict[str, float]] = {}
    f1_list: list[float] = []

    for i, name in enumerate(classes):
        tp = conf_matrix[i][i]
        fp = sum(conf_matrix[r][i] for r in range(num_classes) if r != i)
        fn = sum(conf_matrix[i][c] for c in range(num_classes) if c != i)

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        per_class[name] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "support": sum(conf_matrix[i]),
        }
        f1_list.append(f1)

    total_samples = len(y_true)
    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
    accuracy = correct / total_samples if total_samples > 0 else 0.0
    macro_f1 = sum(f1_list) / len(f1_list) if f1_list else 0.0

    return {
        "accuracy_top1": round(accuracy, 4),
        "macro_f1": round(macro_f1, 4),
        "num_samples": total_samples,
        "per_class": per_class,
        "confusion_matrix": conf_matrix,
    }


def evaluate_test_set(
    checkpoint_path: Path | str,
    npz_path: Path | str,
    output_dir: Path | str,
    device: str = "cpu",
) -> dict[str, Any]:
    """Evaluates a saved checkpoint on the held-out test split."""
    if not HAS_EVAL_DEPS:
        raise ImportError("PyTorch and NumPy are required for evaluation.")

    from ..models.bilstm import SignBiLSTMAttention

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    ckpt = torch.load(checkpoint_path, map_location=device)
    classes = ckpt["classes"]
    cfg = ckpt.get("config", {})

    model = SignBiLSTMAttention(
        input_dim=cfg.get("input_dim", 222),
        hidden_dim=cfg.get("hidden_dim", 128),
        lstm_hidden=cfg.get("lstm_hidden", 128),
        num_layers=cfg.get("num_layers", 2),
        num_classes=len(classes),
    ).to(device)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    test_ds = SignSequenceDataset(npz_path, split="test", augment=False)
    loader = DataLoader(test_ds, batch_size=32, shuffle=False)

    y_true: list[int] = []
    y_pred: list[int] = []
    top5_correct = 0

    with torch.no_grad():
        for x, y in loader:
            x = x.to(device)
            logits = model(x)
            preds = logits.argmax(dim=-1).cpu().tolist()
            y_pred.extend(preds)
            y_true.extend(y.tolist())

            # Top 5 accuracy
            if len(classes) >= 5:
                _, top5 = logits.topk(min(5, len(classes)), dim=-1)
                for target, row in zip(y, top5):
                    if target in row:
                        top5_correct += 1

    metrics = compute_metrics(y_true, y_pred, classes)
    if len(classes) >= 5 and len(y_true) > 0:
        metrics["accuracy_top5"] = round(top5_correct / len(y_true), 4)

    # Latency benchmark
    metrics["latency_benchmark"] = benchmark_latency(model, device=device)

    report_path = out / "evaluation_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"Test Evaluation Complete:")
    print(f"  Top-1 Accuracy: {metrics['accuracy_top1'] * 100:.2f}%")
    if "accuracy_top5" in metrics:
        print(f"  Top-5 Accuracy: {metrics['accuracy_top5'] * 100:.2f}%")
    print(f"  Macro F1:       {metrics['macro_f1']:.4f}")
    print(f"  Median Latency: {metrics['latency_benchmark']['median_ms']} ms")
    print(f"  Report written to: {report_path}")

    return metrics
