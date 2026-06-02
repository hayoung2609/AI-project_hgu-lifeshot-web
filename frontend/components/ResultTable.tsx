import ResultCard from "@/components/ResultCard";
import { PredictionResult, annotatedImageSrc } from "@/lib/api";

type ResultTableProps = {
  results: PredictionResult[];
};

function formatNumber(value: number | null | undefined, digits = 1) {
  if (typeof value !== "number") {
    return "-";
  }
  return value.toFixed(digits);
}

export default function ResultTable({ results }: ResultTableProps) {
  if (results.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink">전체 결과</h2>
          <p className="mt-1 text-sm text-slate-600">
            최종 점수 기준으로 높은 사진부터 정렬했습니다.
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-slate-500">{results.length}장</p>
      </div>

      <div className="grid gap-4 md:hidden">
        {results.map((result, index) => (
          <ResultCard key={`${result.image_name}-${index}`} result={result} rank={index + 1} />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-soft md:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">순위</th>
              <th className="px-4 py-3">사진</th>
              <th className="px-4 py-3">파일명</th>
              <th className="px-4 py-3 text-right">최종</th>
              <th className="px-4 py-3 text-right">NIMA</th>
              <th className="px-4 py-3 text-right">1-10</th>
              <th className="px-4 py-3 text-right">Handong Similarity</th>
              <th className="px-4 py-3">Landmark</th>
              <th className="px-4 py-3 text-right">conf</th>
              <th className="px-4 py-3 text-right">bonus</th>
              <th className="px-4 py-3">Similar References</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.map((result, index) => {
              const imageSrc = annotatedImageSrc(result);

              return (
                <tr key={`${result.image_name}-${index}`} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-handong">#{index + 1}</td>
                  <td className="px-4 py-3">
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={`${result.image_name} 분석 이미지`}
                        className="h-16 w-16 rounded-lg border border-slate-200 bg-slate-100 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-400">
                        없음
                      </div>
                    )}
                  </td>
                  <td className="max-w-56 px-4 py-3 font-semibold text-ink">
                    <span className="block truncate">{result.image_name}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-black text-ink">
                    {formatNumber(result.final_score)}
                  </td>
                  <td className="px-4 py-3 text-right">{formatNumber(result.aesthetic_score)}</td>
                  <td className="px-4 py-3 text-right">
                    {formatNumber(result.nima_score_1_10, 2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatNumber(result.handong_similarity_score)}
                  </td>
                  <td className="px-4 py-3">{result.landmark_class ?? "Not detected"}</td>
                  <td className="px-4 py-3 text-right">
                    {formatNumber(result.landmark_confidence, 3)}
                  </td>
                  <td className="px-4 py-3 text-right">+{result.landmark_bonus}</td>
                  <td className="max-w-72 px-4 py-3 text-slate-600">
                    <span className="line-clamp-2">
                      {result.most_similar_images.length > 0
                        ? result.most_similar_images.join(", ")
                        : "-"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
