import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../lib/api";
import PageShell from "../../components/layout/PageShell";
import { useAuth } from "../../lib/auth";
import { Plus, ArrowRight } from "lucide-react";
import type { Campaign } from "../../types";

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["campaigns"], queryFn: () => adminApi.listCampaigns() });
  const campaigns: Campaign[] = data?.data ?? [];

  const active = campaigns.filter((c) => c.status === "active").length;
  const draft = campaigns.filter((c) => c.status === "draft").length;

  return (
    <PageShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.full_name}</h1>
        <p className="text-gray-500 mt-1">{user?.company_name}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Campaigns", value: campaigns.length },
          { label: "Active", value: active },
          { label: "Drafts", value: draft },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-3xl font-bold text-indigo-600">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Your Campaigns</h2>
        <button
          onClick={() => navigate("/admin/campaigns/new")}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> New Campaign
        </button>
      </div>

      <div className="space-y-3">
        {campaigns.map((c) => (
          <div
            key={c.id}
            onClick={() => navigate(`/admin/campaigns/${c.id}`)}
            className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-colors"
          >
            <div>
              <p className="font-medium text-gray-900">{c.title}</p>
              <p className="text-sm text-gray-500 mt-0.5">{c.round_count ?? 0} rounds</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                c.status === "active" ? "bg-green-100 text-green-700"
                : c.status === "draft" ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-500"
              }`}>
                {c.status}
              </span>
              <ArrowRight size={16} className="text-gray-400" />
            </div>
          </div>
        ))}
        {campaigns.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            No campaigns yet.{" "}
            <button onClick={() => navigate("/admin/campaigns/new")} className="text-indigo-600 hover:underline">
              Create one
            </button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
