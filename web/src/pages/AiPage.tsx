import { AiChat, type AiMessage } from "../components/AiChat";
import { useLang } from "../context/LanguageContext";
import { userApi } from "../lib/api";
import { useTitle } from "../lib/useTitle";

const send = async (messages: AiMessage[]) =>
  (await userApi.post<{ reply: string }>("/api/ai/chat", { messages })).reply;

export function AiPage() {
  const { t } = useLang();
  useTitle(t("ai.title"));
  const suggestions = [t("ai.s1"), t("ai.s2"), t("ai.s3"), t("ai.s4")];
  return (
    <div>
      <section className="border-b border-border bg-gradient-to-br from-brand/15 via-surface to-accent/10">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <span className="flex mx-auto h-12 w-12 items-center justify-center rounded-2xl bg-brand text-2xl text-white">✨</span>
          <h1 className="mt-4 font-display text-4xl font-extrabold text-ink">{t("ai.title")}</h1>
          <p className="mx-auto mt-2 max-w-xl text-lg text-muted">{t("aiPage.subtitle")}</p>
        </div>
      </section>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="card h-[68vh] min-h-[460px] p-3">
          <AiChat send={send} greeting={t("aiPage.greeting")} suggestions={suggestions} />
        </div>
      </div>
    </div>
  );
}
