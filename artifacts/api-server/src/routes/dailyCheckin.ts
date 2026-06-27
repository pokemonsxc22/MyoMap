import { Router, type IRouter } from "express";
import { aiLimiter } from "../middlewares/rateLimiter";
import { sanitizeText } from "../lib/sanitize";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are Myomap's daily check-in assistant. The user will describe how their body feels today or what happened during their workout or activity. Listen carefully and ask one clarifying question if needed. When you have enough information to suggest routine changes, append a JSON block at the very end of your response on its own line in this exact format (no markdown fences, raw JSON only):
{"update_routine": {"muscle_group": "lower_back", "changes": "brief description of what changed and why", "new_exercises": [{"name":"Exercise Name","sets":3,"reps":10,"notes":"Brief instructions"}]}}
Only include the JSON block when you have enough information to make meaningful changes. muscle_group must be one of: lower_back, mid_back, upper_back, neck_shoulders, chest, arms, abs_core, quads, hamstrings, calves, knees, hips. If you don't have enough information yet, just respond conversationally and ask a follow-up question. Keep responses concise — under 120 words before any JSON.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

router.post("/daily-checkin", aiLimiter, async (req, res): Promise<void> => {
  try {
    const { message, conversationHistory = [] } = req.body as {
      message?: unknown;
      conversationHistory?: unknown;
    };

    // Validate and sanitize the incoming message.
    const cleanMessage = sanitizeText(message, 1000);
    if (!cleanMessage) {
      res.status(400).json({ error: "Missing or invalid message" });
      return;
    }

    // Sanitize conversation history — accept only valid role/content pairs.
    const history: ChatMessage[] = Array.isArray(conversationHistory)
      ? conversationHistory
          .filter(
            (m): m is { role: "user" | "assistant"; content: string } =>
              m !== null &&
              typeof m === "object" &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string",
          )
          .map(m => ({ role: m.role, content: sanitizeText(m.content, 1000) }))
      : [];

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      req.log.error("GROQ_API_KEY is not configured");
      res.status(503).json({ error: "AI not configured" });
      return;
    }

    const messages: ChatMessage[] = [...history, { role: "user", content: cleanMessage }];
    req.log.info({ messageCount: messages.length }, "Daily check-in message received");

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!groqRes.ok) {
      const text = await groqRes.text();
      req.log.error({ status: groqRes.status, body: text }, "Groq error in daily-checkin");
      res.status(502).json({ error: "Something went wrong. Please try again." });
      return;
    }

    const data = (await groqRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const reply = data.choices?.[0]?.message?.content ?? "";
    res.json({ reply });
  } catch (err) {
    req.log.error({ err }, "daily-checkin: unexpected error");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
