"""Safe Kaggle training entry point: smoke test by default, full training only explicitly."""
from __future__ import annotations

from pathlib import Path


def smoke_test(features: Path, batch_size: int = 4) -> dict[str, object]:
    from ml.signbridge.training.dataset import create_dataloaders

    train, val, test, classes = create_dataloaders(features, batch_size=batch_size, num_workers=0)
    x, y = next(iter(train))
    return {"classes": classes, "train": len(train.dataset), "val": len(val.dataset), "test": len(test.dataset), "batch_shape": list(x.shape), "targets": list(y.shape)}


def train_full(features: Path, output: Path, language: str, epochs: int, batch_size: int) -> None:
    from ml.signbridge.training import SignModelTrainer, TrainingConfig

    trainer = SignModelTrainer(TrainingConfig(epochs=epochs, batch_size=batch_size), output_dir=output, checkpoint_dir=output / "checkpoints")
    trainer.fit(features, resume_latest=True)
