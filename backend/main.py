from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from inference import ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES, ModelFileMissingError, get_scorer


def _parse_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "*")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


app = FastAPI(
    title="HGU Life-shot Scoring Model API",
    description="한동 감성 인생샷 평가 모델 FastAPI 백엔드",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _validate_upload(file: UploadFile) -> str:
    if not file.filename:
        raise HTTPException(status_code=400, detail="파일 이름이 비어 있습니다.")

    suffix = Path(file.filename).suffix.lower().lstrip(".")
    if suffix not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 파일 형식입니다. 허용 확장자: {allowed}",
        )
    return suffix


@app.post("/predict")
async def predict(files: list[UploadFile] = File(...)) -> dict[str, list[dict]]:
    if not files:
        raise HTTPException(status_code=400, detail="업로드된 파일이 없습니다.")

    try:
        scorer = get_scorer()
    except ModelFileMissingError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"모델 로딩 실패: {exc}") from exc

    results: list[dict] = []
    with tempfile.TemporaryDirectory(prefix="hgu_lifeshot_") as tmp_dir:
        tmp_path = Path(tmp_dir)

        for index, file in enumerate(files):
            suffix = _validate_upload(file)
            content = await file.read(MAX_FILE_SIZE_BYTES + 1)
            if len(content) > MAX_FILE_SIZE_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"{file.filename} 파일이 너무 큽니다. 이미지당 최대 10MB까지 업로드할 수 있습니다.",
                )
            if len(content) == 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"{file.filename} 파일이 비어 있습니다.",
                )

            safe_name = Path(file.filename).name
            saved_path = tmp_path / f"{index:03d}_{safe_name}"
            if not saved_path.suffix:
                saved_path = saved_path.with_suffix(f".{suffix}")
            saved_path.write_bytes(content)

            try:
                results.append(scorer.score_image(saved_path, safe_name))
            except Exception as exc:
                raise HTTPException(
                    status_code=500,
                    detail=f"{safe_name} 평가 중 오류가 발생했습니다: {exc}",
                ) from exc

    return {"results": results}
