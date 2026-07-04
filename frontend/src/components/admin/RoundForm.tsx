import { useState } from "react";
import type { Round } from "../../types";

interface Props {
  initial?: Partial<Round>;
  onSave: (data: Partial<Round>) => Promise<void>;
  onCancel: () => void;
}

export default function RoundForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    type: initial?.type ?? "resume",
    evaluation_mode: initial?.evaluation_mode ?? "ai",
    ai_provider: initial?.ai_provider ?? "claude",
    evaluation_criteria: initial?.evaluation_criteria ?? "",
    shortlist_count: initial?.shortlist_count ?? "",
    auto_select: initial?.auto_select ?? false,
  });
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave({
      ...form,
      shortlist_count: form.shortlist_count ? Number(form.shortlist_count) : undefined,
      ai_provider: form.evaluation_mode === "ai" ? (form.ai_provider as Round["ai_provider"]) : undefined,
    });
    setLoading(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Round Name</label>
          <input
            value={form.name}
            onChange={set("name")}
            required
            placeholder="e.g. Resume Screening"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Round Type</label>
          <select value={form.type} onChange={set("type")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="resume">Resume Round</option>
            <option value="coding">Coding / Notebook Round</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Evaluation Mode</label>
          <select value={form.evaluation_mode} onChange={set("evaluation_mode")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="ai">AI Evaluated</option>
            <option value="manual">Manual Review</option>
          </select>
        </div>
        {form.evaluation_mode === "ai" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">AI Provider</label>
            <select value={form.ai_provider} onChange={set("ai_provider")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="claude">Claude (Anthropic)</option>
              <option value="chatgpt">ChatGPT (OpenAI)</option>
              <option value="gemini">Gemini (Google)</option>
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Evaluation Criteria
          <span className="text-gray-400 font-normal ml-1">(context fed to the AI evaluator)</span>
        </label>
        <textarea
          value={form.evaluation_criteria}
          onChange={set("evaluation_criteria")}
          rows={4}
          placeholder="Describe what to look for: required skills, red flags, scoring rubric…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shortlist Count</label>
          <input
            type="number"
            value={form.shortlist_count}
            onChange={set("shortlist_count")}
            min={1}
            placeholder="Leave blank for no limit"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.auto_select}
              onChange={(e) => setForm((f) => ({ ...f, auto_select: e.target.checked }))}
              className="accent-indigo-600"
            />
            <span className="text-sm text-gray-700">Auto-select shortlist</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-60">
          {loading ? "Saving…" : "Save Round"}
        </button>
      </div>
    </form>
  );
}
