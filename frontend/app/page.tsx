"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Loader2, Wand2 } from "lucide-react";

import ResultTable from "@/components/ResultTable";
import TopThreeResults from "@/components/TopThreeResults";
import UploadBox from "@/components/UploadBox";
import { PredictionResult, predictImages } from "@/lib/api";

export default function HomePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<PredictionResult[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sortedResults = useMemo(
    () => [...results].sort((a, b) => b.final_score - a.final_score),
    [results],
  );

  const handlePredict = async () => {
    if (files.length === 0) {
      setError("평가할 사진을 먼저 업로드해주세요.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await predictImages(files);
      setResults(response.sort((a, b) => b.final_score - a.final_score));
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "알 수 없는 오류가 발생했습니다.";
      setError(message);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-7 max-w-4xl">
        <p className="mb-3 inline-flex rounded-lg bg-white px-3 py-1 text-sm font-bold text-handong shadow-sm">
          HGU Life-shot Scoring Model
        </p>
        <h1 className="text-3xl font-black leading-tight text-ink sm:text-5xl">
          한동 감성 인생샷 평가 모델
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
          사진을 여러 장 업로드하면 AI가 미적 완성도, 한동 감성 유사도,
          랜드마크 포함 여부를 종합하여 Top 3 인생샷을 추천합니다.
        </p>
      </header>

      <UploadBox files={files} onFilesChange={setFiles} disabled={isLoading} />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handlePredict}
          disabled={isLoading || files.length === 0}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-handong px-5 py-3 text-base font-extrabold text-white shadow-soft transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Wand2 className="h-5 w-5" aria-hidden />
          )}
          {isLoading ? "평가 중" : "평가하기"}
        </button>
        {files.length > 0 && (
          <p className="text-sm font-medium text-slate-500">
            선택한 {files.length}장의 사진을 분석합니다.
          </p>
        )}
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p className="leading-6">{error}</p>
        </div>
      )}

      <TopThreeResults results={sortedResults} />
      <ResultTable results={sortedResults} />
    </main>
  );
}
