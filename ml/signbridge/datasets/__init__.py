"""SignBridge dataset management, manifests, and signer-independent splitting."""

from .manifest import (
    DatasetManifest,
    DatasetSplit,
    ManifestItem,
    create_signer_independent_splits,
    verify_signer_isolation,
)
from .include import prepare_include_manifest
from .asl_citizen import prepare_asl_citizen_manifest
from .yolo_data import sample_yolo_frames, export_yolo_yaml

__all__ = [
    "DatasetManifest",
    "DatasetSplit",
    "ManifestItem",
    "create_signer_independent_splits",
    "verify_signer_isolation",
    "prepare_include_manifest",
    "prepare_asl_citizen_manifest",
    "sample_yolo_frames",
    "export_yolo_yaml",
]
