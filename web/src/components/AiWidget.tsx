import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AiChat, type AiMessage } from "./AiChat";
import { CloseIcon } from "./icons";
import { useLang } from "../context/LanguageContext";
import { userApi } from "../lib/api";

const send = async (messages: AiMessage[]) =>
  (await userApi.post<{ reply: string }>("/api/ai/chat", { messages })).reply;

export function AiWidget() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { t } = useLang();
  const SUGGESTIONS = [t("ai.s1"), t("ai.s2"), t("ai.s3"), t("ai.s4")];
  if (pathname === "/ai") return null; // full page already has the assistant

  return (
    <>
      {open && (
        <div className="ai-panel fixed bottom-24 right-4 z-50 flex h-[70vh] max-h-[560px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl sm:right-6">
          <div className="flex items-center gap-2 border-b border-border bg-gradient-to-r from-brand/15 to-accent/10 px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white">✨</span>
            <div className="flex-1">
              <p className="font-display font-extrabold leading-none text-ink">{t("ai.title")}</p>
              <p className="text-[11px] text-muted">{t("ai.subtitle")}</p>
            </div>
            <Link to="/ai" onClick={() => setOpen(false)} className="text-xs font-semibold text-brand">{t("ai.fullPage")}</Link>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-hidden px-3 pb-2">
            <AiChat send={send} greeting={t("ai.greeting")} suggestions={SUGGESTIONS} compact onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Aley AI assistant"
        className="ai-fab fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-2xl text-white shadow-xl transition hover:scale-105 sm:right-6"
      >
        {open ? <CloseIcon className="h-6 w-6" /> : "✨"}
      </button>
    </>
  );
}
