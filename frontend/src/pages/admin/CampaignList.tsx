import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../lib/api";
import PageShell from "../../components/layout/PageShell";
import { Plus } from "lucide-react";
import type { Campaign } from "../../types";

export default function CampaignList() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["campaigns"], queryFn: () => adminApi.listCampaigns() });
  const campaigns: Campaign[] = data?.data ?? [];

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Campaigns</h1>
        <button
          onClick={() => navigate("/admin/campaigns/new")}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          <Plus size={16} /> New Campaign
        </button>
      </div>
      <div className="space-y-3">
        {campaigns.map((c) => (
          <div
            key={c.id}
            onClick={() => navigate(`/admin/campaigns/${c.id}`)}
            className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-indigo-300"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">{c.title}</p>
                <p className="text-sm text-gray-500 mt-1 line-clamp-1">{c.description}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-4 ${
                c.status === "active" ? "bg-green-100 text-green-700"
                : c.status === "draft" ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-500"
              }`}>
                {c.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
