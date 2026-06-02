import { Award, MapPin, Sparkles } from "lucide-react";

import { PredictionResult, annotatedImageSrc } from "@/lib/api";

type TopThreeResultsProps = {
  results: PredictionResult[];
};

const BADGES = ["1위 🥇", "2위 🥈", "3위 🥉"];

function scoreText(value: number, suffix = "점") {
  return `${value.toFixed(1)}${suffix}`;
}

export default function TopThreeResults({ results }: TopThreeResultsProps) {
  const topThree = results.slice(0, 3);

  if (topThree.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <Award className="h-5 w-5 text-coral" aria-hidden />
        <h2 className="text-xl font-bold text-ink">Top 3 인생샷</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {topThree.map((result, index) => {
          const imageSrc = annotatedImageSrc(result);
          return (
            <article
              key={`${result.image_name}-${index}`}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft"
            >
              <div className="relative bg-slate-100">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={`${result.image_name} 분석 이미지`}
                    className="h-72 w-full object-contain"
                  />
                ) : (
                  <div className="flex h-72 items-center justify-center text-sm text-slate-500">
                    이미지 없음
                  </div>
                )}
                <div className="absolute left-3 top-3 rounded-lg bg-white px-3 py-2 text-sm font-extrabold text-ink shadow">
                  {BADGES[index]}
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <p className="truncate text-sm font-medium text-slate-500">{result.image_name}</p>
                  <p className="mt-1 text-3xl font-black text-handong">
                    {scoreText(result.final_score)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                      <Sparkles className="h-4 w-4 text-coral" aria-hidden />
                      NIMA
                    </div>
                    <p className="mt-1 text-lg font-bold text-ink">
                      {scoreText(result.aesthetic_score)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                      <MapPin className="h-4 w-4 text-leaf" aria-hidden />
                      Handong Similarity
                    </div>
                    <p className="mt-1 text-lg font-bold text-ink">
                      {scoreText(result.handong_similarity_score)}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-600">Landmark</span>
                    <span className="font-bold text-ink">
                      {result.landmark_class ?? "Not detected"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-slate-600">
                    <span>
                      confidence{" "}
                      {result.landmark_confidence === null
                        ? "-"
                        : result.landmark_confidence.toFixed(3)}
                    </span>
                    <span>bonus +{result.landmark_bonus}</span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
