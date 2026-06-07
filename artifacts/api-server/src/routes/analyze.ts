import { Router, type IRouter } from "express";

const router: IRouter = Router();

const LABELS: Record<string, string> = {
  "lower-back": "lower back",
  "mid-back": "mid back",
  "upper-back": "upper back",
  "neck-shoulders": "neck and shoulders",
  "chest": "chest",
  "arms": "arms",
  "abs-core": "abs / core",
  "quads": "quads",
  "hamstrings": "hamstrings",
  "calves": "calves",
  "knees": "knees",
  "hips": "hips",
  "just-started": "just started",
  "few-weeks": "a few weeks",
  "months-plus": "months or longer",
  "sitting": "sitting too long",
  "after-workouts": "after workouts",
  "morning": "in the morning",
  "no-pattern": "no clear pattern",
  "reduce-pain": "reduce pain",
  "improve-flexibility": "improve flexibility",
  "sports-performance": "move better for sports",
  "general-health": "general health",
};

function label(key: string): string {
  return LABELS[key] ?? key;
}

router.post("/analyze", async (req, res): Promise<void> => {
  const { painArea, duration, worsens, goal, severity, sex } = req.body as {
    painArea?: string;
    duration?: string;
    worsens?: string[];
    goal?: string;
    severity?: number;
    sex?: string;
  };

  if (!painArea || !duration || !goal) {
    res.status(400).json({ error: "Missing required fields: painArea, duration, goal" });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    req.log.error("GROQ_API_KEY is not configured");
    res.status(500).json({ error: "AI service not configured" });
    return;
  }

  const worsenLabels =
    Array.isArray(worsens) && worsens.length > 0
      ? worsens.map(label).join(", ")
      : "nothing specific";

  const severityText = severity
    ? `${severity}/5 (${severity <= 1 ? "barely noticeable" : severity === 2 ? "mild" : severity === 3 ? "moderate" : severity === 4 ? "quite painful" : "very painful"})`
    : "not specified";

  const userMessage = [
    `I have pain or tightness in my ${label(painArea)}.`,
    `I've had this issue for ${label(duration)}.`,
    `Pain severity: ${severityText}.`,
    `It gets worse when: ${worsenLabels}.`,
    `My main goal is to ${label(goal)}.`,
    sex ? `Biological sex: ${sex}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  req.log.info({ painArea, duration, goal }, "Calling Groq API");

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are an AI mobility coach with expertise in kinesiology and biomechanics. When given a user's pain/tightness profile, respond with: 1) A plain-English explanation of the likely biomechanical root cause (2-3 sentences), and 2) A numbered list of exactly 5 corrective exercises with a name and one-sentence description each. Be encouraging and specific.",
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    }),
  });

  if (!groqRes.ok) {
    const errorText = await groqRes.text();
    req.log.error({ status: groqRes.status, body: errorText }, "Groq API error");
    res.status(502).json({ error: "Failed to get a response from the AI. Please try again." });
    return;
  }

  const data = (await groqRes.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const routine = data.choices?.[0]?.message?.content ?? "";

  res.json({ routine });
});

export default router;
