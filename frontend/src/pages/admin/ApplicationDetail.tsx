import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../lib/api";
import PageShell from "../../components/layout/PageShell";
import type { Evaluation, Submission } from "../../types";

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: appData } = useQuery({ queryKey: ["application", id], queryFn: () => adminApi.getApplication(id!) });
  const { data: subsData } = useQuery({ queryKey: ["submissions", id], queryFn: () => adminApi.getSubmissions(id!) });

  const app = appData?.data;
  const submissions: (Submission & { evaluation?: Evaluation })[] = subsData?.data ?? [];

  const [scores, setScores] = useState<Record<string, { score: string; feedback: string }>>({});
  const evalMut = useMutation({
    mutationFn: ({ subId, data }: { subId: string; data: object }) => adminApi.manualEvaluate(subId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submissions", id] }),
  });

  if (!app) return null;

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{app.candidate_name}</h1>
        <p className="text-sm text-gray-500">
          Status: <span className="font-medium capitalize">{app.status}</span> · Round {app.current_round_order}
        </p>
      </div>

      <div className="space-y-6">
        {submissions.map((sub) => {
          const s = scores[sub.id] ?? { score: sub.evaluation?.score?.toString() ?? "", feedback: sub.evaluation?.feedback ?? "" };
          return (
            <div key={sub.id} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-gray-900">Round {sub.round_id.slice(-4)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  sub.status === "evaluated" ? "bg-green-100 text-green-700"
                  : sub.status === "submitted" ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-500"
                }`}>{sub.status}</span>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{sub.content || "No content submitted"}</pre>
              </div>

              {sub.evaluation && (
                <div className="mb-3 p-3 bg-indigo-50 rounded-lg text-sm">
                  <p className="font-medium text-indigo-800">
                    AI Evaluation · Score: {sub.evaluation.score ?? "N/A"}
                  </p>
                  <p className="text-indigo-700 mt-1">{sub.evaluation.feedback}</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Manual Override</p>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={s.score}
                    onChange={(e) => setScores((sc) => ({ ...sc, [sub.id]: { ...s, score: e.target.value } }))}
                    placeholder="Score (0–100)"
                    min={0}
                    max={100}
                    className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    value={s.feedback}
                    onChange={(e) => setScores((sc) => ({ ...sc, [sub.id]: { ...s, feedback: e.target.value } }))}
                    placeholder="Feedback…"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => evalMut.mutate({ subId: sub.id, data: { score: Number(s.score), feedback: s.feedback } })}
                    className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
