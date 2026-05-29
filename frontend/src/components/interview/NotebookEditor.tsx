import { useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import { Play, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import type { NotebookCell } from "../../types";
import api from "../../lib/api";

interface Props {
  cells: NotebookCell[];
  onChange: (cells: NotebookCell[]) => void;
}

let cellCounter = 0;
function newCell(type: "code" | "markdown"): NotebookCell {
  return { id: `cell-${++cellCounter}`, type, source: "", outputs: [] };
}

export default function NotebookEditor({ cells, onChange }: Props) {
  const [running, setRunning] = useState<string | null>(null);
  const [editingMarkdown, setEditingMarkdown] = useState<string | null>(null);
  const execCount = useRef(0);

  const update = (id: string, patch: Partial<NotebookCell>) =>
    onChange(cells.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const addCell = (type: "code" | "markdown") => onChange([...cells, newCell(type)]);

  const deleteCell = (id: string) => onChange(cells.filter((c) => c.id !== id));

  const runCell = async (cell: NotebookCell) => {
    if (cell.type !== "code") return;
    setRunning(cell.id);
    try {
      const { data } = await api.post("/ai/execute-cell", { code: cell.source });
      const outputs = [];
      if (data.stdout) outputs.push({ output_type: "stream" as const, text: data.stdout });
      if (data.stderr) outputs.push({ output_type: "error" as const, text: data.stderr });
      if (data.error) outputs.push({ output_type: "error" as const, text: data.error });
      update(cell.id, { outputs, execution_count: ++execCount.current });
    } finally {
      setRunning(null);
    }
  };

  const runAll = async () => {
    for (const cell of cells) {
      if (cell.type === "code") await runCell(cell);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-white">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2">
        <button
          onClick={() => addCell("code")}
          className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
        >
          <Plus size={12} /> Code
        </button>
        <button
          onClick={() => addCell("markdown")}
          className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
        >
          <Plus size={12} /> Markdown
        </button>
        <button
          onClick={runAll}
          className="flex items-center gap-1 text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          <Play size={12} /> Run All
        </button>
        <button
          onClick={() => onChange(cells.map((c) => ({ ...c, outputs: [] })))}
          className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
        >
          Clear Outputs
        </button>
      </div>

      {/* Cells */}
      <div className="p-4 space-y-3 flex-1">
        {cells.map((cell, idx) => (
          <div key={cell.id} className="border border-gray-200 rounded-lg overflow-hidden group">
            {/* Cell header */}
            <div className="flex items-center justify-between bg-gray-50 px-3 py-1.5 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {cell.type === "code"
                    ? `In [${cell.execution_count ?? " "}]:`
                    : "Markdown"}
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {cell.type === "code" && (
                  <button
                    onClick={() => runCell(cell)}
                    disabled={running === cell.id}
                    className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                    title="Run cell"
                  >
                    <Play size={13} />
                  </button>
                )}
                <button onClick={() => deleteCell(cell.id)} className="p-1 text-red-400 hover:text-red-600" title="Delete cell">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Cell body */}
            {cell.type === "code" ? (
              <div className="bg-gray-900">
                <Editor
                  height="120px"
                  language="python"
                  theme="vs-dark"
                  value={cell.source}
                  onChange={(v) => update(cell.id, { source: v ?? "" })}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    automaticLayout: true,
                  }}
                />
              </div>
            ) : editingMarkdown === cell.id ? (
              <div>
                <textarea
                  className="w-full p-3 text-sm font-mono focus:outline-none resize-y"
                  style={{ minHeight: 80 }}
                  value={cell.source}
                  onChange={(e) => update(cell.id, { source: e.target.value })}
                  onBlur={() => setEditingMarkdown(null)}
                  autoFocus
                />
              </div>
            ) : (
              <div
                className="p-4 prose prose-sm max-w-none cursor-text min-h-[48px]"
                onDoubleClick={() => setEditingMarkdown(cell.id)}
                title="Double-click to edit"
              >
                {cell.source ? (
                  <ReactMarkdown>{cell.source}</ReactMarkdown>
                ) : (
                  <span className="text-gray-400 italic text-sm">Double-click to edit markdown…</span>
                )}
              </div>
            )}

            {/* Outputs */}
            {cell.type === "code" && cell.outputs.length > 0 && (
              <div className="border-t border-gray-200">
                {cell.outputs.map((out, oi) => (
                  <div
                    key={oi}
                    className={`p-3 text-xs font-mono whitespace-pre-wrap ${
                      out.output_type === "error" ? "bg-red-50 text-red-700" : "bg-white text-gray-800"
                    }`}
                  >
                    {out.output_type === "stream" && <span className="text-gray-400 mr-2">Out:</span>}
                    {out.text}
                  </div>
                ))}
              </div>
            )}
            {running === cell.id && (
              <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-400 animate-pulse">
                Running…
              </div>
            )}
          </div>
        ))}

        {cells.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="mb-2">Empty notebook</p>
            <button onClick={() => addCell("code")} className="text-indigo-600 hover:underline text-sm">
              Add a code cell
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
