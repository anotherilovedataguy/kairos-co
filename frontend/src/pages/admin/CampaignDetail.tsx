import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../lib/api";
import PageShell from "../../components/layout/PageShell";
import RoundForm from "../../components/admin/RoundForm";
import type { Application, Round } from "../../types";
import { Plus, Trash2, Edit2, Zap, Users } from "lucide-react";

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"rounds" | "applications">("rounds");
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [editRound, setEditRound] = useState<Round | null>(null);

  const { data: campaignData } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => adminApi.getCampaign(id!),
  });
  const { data: roundsData } = useQuery({
    queryKey: ["rounds", id],
    queryFn: () => adminApi.listRounds(id!),
  });
  const { data: appsData } = useQuery({
    queryKey: ["applications", id],
    queryFn: () => adminApi.listApplications(id!),
    enabled: tab === "applications",
  });

  const campaign = campaignData?.data;
  const rounds: Round[] = roundsData?.data ?? [];
  const applications: Application[] = appsData?.data ?? [];

  const publishMut = useMutation({
    mutationFn: () => adminApi.publishCampaign(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaign", id] }),
  });

  const deleteRoundMut = useMutation({
    mutationFn: (roundId: string) => adminApi.deleteRound(roundId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rounds", id] }),
  });

  const createRound = async (data: object) => {
    await adminApi.createRound(id!, data);
    qc.invalidateQueries({ queryKey: ["rounds", id] });
    setShowRoundForm(false);
  };

  const updateRound = async (data: object) => {
    await adminApi.updateRound(editRound!.id, data);
    qc.invalidateQueries({ queryKey: ["rounds", id] });
    setEditRound(null);
  };

  const triggerEval = async (roundId: string) => {
    await adminApi.triggerAiEval(roundId);
    alert("AI evaluation triggered for all submitted candidates in this round.");
  };

  const shortlist = async (roundId: string) => {
    const res = await adminApi.shortlist(roundId);
    const d = res.data;
    alert(`Shortlisted ${d.shortlisted.length} candidates. Rejected: ${d.rejected.length}. Auto-applied: ${d.auto_applied}`);
  };

  if (!campaign) return null;

  return (
    <PageShell>
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Campaign</p>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.title}</h1>
            <p className="text-gray-500 mt-1">{campaign.description}</p>
          </div>
          {campaign.status === "draft" && (
            <button
              onClick={() => publishMut.mutate()}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              Publish Campaign
            </button>
          )}
          {campaign.status === "active" && (
            <span className="bg-green-100 text-green-700 text-sm font-medium px-3 py-1.5 rounded-full">Active</span>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["rounds", "applications"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "rounds" && (
        <div>
          <div className="space-y-3 mb-4">
            {rounds.map((r) => (
              <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-5">
                {editRound?.id === r.id ? (
                  <RoundForm initial={r} onSave={updateRound} onCancel={() => setEditRound(null)} />
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Round {r.order}</span>
                        <p className="font-medium text-gray-900">{r.name}</p>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full capitalize">{r.type}</span>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full capitalize">
                          {r.evaluation_mode === "ai" ? `AI · ${r.ai_provider}` : "Manual"}
                        </span>
                      </div>
                      {r.evaluation_criteria && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{r.evaluation_criteria}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {r.evaluation_mode === "ai" && (
                        <button onClick={() => triggerEval(r.id)} title="Run AI Evaluation" className="text-purple-500 hover:text-purple-700">
                          <Zap size={16} />
                        </button>
                      )}
                      {r.shortlist_count && (
                        <button onClick={() => shortlist(r.id)} title="Shortlist" className="text-green-500 hover:text-green-700">
                          <Users size={16} />
                        </button>
                      )}
                      <button onClick={() => setEditRound(r)} className="text-gray-400 hover:text-gray-700">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => deleteRoundMut.mutate(r.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {showRoundForm ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Add Round</h3>
              <RoundForm onSave={createRound} onCancel={() => setShowRoundForm(false)} />
            </div>
          ) : (
            <button
              onClick={() => setShowRoundForm(true)}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <Plus size={16} /> Add Round
            </button>
          )}
        </div>
      )}

      {tab === "applications" && (
        <div className="space-y-3">
          {applications.map((a) => (
            <div
              key={a.id}
              onClick={() => navigate(`/admin/applications/${a.id}`)}
              className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between cursor-pointer hover:border-indigo-300"
            >
              <div>
                <p className="font-medium text-gray-900">{a.candidate_name}</p>
                <p className="text-sm text-gray-500">Round {a.current_round_order}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                a.status === "shortlisted" ? "bg-green-100 text-green-700"
                : a.status === "rejected" ? "bg-red-100 text-red-700"
                : a.status === "in_progress" ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-500"
              }`}>
                {a.status}
              </span>
            </div>
          ))}
          {applications.length === 0 && (
            <p className="text-center text-gray-400 py-12">No applications yet.</p>
          )}
        </div>
      )}
    </PageShell>
  );
}
