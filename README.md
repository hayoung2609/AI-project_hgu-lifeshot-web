# HGU Life-shot Scoring Model

한동 감성 인생샷 평가 모델을 웹서비스로 실행하기 위한 Next.js 프론트엔드와 FastAPI 백엔드입니다.

## 구조

```text
hgu-lifeshot-web/
├── frontend/   # Vercel 배포용 Next.js + TypeScript + Tailwind CSS
└── backend/    # Render 배포용 FastAPI + 모델 추론 서버
```

## 모델 파일 위치

실제 weight와 reference 파일은 용량이 클 수 있으므로 GitHub에 직접 올리지 않는 것을 권장합니다. 아래 위치에 직접 넣어주세요.

```text
backend/weights/yolo_best.pt
backend/weights/nima_epoch-82.pth
backend/reference/handong_reference.pkl
```

`handong_reference.pkl`에는 `vectors`, `image_names`, `num_images`, `topk`, `q05`, `q95`가 들어있어야 합니다.

## 백엔드 로컬 실행

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

확인:

```bash
curl http://localhost:8000/health
```

정상 응답:

```json
{"status":"ok"}
```

## 프론트엔드 로컬 실행

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

브라우저에서 `http://localhost:3000`을 열면 됩니다.

## API

### `GET /health`

```json
{"status":"ok"}
```

### `POST /predict`

- `multipart/form-data`
- key: `files`
- 여러 장 업로드 가능
- 허용 확장자: `jpg`, `jpeg`, `png`, `webp`, `bmp`
- 파일당 최대 10MB

응답은 `results` 배열입니다. 각 항목에는 최종 점수, NIMA 점수, 한동 감성 유사도, 랜드마크 정보, base64 annotated image가 포함됩니다.

### `GET /leaderboard?limit=3`

전체 사용자 점수 랭킹을 반환합니다. 사진 원본은 저장하지 않고 점수와 기본 메타데이터만 SQLite에 저장합니다.

```json
{
  "results": [
    {
      "id": 1,
      "image_name": "example.jpg",
      "final_score": 92.3,
      "aesthetic_score": 88.1,
      "handong_similarity_score": 95.5,
      "landmark_bonus": 8,
      "landmark_class": "OH",
      "created_at": "2026-05-26T08:00:00+00:00"
    }
  ]
}
```

## 점수 계산

```text
base_score = 0.65 * aesthetic_score + 0.35 * handong_similarity_score
final_score = min(100, base_score + landmark_bonus)
```

랜드마크 보너스:

```text
confidence >= 0.9 -> +10
confidence >= 0.7 -> +8
confidence >= 0.5 -> +5
otherwise -> +0
```

## Render 백엔드 배포

1. GitHub에 프로젝트를 올립니다.
2. Render에서 새 Web Service를 만듭니다.
3. Docker 배포를 선택하고 Root Directory를 `backend`로 설정합니다.
4. Dockerfile은 `backend/Dockerfile`을 사용합니다.
5. 모델 파일은 Render Disk, 수동 업로드, Git LFS, 또는 외부 스토리지 다운로드 방식으로 서버의 아래 경로에 배치합니다.

```text
/app/weights/yolo_best.pt
/app/weights/nima_epoch-82.pth
/app/reference/handong_reference.pkl
```

Docker를 쓰지 않는 Native Python 서비스로 배포할 경우 Start Command는 다음과 같습니다.

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

환경변수:

```text
CORS_ORIGINS=*
```

Vercel 도메인을 확정한 뒤에는 `CORS_ORIGINS=https://프론트엔드주소.vercel.app`처럼 좁히는 것을 권장합니다.

## Vercel 프론트엔드 배포

1. Vercel에서 새 프로젝트를 만들고 Root Directory를 `frontend`로 설정합니다.
2. 환경변수를 추가합니다.

```text
NEXT_PUBLIC_API_URL=https://백엔드주소.onrender.com
```

3. Build Command는 기본값 `npm run build`, Output은 Next.js 기본값을 사용합니다.

## 환경변수

| 위치 | 이름 | 예시 | 설명 |
| --- | --- | --- | --- |
| frontend | `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | FastAPI 백엔드 주소 |
| backend | `CORS_ORIGINS` | `*` | 프론트엔드 요청을 허용할 Origin 목록 |
| backend | `LEADERBOARD_DB_PATH` | `/app/data/leaderboard.sqlite3` | 전체 사용자 점수 랭킹 SQLite 저장 위치 |

## 주의사항

- `.pt`, `.pth`, `.pkl` 파일은 용량이 클 수 있으니 GitHub에 직접 올리지 말고 Google Drive, Git LFS, Render Disk, 또는 배포 시 수동 업로드 방식을 사용하세요.
- Render 무료 플랜은 서버가 잠든 뒤 첫 요청이 느릴 수 있습니다.
- 전체 사용자 Top 3 점수는 기본적으로 `backend/data/leaderboard.sqlite3`에 저장됩니다. Render 무료 플랜의 ephemeral filesystem에서는 재시작/재배포 시 데이터가 사라질 수 있으므로, 실제 운영에서는 Render Disk, Supabase, PostgreSQL 같은 영구 저장소를 사용하세요.
- CPU 환경에서도 동작하도록 구현했지만, NIMA와 YOLO 추론은 이미지 수가 많을수록 시간이 걸립니다.
- 모델 파일이 없으면 `/predict`는 어떤 파일이 빠졌는지 알려주는 500 오류를 반환합니다.
