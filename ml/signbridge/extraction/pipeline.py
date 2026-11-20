"""Video-to-features extraction pipeline.

Processes sign language video datasets into versioned, compressed landmark
sequence datasets (.npz) structured by signer-independent splits.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from ..datasets.manifest import DatasetManifest, ManifestItem
from ..schema import (
    FEATURES_PER_FRAME,
    NUM_FRAMES,
    SCHEMA_VERSION,
    resample_sequence,
)
from .mediapipe_extractor import MultiLandmarkExtractor


def extract_features_from_video(
    video_path: Path | str,
    extractor: MultiLandmarkExtractor,
    target_frames: int = NUM_FRAMES,
    min_valid_frames: int = 8,
) -> Any | None:
    """Extracts a normalized (32, 222) feature matrix from a single video file."""
    try:
        import cv2
    except ImportError:
        raise ImportError("OpenCV (cv2) is required for video reading.")

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return None

    frames: list[Any] = []
    while cap.isOpened():
        ret, frame_bgr = cap.read()
        if not ret:
            break
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        norm_frame = extractor.extract_frame_normalized(frame_rgb)
        # Flatten normalized landmarks: (74, 3) -> 222 features
        flat = [coord for pt in norm_frame for coord in pt]
        frames.append(flat)

    cap.release()

    if len(frames) < min_valid_frames:
        return None

    # Resample along temporal dimension to exactly target_frames
    return resample_sequence(frames, target_frames=target_frames)


def process_manifest_to_npz(
    manifest: DatasetManifest,
    output_npz_path: Path | str,
    limit_per_class: int = 0,
) -> dict[str, int]:
    """Extracts features for all videos in a manifest and writes a compressed .npz archive."""
    try:
        import numpy as np
    except ImportError:
        raise ImportError("numpy is required to save compressed .npz datasets.")

    out = Path(output_npz_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    features_list: list[np.ndarray] = []
    labels_list: list[str] = []
    video_ids_list: list[str] = []
    signer_ids_list: list[str] = []
    splits_list: list[str] = []

    class_counts: dict[str, int] = {}
    total_processed = 0

    all_items: list[tuple[str, ManifestItem]] = [
        ("train", item) for item in manifest.splits.train
    ] + [("val", item) for item in manifest.splits.val] + [
        ("test", item) for item in manifest.splits.test
    ]

    with MultiLandmarkExtractor() as extractor:
        for split_name, item in all_items:
            if limit_per_class and class_counts.get(item.label, 0) >= limit_per_class:
                continue

            seq = extract_features_from_video(item.file_path, extractor)
            if seq is None:
                continue

            features_list.append(np.array(seq, dtype=np.float32))
            labels_list.append(item.label)
            video_ids_list.append(item.video_id)
            signer_ids_list.append(item.signer_id)
            splits_list.append(split_name)

            class_counts[item.label] = class_counts.get(item.label, 0) + 1
            total_processed += 1

            if total_processed % 25 == 0:
                print(f"Processed {total_processed} videos... ({len(class_counts)} classes)")

    if not features_list:
        raise RuntimeError("No features could be extracted from manifest videos.")

    features_arr = np.stack(features_list)
    labels_arr = np.array(labels_list)
    video_ids_arr = np.array(video_ids_list)
    signer_ids_arr = np.array(signer_ids_list)
    splits_arr = np.array(splits_list)
    label_names = np.array(sorted(set(labels_list)))

    np.savez_compressed(
        out,
        features=features_arr,
        labels=labels_arr,
        video_ids=video_ids_arr,
        signer_ids=signer_ids_arr,
        splits=splits_arr,
        label_names=label_names,
        schema_version=SCHEMA_VERSION,
        language=manifest.language,
        dataset_name=manifest.dataset_name,
    )

    print(
        f"Saved {features_arr.shape[0]} sequences (shape: {features_arr.shape}) to {out}"
    )
    return {
        "total": len(features_list),
        "train": sum(1 for s in splits_list if s == "train"),
        "val": sum(1 for s in splits_list if s == "val"),
        "test": sum(1 for s in splits_list if s == "test"),
        "num_classes": len(label_names),
    }
