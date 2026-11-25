"""Discover attached Kaggle data without downloading provider archives again."""
from __future__ import annotations

from pathlib import Path


def discover_inputs(input_root: Path) -> dict[str, object]:
    files: list[Path] = []
    if input_root.exists():
        try:
            for path in input_root.rglob("*"):
                try:
                    if path.is_file():
                        files.append(path)
                except OSError:
                    # Kaggle inputs are normally readable, but discovery should not
                    # fail if a mounted directory contains a protected entry.
                    continue
        except OSError:
            # A protected sibling must not hide otherwise-valid attached input.
            pass
    return {
        "input_root": str(input_root),
        "files": len(files),
        "archives": [str(path) for path in files if path.suffix.lower() == ".zip"],
        "metadata": [str(path) for path in files if path.suffix.lower() == ".csv"],
    }
