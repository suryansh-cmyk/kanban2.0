"use client";

import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiChatProps {
  username: string;
  onBoardUpdated: (board: BoardData) => void;
}

const HINTS = [
  "What's in my Backlog?",
  "Move the first card to Done",
  "Add a card 'Fix login bug' to In Progress",
];

export const AiChat = ({ username, onBoardUpdated }: AiChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await sendChatMessage(username, text);
      setMessages((prev) => [...prev, { role: "assistant", content: res.message }]);
      if (res.board !== null) onBoardUpdated(res.board);
    } catch {
      setError("Could not reach AI. Please try again.");
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--stroke)] bg-[var(--navy-dark)] px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--accent-yellow)]">
          AI Assistant
        </p>
        <p className="mt-0.5 text-sm font-medium text-white/70">
          Ask anything about your board
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mt-2 flex flex-col gap-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--gray-text)]">
              Try asking
            </p>
            {HINTS.map((hint) => (
              <button
                key={hint}
                onClick={() => { setInput(hint); textareaRef.current?.focus(); }}
                className="rounded-xl border border-[var(--stroke)] bg-white px-4 py-2.5 text-left text-xs text-[var(--navy-dark)] transition hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)]"
              >
                {hint}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 mt-2">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--navy-dark)] text-[var(--accent-yellow)]">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 14h-2v-6h2v6zm0-8h-2V6h2v2z" />
                  </svg>
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[var(--secondary-purple)] text-white"
                    : "border border-[var(--stroke)] bg-white text-[var(--navy-dark)]"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--navy-dark)] text-[var(--accent-yellow)]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 14h-2v-6h2v6zm0-8h-2V6h2v2z" />
                </svg>
              </div>
              <div className="rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3">
                <span className="flex gap-1 items-center">
                  {[0, 160, 320].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--gray-text)]"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <p className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500">
          {error}
        </p>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-[var(--stroke)] p-4">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Message… (Enter to send)"
            className="flex-1 resize-none rounded-xl border border-[var(--stroke)] bg-[#f4f5f8] px-3.5 py-2.5 text-sm text-[var(--navy-dark)] placeholder-[var(--gray-text)] outline-none transition focus:border-[var(--primary-blue)]"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--secondary-purple)] text-white transition disabled:opacity-30 hover:opacity-90"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-[var(--gray-text)]">Shift+Enter for new line</p>
      </div>
    </div>
  );
};
