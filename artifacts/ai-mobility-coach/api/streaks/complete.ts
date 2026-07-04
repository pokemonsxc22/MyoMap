import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseClient } from "../_lib/supabase.js";

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayUTC(): string {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
}

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const unique = [...new Set(dates)].sort().reverse();
  if (unique[0] !== todayUTC() && unique[0] !== yesterdayUTC()) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const prevMs = new Date(unique[i - 1]).getTime();
    const currMs = new Date(unique[i]).getTime();
    if (Math.round((prevMs - currMs) / 86_400_000) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { userId } = req.body as { userId?: string };

  if (!userId || typeof userId !== "string" || userId.length > 128) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }

  const todayStr = todayUTC();
  const client   = getSupabaseClient();

  if (!client) {
    res.json({ streak: 1, totalCompletions: 1, completedToday: true });
    return;
  }

  const { error: insertError } = await client
    .from("streaks")
    .insert({ user_identifier: userId, completed_date: todayStr });

  if (insertError && insertError.code !== "23505") {
    if (insertError.code === "PGRST205") {
      res.status(503).json({ error: "Streaks table not set up yet." });
    } else {
      res.status(500).json({ error: "Failed to save completion" });
    }
    return;
  }

  const { data, error: fetchError } = await client
    .from("streaks")
    .select("completed_date")
    .eq("user_identifier", userId);

  if (fetchError) {
    res.json({ streak: 1, totalCompletions: 1, completedToday: true });
    return;
  }

  const dates = (data ?? []).map(row => row.completed_date as string);
  res.json({ streak: computeStreak(dates), totalCompletions: dates.length, completedToday: true });
}
