import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { candidateApi } from "../../lib/api";
import PageShell from "../../components/layout/PageShell";
import type { Campaign } from "../../types";
import { Building2, ChevronRight } from "lucide-react";

export default function CampaignBrowse() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["campaigns-public"], queryFn: () => candidateApi.listCampaigns() });
  const campaigns: Campaign[] = data?.data ?? [];

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Open Positions</h1>
        <p className="text-gray-500 mt-1">Browse and apply to interview campaigns</p>
      </div>

      <div className="grid gap-4">
        {campaigns.map((c) => (
          <div
            key={c.id}
            onClick={() => navigate(`/campaigns/${c.id}`)}
            className="bg-white border border-gray-200 rounded-xl p-6 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">{c.title}</h2>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                  <Building2 size={14} />
                  <span>{c.company_name}</span>
                </div>
                {c.description && (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">{c.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {c.round_count} round{c.round_count !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400 mt-1 ml-4 shrink-0" />
            </div>
          </div>
        ))}
        {campaigns.length === 0 && (
          <div className="text-center py-16 text-gray-400">No active campaigns available right now.</div>
        )}
      </div>
    </PageShell>
  );
}
