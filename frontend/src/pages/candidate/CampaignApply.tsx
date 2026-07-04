import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { candidateApi } from "../../lib/api";
import PageShell from "../../components/layout/PageShell";
import type { RoundPublic } from "../../types";
import { FileText, Code2 } from "lucide-react";

export default function CampaignApply() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: campData } = useQuery({ queryKey: ["campaign-public", id], queryFn: () => candidateApi.getCampaign(id!) });
  const { data: roundsData } = useQuery({ queryKey: ["campaign-rounds-public", id], queryFn: () => candidateApi.getCampaignRounds(id!) });

  const campaign = campData?.data;
  const rounds: RoundPublic[] = roundsData?.data ?? [];

  const applyMut = useMutation({
    mutationFn: () => candidateApi.apply(id!),
    onSuccess: (res) => {
      const app = res.data;
      const round1 = rounds.find((r) => r.order === 1);
      if (round1) navigate(`/interview/${app.id}/${round1.id}`);
    },
  });

  if (!campaign) return null;

  return (
    <PageShell maxWidth="max-w-2xl">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-indigo-600 px-6 py-8">
          <h1 className="text-2xl font-bold text-white">{campaign.title}</h1>
          <p className="text-indigo-200 mt-1">{campaign.company_name}</p>
        </div>

        <div className="p-6">
          {campaign.description && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">About the Role</h2>
              <p className="text-gray-600">{campaign.description}</p>
            </div>
          )}

          {campaign.job_posting && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Job Description</h2>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{campaign.job_posting}</pre>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Interview Process</h2>
            <div className="space-y-2">
              {rounds.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {r.type === "resume" ? (
                    <FileText size={18} className="text-indigo-500 shrink-0" />
                  ) : (
                    <Code2 size={18} className="text-purple-500 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">Round {r.order}: {r.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{r.type === "coding" ? "Notebook / Coding" : "Resume review"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => applyMut.mutate()}
            disabled={applyMut.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-60"
          >
            {applyMut.isPending ? "Starting…" : "Apply & Begin Interview"}
          </button>
          {applyMut.isError && (
            <p className="text-sm text-red-500 mt-2 text-center">
              {(applyMut.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Something went wrong"}
            </p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
