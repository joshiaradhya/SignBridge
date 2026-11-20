"""ONNX export, numerical validation, and metadata generation for SignBridge."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ..schema import FEATURES_PER_FRAME, NUM_FRAMES, SCHEMA_VERSION

try:
    import numpy as np
    import torch
    HAS_TORCH = True
except ImportError:
    np = None     # type: ignore[assignment]
    torch = None  # type: ignore[assignment]
    HAS_TORCH = False


def export_to_onnx(
    checkpoint_path: Path | str,
    output_onnx_path: Path | str,
    metadata_output_path: Path | str,
    opset_version: int = 17,
) -> dict[str, Any]:
    """Exports a trained PyTorch model checkpoint to ONNX with metadata and parity checks."""
    if not HAS_TORCH:
        raise ImportError("PyTorch and NumPy are required for ONNX export.")

    from ..models.bilstm import SignBiLSTMAttention

    ckpt_path = Path(checkpoint_path)
    onnx_path = Path(output_onnx_path)
    meta_path = Path(metadata_output_path)

    onnx_path.parent.mkdir(parents=True, exist_ok=True)
    meta_path.parent.mkdir(parents=True, exist_ok=True)

    ckpt = torch.load(ckpt_path, map_location="cpu")
    classes = ckpt["classes"]
    cfg = ckpt.get("config", {})

    model = SignBiLSTMAttention(
        input_dim=cfg.get("input_dim", FEATURES_PER_FRAME),
        hidden_dim=cfg.get("hidden_dim", 128),
        lstm_hidden=cfg.get("lstm_hidden", 128),
        num_layers=cfg.get("num_layers", 2),
        num_classes=len(classes),
    )
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    dummy_input = torch.randn(1, NUM_FRAMES, FEATURES_PER_FRAME, dtype=torch.float32)

    # Export to ONNX
    torch.onnx.export(
        model,
        dummy_input,
        str(onnx_path),
        export_params=True,
        opset_version=opset_version,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["logits"],
        dynamic_axes={
            "input": {0: "batch_size"},
            "logits": {0: "batch_size"},
        },
    )
    print(f"Exported ONNX model to {onnx_path}")

    # Verify ONNX model integrity
    try:
        import onnx
        onnx_model = onnx.load(str(onnx_path))
        onnx.checker.check_model(onnx_model)
        print("ONNX graph validation passed successfully.")
    except ImportError:
        print("onnx package not installed; skipping onnx.checker.")

    # Numerical parity check with ONNX Runtime
    parity_result = {"status": "skipped"}
    try:
        import onnxruntime as ort

        session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
        with torch.no_grad():
            torch_out = model(dummy_input).numpy()

        ort_inputs = {"input": dummy_input.numpy()}
        ort_out = session.run(["logits"], ort_inputs)[0]

        max_diff = float(np.max(np.abs(torch_out - ort_out)))
        parity_passed = max_diff < 1e-4

        parity_result = {
            "status": "passed" if parity_passed else "failed",
            "max_abs_diff": max_diff,
        }
        print(f"ONNX Runtime parity check: max difference = {max_diff:.6e} ({parity_result['status']})")
    except ImportError:
        print("onnxruntime not installed; skipping runtime parity test.")

    # Generate metadata JSON for browser client
    language = "ISL" if "ISL" in onnx_path.name.upper() else "ASL"
    metadata = {
        "version": "2.0.0",
        "schemaVersion": SCHEMA_VERSION,
        "language": language,
        "modelType": "bilstm-attention",
        "frames": NUM_FRAMES,
        "featuresPerFrame": FEATURES_PER_FRAME,
        "inputShape": [1, NUM_FRAMES, FEATURES_PER_FRAME],
        "inputName": "input",
        "outputName": "logits",
        "numClasses": len(classes),
        "labels": classes,
        "thresholds": {cls_name: 0.65 for cls_name in classes},
        "onnxUrl": f"/models/{onnx_path.name}",
    }

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"Generated browser metadata to {meta_path}")
    return {
        "onnx_path": str(onnx_path),
        "metadata_path": str(meta_path),
        "num_classes": len(classes),
        "parity": parity_result,
    }
