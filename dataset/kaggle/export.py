from __future__ import annotations

import shutil
from pathlib import Path


def export(checkpoint: Path, language: str, output_dir: Path) -> dict[str, str]:
    from ml.signbridge.export import export_to_onnx

    output_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{language.lower()}-bilstm-v1"
    result = export_to_onnx(checkpoint, output_dir / f"{stem}.onnx", output_dir / f"{language.lower()}-metadata.json")
    archive = shutil.make_archive(str(output_dir / "signbridge_export"), "zip", output_dir)
    return {**{key: str(value) for key, value in result.items()}, "archive": archive}
