import { AiChat, type AiMessage } from "../../components/AiChat";
import { adminApi } from "../../lib/api";

const send = async (messages: AiMessage[]) =>
  (await adminApi.post<{ reply: string }>("/api/ai/admin", { messages })).reply;

export function AdminAi() {
  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-ink">AI co-pilot</h1>
      <p className="mt-1 text-muted">Ask about platform activity, trends, and which businesses need attention — grounded in live analytics.</p>
      <div className="card mt-5 h-[68vh] min-h-[460px] p-3">
        <AiChat
          send={send}
          greeting="Hi! I'm your platform co-pilot. Ask me to **summarize this week's activity**, surface **trends**, find **businesses that need attention**, suggest **who to feature**, or spot **anomalies**."
          suggestions={["Summarize platform activity this month", "Which categories are most popular?", "Which businesses should we feature?", "Find businesses that need attention", "What's the fastest growing business?", "Any suspicious review patterns?"]}
        />
      </div>
    </div>
  );
}
