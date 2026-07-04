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
    // Return the raw Supabase error so callers can see exactly what failed.
    const detail = `[${insertError.code ?? "?"}] ${insertError.message ?? "unknown error"}`;
    if (insertError.code === "PGRST205" || insertError.message?.includes("does not exist")) {
      res.status(503).json({
        error: `Streaks table missing — run api/_lib/migrations.sql in Supabase SQL Editor. (${detail})`,
        supabase_code: insertError.code,
        supabase_message: insertError.message,
      });
    } else {
      res.status(500).json({
        error: `Failed to save check-in: ${detail}`,
        supabase_code: insertError.code,
        supabase_message: insertError.message,
      });
    }
    return;
  }

  const { data, error: fetchError } = await client
    .from("streaks")
    .select("completed_date")
    .eq("user_identifier", userId);

  if (fetchError) {
    // Non-fatal — insert succeeded; return a safe fallback streak.
    res.json({
      streak: 1,
      totalCompletions: 1,
      completedToday: true,
      warning: `Insert succeeded but re-fetch failed: [${fetchError.code}] ${fetchError.message}`,
    });
    return;
  }

  const dates = (data ?? []).map((row: any) => row.completed_date as string);
  res.json({ streak: computeStreak(dates), totalCompletions: dates.length, completedToday: true });
}
