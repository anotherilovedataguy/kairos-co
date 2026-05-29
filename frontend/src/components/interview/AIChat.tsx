import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, ChevronRight, ChevronLeft, Bot } from "lucide-react";
import type { ChatMsg } from "../../types";

interface Props {
  applicationId: string;
  roundId: string;
  provider?: string;
}

export default function AIChat({ applicationId, roundId, provider = "claude" }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg: ChatMsg = { role: "user", content: input };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setStreaming(true);

    const assistantMsg: ChatMsg = { role: "assistant", content: "" };
    setMessages([...updated, assistantMsg]);

    try {
      const token = localStorage.getItem("token");
      const resp = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ application_id: applicationId, round_id: roundId, messages: updated }),
      });

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const { content } = JSON.parse(payload);
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + content };
              return copy;
            });
          } catch {
            /* skip malformed */
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { ...copy[copy.length - 1], content: "Error reaching AI. Please try again." };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  const providerLabel: Record<string, string> = { claude: "Claude", chatgpt: "ChatGPT", gemini: "Gemini" };

  return (
    <div className={`flex flex-col h-full bg-white border-l border-gray-200 transition-all ${collapsed ? "w-10" : "w-80"}`}>
      {collapsed ? (
        <button onClick={() => setCollapsed(false)} className="flex-1 flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-colors">
          <ChevronLeft size={20} />
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-indigo-600" />
              <span className="text-sm font-semibold text-gray-800">AI Assistant</span>
              <span className="text-xs px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">{providerLabel[provider] ?? provider}</span>
            </div>
            <button onClick={() => setCollapsed(true)} className="text-gray-400 hover:text-gray-600">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <MessageSquare size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Ask me anything about this round</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-indigo-600 text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}>
                  {m.content || <span className="opacity-50">…</span>}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Ask a question…"
                disabled={streaming}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
              />
              <button
                onClick={send}
                disabled={streaming || !input.trim()}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-60 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
