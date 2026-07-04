import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sanitizeText } from "./_lib/sanitize";
import { callGroq } from "./_lib/groq";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ProgressLog {
  difficulty?: string | null;
  improvement?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { messages, context } = req.body as {
      messages?: unknown;
      context?: { painArea?: unknown; goal?: unknown; recentLogs?: ProgressLog[] };
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Missing messages" });
      return;
    }

    const cleanMessages: ChatMessage[] = messages
      .filter(
        (m): m is { role: "user" | "assistant"; content: string } =>
          m !== null &&
          typeof m === "object" &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string",
      )
      .map(m => ({ role: m.role, content: sanitizeText(m.content, 1000) }));

    if (cleanMessages.length === 0) {
      res.status(400).json({ error: "No valid messages provided" });
      return;
    }

    if (!process.env.GROQ_API_KEY) {
      res.status(503).json({ error: "AI service not configured" });
      return;
    }

    const painArea = sanitizeText(context?.painArea, 100);
    const goal     = sanitizeText(context?.goal, 100);

    const logsSummary =
      Array.isArray(context?.recentLogs) && context.recentLogs.length > 0
        ? context.recentLogs
            .slice(0, 5)
            .map((l, i) => {
              const parts: string[] = [];
              if (l.difficulty)  parts.push(`Difficulty: ${l.difficulty}`);
              if (l.improvement) parts.push(`Improvement: ${l.improvement}`);
              if (l.notes)       parts.push(`Notes: ${sanitizeText(l.notes, 200)}`);
              const dateStr = l.created_at
                ? new Date(l.created_at).toLocaleDateString()
                : `Session ${i + 1}`;
              return `${dateStr}: ${parts.join(", ") || "(no data)"}`;
            })
            .join("\n")
        : "No previous sessions logged yet.";

    const systemPrompt =
      "You are a supportive AI mobility coach. The user is sharing how they felt during or after their corrective exercise routine. " +
      "Respond with empathy, specific encouragement, and actionable advice. Keep responses under 180 words. " +
      "If the user reports worsening pain, numbness, tingling, or symptoms that sound acute or serious, gently suggest they consult a physiotherapist or doctor. " +
      "Do not diagnose medical conditions. Be warm and conversational.\n\n" +
      `USER'S ISSUE: ${painArea || "not specified"}\n` +
      `USER'S GOAL: ${goal || "not specified"}\n\n` +
      `RECENT PROGRESS HISTORY:\n${logsSummary}`;

    const answer = await callGroq({
      messages: [{ role: "system", content: systemPrompt }, ...cleanMessages],
      max_tokens: 600,
    });

    res.json({ answer });
  } catch (err) {
    console.error("progress-chat error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
