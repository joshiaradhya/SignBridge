"""Read and normalize the SignBridge dataset vocabulary configuration."""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

DEFAULT_CONFIG = Path(__file__).with_name("config") / "target_signs.json"


def load_vocabulary(path: Path | str = DEFAULT_CONFIG) -> dict[str, Any]:
    with Path(path).open(encoding="utf-8") as handle:
        return json.load(handle)


def normalize_label(label: str, vocabulary: dict[str, Any]) -> str:
    value = re.sub(r"\s+", " ", label.strip().upper().replace("_", " "))
    return vocabulary.get("aliases", {}).get(value, value)


def training_labels(vocabulary: dict[str, Any], language: str) -> set[str]:
    return set(vocabulary["trained_classes"][language.upper()]["labels"])


def source_for_language(vocabulary: dict[str, Any], language: str) -> str:
    return str(vocabulary["trained_classes"][language.upper()]["source"])


def curriculum_labels(vocabulary: dict[str, Any], language: str) -> dict[str, list[str]]:
    return vocabulary["curriculum"][language.upper()]
