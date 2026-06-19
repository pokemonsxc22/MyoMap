import { Router, type IRouter } from "express";
import { getSupabaseClient } from "../lib/supabase";

const router: IRouter = Router();

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayUTC(): string {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
}

// Compute consecutive day streak from an array of YYYY-MM-DD strings
function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const unique = [...new Set(dates)].sort().reverse(); // newest first

  // Streak only counts if the most recent completion is today or yesterday
  if (unique[0] !== todayUTC() && unique[0] !== yesterdayUTC()) return 0;

  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const prevMs = new Date(unique[i - 1]).getTime();
    const currMs = new Date(unique[i]).getTime();
    const diffDays = Math.round((prevMs - currMs) / 86_400_000);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// GET /streaks/:userId — current streak, total completions, completed-today flag
router.get("/streaks/:userId", async (req, res): Promise<void> => {
  const { userId } = req.params;

  if (!userId || userId.length > 128) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }

  const client = getSupabaseClient();
  if (!client) {
    res.json({ streak: 0, totalCompletions: 0, completedToday: false });
    return;
  }

  const { data, error } = await client
    .from("streaks")
    .select("completed_date")
    .eq("user_identifier", userId);

  if (error) {
    req.log.error({ code: error.code, message: error.message }, "streaks GET error");
    res.json({ streak: 0, totalCompletions: 0, completedToday: false });
    return;
  }

  const dates = (data ?? []).map((row) => row.completed_date as string);

  res.json({
    streak:           computeStreak(dates),
    totalCompletions: dates.length,
    completedToday:   dates.includes(todayUTC()),
  });
});

// POST /streaks/complete — mark today complete for a user
router.post("/streaks/complete", async (req, res): Promise<void> => {
  const { userId } = req.body as { userId?: string };

  if (!userId || typeof userId !== "string" || userId.length > 128) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }

  const todayStr = todayUTC();
  const client = getSupabaseClient();

  if (!client) {
    // Supabase not configured — return optimistic values so the UI still works
    res.json({ streak: 1, totalCompletions: 1, completedToday: true });
    return;
  }

  req.log.info({ date: todayStr }, "Marking routine complete");

  // INSERT — if the row already exists (unique constraint), treat as idempotent
  const { error: insertError } = await client
    .from("streaks")
    .insert({ user_identifier: userId, completed_date: todayStr });

  if (insertError && insertError.code !== "23505") {
    req.log.error({ code: insertError.code, message: insertError.message }, "streaks POST insert error");
    if (insertError.code === "PGRST205") {
      res.status(503).json({ error: "Streaks table not set up yet — run supabase/migrations/006_create_streaks.sql in your Supabase SQL Editor." });
    } else {
      res.status(500).json({ error: "Failed to save completion" });
    }
    return;
  }

  // Fetch full history to recompute the streak
  const { data, error: fetchError } = await client
    .from("streaks")
    .select("completed_date")
    .eq("user_identifier", userId);

  if (fetchError) {
    req.log.error({ code: fetchError.code, message: fetchError.message }, "streaks POST fetch error");
    res.json({ streak: 1, totalCompletions: 1, completedToday: true });
    return;
  }

  const dates = (data ?? []).map((row) => row.completed_date as string);

  res.json({
    streak:           computeStreak(dates),
    totalCompletions: dates.length,
    completedToday:   true,
  });
});

export default router;
