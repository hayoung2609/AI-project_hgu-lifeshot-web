import { MapPinned } from "lucide-react";

import { PredictionResult, annotatedImageSrc } from "@/lib/api";

type ResultCardProps = {
  result: PredictionResult;
  rank: number;
};

export default function ResultCard({ result, rank }: ResultCardProps) {
  const imageSrc = annotatedImageSrc(result);

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={`${result.image_name} 분석 이미지`}
          className="h-44 w-full bg-slate-100 object-contain"
        />
      ) : (
        <div className="flex h-44 items-center justify-center bg-slate-100 text-sm text-slate-500">
          이미지 없음
        </div>
      )}
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-handong">#{rank}</p>
            <h3 className="truncate text-base font-bold text-ink">{result.image_name}</h3>
          </div>
          <p className="shrink-0 text-xl font-black text-ink">{result.final_score.toFixed(1)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-xs font-semibold text-slate-500">NIMA 미적 점수</p>
            <p className="font-bold text-ink">{result.aesthetic_score.toFixed(1)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-xs font-semibold text-slate-500">한동 감성</p>
            <p className="font-bold text-ink">
              {result.handong_similarity_score.toFixed(1)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm">
          <MapPinned className="h-4 w-4 text-leaf" aria-hidden />
          <span className="font-semibold text-slate-600">{result.landmark_class ?? "미탐지"}</span>
          <span className="ml-auto text-slate-500">+{result.landmark_bonus}</span>
        </div>
        {result.most_similar_images.length > 0 && (
          <p className="line-clamp-2 text-xs leading-5 text-slate-500">
            유사 기준 사진: {result.most_similar_images.join(", ")}
          </p>
        )}
      </div>
    </article>
  );
}
