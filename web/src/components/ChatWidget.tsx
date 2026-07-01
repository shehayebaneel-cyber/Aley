import { FormEvent, useEffect, useRef, useState } from "react";
import { ChatBubbles } from "./ChatBubbles";
import { CloseIcon } from "./icons";
import { useUserAuth } from "../context/UserAuthContext";
import { userApi } from "../lib/api";
import type { ChatMessage } from "../types";

/** Customer-side chat with a business, as a bottom-right panel. */
export function ChatWidget({ business, onClose }: { business: { id: number; name: string; logo: string | null }; onClose: () => void }) {
  const { user, openAuth } = useUserAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    if (!user) { setLoading(false); return; }
    const load = () => userApi.get<{ messages: ChatMessage[] }>(`/api/me/chats/with/${business.id}`).then((d) => { if (alive.current) setMessages(d.messages); }).catch(() => {}).finally(() => alive.current && setLoading(false));
    load();
    const t = setInterval(load, 4000);
    return () => { alive.current = false; clearInterval(t); };
  }, [business.id, user]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    if (!user) return openAuth();
    setBusy(true);
    try {
      const r = await userApi.post<{ message: ChatMessage }>(`/api/me/chats/with/${business.id}`, { body });
      setMessages((m) => [...m, r.message]);
      setText("");
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] sm:inset-x-auto sm:bottom-6 sm:right-6">
      <div className="flex h-[70vh] max-h-[560px] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-lg sm:h-[520px] sm:w-96 sm:rounded-3xl">
        <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-brand to-brand-dark px-4 py-3 text-white">
          {business.logo && <img src={business.logo} alt="" className="h-8 w-8 rounded-lg object-cover" />}
          <div className="min-w-0 flex-1"><p className="truncate font-display font-bold">{business.name}</p><p className="text-[11px] text-white/80">Typically replies within a day</p></div>
          <button onClick={onClose} aria-label="Close" className="text-white/90 hover:text-white"><CloseIcon /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {!user ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-muted">Log in to message {business.name}.</p>
              <button onClick={openAuth} className="btn btn-primary px-5 py-2 text-sm">Log in</button>
            </div>
          ) : loading ? (
            <div className="h-full animate-pulse rounded-xl surface-2" />
          ) : (
            <ChatBubbles messages={messages} mineSender="CUSTOMER" emptyText={`Send ${business.name} a message — ask a question, check availability, or place a request.`} />
          )}
        </div>
        {user && (
          <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" className="input !py-2 text-sm" />
            <button type="submit" disabled={busy || !text.trim()} className="btn btn-primary shrink-0 px-4 py-2 text-sm disabled:opacity-50">Send</button>
          </form>
        )}
      </div>
    </div>
  );
}
