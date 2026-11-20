"""Unit tests for SignBridge feature schema."""

import unittest

from ml.signbridge.schema import (
    COORDS_PER_LANDMARK,
    FACE_LANDMARK_INDICES,
    FEATURES_PER_FRAME,
    HAS_NUMPY,
    NUM_FRAMES,
    NUM_HAND_LANDMARKS,
    NUM_POSE_LANDMARKS,
    NUM_FACE_LANDMARKS,
    POSE_LANDMARK_INDICES,
    SCHEMA_VERSION,
    TOTAL_FEATURE_DIM,
    TOTAL_LANDMARKS,
    normalize_frame_landmarks,
    resample_sequence,
)


class TestFeatureSchema(unittest.TestCase):
    def test_dimensions(self):
        self.assertEqual(SCHEMA_VERSION, "2.0.0")
        self.assertEqual(NUM_FRAMES, 32)
        self.assertEqual(NUM_HAND_LANDMARKS, 21)
        self.assertEqual(NUM_POSE_LANDMARKS, 12)
        self.assertEqual(NUM_FACE_LANDMARKS, 20)
        self.assertEqual(TOTAL_LANDMARKS, 74)
        self.assertEqual(COORDS_PER_LANDMARK, 3)
        self.assertEqual(FEATURES_PER_FRAME, 222)
        self.assertEqual(TOTAL_FEATURE_DIM, 7104)
        self.assertEqual(len(POSE_LANDMARK_INDICES), 12)
        self.assertEqual(len(FACE_LANDMARK_INDICES), 20)

    def test_empty_frame_normalization(self):
        points = [[0.0, 0.0, 0.0] for _ in range(TOTAL_LANDMARKS)]
        norm = normalize_frame_landmarks(points)
        self.assertEqual(len(norm), TOTAL_LANDMARKS)
        self.assertTrue(all(p == [0.0, 0.0, 0.0] for p in norm))

    def test_shoulder_normalization(self):
        points = [[0.0, 0.0, 0.0] for _ in range(TOTAL_LANDMARKS)]
        # Left shoulder at (0.4, 0.5, 0.0), Right shoulder at (0.6, 0.5, 0.0)
        points[42] = [0.4, 0.5, 0.0]
        points[43] = [0.6, 0.5, 0.0]
        # Some hand point at (0.5, 0.8, 0.1)
        points[0] = [0.5, 0.8, 0.1]

        norm = normalize_frame_landmarks(points)
        # Origin should be mid-shoulder: (0.5, 0.5, 0.0)
        # Scale should be distance: 0.2
        # So hand point (0.5, 0.8, 0.1) -> ((0.5-0.5)/0.2, (0.8-0.5)/0.2, (0.1-0.0)/0.2) = (0.0, 1.5, 0.5)
        self.assertAlmostEqual(norm[0][0], 0.0, places=5)
        self.assertAlmostEqual(norm[0][1], 1.5, places=5)
        self.assertAlmostEqual(norm[0][2], 0.5, places=5)

        # Left shoulder -> ((0.4-0.5)/0.2, 0, 0) = (-0.5, 0.0, 0.0)
        self.assertAlmostEqual(norm[42][0], -0.5, places=5)
        self.assertAlmostEqual(norm[42][1], 0.0, places=5)

        # Right shoulder -> ((0.6-0.5)/0.2, 0, 0) = (0.5, 0.0, 0.0)
        self.assertAlmostEqual(norm[43][0], 0.5, places=5)
        self.assertAlmostEqual(norm[43][1], 0.0, places=5)

    def test_wrist_fallback_normalization(self):
        points = [[0.0, 0.0, 0.0] for _ in range(TOTAL_LANDMARKS)]
        # No shoulders. Left wrist at (0.3, 0.3, 0.0)
        points[0] = [0.3, 0.3, 0.0]
        # Tip of middle finger at (0.3, 0.5, 0.0)
        points[12] = [0.3, 0.5, 0.0]

        norm = normalize_frame_landmarks(points)
        # Origin is wrist (0.3, 0.3, 0.0), max distance is 0.2
        self.assertAlmostEqual(norm[0][0], 0.0, places=5)
        self.assertAlmostEqual(norm[0][1], 0.0, places=5)
        self.assertAlmostEqual(norm[12][0], 0.0, places=5)
        self.assertAlmostEqual(norm[12][1], 1.0, places=5)

    def test_resample_sequence(self):
        frames = [[float(i)] * FEATURES_PER_FRAME for i in range(10)]
        resampled = resample_sequence(frames, target_frames=32)
        self.assertEqual(len(resampled), 32)
        self.assertEqual(resampled[0], frames[0])
        self.assertEqual(resampled[-1], frames[-1])


if __name__ == "__main__":
    unittest.main()
