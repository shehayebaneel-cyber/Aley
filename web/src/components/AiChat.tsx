import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";

export interface AiMessage { role: "user" | "assistant"; content: string }

// ---- Minimal rich renderer: **bold**, [label](url) links, bullet lines ----
function renderInline(text: string, onNavigate?: () => void): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Split on links and bold, preserving order.
  const re = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      const label = m[2], url = m[3];
      if (url.startsWith("/")) nodes.push(<Link key={k++} to={url} onClick={onNavigate} className="font-semibold text-brand hover:underline">{label}</Link>);
      else nodes.push(<a key={k++} href={url} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">{label}</a>);
    } else if (m[4]) {
      nodes.push(<strong key={k++} className="font-bold text-ink">{m[5]}</strong>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Rich({ text, onNavigate }: { text: string; onNavigate?: () => void }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let bullets: ReactNode[] = [];
  const flush = () => { if (bullets.length) { out.push(<ul key={out.length} className="my-1 space-y-0.5 pl-1">{bullets}</ul>); bullets = []; } };
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith("- ") || t.startsWith("* ")) {
      bullets.push(<li key={i} className="flex gap-1.5"><span className="text-brand">•</span><span>{renderInline(t.slice(2), onNavigate)}</span></li>);
    } else {
      flush();
      if (t) out.push(<p key={i} className="my-1">{renderInline(t, onNavigate)}</p>);
    }
  });
  flush();
  return <div className="text-sm leading-relaxed text-ink">{out}</div>;
}

export function AiChat({
  send, greeting, suggestions = [], compact = false, onNavigate,
}: {
  send: (messages: AiMessage[]) => Promise<string>;
  greeting: string;
  suggestions?: string[];
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const { t } = useLang();
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function submit(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const reply = await send(next);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-1">
        {messages.length === 0 && (
          <div>
            <div className="rounded-2xl rounded-tl-sm bg-surface-2 p-3"><Rich text={greeting} onNavigate={onNavigate} /></div>
            {suggestions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((s) => <button key={s} onClick={() => submit(s)} className="chip text-left">{s}</button>)}
              </div>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[88%] rounded-2xl p-3 ${m.role === "user" ? "rounded-tr-sm bg-brand text-white" : "rounded-tl-sm bg-surface-2"}`}>
              {m.role === "user" ? <p className="whitespace-pre-wrap text-sm">{m.content}</p> : <Rich text={m.content} onNavigate={onNavigate} />}
            </div>
          </div>
        ))}
        {busy && <div className="flex justify-start"><div className="rounded-2xl rounded-tl-sm bg-surface-2 p-3 text-sm text-muted">{t("ai.thinking")}</div></div>}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); submit(input); }} className="mt-2 flex items-center gap-2 border-t border-border p-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("ai.placeholder")} className="input !py-2.5" autoFocus={!compact} />
        <button type="submit" disabled={busy || !input.trim()} className="btn btn-primary shrink-0 px-4 py-2.5 disabled:opacity-50">{t("common.send")}</button>
      </form>
    </div>
  );
}
