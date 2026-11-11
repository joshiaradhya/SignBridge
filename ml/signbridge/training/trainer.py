"""Resumable training engine for SignBridge recognition models."""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from .dataset import create_dataloaders

try:
    import torch
    import torch.nn as nn
    from torch.optim import AdamW
    from torch.optim.lr_scheduler import CosineAnnealingLR
    HAS_TORCH_TRAIN = True
except ImportError:
    torch = None  # type: ignore[assignment]
    HAS_TORCH_TRAIN = False


@dataclass
class TrainingConfig:
    input_dim: int = 222
    hidden_dim: int = 128
    lstm_hidden: int = 128
    num_layers: int = 2
    dropout: float = 0.3
    learning_rate: float = 1e-3
    weight_decay: float = 1e-4
    epochs: int = 60
    batch_size: int = 32
    patience: int = 15
    label_smoothing: float = 0.1
    device: str = "cuda" if HAS_TORCH_TRAIN and torch.cuda.is_available() else "cpu"


class SignModelTrainer:
    """Handles training, checkpointing, resume, and validation for SignBiLSTMAttention."""

    def __init__(
        self,
        config: TrainingConfig,
        output_dir: Path | str,
        checkpoint_dir: Path | str | None = None,
    ) -> None:
        self.config = config
        self.output_dir = Path(output_dir)
        self.checkpoint_dir = Path(checkpoint_dir or (self.output_dir / "checkpoints"))

        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)

        self.device = torch.device(config.device) if HAS_TORCH_TRAIN else None
        self.model: Any = None
        self.optimizer: Any = None
        self.scheduler: Any = None
        self.criterion: Any = None
        self.classes: list[str] = []

        self.start_epoch = 0
        self.best_val_acc = 0.0
        self.patience_counter = 0

    def init_model(self, num_classes: int) -> None:
        """Initializes model, optimizer, loss, and scheduler."""
        from ..models.bilstm import SignBiLSTMAttention

        self.model = SignBiLSTMAttention(
            input_dim=self.config.input_dim,
            hidden_dim=self.config.hidden_dim,
            lstm_hidden=self.config.lstm_hidden,
            num_layers=self.config.num_layers,
            num_classes=num_classes,
            dropout=self.config.dropout,
        ).to(self.device)

        self.optimizer = AdamW(
            self.model.parameters(),
            lr=self.config.learning_rate,
            weight_decay=self.config.weight_decay,
        )
        self.scheduler = CosineAnnealingLR(
            self.optimizer, T_max=self.config.epochs, eta_min=1e-5
        )
        self.criterion = nn.CrossEntropyLoss(label_smoothing=self.config.label_smoothing)

    def save_checkpoint(
        self,
        epoch: int,
        val_loss: float,
        val_acc: float,
        is_best: bool = False,
    ) -> None:
        """Saves persistent training state to disk."""
        checkpoint = {
            "epoch": epoch,
            "model_state_dict": self.model.state_dict(),
            "optimizer_state_dict": self.optimizer.state_dict(),
            "scheduler_state_dict": self.scheduler.state_dict(),
            "val_loss": val_loss,
            "val_acc": val_acc,
            "best_val_acc": self.best_val_acc,
            "classes": self.classes,
            "config": asdict(self.config),
        }
        latest_path = self.checkpoint_dir / "checkpoint_latest.pt"
        torch.save(checkpoint, latest_path)

        if is_best:
            best_path = self.checkpoint_dir / "best_model.pt"
            torch.save(checkpoint, best_path)
            print(f"--> Saved new best checkpoint (Val Acc: {val_acc:.4f}) to {best_path}")

    def load_checkpoint(self, checkpoint_path: Path | str) -> None:
        """Resumes training from a saved checkpoint."""
        ckpt = torch.load(checkpoint_path, map_location=self.device)
        self.classes = ckpt["classes"]
        self.init_model(len(self.classes))

        self.model.load_state_dict(ckpt["model_state_dict"])
        self.optimizer.load_state_dict(ckpt["optimizer_state_dict"])
        self.scheduler.load_state_dict(ckpt["scheduler_state_dict"])
        self.start_epoch = ckpt["epoch"] + 1
        self.best_val_acc = ckpt.get("best_val_acc", 0.0)
        print(f"Resumed from epoch {self.start_epoch} (Best Val Acc: {self.best_val_acc:.4f})")

    def train_epoch(self, dataloader: Any) -> tuple[float, float]:
        self.model.train()
        total_loss = 0.0
        correct = 0
        total = 0

        for x, y in dataloader:
            x, y = x.to(self.device), y.to(self.device)
            self.optimizer.zero_grad()
            logits = self.model(x)
            loss = self.criterion(logits, y)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            self.optimizer.step()

            total_loss += loss.item() * len(y)
            preds = logits.argmax(dim=-1)
            correct += (preds == y).sum().item()
            total += len(y)

        return total_loss / total, correct / total

    def evaluate(self, dataloader: Any) -> tuple[float, float]:
        self.model.eval()
        total_loss = 0.0
        correct = 0
        total = 0

        with torch.no_grad():
            for x, y in dataloader:
                x, y = x.to(self.device), y.to(self.device)
                logits = self.model(x)
                loss = self.criterion(logits, y)
                total_loss += loss.item() * len(y)
                preds = logits.argmax(dim=-1)
                correct += (preds == y).sum().item()
                total += len(y)

        return total_loss / total, correct / total

    def fit(self, npz_path: Path | str, resume_latest: bool = True) -> None:
        """Runs the complete training and validation cycle with early stopping."""
        train_loader, val_loader, _, classes = create_dataloaders(
            npz_path, batch_size=self.config.batch_size
        )
        self.classes = classes

        latest_ckpt = self.checkpoint_dir / "checkpoint_latest.pt"
        if resume_latest and latest_ckpt.exists():
            self.load_checkpoint(latest_ckpt)
        else:
            self.init_model(len(classes))

        print(f"Starting training on {len(classes)} sign classes for {self.config.epochs} epochs...")

        history: list[dict[str, Any]] = []
        for epoch in range(self.start_epoch, self.config.epochs):
            t0 = time.time()
            train_loss, train_acc = self.train_epoch(train_loader)
            val_loss, val_acc = self.evaluate(val_loader)
            self.scheduler.step()
            elapsed = time.time() - t0

            is_best = val_acc > self.best_val_acc
            if is_best:
                self.best_val_acc = val_acc
                self.patience_counter = 0
            else:
                self.patience_counter += 1

            self.save_checkpoint(epoch, val_loss, val_acc, is_best=is_best)

            log_entry = {
                "epoch": epoch + 1,
                "train_loss": round(train_loss, 4),
                "train_acc": round(train_acc, 4),
                "val_loss": round(val_loss, 4),
                "val_acc": round(val_acc, 4),
                "lr": round(self.scheduler.get_last_lr()[0], 6),
                "time_sec": round(elapsed, 2),
            }
            history.append(log_entry)
            print(
                f"Epoch {epoch+1:02d}/{self.config.epochs} | "
                f"Train Loss: {train_loss:.4f} Acc: {train_acc:.4f} | "
                f"Val Loss: {val_loss:.4f} Acc: {val_acc:.4f} | "
                f"Time: {elapsed:.1f}s"
            )

            if self.patience_counter >= self.config.patience:
                print(f"Early stopping triggered after {self.config.patience} epochs without improvement.")
                break

        # Save history log
        with open(self.output_dir / "training_history.json", "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
