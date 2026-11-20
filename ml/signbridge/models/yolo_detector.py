"""YOLO detector for person, hand, and face detection.

Integrates ultralytics YOLO (e.g., YOLOv8n / YOLO11n) for spatial region-of-interest
detection in sign language video processing.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

YOLO_CLASSES = ["person", "hand", "face"]


@dataclass
class DetectedBox:
    class_id: int
    class_name: str
    confidence: float
    x1: float
    y1: float
    x2: float
    y2: float

    @property
    def box_xywh(self) -> tuple[float, float, float, float]:
        return (self.x1, self.y1, self.x2 - self.x1, self.y2 - self.y1)


class SignYoloDetector:
    """YOLO detector for locating signers, hands, and faces in video frames."""

    def __init__(self, model_path: str | Path | None = None) -> None:
        self.model_path = str(model_path) if model_path else None
        self._model: Any = None

    def load(self) -> None:
        """Loads YOLO model from disk or initializes YOLOv8n."""
        try:
            from ultralytics import YOLO
        except ImportError:
            raise ImportError(
                "ultralytics package is required for YOLO detection. "
                "Install with `pip install ultralytics` in Google Colab."
            )

        if self.model_path and Path(self.model_path).exists():
            self._model = YOLO(self.model_path)
        else:
            # Default to YOLOv8 nano pretrained weights
            self._model = YOLO("yolov8n.pt")

    def detect(
        self,
        frame_rgb_or_bgr: Any,
        conf: float = 0.35,
    ) -> list[DetectedBox]:
        """Runs detection on a single frame."""
        if self._model is None:
            self.load()

        results = self._model(frame_rgb_or_bgr, conf=conf, verbose=False)
        detected: list[DetectedBox] = []

        for r in results:
            boxes = r.boxes
            if boxes is None:
                continue
            for b in boxes:
                cls_idx = int(b.cls.item())
                confidence = float(b.conf.item())
                x1, y1, x2, y2 = b.xyxy[0].tolist()

                name = YOLO_CLASSES[cls_idx] if cls_idx < len(YOLO_CLASSES) else f"class_{cls_idx}"
                detected.append(
                    DetectedBox(
                        class_id=cls_idx,
                        class_name=name,
                        confidence=confidence,
                        x1=x1,
                        y1=y1,
                        x2=x2,
                        y2=y2,
                    )
                )

        return detected


def crop_roi(
    image: Any,
    box: DetectedBox,
    pad_ratio: float = 0.15,
) -> Any:
    """Crops an image around a detected bounding box with optional boundary padding."""
    h, w = image.shape[:2]
    bw = box.x2 - box.x1
    bh = box.y2 - box.y1

    pad_x = bw * pad_ratio
    pad_y = bh * pad_ratio

    x1 = max(0, int(box.x1 - pad_x))
    y1 = max(0, int(box.y1 - pad_y))
    x2 = min(w, int(box.x2 + pad_x))
    y2 = min(h, int(box.y2 + pad_y))

    return image[y1:y2, x1:x2]
