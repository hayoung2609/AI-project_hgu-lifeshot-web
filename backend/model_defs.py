from __future__ import annotations

from collections.abc import Mapping
from typing import Any

import torch
from torch import nn
from torchvision import models


class NIMAModel(nn.Module):
    """NIMA-style aesthetic model with a VGG16 feature extractor."""

    def __init__(self) -> None:
        super().__init__()
        vgg16 = models.vgg16(weights=None)
        self.features = vgg16.features
        self.avgpool = vgg16.avgpool
        self.classifier = nn.Sequential(
            nn.Dropout(p=0.75),
            nn.Linear(25088, 10),
            nn.Softmax(dim=1),
        )

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = self.avgpool(x)
        return torch.flatten(x, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.extract_features(x)
        return self.classifier(x)


def get_best_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def _extract_state_dict(checkpoint: Any) -> Mapping[str, Any]:
    if isinstance(checkpoint, nn.Module):
        return checkpoint.state_dict()
    if isinstance(checkpoint, Mapping):
        for key in ("state_dict", "model_state_dict", "model"):
            value = checkpoint.get(key)
            if isinstance(value, Mapping):
                return value
        return checkpoint
    raise TypeError("지원하지 않는 NIMA checkpoint 형식입니다.")


def load_nima_model(weight_path: str, device: torch.device) -> NIMAModel:
    model = NIMAModel().to(device)
    checkpoint = torch.load(weight_path, map_location=device)
    state_dict = _extract_state_dict(checkpoint)

    cleaned_state = {}
    for key, value in state_dict.items():
        cleaned_key = key
        if cleaned_key.startswith("module."):
            cleaned_key = cleaned_key[len("module.") :]
        cleaned_state[cleaned_key] = value

    model.load_state_dict(cleaned_state, strict=False)
    model.eval()
    return model
