"""YOLO dataset creation and frame sampling for sign language detection.

Extracts representative video frames and formats annotations for fine-tuning
a lightweight YOLO model (YOLOv8n / YOLO11n) detecting:
  0: person
  1: hand
  2: face
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

YOLO_CLASSES = ["person", "hand", "face"]


@dataclass
class BoundingBox:
    class_id: int  # 0: person, 1: hand, 2: face
    x_center: float  # Normalized 0..1
    y_center: float  # Normalized 0..1
    width: float     # Normalized 0..1
    height: float    # Normalized 0..1

    def to_yolo_line(self) -> str:
        return f"{self.class_id} {self.x_center:.6f} {self.y_center:.6f} {self.width:.6f} {self.height:.6f}"


def sample_yolo_frames(
    video_paths: Sequence[Path | str],
    output_dir: Path | str,
    frames_per_video: int = 3,
    train_ratio: float = 0.8,
) -> dict[str, int]:
    """Samples video frames and organizes them into YOLO directory structure.

    Note: In Google Colab or environments with OpenCV, this uses cv2.VideoCapture.
    """
    try:
        import cv2
    except ImportError:
        raise ImportError("OpenCV (cv2) is required to sample video frames.")

    out = Path(output_dir)
    images_train = out / "images" / "train"
    images_val = out / "images" / "val"
    labels_train = out / "labels" / "train"
    labels_val = out / "labels" / "val"

    for d in (images_train, images_val, labels_train, labels_val):
        d.mkdir(parents=True, exist_ok=True)

    counts = {"train": 0, "val": 0}

    for idx, vpath in enumerate(video_paths):
        v = Path(vpath)
        cap = cv2.VideoCapture(str(v))
        if not cap.isOpened():
            continue

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            cap.release()
            continue

        # Sample evenly across the middle 80% of the video to avoid empty buffer frames
        sample_indices = [
            int(total_frames * (0.1 + 0.8 * i / max(1, frames_per_video - 1)))
            for i in range(frames_per_video)
        ]

        is_val = (idx % int(1.0 / (1.0 - train_ratio + 1e-6))) == 0
        target_img_dir = images_val if is_val else images_train
        target_lbl_dir = labels_val if is_val else labels_train
        split_key = "val" if is_val else "train"

        current_frame = 0
        sample_set = set(sample_indices)
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            if current_frame in sample_set:
                frame_name = f"{v.stem}_f{current_frame:04d}.jpg"
                img_path = target_img_dir / frame_name
                cv2.imwrite(str(img_path), frame)
                # Ensure placeholder label file exists
                lbl_path = target_lbl_dir / f"{v.stem}_f{current_frame:04d}.txt"
                if not lbl_path.exists():
                    lbl_path.touch()
                counts[split_key] += 1
            current_frame += 1

        cap.release()

    return counts


def export_yolo_yaml(output_path: Path | str, dataset_root: Path | str) -> None:
    """Writes the data.yaml configuration file for YOLO training."""
    out = Path(output_path)
    root = Path(dataset_root).resolve()
    content = f"""# SignBridge YOLO Object Detection Dataset
path: {root}
train: images/train
val: images/val

# Classes: Person, Hand, Face
names:
  0: person
  1: hand
  2: face
"""
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(content)
