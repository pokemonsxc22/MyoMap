import { Router, type IRouter } from "express";
import { aiLimiter } from "../middlewares/rateLimiter";
import { sanitizeText } from "../lib/sanitize";

const router: IRouter = Router();

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

router.post("/followup", aiLimiter, async (req, res): Promise<void> => {
  try {
    const { messages, context } = req.body as {
      messages?: unknown;
      context?: {
        painArea?: unknown;
        duration?: unknown;
        goal?: unknown;
        severity?: unknown;
        sex?: unknown;
        sport?: unknown;
        worsens?: unknown;
        routine?: unknown;
      };
    };

    if (!Array.isArray(messages) || messages.length === 0 || !context) {
      res.status(400).json({ error: "Missing messages or context" });
      return;
    }

    // Validate and sanitize each message in the conversation.
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

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      req.log.error("GROQ_API_KEY is not configured");
      res.status(503).json({ error: "AI service not configured" });
      return;
    }

    // Sanitize context fields.
    const painArea = sanitizeText(context.painArea, 100);
    const duration  = sanitizeText(context.duration, 100);
    const goal      = sanitizeText(context.goal, 100);
    const sex       = sanitizeText(context.sex, 50);
    const sport     = sanitizeText(context.sport, 100);
    const routine   = sanitizeText(context.routine, 5000);
    const severity  = typeof context.severity === "number" &&
      context.severity >= 1 && context.severity <= 5 ? context.severity : null;
    const worsenList =
      Array.isArray(context.worsens) && context.worsens.length > 0
        ? context.worsens
            .filter((v): v is string => typeof v === "string")
            .map(v => sanitizeText(v, 100))
            .join(", ")
        : "nothing specific";

    const profileSummary = [
      `Pain/tightness location: ${painArea || "not specified"}`,
      `Duration: ${duration || "not specified"}`,
      `Goal: ${goal || "not specified"}`,
      severity ? `Severity: ${severity}/5` : "",
      sex ? `Biological sex: ${sex}` : "",
      sport ? `Primary sport/activity: ${sport}` : "",
      `Worsens with: ${worsenList}`,
    ]
      .filter(Boolean)
      .join(". ");

    const systemPrompt =
      "You are an AI mobility coach. The user has already received their personalized corrective routine. " +
      "Answer their follow-up question concisely and specifically based on their pain profile and routine below. " +
      "Do not repeat the full routine. Keep answers under 150 words.\n\n" +
      "If the user describes new or changed symptoms, or asks to update their exercises, respond with a JSON block " +
      "at the very end of your message in this exact format:\n" +
      '{"update_exercises": [{"name": "...", "sets": "...", "reps": "...", "instructions": "..."}]}\n' +
      "Only include this block when exercises should change. Otherwise respond normally with no JSON.\n\n" +
      `USER PROFILE: ${profileSummary}\n\n` +
      `THEIR ROUTINE:\n${routine || "(not provided)"}`;

    req.log.info({ messageCount: cleanMessages.length, painArea }, "Follow-up question received");

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [{ role: "system", content: systemPrompt }, ...cleanMessages],
        max_tokens: 600,
      }),
    });

    if (!groqRes.ok) {
      const errorText = await groqRes.text();
      req.log.error({ status: groqRes.status, body: errorText }, "Groq follow-up error");
      res.status(502).json({ error: "Something went wrong. Please try again." });
      return;
    }

    const data = (await groqRes.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const answer = data.choices?.[0]?.message?.content ?? "";
    res.json({ answer });
  } catch (err) {
    req.log.error({ err }, "followup: unexpected error");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
