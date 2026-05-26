from __future__ import annotations

import base64
import pickle
from functools import lru_cache
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import torch
from PIL import Image, ImageOps
from torchvision import transforms
from ultralytics import YOLO

from model_defs import get_best_device, load_nima_model


BASE_DIR = Path(__file__).resolve().parent
YOLO_WEIGHT_PATH = BASE_DIR / "weights" / "yolo_best.pt"
NIMA_WEIGHT_PATH = BASE_DIR / "weights" / "nima_epoch-82.pth"
REFERENCE_PATH = BASE_DIR / "reference" / "handong_reference.pkl"

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "bmp"}


class ModelFileMissingError(FileNotFoundError):
    pass


def _require_file(path: Path, label: str) -> None:
    if not path.exists():
        raise ModelFileMissingError(
            f"{label} 파일을 찾을 수 없습니다: {path}. README에 적힌 위치에 모델 파일을 넣어주세요."
        )


def _normalize_vectors(vectors: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms = np.clip(norms, 1e-12, None)
    return vectors / norms


def _to_numpy(value: Any) -> np.ndarray:
    if torch.is_tensor(value):
        return value.detach().cpu().numpy()
    return np.asarray(value)


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _score_from_distribution(probabilities: torch.Tensor) -> tuple[float, float]:
    ratings = torch.arange(1, 11, device=probabilities.device, dtype=torch.float32)
    nima_score = torch.sum(probabilities * ratings).item()
    aesthetic_score = ((nima_score - 1.0) / 9.0) * 100.0
    return float(np.clip(aesthetic_score, 0.0, 100.0)), float(nima_score)


def _landmark_bonus(confidence: float) -> int:
    if confidence >= 0.9:
        return 10
    if confidence >= 0.7:
        return 8
    if confidence >= 0.5:
        return 5
    return 0


def _image_to_base64_png(image_array: np.ndarray) -> str:
    success, buffer = cv2.imencode(".png", image_array)
    if not success:
        raise RuntimeError("annotated image PNG 변환에 실패했습니다.")
    return base64.b64encode(buffer).decode("utf-8")


class ImageScorer:
    def __init__(self) -> None:
        _require_file(YOLO_WEIGHT_PATH, "YOLO weight")
        _require_file(NIMA_WEIGHT_PATH, "NIMA weight")
        _require_file(REFERENCE_PATH, "한동 reference")

        self.device = get_best_device()
        self.yolo = YOLO(str(YOLO_WEIGHT_PATH))
        self.nima = load_nima_model(str(NIMA_WEIGHT_PATH), self.device)
        self.transform = transforms.Compose(
            [
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
            ]
        )
        self.reference = self._load_reference()

    def _load_reference(self) -> dict[str, Any]:
        with REFERENCE_PATH.open("rb") as file:
            data = pickle.load(file)

        vectors = _to_numpy(data["vectors"]).astype(np.float32)
        if vectors.ndim == 1:
            vectors = vectors.reshape(1, -1)

        image_names = [str(name) for name in data.get("image_names", [])]
        if len(image_names) != len(vectors):
            image_names = [f"reference_{idx}" for idx in range(len(vectors))]

        return {
            "vectors": _normalize_vectors(vectors),
            "image_names": image_names,
            "num_images": int(data.get("num_images", len(vectors))),
            "topk": int(data.get("topk", min(5, len(vectors)))),
            "q05": _safe_float(data.get("q05"), 0.0),
            "q95": _safe_float(data.get("q95"), 1.0),
        }

    def _run_nima(self, image_path: Path) -> tuple[float, float, np.ndarray]:
        image = ImageOps.exif_transpose(Image.open(image_path)).convert("RGB")
        tensor = self.transform(image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            features = self.nima.extract_features(tensor)
            probabilities = self.nima.classifier(features)[0]

        aesthetic_score, nima_score = _score_from_distribution(probabilities)
        feature_vector = features[0].detach().cpu().numpy().astype(np.float32)
        return aesthetic_score, nima_score, feature_vector

    def _run_similarity(self, feature_vector: np.ndarray) -> dict[str, Any]:
        query = feature_vector / max(float(np.linalg.norm(feature_vector)), 1e-12)
        similarities = self.reference["vectors"] @ query
        topk = min(max(1, self.reference["topk"]), len(similarities))
        top_indices = np.argsort(similarities)[::-1][:topk]
        top_scores = similarities[top_indices]
        topk_mean = float(np.mean(top_scores))

        q05 = self.reference["q05"]
        q95 = self.reference["q95"]
        if q95 <= q05:
            normalized = 0.0
        else:
            normalized = ((topk_mean - q05) / (q95 - q05)) * 100.0

        visible_count = min(5, len(top_indices))
        most_similar_images = [
            self.reference["image_names"][int(index)] for index in top_indices[:visible_count]
        ]

        return {
            "handong_similarity_score": float(np.clip(normalized, 0.0, 100.0)),
            "top1_similarity": float(top_scores[0]),
            "topk_mean_similarity": topk_mean,
            "most_similar_images": most_similar_images,
        }

    def _run_yolo(self, image_path: Path) -> dict[str, Any]:
        results = self.yolo.predict(source=str(image_path), save=False, verbose=False)
        result = results[0]
        annotated_image_base64 = _image_to_base64_png(result.plot())

        boxes = result.boxes
        if boxes is None or len(boxes) == 0:
            return {
                "raw_detected": False,
                "landmark_detected": False,
                "landmark_class": None,
                "raw_landmark_class": None,
                "landmark_confidence": None,
                "landmark_bonus": 0,
                "bbox_area_ratio": 0.0,
                "annotated_image_base64": annotated_image_base64,
            }

        confidences = boxes.conf.detach().cpu().numpy()
        best_index = int(np.argmax(confidences))
        confidence = float(confidences[best_index])
        class_id = int(boxes.cls[best_index].detach().cpu().item())
        class_name = str(result.names.get(class_id, class_id))
        landmark_detected = confidence >= 0.5

        xyxy = boxes.xyxy[best_index].detach().cpu().numpy()
        height, width = result.orig_shape
        box_area = max(0.0, float(xyxy[2] - xyxy[0])) * max(0.0, float(xyxy[3] - xyxy[1]))
        image_area = max(1.0, float(width * height))
        bbox_area_ratio = box_area / image_area

        return {
            "raw_detected": True,
            "landmark_detected": landmark_detected,
            "landmark_class": class_name if landmark_detected else None,
            "raw_landmark_class": class_name,
            "landmark_confidence": confidence,
            "landmark_bonus": _landmark_bonus(confidence),
            "bbox_area_ratio": bbox_area_ratio,
            "annotated_image_base64": annotated_image_base64,
        }

    def score_image(self, image_path: Path, image_name: str) -> dict[str, Any]:
        yolo_result = self._run_yolo(image_path)
        aesthetic_score, nima_score, feature_vector = self._run_nima(image_path)
        similarity_result = self._run_similarity(feature_vector)

        base_score = (
            0.65 * aesthetic_score + 0.35 * similarity_result["handong_similarity_score"]
        )
        final_score = min(100.0, base_score + yolo_result["landmark_bonus"])

        return {
            "image_name": image_name,
            **yolo_result,
            "aesthetic_score": round(aesthetic_score, 2),
            "nima_score_1_10": round(nima_score, 2),
            **{
                "handong_similarity_score": round(
                    similarity_result["handong_similarity_score"], 2
                ),
                "topk_mean_similarity": round(
                    similarity_result["topk_mean_similarity"], 6
                ),
                "top1_similarity": round(similarity_result["top1_similarity"], 6),
                "most_similar_images": similarity_result["most_similar_images"],
            },
            "base_score": round(base_score, 2),
            "final_score": round(final_score, 2),
        }


@lru_cache(maxsize=1)
def get_scorer() -> ImageScorer:
    return ImageScorer()
