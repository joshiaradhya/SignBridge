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


def _box_from_corners(class_id: int, left: float, top: float, right: float, bottom: float) -> BoundingBox | None:
    """Convert normalized corners to a clipped YOLO bounding box."""
    left, top = max(0.0, left), max(0.0, top)
    right, bottom = min(1.0, right), min(1.0, bottom)
    width, height = right - left, bottom - top
    if width <= 0 or height <= 0:
        return None
    return BoundingBox(class_id, left + width / 2, top + height / 2, width, height)


def _bootstrap_annotations(frame, hands, face_detector) -> list[BoundingBox]:
    """Create reviewable starter labels with MediaPipe for sampled sign frames.

    The person box deliberately covers the webcam frame. Hand and face boxes are
    derived from MediaPipe detections. These labels are useful for bootstrapping
    a detector, but should be spot-checked before using the resulting model.
    """
    import cv2

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    labels: list[BoundingBox] = [BoundingBox(0, 0.5, 0.5, 1.0, 1.0)]

    hand_result = hands.process(rgb)
    for hand in hand_result.multi_hand_landmarks or []:
        xs = [point.x for point in hand.landmark]
        ys = [point.y for point in hand.landmark]
        margin = 0.03
        box = _box_from_corners(1, min(xs) - margin, min(ys) - margin, max(xs) + margin, max(ys) + margin)
        if box:
            labels.append(box)

    face_result = face_detector.process(rgb)
    for detection in face_result.detections or []:
        relative = detection.location_data.relative_bounding_box
        box = _box_from_corners(
            2,
            relative.xmin,
            relative.ymin,
            relative.xmin + relative.width,
            relative.ymin + relative.height,
        )
        if box:
            labels.append(box)
    return labels


def sample_yolo_frames(
    video_paths: Sequence[Path | str],
    output_dir: Path | str,
    frames_per_video: int = 3,
    train_ratio: float = 0.8,
) -> dict[str, int]:
    """Sample video frames and bootstrap person/hand/face YOLO labels.

    MediaPipe provides starter hand and face boxes and every webcam frame gets
    a person box. Review a sample of the generated labels before production
    training; automatic annotations are not a substitute for a curated set.
    """
    try:
        import cv2
        import mediapipe as mp
    except ImportError:
        raise ImportError("OpenCV (cv2) and MediaPipe are required to sample and label frames.")

    out = Path(output_dir)
    images_train = out / "images" / "train"
    images_val = out / "images" / "val"
    labels_train = out / "labels" / "train"
    labels_val = out / "labels" / "val"

    for d in (images_train, images_val, labels_train, labels_val):
        d.mkdir(parents=True, exist_ok=True)

    counts = {"train": 0, "val": 0}

    with mp.solutions.hands.Hands(
        static_image_mode=True,
        max_num_hands=2,
        min_detection_confidence=0.5,
    ) as hands, mp.solutions.face_detection.FaceDetection(
        model_selection=0,
        min_detection_confidence=0.5,
    ) as face_detector:
        for idx, vpath in enumerate(video_paths):
            v = Path(vpath)
            cap = cv2.VideoCapture(str(v))
            if not cap.isOpened():
                continue

            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            if total_frames <= 0:
                cap.release()
                continue

            # Sample evenly across the middle 80% to avoid empty buffer frames.
            sample_indices = [
                int(total_frames * (0.1 + 0.8 * i / max(1, frames_per_video - 1)))
                for i in range(frames_per_video)
            ]

            split_period = max(2, round(1 / (1 - train_ratio)))
            is_val = idx % split_period == 0
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
                    frame_name = f"{idx:05d}_{v.stem}_f{current_frame:04d}.jpg"
                    img_path = target_img_dir / frame_name
                    label_path = target_lbl_dir / f"{img_path.stem}.txt"
                    labels = _bootstrap_annotations(frame, hands, face_detector)
                    if cv2.imwrite(str(img_path), frame):
                        label_path.write_text(
                            "\n".join(box.to_yolo_line() for box in labels) + "\n",
                            encoding="utf-8",
                        )
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
