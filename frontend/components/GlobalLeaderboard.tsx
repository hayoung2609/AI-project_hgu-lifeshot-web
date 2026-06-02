import { Trophy } from "lucide-react";

import { LeaderboardEntry } from "@/lib/api";

type GlobalLeaderboardProps = {
  entries: LeaderboardEntry[];
  error?: string;
};

const RANK_LABELS = ["1위", "2위", "3위"];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function GlobalLeaderboard({ entries, error }: GlobalLeaderboardProps) {
  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-coral" aria-hidden />
          <h2 className="text-lg font-extrabold text-ink">전체 사용자 Top 3 점수</h2>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : entries.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
          아직 공개된 점수가 없습니다. 첫 평가 결과가 랭킹에 올라갑니다.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {entries.map((entry, index) => (
            <article
              key={entry.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-handong">
                    {RANK_LABELS[index] ?? `${index + 1}위`}
                  </p>
                  <p className="mt-1 max-w-40 truncate text-sm font-semibold text-slate-500">
                    {entry.image_name}
                  </p>
                </div>
                <p className="text-2xl font-black text-ink">
                  {entry.final_score.toFixed(1)}
                </p>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="font-semibold text-slate-500">NIMA</dt>
                  <dd className="mt-1 font-bold text-ink">{entry.aesthetic_score.toFixed(1)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Handong Similarity</dt>
                  <dd className="mt-1 font-bold text-ink">
                    {entry.handong_similarity_score.toFixed(1)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Landmark</dt>
                  <dd className="mt-1 font-bold text-ink">
                    {entry.landmark_class ?? "Not detected"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Bonus</dt>
                  <dd className="mt-1 font-bold text-ink">+{entry.landmark_bonus}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs font-medium text-slate-400">
                {formatDate(entry.created_at)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
