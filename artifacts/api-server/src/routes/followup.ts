import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

router.post("/followup", async (req, res): Promise<void> => {
  const { messages, context } = req.body as {
    messages?: ChatMessage[];
    context?: {
      painArea?: string;
      duration?: string;
      goal?: string;
      severity?: number;
      sex?: string;
      sport?: string;
      worsens?: string[];
      routine?: string;
    };
  };

  if (!Array.isArray(messages) || messages.length === 0 || !context) {
    res.status(400).json({ error: "Missing messages or context" });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    req.log.error("GROQ_API_KEY is not configured");
    res.status(500).json({ error: "AI service not configured" });
    return;
  }

  const worsenList =
    Array.isArray(context.worsens) && context.worsens.length > 0
      ? context.worsens.join(", ")
      : "nothing specific";

  const profileSummary = [
    `Pain/tightness location: ${context.painArea ?? "not specified"}`,
    `Duration: ${context.duration ?? "not specified"}`,
    `Goal: ${context.goal ?? "not specified"}`,
    context.severity ? `Severity: ${context.severity}/5` : "",
    context.sex ? `Biological sex: ${context.sex}` : "",
    context.sport ? `Primary sport/activity: ${context.sport}` : "",
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
    `THEIR ROUTINE:\n${context.routine ?? "(not provided)"}`;

  req.log.info({ messageCount: messages.length, painArea: context.painArea }, "Follow-up question received");

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: 600,
    }),
  });

  if (!groqRes.ok) {
    const errorText = await groqRes.text();
    req.log.error({ status: groqRes.status, body: errorText }, "Groq follow-up error");
    res.status(502).json({ error: "Failed to get a response from the AI. Please try again." });
    return;
  }

  const data = (await groqRes.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const answer = data.choices?.[0]?.message?.content ?? "";
  res.json({ answer });
});

export default router;
