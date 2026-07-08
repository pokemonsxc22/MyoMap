import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sanitizeText } from "./_lib/sanitize.js";
import { callGroq } from "./_lib/groq.js";
import { verifyAuth } from "./_lib/auth.js";
import { setSecurityHeaders, checkSizeLimit, checkRateLimit } from "./_lib/security.js";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setSecurityHeaders(res);

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!checkSizeLimit(req, res)) return;

  const { userId, error: authError } = await verifyAuth(req);
  if (authError || !userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!checkRateLimit(`followup_${userId}`, 30, 5 * 60 * 1000)) {
    res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
    return;
  }

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

    const painArea = sanitizeText(context.painArea, 100);
    const duration = sanitizeText(context.duration, 100);
    const goal     = sanitizeText(context.goal, 100);
    const sex      = sanitizeText(context.sex, 50);
    const sport    = sanitizeText(context.sport, 100);
    const routine  = sanitizeText(context.routine, 5000);
    const severity =
      typeof context.severity === "number" &&
      context.severity >= 1 &&
      context.severity <= 5
        ? context.severity
        : null;
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

    const answer = await callGroq({
      messages: [{ role: "system", content: systemPrompt }, ...cleanMessages],
      max_tokens: 600,
    });

    res.json({ answer });
  } catch (err) {
    console.error("followup error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
