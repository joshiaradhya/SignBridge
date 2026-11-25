from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class KagglePaths:
    """Kaggle input is read-only; only working/output paths are writable."""

    input_root: Path = Path(os.environ.get("SIGNBRIDGE_KAGGLE_INPUT", "/kaggle/input"))
    work_root: Path = Path(os.environ.get("SIGNBRIDGE_KAGGLE_WORKING", "/kaggle/working/signbridge"))

    def language_dir(self, language: str) -> Path:
        return self.work_root / language.lower()

    def ensure(self) -> None:
        self.work_root.mkdir(parents=True, exist_ok=True)
