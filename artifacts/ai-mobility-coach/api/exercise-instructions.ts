import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sanitizeText } from "./_lib/sanitize.js";
import { callGroq } from "./_lib/groq.js";
import { verifyAuth } from "./_lib/auth.js";
import { setSecurityHeaders, checkSizeLimit, checkRateLimit } from "./_lib/security.js";

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

  if (!checkRateLimit(`exercise-instructions_${userId}`, 60, 5 * 60 * 1000)) {
    res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
    return;
  }

  try {
    const { exerciseName } = req.body as { exerciseName?: unknown };

    if (!exerciseName || typeof exerciseName !== "string") {
      res.status(400).json({ error: "Missing exerciseName" });
      return;
    }

    const cleanName = sanitizeText(exerciseName, 200);

    if (!process.env.GROQ_API_KEY) {
      res.status(503).json({ error: "AI service not configured" });
      return;
    }

    const systemPrompt =
      "You are a professional physical therapist and corrective exercise specialist. " +
      "Provide clear, numbered step-by-step instructions for performing the given exercise. " +
      "Include: starting position, movement cues, breathing, reps/sets guidance, and one common mistake to avoid. " +
      "Keep the total response under 200 words. Use simple language a fitness beginner can follow. " +
      "Format as numbered steps only — no preamble or summary paragraph.";

    const instructions = await callGroq({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Give me step-by-step instructions for how to perform: ${cleanName}` },
      ],
      max_tokens: 400,
    });

    res.json({ instructions });
  } catch (err) {
    console.error("exercise-instructions error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
