import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sanitizeText } from "./_lib/sanitize";
import { callGroq } from "./_lib/groq";

const SYSTEM_PROMPT = `You are Myomap's daily check-in assistant. The user will describe how their body feels today or what happened during their workout or activity. Listen carefully and ask one clarifying question if needed. When you have enough information to suggest routine changes, append a JSON block at the very end of your response on its own line in this exact format (no markdown fences, raw JSON only):
{"update_routine": {"muscle_group": "lower_back", "changes": "brief description of what changed and why", "new_exercises": [{"name":"Exercise Name","sets":3,"reps":10,"notes":"Brief instructions"}]}}
Only include the JSON block when you have enough information to make meaningful changes. muscle_group must be one of: lower_back, mid_back, upper_back, neck_shoulders, chest, arms, abs_core, quads, hamstrings, calves, knees, hips. If you don't have enough information yet, just respond conversationally and ask a follow-up question. Keep responses concise — under 120 words before any JSON.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { message, conversationHistory = [] } = req.body as {
      message?: unknown;
      conversationHistory?: unknown;
    };

    const cleanMessage = sanitizeText(message, 1000);
    if (!cleanMessage) {
      res.status(400).json({ error: "Missing or invalid message" });
      return;
    }

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

    const reply = await callGroq({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: cleanMessage },
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    res.json({ reply });
  } catch (err) {
    console.error("daily-checkin error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
