import { Router } from "express";
import { optionalUser, requireAdmin, requireOwner } from "../auth";
import { aiEnabled, runChat, type ChatMsg } from "../lib/ai";
import { prisma } from "../db";

export const aiRouter = Router();

// Normalize + bound the incoming conversation.
function parseMessages(body: unknown): ChatMsg[] | null {
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw)) return null;
  const msgs = raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content).slice(0, 4000) }))
    .slice(-16);
  return msgs.length ? msgs : null;
}

// GET /api/ai/status — lets the UI show whether full AI is on.
aiRouter.get("/status", (_req, res) => res.json({ enabled: aiEnabled() }));

// POST /api/ai/chat — public visitor assistant.
aiRouter.post("/chat", optionalUser, async (req, res) => {
  const messages = parseMessages(req.body);
  if (!messages) return res.status(400).json({ error: "Send a non-empty messages array." });
  try {
    const { reply, grounded } = await runChat("public", messages);
    res.json({ reply, grounded });
  } catch (e) {
    console.error("AI chat error:", e);
    res.status(500).json({ error: "The assistant is unavailable right now." });
  }
});

// POST /api/ai/owner — business-owner assistant (scoped to one of their businesses).
aiRouter.post("/owner", requireOwner, async (req, res) => {
  const messages = parseMessages(req.body);
  if (!messages) return res.status(400).json({ error: "Send a non-empty messages array." });
  const businessId = Number((req.body as { businessId?: number }).businessId);
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || business.ownerId !== req.ownerId) return res.status(404).json({ error: "Business not found." });
  try {
    const { reply } = await runChat("owner", messages, { businessId });
    res.json({ reply });
  } catch (e) {
    console.error("AI owner error:", e);
    res.status(500).json({ error: "The assistant is unavailable right now." });
  }
});

// POST /api/ai/admin — admin platform co-pilot.
aiRouter.post("/admin", requireAdmin, async (req, res) => {
  const messages = parseMessages(req.body);
  if (!messages) return res.status(400).json({ error: "Send a non-empty messages array." });
  try {
    const { reply } = await runChat("admin", messages);
    res.json({ reply });
  } catch (e) {
    console.error("AI admin error:", e);
    res.status(500).json({ error: "The assistant is unavailable right now." });
  }
});
