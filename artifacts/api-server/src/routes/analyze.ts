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
// "inverted" means "yes" = the problem exists (e.g. knee cave, stair pain).
const SCREEN_CLINICAL: Record<
  string,
  { question: string; failMsg: string; passMsg: string; inverted?: boolean }
> = {
  // ── Original ──────────────────────────────────────────────────────────────
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
    inverted: true,
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
  // ── New ───────────────────────────────────────────────────────────────────
  legsTo90: {
    question: "Lying leg raise to 90° without lower back lifting",
    passMsg: "PASS",
    failMsg: "FAIL — suggests weak deep core / hip flexors or limited lumbar stability",
  },
  squatParallel: {
    question: "Squat to parallel without knee cave",
    passMsg: "PASS",
    failMsg: "FAIL — suggests weak glutes / abductors or poor hip mobility",
  },
  singleLegBalance: {
    question: "Single-leg balance for 10 seconds",
    passMsg: "PASS",
    failMsg: "FAIL — suggests poor hip stability, weak glute medius, or proprioception deficit",
  },
  headTurn: {
    question: "Full head rotation left and right without pain",
    passMsg: "PASS",
    failMsg: "FAIL — suggests restricted cervical mobility or neck muscle tightness",
  },
  singleLegSquat: {
    question: "Single-leg squat without losing balance",
    passMsg: "PASS",
    failMsg: "FAIL — suggests weak quad / glute or poor ankle proprioception",
  },
  stairsKneePain: {
    question: "Pain or instability in knee walking down stairs",
    passMsg: "PASS — no stair pain",
    failMsg: "CONCERN — stair descent pain suggests patellar tracking issues or weak VMO",
    inverted: true,
  },
  straightLegRaise: {
    question: "Straight leg raise to 90°",
    passMsg: "PASS",
    failMsg: "FAIL — suggests hamstring flexibility deficit limiting hip flexion",
  },
  standingForwardFold: {
    question: "Standing forward fold reaching past shins",
    passMsg: "PASS",
    failMsg: "FAIL — suggests hamstring / posterior chain tightness limiting spinal flexion",
  },
  singleLegSquatNoCollapse: {
    question: "Single-leg squat without knee collapsing inward",
    passMsg: "PASS",
    failMsg: "FAIL — suggests weak quad, limited hip strength, or poor knee control",
  },
  heelSit: {
    question: "Kneeling heel sit comfortably",
    passMsg: "PASS",
    failMsg: "FAIL — suggests limited quad flexibility or restricted knee flexion",
  },
  wallSit30: {
    question: "30-second wall sit without pain",
    passMsg: "PASS",
    failMsg: "FAIL — suggests weak quads or patellar irritation under load",
  },
  calfRaises10: {
    question: "10 single-leg calf raises without cramping",
    passMsg: "PASS",
    failMsg: "FAIL — suggests weak or tight gastrocnemius / soleus complex",
  },
  heelWalk: {
    question: "Heel walk for 10 steps without difficulty",
    passMsg: "PASS",
    failMsg: "FAIL — suggests reduced dorsiflexion strength or tibialis anterior weakness",
  },
  wallSpine: {
    question: "Full spine contact against wall",
    passMsg: "PASS",
    failMsg: "FAIL — suggests thoracic kyphosis or tight hip flexors pulling lumbar off the wall",
  },
  wallAngel: {
    question: "Wall angel without lower back lifting",
    passMsg: "PASS",
    failMsg: "FAIL — suggests limited thoracic extension, tight lats, or poor shoulder mobility",
  },
  legsOff6: {
    question: "Lifting both legs 6 inches without lower back arching",
    passMsg: "PASS",
    failMsg: "FAIL — suggests weak deep core / lower abdominals and poor lumbar bracing",
  },
  deadBug: {
    question: "Dead bug without losing core tension",
    passMsg: "PASS",
    failMsg: "FAIL — suggests poor motor control and core endurance under anti-rotation load",
  },
  elbowBend: {
    question: "Full elbow flexion (hand to shoulder)",
    passMsg: "PASS",
    failMsg: "FAIL — suggests limited elbow flexion range or biceps / brachialis restriction",
  },
  wallPushup: {
    question: "Wall pushup without elbow flare",
    passMsg: "PASS",
    failMsg: "FAIL — suggests weak serratus anterior or scapular instability",
  },
};

function buildScreenLine(id: string, answer: "yes" | "no"): string {
  const def = SCREEN_CLINICAL[id];
  if (!def) return "";
  const failed = def.inverted ? answer === "yes" : answer === "no";
  return `${def.question}: ${failed ? def.failMsg : def.passMsg}.`;
}

router.post("/analyze", async (req, res): Promise<void> => {
  const { painArea, duration, worsens, goal, severity, sex, sport, screen, sessionId, userId } = req.body as {
    painArea?: string;
    duration?: string;
    worsens?: string[];
    goal?: string;
    severity?: number;
    sex?: string;
    sport?: string;
    screen?: Record<string, "yes" | "no">;
    sessionId?: string;
    userId?: string;
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

  const assessmentId = crypto.randomUUID();

  req.log.info({ painArea, duration, goal, severity, sex, sport, assessmentId }, "Triggering saveAssessment");
  void saveAssessment({
    id:            assessmentId,
    user_id:       userId ?? null,
    session_id:    sessionId ?? null,
    pain_location: painArea,
    duration:      duration ?? null,
    worsens:       Array.isArray(worsens) ? worsens : null,
    goal:          goal ?? null,
    severity:      typeof severity === "number" ? severity : null,
    gender:        sex ?? null,
    sport:         sport ?? null,
    screen_json:   screen && Object.keys(screen).length > 0 ? screen : null,
    routine_text:  routine,
  });

  res.json({ routine, assessmentId });
});

export default router;
