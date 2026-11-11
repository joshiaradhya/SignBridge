"""MediaPipe multi-landmarker feature extraction (Hands, Upper-Pose, Face).

Extracts exactly 74 canonical 3D landmarks conforming to Schema v2.0.0.
"""
from __future__ import annotations

from typing import Any

from ..schema import (
    COORDS_PER_LANDMARK,
    FACE_LANDMARK_INDICES,
    NUM_HAND_LANDMARKS,
    NUM_POSE_LANDMARKS,
    NUM_FACE_LANDMARKS,
    POSE_LANDMARK_INDICES,
    TOTAL_LANDMARKS,
    normalize_frame_landmarks,
)


class MultiLandmarkExtractor:
    """Extracts synchronized hand, pose, and face landmarks from RGB video frames."""

    def __init__(
        self,
        static_image_mode: bool = False,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
    ) -> None:
        self.static_mode = static_image_mode
        self.min_det_conf = min_detection_confidence
        self.min_track_conf = min_tracking_confidence

        self._mp: Any = None
        self._hands: Any = None
        self._pose: Any = None
        self._face_mesh: Any = None

    def __enter__(self) -> MultiLandmarkExtractor:
        self.load()
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def load(self) -> None:
        """Initializes MediaPipe solution graphs."""
        try:
            import mediapipe as mp
        except ImportError:
            raise ImportError(
                "mediapipe is required for feature extraction. "
                "Install with `pip install mediapipe` in Google Colab."
            )

        self._mp = mp
        self._hands = mp.solutions.hands.Hands(
            static_image_mode=self.static_mode,
            max_num_hands=2,
            min_detection_confidence=self.min_det_conf,
            min_tracking_confidence=self.min_track_conf,
        )
        self._pose = mp.solutions.pose.Pose(
            static_image_mode=self.static_mode,
            model_complexity=1,
            min_detection_confidence=self.min_det_conf,
            min_tracking_confidence=self.min_track_conf,
        )
        self._face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=self.static_mode,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=self.min_det_conf,
            min_tracking_confidence=self.min_track_conf,
        )

    def close(self) -> None:
        if self._hands:
            self._hands.close()
        if self._pose:
            self._pose.close()
        if self._face_mesh:
            self._face_mesh.close()

    def extract_frame_raw(self, frame_rgb: Any) -> list[list[float]]:
        """Extracts 74 raw (x, y, z) landmarks from a single RGB frame.

        Layout:
          [0:21]   - Left Hand
          [21:42]  - Right Hand
          [42:54]  - Upper Pose (12 points)
          [54:74]  - Face (20 points)
        """
        if self._hands is None:
            self.load()

        points = [[0.0, 0.0, 0.0] for _ in range(TOTAL_LANDMARKS)]

        # 1. Hands (Left & Right)
        hands_res = self._hands.process(frame_rgb)
        if hands_res.multi_hand_landmarks and hands_res.multi_handedness:
            for hand_lms, handedness in zip(
                hands_res.multi_hand_landmarks, hands_res.multi_handedness
            ):
                label = handedness.classification[0].label  # "Left" or "Right"
                offset = 0 if label.lower() == "left" else NUM_HAND_LANDMARKS
                for i, lm in enumerate(hand_lms.landmark[:NUM_HAND_LANDMARKS]):
                    points[offset + i] = [float(lm.x), float(lm.y), float(lm.z)]

        # 2. Pose (Upper Body)
        pose_res = self._pose.process(frame_rgb)
        if pose_res.pose_landmarks:
            pose_lms = pose_res.pose_landmarks.landmark
            for i, idx in enumerate(POSE_LANDMARK_INDICES):
                if idx < len(pose_lms):
                    lm = pose_lms[idx]
                    points[NUM_HAND_LANDMARKS * 2 + i] = [
                        float(lm.x),
                        float(lm.y),
                        float(lm.z),
                    ]

        # 3. Face (Non-manual markers)
        face_res = self._face_mesh.process(frame_rgb)
        if face_res.multi_face_landmarks:
            face_lms = face_res.multi_face_landmarks[0].landmark
            for i, idx in enumerate(FACE_LANDMARK_INDICES):
                if idx < len(face_lms):
                    lm = face_lms[idx]
                    points[NUM_HAND_LANDMARKS * 2 + NUM_POSE_LANDMARKS + i] = [
                        float(lm.x),
                        float(lm.y),
                        float(lm.z),
                    ]

        return points

    def extract_frame_normalized(self, frame_rgb: Any) -> list[list[float]]:
        """Extracts and normalizes 74 landmarks for a single frame."""
        raw = self.extract_frame_raw(frame_rgb)
        return normalize_frame_landmarks(raw)
