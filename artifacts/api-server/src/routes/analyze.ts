import { Router, type IRouter } from "express";
import { saveAssessment } from "../lib/supabase";

const router: IRouter = Router();

const LABELS: Record<string, string> = {
  "lower-back":       "lower back",
  "mid-back":         "mid back",
  "upper-back":       "upper back",
  "neck-shoulders":   "neck and shoulders",
  "chest":            "chest",
  "arms":             "arms",
  "abs-core":         "abs / core",
  "quads":            "quads",
  "hamstrings":       "hamstrings",
  "calves":           "calves",
  "knees":            "knees",
  "hips":             "hips",
  "just-started":     "just started",
  "few-weeks":        "a few weeks",
  "months-plus":      "months or longer",
  "sitting":          "sitting too long",
  "after-workouts":   "after workouts",
  "morning":          "in the morning",
  "no-pattern":       "no clear pattern",
  "reduce-pain":      "reduce pain",
  "improve-flexibility": "improve flexibility",
  "sports-performance": "move better for sports",
  "general-health":   "general health",
  "running":          "running",
  "basketball":       "basketball",
  "weightlifting":    "weightlifting",
  "swimming":         "swimming",
  "soccer":           "soccer",
  "general-fitness":  "general fitness",
  "other":            "general activity",
};

function label(key: string): string {
  return LABELS[key] ?? key;
}

// Clinical interpretation for each movement screen question.
// "inverted" means "yes" = the problem exists (e.g. knee does cave in).
const SCREEN_CLINICAL: Record<
  string,
  { question: string; failMsg: string; passMsg: string; inverted?: boolean }
> = {
  overheadReach: {
    question: "Overhead arm raise without lower back arching",
    passMsg: "PASS",
    failMsg: "FAIL — suggests limited shoulder flexion, lat tightness, or reduced thoracic extension",
  },
  heelsFlat: {
    question: "Squat with heels flat on ground",
    passMsg: "PASS",
    failMsg: "FAIL — suggests limited ankle dorsiflexion or tight hip flexors / adductors",
  },
  touchToes: {
    question: "Toe touch without bending knees",
    passMsg: "PASS",
    failMsg: "FAIL — suggests limited hamstring flexibility or restricted lumbar mobility",
  },
  kneeCave: {
    question: "Knee caving inward during squat",
    passMsg: "PASS — no knee valgus observed",
    failMsg: "CONCERN — knee valgus present, suggests weak glutes or tight IT band / TFL",
    inverted: true, // "yes" means the problem exists
  },
  shoulderClasp: {
    question: "Hands clasped behind back (one over shoulder, one below)",
    passMsg: "PASS",
    failMsg: "FAIL — suggests limited shoulder rotation or reduced thoracic mobility",
  },
  plankHold: {
    question: "30-second plank without hips sagging",
    passMsg: "PASS",
    failMsg: "FAIL — suggests weak core stability and poor spinal bracing",
  },
  armOverhead: {
    question: "Full arm extension overhead next to ear",
    passMsg: "PASS",
    failMsg: "FAIL — suggests limited shoulder flexion or restricted elbow extension",
  },
};

function buildScreenLine(id: string, answer: "yes" | "no"): string {
  const def = SCREEN_CLINICAL[id];
  if (!def) return "";
  const failed = def.inverted ? answer === "yes" : answer === "no";
  return `${def.question}: ${failed ? def.failMsg : def.passMsg}.`;
}

router.post("/analyze", async (req, res): Promise<void> => {
  const { painArea, duration, worsens, goal, severity, sex, sport, screen } = req.body as {
    painArea?: string;
    duration?: string;
    worsens?: string[];
    goal?: string;
    severity?: number;
    sex?: string;
    sport?: string;
    screen?: Record<string, "yes" | "no">;
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
    ? `${severity}/5 (${
        severity <= 1 ? "barely noticeable"
        : severity === 2 ? "mild"
        : severity === 3 ? "moderate"
        : severity === 4 ? "quite painful"
        : "very painful"
      })`
    : "not specified";

  const screenLines = Object.entries(screen ?? {})
    .map(([id, ans]) => buildScreenLine(id, ans))
    .filter(Boolean);

  const userMessage = [
    `I have pain or tightness in my ${label(painArea)}.`,
    `I've had this issue for ${label(duration)}.`,
    `Pain severity: ${severityText}.`,
    `It gets worse when: ${worsenLabels}.`,
    `My main goal is to ${label(goal)}.`,
    sex   ? `Biological sex: ${sex}.` : "",
    sport ? `My primary sport or activity is ${label(sport)}.` : "",
    screenLines.length > 0
      ? `Movement screen results: ${screenLines.join(" ")}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  req.log.info({ painArea, duration, goal, sport }, "Calling Groq API");

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
            "You are an AI mobility coach with expertise in kinesiology and biomechanics. When given a user's pain/tightness profile, respond with: " +
            "1) A plain-English explanation of the likely biomechanical root cause (2-3 sentences) — explicitly reference the user's sport or activity if provided, and call out any movement screen FAIL or CONCERN results by name, explaining what specific mobility restriction they reveal. " +
            "2) A numbered list of exactly 10 corrective exercises, selected to address both the reported pain area and any restrictions identified in the movement screen, and adapted where possible to the demands of the user's sport. " +
            "Format each exercise as: '1. **Exercise Name**: Description.' Be encouraging and specific.",
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

  // Map screen dict keys to individual DB columns
  const s = screen ?? {};
  req.log.info({ painArea, duration, goal, severity, sex, sport, screen }, "Triggering saveAssessment");
  void saveAssessment({
    pain_location:  painArea,
    duration:       duration ?? null,
    worsens:        Array.isArray(worsens) ? worsens : null,
    goal:           goal ?? null,
    severity:       typeof severity === "number" ? severity : null,
    gender:         sex ?? null,
    sport:          sport ?? null,
    overhead_reach: s["overheadReach"] ?? null,
    heels_flat:     s["heelsFlat"]     ?? null,
    touch_toes:     s["touchToes"]     ?? null,
    knee_cave:      s["kneeCave"]      ?? null,
    shoulder_clasp: s["shoulderClasp"] ?? null,
    plank_hold:     s["plankHold"]     ?? null,
    arm_overhead:   s["armOverhead"]   ?? null,
  });

  res.json({ routine });
});

export default router;
