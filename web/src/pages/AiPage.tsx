import { AiChat, type AiMessage } from "../components/AiChat";
import { userApi } from "../lib/api";
import { useTitle } from "../lib/useTitle";

const SUGGESTIONS = [
  "Find a quiet coffee shop to study",
  "Cheapest barber in Aley",
  "Restaurants with outdoor seating",
  "A pharmacy open now",
  "Where can I buy car batteries?",
  "Recommend a romantic restaurant",
  "What's happening this weekend?",
  "Show active community projects",
  "Deliver coffee from Bean Avenue to my house",
  "Plan a day out in Aley",
];

const send = async (messages: AiMessage[]) =>
  (await userApi.post<{ reply: string }>("/api/ai/chat", { messages })).reply;

export function AiPage() {
  useTitle("Aley AI");
  return (
    <div>
      <section className="border-b border-border bg-gradient-to-br from-brand/15 via-surface to-accent/10">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <span className="flex mx-auto h-12 w-12 items-center justify-center rounded-2xl bg-brand text-2xl text-white">✨</span>
          <h1 className="mt-4 font-display text-4xl font-extrabold text-ink">Aley AI</h1>
          <p className="mx-auto mt-2 max-w-xl text-lg text-muted">Your guide to everything in Aley — ask in plain language and I'll find businesses, services, events, offers, community projects and more, using live platform data.</p>
        </div>
      </section>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="card h-[68vh] min-h-[460px] p-3">
          <AiChat
            send={send}
            greeting="Hi! I'm **Aley AI**. I can find and compare businesses, recommend places, surface offers and events, help with delivery, and answer questions about Aley. What are you looking for?"
            suggestions={SUGGESTIONS}
          />
        </div>
      </div>
    </div>
  );
}
