import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { candidateApi } from "../../lib/api";
import Navbar from "../../components/layout/Navbar";
import AIChat from "../../components/interview/AIChat";
import ResumeEditor from "../../components/interview/ResumeEditor";
import NotebookEditor from "../../components/interview/NotebookEditor";
import type { NotebookCell, RoundPublic } from "../../types";
import { CheckCircle } from "lucide-react";

function serializeNotebook(cells: NotebookCell[]): string {
  const nb = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: { kernelspec: { display_name: "Python 3", language: "python", name: "python3" } },
    cells: cells.map((c) => ({
      cell_type: c.type === "markdown" ? "markdown" : "code",
      source: c.source,
      metadata: {},
      outputs: c.outputs.map((o) => ({
        output_type: o.output_type === "error" ? "error" : "stream",
        text: o.text,
        ...(o.output_type === "error" ? { ename: "Error", evalue: o.text, traceback: [] } : { name: "stdout" }),
      })),
      execution_count: c.execution_count ?? null,
    })),
  };
  return JSON.stringify(nb, null, 2);
}

function defaultCells(): NotebookCell[] {
  return [
    { id: "cell-0", type: "markdown", source: "## Problem\n\nRead the problem statement and write your solution below.", outputs: [] },
    { id: "cell-1", type: "code", source: "# Your solution here\n", outputs: [], execution_count: undefined },
  ];
}

export default function InterviewRoom() {
  const { appId, roundId } = useParams<{ appId: string; roundId: string }>();
  const navigate = useNavigate();

  const [content, setContent] = useState("");
  const [cells, setCells] = useState<NotebookCell[]>(defaultCells());
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data: appData } = useQuery({ queryKey: ["application", appId], queryFn: () => candidateApi.getApplication(appId!) });
  const { data: subData } = useQuery({
    queryKey: ["submission", appId, roundId],
    queryFn: () => candidateApi.getSubmission(appId!, roundId!),
  });
  const { data: roundsData } = useQuery({
    queryKey: ["campaign-rounds-public", appData?.data?.campaign_id],
    queryFn: () => candidateApi.getCampaignRounds(appData!.data.campaign_id),
    enabled: !!appData?.data?.campaign_id,
  });

  const app = appData?.data;
  const sub = subData?.data;
  const rounds: RoundPublic[] = roundsData?.data ?? [];
  const currentRound = rounds.find((r) => r.id === roundId);

  useEffect(() => {
    if (sub && sub.content) {
      if (currentRound?.type === "coding") {
        try {
          const parsed = JSON.parse(sub.content);
          if (parsed.cells) {
            setCells(
              parsed.cells.map((c: { cell_type: string; source: string; outputs: unknown[]; execution_count?: number }, i: number) => ({
                id: `cell-loaded-${i}`,
                type: c.cell_type === "markdown" ? "markdown" : "code",
                source: typeof c.source === "string" ? c.source : (c.source as string[]).join(""),
                outputs: [],
                execution_count: c.execution_count ?? undefined,
              }))
            );
          }
        } catch {
          /* not ipynb — use default cells */
        }
      } else {
        setContent(sub.content);
      }
    }
    if (sub?.status === "submitted") setSubmitted(true);
  }, [sub, currentRound]);

  const autoSave = (newContent: string) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await candidateApi.saveSubmission(appId!, roundId!, newContent);
      } finally {
        setSaving(false);
      }
    }, 1500);
  };

  const handleTextChange = (v: string) => {
    setContent(v);
    autoSave(v);
  };

  const handleCellsChange = (c: NotebookCell[]) => {
    setCells(c);
    autoSave(serializeNotebook(c));
  };

  const handleSubmit = async () => {
    if (!confirm("Submit this round? You won't be able to edit after submission.")) return;
    const finalContent = currentRound?.type === "coding" ? serializeNotebook(cells) : content;
    await candidateApi.saveSubmission(appId!, roundId!, finalContent);
    const updatedApp = await candidateApi.submitRound(appId!, roundId!);
    const nextRoundOrder = updatedApp.data.current_round_order;
    const nextRound = rounds.find((r) => r.order === nextRoundOrder);
    if (nextRound && nextRoundOrder !== app?.current_round_order) {
      navigate(`/interview/${appId}/${nextRound.id}`);
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Round Submitted!</h1>
            <p className="text-gray-500 mt-2">Your submission is under review. We'll be in touch.</p>
            <button onClick={() => navigate("/campaigns")} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Back to Campaigns
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Navbar />

      {/* Header bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-semibold text-gray-900">
            Round {currentRound?.order}: {currentRound?.name ?? "Interview"}
          </h1>
          <p className="text-xs text-gray-500 capitalize">{currentRound?.type === "coding" ? "Notebook / Coding Round" : "Resume Round"}</p>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-gray-400">Saving…</span>}
          {!saving && sub && <span className="text-xs text-green-500">Saved</span>}
          <button
            onClick={handleSubmit}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Submit Round
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor area */}
        <div className="flex-1 overflow-hidden">
          {currentRound?.type === "coding" ? (
            <div className="h-full overflow-y-auto">
              <NotebookEditor cells={cells} onChange={handleCellsChange} />
            </div>
          ) : (
            <ResumeEditor value={content} onChange={handleTextChange} />
          )}
        </div>

        {/* AI Chat panel */}
        <AIChat applicationId={appId!} roundId={roundId!} provider={undefined} />
      </div>
    </div>
  );
}
