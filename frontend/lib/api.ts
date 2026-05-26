export type PredictionResult = {
  image_name: string;
  raw_detected?: boolean;
  landmark_detected: boolean;
  landmark_class: string | null;
  raw_landmark_class?: string | null;
  landmark_confidence: number | null;
  landmark_bonus: number;
  bbox_area_ratio: number;
  aesthetic_score: number;
  nima_score_1_10: number;
  handong_similarity_score: number;
  topk_mean_similarity: number;
  top1_similarity: number;
  most_similar_images: string[];
  base_score: number;
  final_score: number;
  annotated_image_base64?: string;
};

export type LeaderboardEntry = {
  id: number;
  image_name: string;
  final_score: number;
  aesthetic_score: number;
  handong_similarity_score: number;
  landmark_bonus: number;
  landmark_class: string | null;
  created_at: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
  }
  return fallback;
}

export async function predictImages(files: File[]): Promise<PredictionResult[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  let response: Response;
  try {
    response = await fetch(`${API_URL}/predict`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error("백엔드에 연결할 수 없습니다. NEXT_PUBLIC_API_URL 값을 확인해주세요.");
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "이미지 평가 중 오류가 발생했습니다."));
  }

  if (Array.isArray(payload)) {
    return payload as PredictionResult[];
  }

  const results = (payload as { results?: PredictionResult[] } | null)?.results;
  if (!Array.isArray(results)) {
    throw new Error("백엔드 응답 형식이 올바르지 않습니다.");
  }
  return results;
}

export async function fetchLeaderboard(limit = 3): Promise<LeaderboardEntry[]> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/leaderboard?limit=${limit}`, {
      cache: "no-store",
    });
  } catch {
    throw new Error("전체 랭킹을 불러올 수 없습니다.");
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "전체 랭킹을 불러올 수 없습니다."));
  }

  const results = (payload as { results?: LeaderboardEntry[] } | null)?.results;
  if (!Array.isArray(results)) {
    throw new Error("전체 랭킹 응답 형식이 올바르지 않습니다.");
  }
  return results;
}

export function annotatedImageSrc(result: PredictionResult) {
  if (!result.annotated_image_base64) {
    return "";
  }
  return `data:image/png;base64,${result.annotated_image_base64}`;
}
