"""PyTorch Dataset and DataLoader utilities for sign landmark sequences."""

from __future__ import annotations

from pathlib import Path
from typing import Any

try:
    import numpy as np
    import torch
    from torch.utils.data import DataLoader, Dataset
    HAS_TORCH_DATA = True
except ImportError:
    np = None            # type: ignore[assignment]
    torch = None         # type: ignore[assignment]
    DataLoader = None    # type: ignore[assignment]
    Dataset = object     # type: ignore[assignment, misc]
    HAS_TORCH_DATA = False


if HAS_TORCH_DATA:
    class SignSequenceDataset(Dataset):
        """Dataset of normalized landmark sequences for sign recognition."""

        def __init__(
            self,
            npz_path: Path | str,
            split: str = "train",
            augment: bool = False,
        ) -> None:
            self.split = split
            self.augment = augment

            data = np.load(npz_path)
            all_splits = data["splits"]
            mask = all_splits == split

            self.features = data["features"][mask].astype(np.float32)
            raw_labels = data["labels"][mask].astype(str)

            # Canonical sorted label vocabulary
            if "label_names" in data:
                self.classes = sorted(data["label_names"].tolist())
            else:
                self.classes = sorted(set(data["labels"].tolist()))

            self.label_to_idx = {name: i for i, name in enumerate(self.classes)}
            self.targets = np.array([self.label_to_idx[l] for l in raw_labels], dtype=np.int64)

        def __len__(self) -> int:
            return len(self.features)

        def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
            feat = self.features[idx].copy()  # [32, 222]

            if self.augment and self.split == "train":
                # 1. Spatial jitter: small Gaussian noise
                noise = np.random.normal(0, 0.005, size=feat.shape).astype(np.float32)
                # Keep zeros as zeros (missing landmarks remain zero)
                mask = feat != 0
                feat += noise * mask

                # 2. Random scale variation (+/- 5%)
                scale_factor = np.random.uniform(0.95, 1.05)
                feat *= scale_factor

            x = torch.from_numpy(feat)
            y = torch.tensor(self.targets[idx], dtype=torch.long)
            return x, y


    def create_dataloaders(
        npz_path: Path | str,
        batch_size: int = 32,
        num_workers: int = 2,
    ) -> tuple[DataLoader, DataLoader, DataLoader, list[str]]:
        """Creates train, val, and test DataLoaders from a single preprocessed .npz file."""
        train_ds = SignSequenceDataset(npz_path, split="train", augment=True)
        val_ds = SignSequenceDataset(npz_path, split="val", augment=False)
        test_ds = SignSequenceDataset(npz_path, split="test", augment=False)

        train_loader = DataLoader(
            train_ds, batch_size=batch_size, shuffle=True, num_workers=num_workers, pin_memory=True
        )
        val_loader = DataLoader(
            val_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers, pin_memory=True
        )
        test_loader = DataLoader(
            test_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers, pin_memory=True
        )

        return train_loader, val_loader, test_loader, train_ds.classes

else:
    class SignSequenceDataset:  # type: ignore[no-redef]
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            raise ImportError("PyTorch and NumPy are required. Run in Google Colab.")
