import { Router, type IRouter } from "express";
import { aiLimiter } from "../middlewares/rateLimiter";
import { sanitizeText } from "../lib/sanitize";

const router: IRouter = Router();

router.post("/exercise-instructions", aiLimiter, async (req, res): Promise<void> => {
  try {
    const { exerciseName } = req.body as { exerciseName?: unknown };

    if (!exerciseName || typeof exerciseName !== "string") {
      res.status(400).json({ error: "Missing exerciseName" });
      return;
    }

    const cleanName = sanitizeText(exerciseName, 200);

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      req.log.error("GROQ_API_KEY is not configured");
      res.status(503).json({ error: "AI service not configured" });
      return;
    }

    const systemPrompt =
      "You are a professional physical therapist and corrective exercise specialist. " +
      "Provide clear, numbered step-by-step instructions for performing the given exercise. " +
      "Include: starting position, movement cues, breathing, reps/sets guidance, and one common mistake to avoid. " +
      "Keep the total response under 200 words. Use simple language a fitness beginner can follow. " +
      "Format as numbered steps only — no preamble or summary paragraph.";

    const userMessage = `Give me step-by-step instructions for how to perform: ${cleanName}`;

    req.log.info({ exerciseName: cleanName }, "Exercise instructions requested");

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 400,
      }),
    });

    if (!groqRes.ok) {
      const errorText = await groqRes.text();
      req.log.error({ status: groqRes.status, body: errorText }, "Groq exercise instructions error");
      res.status(502).json({ error: "Something went wrong. Please try again." });
      return;
    }

    const data = (await groqRes.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const instructions = data.choices?.[0]?.message?.content ?? "";
    res.json({ instructions });
  } catch (err) {
    req.log.error({ err }, "exercise-instructions: unexpected error");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
