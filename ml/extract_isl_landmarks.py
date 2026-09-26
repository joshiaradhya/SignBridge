#!/usr/bin/env python3
"""Extract two-hand MediaPipe landmark sequences from an INCLUDE-50 video folder.

Expected input layout:
  data/include50/<GLOSS>/<video file>

The downloaded dataset stays outside git. This script writes compressed .npz files
containing only landmarks and labels, which are safer and much smaller to work with.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np

FRAMES = 32
POINTS = 42


def normalise(points: np.ndarray) -> np.ndarray:
    """Wrist-centre and scale one frame; missing points remain zero."""
    wrist = points[0].copy()
    visible = np.any(points != 0, axis=1)
    distances = np.linalg.norm(points[visible] - wrist, axis=1)
    scale = max(0.05, float(distances.max(initial=0.05)))
    return (points - wrist) / scale


def sample_video(path: Path, hands: mp.solutions.hands.Hands) -> np.ndarray | None:
    capture = cv2.VideoCapture(str(path))
    raw: list[np.ndarray] = []
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        result = hands.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        if not result.multi_hand_landmarks:
            continue
        points = np.zeros((POINTS, 3), dtype=np.float32)
        for hand_index, hand in enumerate(result.multi_hand_landmarks[:2]):
            start = hand_index * 21
            points[start : start + 21] = [[p.x, p.y, p.z] for p in hand.landmark]
        raw.append(normalise(points))
    capture.release()
    if len(raw) < 8:
        return None
    indices = np.linspace(0, len(raw) - 1, FRAMES).round().astype(int)
    return np.stack([raw[index] for index in indices]).reshape(-1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", type=Path)
    parser.add_argument("--output", type=Path, default=Path("data/isl-landmarks.npz"))
    parser.add_argument("--limit-per-label", type=int, default=0)
    args = parser.parse_args()

    videos = [path for path in args.dataset.rglob("*") if path.suffix.lower() in {".mp4", ".avi", ".mov", ".mkv"}]
    if not videos:
        raise SystemExit("No videos found. Arrange data as <dataset>/<GLOSS>/<video>.")

    vectors: list[np.ndarray] = []
    labels: list[str] = []
    counts: dict[str, int] = {}
    with mp.solutions.hands.Hands(static_image_mode=False, max_num_hands=2) as hands:
        for video in videos:
            label = video.parent.name.upper()
            if args.limit_per_label and counts.get(label, 0) >= args.limit_per_label:
                continue
            vector = sample_video(video, hands)
            if vector is not None:
                vectors.append(vector)
                labels.append(label)
                counts[label] = counts.get(label, 0) + 1
                print(f"{label}: {counts[label]}")

    if not vectors:
        raise SystemExit("No usable hand landmarks were extracted.")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(args.output, vectors=np.stack(vectors), labels=np.array(labels))
    print(f"Wrote {len(labels)} sequences for {len(set(labels))} labels to {args.output}")


if __name__ == "__main__":
    main()
