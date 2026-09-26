#!/usr/bin/env python3
"""Train the browser-friendly ISL nearest-centroid landmark sequence classifier."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np


def cosine_similarity(vectors: np.ndarray, centroid: np.ndarray) -> np.ndarray:
    return vectors.dot(centroid) / np.maximum(1e-8, np.linalg.norm(vectors, axis=1) * np.linalg.norm(centroid))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("landmarks", type=Path)
    parser.add_argument("--output", type=Path, default=Path("public/models/isl-v1.json"))
    args = parser.parse_args()
    data = np.load(args.landmarks)
    vectors = data["vectors"].astype(np.float32)
    raw_labels = data["labels"].astype(str)
    labels = sorted(set(raw_labels.tolist()))
    if len(labels) < 2:
        raise SystemExit("At least two sign labels are required for training.")

    centroids: list[np.ndarray] = []
    thresholds: dict[str, float] = {}
    for label in labels:
        class_vectors = vectors[raw_labels == label]
        centroid = class_vectors.mean(axis=0)
        centroids.append(centroid)
        # Hold back the least similar 10% as an acceptance threshold, with a
        # conservative floor to avoid turning every motion into a transcript word.
        scores = cosine_similarity(class_vectors, centroid)
        thresholds[label] = round(float(max(0.7, np.quantile(scores, 0.10))), 4)

    model = {
        "version": "1.0.0",
        "language": "ISL",
        "frames": 32,
        "landmarksPerFrame": 42,
        "labels": labels,
        "centroids": [centroid.round(6).tolist() for centroid in centroids],
        "thresholds": thresholds,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(model, separators=(",", ":")))
    print(f"Trained {len(labels)} ISL classes; browser model written to {args.output}")


if __name__ == "__main__":
    main()
