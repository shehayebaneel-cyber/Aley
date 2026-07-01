import { useEffect, useRef } from "react";
import { timeAgo } from "../lib/api";
import type { ChatMessage } from "../types";

/** Shared message thread rendering. `mineSender` is the viewer's role ("CUSTOMER" | "BUSINESS"). */
export function ChatBubbles({ messages, mineSender, emptyText }: { messages: ChatMessage[]; mineSender: string; emptyText?: string }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  if (messages.length === 0) return <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">{emptyText ?? "No messages yet — say hello 👋"}</div>;
  return (
    <div className="space-y-2">
      {messages.map((m) => {
        const mine = m.sender === mineSender;
        return (
          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-brand text-white" : "surface-2 text-ink"}`}>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={`mt-0.5 text-[10px] ${mine ? "text-white/70" : "text-muted"}`}>{timeAgo(m.createdAt)}</p>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
