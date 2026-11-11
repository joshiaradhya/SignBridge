"""Shared, versioned feature schema for SignBridge ML pipelines.

Defines the canonical landmark definitions, indices, and normalization
algorithms shared between Python (training / extraction) and TypeScript (browser inference).
Designed to run with NumPy when available, or fall back to pure-Python math
when running in lightweight environments without dependencies.
"""
from __future__ import annotations

import json
import math
from dataclasses import asdict, dataclass
from typing import Any

try:
    import numpy as np

    HAS_NUMPY = True
except ImportError:
    np = None  # type: ignore[assignment]
    HAS_NUMPY = False

SCHEMA_VERSION = "2.0.0"
NUM_FRAMES = 32

# Landmark counts
NUM_HAND_LANDMARKS = 21  # 21 per hand (left + right = 42)
NUM_POSE_LANDMARKS = 12  # Selected upper-body pose keypoints
NUM_FACE_LANDMARKS = 20  # Selected non-manual expression keypoints
TOTAL_LANDMARKS = (NUM_HAND_LANDMARKS * 2) + NUM_POSE_LANDMARKS + NUM_FACE_LANDMARKS  # 74
COORDS_PER_LANDMARK = 3  # (x, y, z)
FEATURES_PER_FRAME = TOTAL_LANDMARKS * COORDS_PER_LANDMARK  # 222
TOTAL_FEATURE_DIM = NUM_FRAMES * FEATURES_PER_FRAME  # 7104

# MediaPipe Pose landmark indices to keep (upper body & torso reference)
POSE_LANDMARK_INDICES = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 23, 24]

# MediaPipe Face Mesh landmark indices to keep (non-manual grammatical markers)
FACE_BROW_INDICES = [70, 63, 105, 300, 293, 336]
FACE_EYE_INDICES = [159, 145, 386, 374]
FACE_NOSE_INDICES = [1, 168]
FACE_MOUTH_INDICES = [0, 17, 61, 291, 37, 267, 84, 314]

FACE_LANDMARK_INDICES = (
    FACE_BROW_INDICES + FACE_EYE_INDICES + FACE_NOSE_INDICES + FACE_MOUTH_INDICES
)


@dataclass(frozen=True)
class FeatureSchemaMetadata:
    version: str = SCHEMA_VERSION
    frames: int = NUM_FRAMES
    num_hand_landmarks: int = NUM_HAND_LANDMARKS
    num_pose_landmarks: int = NUM_POSE_LANDMARKS
    num_face_landmarks: int = NUM_FACE_LANDMARKS
    total_landmarks: int = TOTAL_LANDMARKS
    coords_per_landmark: int = COORDS_PER_LANDMARK
    features_per_frame: int = FEATURES_PER_FRAME
    total_feature_dim: int = TOTAL_FEATURE_DIM
    pose_indices: list[int] = None  # type: ignore[assignment]
    face_indices: list[int] = None  # type: ignore[assignment]

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["pose_indices"] = POSE_LANDMARK_INDICES
        data["face_indices"] = FACE_LANDMARK_INDICES
        return data

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)


SCHEMA_METADATA = FeatureSchemaMetadata(
    pose_indices=POSE_LANDMARK_INDICES, face_indices=FACE_LANDMARK_INDICES
)


def _euclidean_dist(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)


def normalize_frame_landmarks(
    points: Any,
    has_pose: bool = True,
) -> Any:
    """Normalizes a single frame of (74, 3) landmarks.

    Layout of points:
      [0:21]   - Left Hand
      [21:42]  - Right Hand
      [42:54]  - Upper Pose (12 points, indices 0 & 1 are shoulders)
      [54:74]  - Face (20 points)

    Supports both NumPy ndarray and nested Python list.
    """
    is_np = HAS_NUMPY and isinstance(points, np.ndarray)

    if is_np:
        assert points.shape == (TOTAL_LANDMARKS, COORDS_PER_LANDMARK), (
            f"Expected points shape ({TOTAL_LANDMARKS}, {COORDS_PER_LANDMARK}), got {points.shape}"
        )
        pts = points.tolist()
    else:
        pts = [[float(coord) for coord in pt] for pt in points]
        assert len(pts) == TOTAL_LANDMARKS and len(pts[0]) == COORDS_PER_LANDMARK

    result = [[0.0, 0.0, 0.0] for _ in range(TOTAL_LANDMARKS)]

    left_shoulder = pts[42]
    right_shoulder = pts[43]
    shoulders_detected = (
        has_pose
        and any(c != 0.0 for c in left_shoulder)
        and any(c != 0.0 for c in right_shoulder)
    )

    if shoulders_detected:
        origin = (
            (left_shoulder[0] + right_shoulder[0]) / 2.0,
            (left_shoulder[1] + right_shoulder[1]) / 2.0,
            (left_shoulder[2] + right_shoulder[2]) / 2.0,
        )
        dist = _euclidean_dist(
            (left_shoulder[0], left_shoulder[1], left_shoulder[2]),
            (right_shoulder[0], right_shoulder[1], right_shoulder[2]),
        )
        scale = max(0.1, dist)
    else:
        # Fallback to hand wrist
        wrist = None
        if any(c != 0.0 for c in pts[0]):
            wrist = (pts[0][0], pts[0][1], pts[0][2])
        elif any(c != 0.0 for c in pts[21]):
            wrist = (pts[21][0], pts[21][1], pts[21][2])

        if wrist is None:
            return np.zeros((TOTAL_LANDMARKS, COORDS_PER_LANDMARK), dtype=np.float32) if is_np else result

        origin = wrist
        max_dist = 0.05
        for pt in pts:
            if any(c != 0.0 for c in pt):
                d = _euclidean_dist((pt[0], pt[1], pt[2]), origin)
                if d > max_dist:
                    max_dist = d
        scale = max(0.05, max_dist)

    for i in range(TOTAL_LANDMARKS):
        if any(c != 0.0 for c in pts[i]):
            result[i] = [
                (pts[i][0] - origin[0]) / scale,
                (pts[i][1] - origin[1]) / scale,
                (pts[i][2] - origin[2]) / scale,
            ]

    if is_np:
        return np.array(result, dtype=np.float32)
    return result


def resample_sequence(
    frames: list[Any], target_frames: int = NUM_FRAMES
) -> Any:
    """Resamples a temporal sequence of frames to exactly target_frames."""
    if not frames:
        if HAS_NUMPY:
            return np.zeros((target_frames, FEATURES_PER_FRAME), dtype=np.float32)
        return [[0.0] * FEATURES_PER_FRAME for _ in range(target_frames)]

    n_frames = len(frames)
    indices = [
        min(n_frames - 1, round((i * (n_frames - 1)) / max(1, target_frames - 1)))
        for i in range(target_frames)
    ]
    sampled = [frames[idx] for idx in indices]

    if HAS_NUMPY and isinstance(frames[0], np.ndarray):
        return np.stack(sampled).astype(np.float32)
    return sampled


def serialize_metadata_json(output_path: str) -> None:
    """Exports the schema definition as a JSON file for frontend ingestion."""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(SCHEMA_METADATA.to_json())
