import { useState } from "react";
import { Link } from "react-router-dom";
import { ChatWidget } from "../components/ChatWidget";
import { useUserAuth } from "../context/UserAuthContext";
import { useFetch } from "../lib/useFetch";
import { timeAgo } from "../lib/api";
import { useTitle } from "../lib/useTitle";
import type { ChatConversation } from "../types";

export function Messages() {
  useTitle("Messages");
  const { user, openAuth } = useUserAuth();
  const { data, loading } = useFetch<ChatConversation[]>(user ? "/api/me/chats" : null);
  const [open, setOpen] = useState<{ id: number; name: string; logo: string | null } | null>(null);

  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-extrabold text-ink">Messages</h1>
        <p className="mt-2 text-muted">Log in to chat directly with businesses across Lebanon.</p>
        <button onClick={openAuth} className="btn btn-primary mt-6 px-6 py-3">Log in</button>
      </div>
    );

  const convos = data ?? [];
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">Messages</h1>
      <p className="mt-1 text-muted">Your conversations with businesses.</p>

      <div className="mt-6 space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-16 animate-pulse" />)
        ) : convos.length === 0 ? (
          <div className="card p-12 text-center text-muted">
            No messages yet. Open any business page and tap <span className="font-semibold text-ink">Message</span> to start a chat.
            <div className="mt-3"><Link to="/explore" className="font-semibold text-brand">Browse businesses →</Link></div>
          </div>
        ) : (
          convos.map((c) => (
            <button key={c.id} onClick={() => setOpen({ id: c.businessId!, name: c.business?.name ?? "Business", logo: c.business?.logo ?? null })} className="card flex w-full items-center gap-3 p-3.5 text-left">
              {c.business?.logo ? <img src={c.business.logo} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-lg">💬</span>}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{c.business?.name ?? "Business"}</p>
                <p className="truncate text-sm text-muted">{c.lastSender === "CUSTOMER" ? "You: " : ""}{c.lastMessage}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[10px] text-muted">{timeAgo(c.lastMessageAt)}</span>
                {c.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{c.unread}</span>}
              </div>
            </button>
          ))
        )}
      </div>

      {open && <ChatWidget business={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
