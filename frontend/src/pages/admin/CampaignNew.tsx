import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../../lib/api";
import PageShell from "../../components/layout/PageShell";

export default function CampaignNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", job_posting: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await adminApi.createCampaign(form);
      navigate(`/admin/campaigns/${data.id}`);
    } catch {
      setError("Failed to create campaign");
      setLoading(false);
    }
  };

  return (
    <PageShell maxWidth="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">New Campaign</h1>
        <p className="text-sm text-gray-500 mt-1">Set up a job posting and interview campaign</p>
      </div>
      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
          <input
            type="text"
            value={form.title}
            onChange={set("title")}
            required
            placeholder="e.g. Senior Software Engineer"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
          <textarea
            value={form.description}
            onChange={set("description")}
            rows={2}
            placeholder="Brief overview of the role"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Posting{" "}
            <span className="text-gray-400 font-normal">(paste full JD or leave for candidates to see description)</span>
          </label>
          <textarea
            value={form.job_posting}
            onChange={set("job_posting")}
            rows={8}
            placeholder="Paste the full job description here…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-mono"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save as Draft"}
          </button>
        </div>
      </form>
    </PageShell>
  );
}
