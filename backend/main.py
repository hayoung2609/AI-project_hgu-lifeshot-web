from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Header, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from inference import ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES, ModelFileMissingError, get_scorer
from leaderboard import (
    add_leaderboard_entries,
    clear_leaderboard,
    get_top_leaderboard,
    init_leaderboard_db,
)


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


@app.on_event("startup")
def startup() -> None:
    init_leaderboard_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, object]:
    return {
        "status": "ok",
        "service": "HGU Life-shot Scoring Model API",
        "endpoints": ["GET /health", "GET /leaderboard", "DELETE /leaderboard", "POST /predict"],
    }


@app.get("/leaderboard")
def leaderboard(response: Response, limit: int = 3) -> dict[str, list[dict]]:
    response.headers["Cache-Control"] = "no-store"
    return {"results": get_top_leaderboard(limit)}


@app.delete("/leaderboard")
def reset_leaderboard(x_reset_token: str | None = Header(default=None)) -> dict[str, int | str]:
    expected_token = os.getenv("RESET_LEADERBOARD_TOKEN")
    if not expected_token:
        raise HTTPException(
            status_code=403,
            detail="RESET_LEADERBOARD_TOKEN 환경변수가 설정되어 있지 않습니다.",
        )
    if x_reset_token != expected_token:
        raise HTTPException(status_code=401, detail="초기화 토큰이 올바르지 않습니다.")

    deleted_count = clear_leaderboard()
    return {"status": "cleared", "deleted_count": deleted_count}


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

    add_leaderboard_entries(results)
    return {"results": results}
