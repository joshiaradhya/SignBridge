from __future__ import annotations

from pathlib import Path


def evaluate(checkpoint: Path, features: Path, output: Path) -> dict[str, object]:
    from ml.signbridge.training import evaluate_test_set

    return evaluate_test_set(checkpoint, features, output, device="cuda" if _cuda_available() else "cpu")


def _cuda_available() -> bool:
    try:
        import torch
        return bool(torch.cuda.is_available())
    except ImportError:
        return False
