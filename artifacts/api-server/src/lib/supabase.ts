import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  logger.info(
    {
      supabase_url_set: !!url,
      supabase_key_set: !!key,
      supabase_url_prefix: url ? url.slice(0, 30) + "..." : "(not set)",
    },
    "Supabase env check"
  );

  if (!url || !key) {
    logger.warn("SUPABASE_URL or SUPABASE_ANON_KEY not set — Supabase writes disabled");
    return null;
  }

  _client = createClient(url, key);
  logger.info("Supabase client initialized");
  return _client;
}

export interface AssessmentRow {
  session_id:     string | null;
  pain_location:  string;
  duration:       string | null;
  worsens:        string[] | null;
  goal:           string | null;
  severity:       number | null;
  gender:         string | null;
  sport:          string | null;
  overhead_reach: "yes" | "no" | null;
  heels_flat:     "yes" | "no" | null;
  touch_toes:     "yes" | "no" | null;
  knee_cave:      "yes" | "no" | null;
  shoulder_clasp: "yes" | "no" | null;
  plank_hold:     "yes" | "no" | null;
  arm_overhead:   "yes" | "no" | null;
}

export async function saveAssessment(row: AssessmentRow): Promise<void> {
  try {
    const client = getSupabaseClient();
    if (!client) {
      logger.warn("saveAssessment: no Supabase client, skipping insert");
      return;
    }

    logger.info({ row }, "saveAssessment: attempting insert");

    const { error, status, statusText } = await client
      .from("assessments")
      .insert(row);

    if (error) {
      logger.error(
        { code: error.code, message: error.message, details: error.details, hint: error.hint, status, statusText },
        "saveAssessment: insert failed"
      );
    } else {
      logger.info({ pain_location: row.pain_location, status }, "saveAssessment: insert succeeded");
    }
  } catch (err) {
    logger.error({ err }, "saveAssessment: unexpected exception");
  }
}

export interface RetakeRow {
  retake_overhead_reach:  "yes" | "no" | null;
  retake_heels_flat:      "yes" | "no" | null;
  retake_touch_toes:      "yes" | "no" | null;
  retake_knee_cave:       "yes" | "no" | null;
  retake_shoulder_clasp:  "yes" | "no" | null;
  retake_plank_hold:      "yes" | "no" | null;
  retake_arm_overhead:    "yes" | "no" | null;
  retake_at:              string;
}

export async function saveRetake(sessionId: string, screen: Record<string, "yes" | "no">): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) {
      logger.warn("saveRetake: no Supabase client, skipping update");
      return false;
    }

    const row: RetakeRow = {
      retake_overhead_reach: screen["overheadReach"] ?? null,
      retake_heels_flat:     screen["heelsFlat"]     ?? null,
      retake_touch_toes:     screen["touchToes"]     ?? null,
      retake_knee_cave:      screen["kneeCave"]      ?? null,
      retake_shoulder_clasp: screen["shoulderClasp"] ?? null,
      retake_plank_hold:     screen["plankHold"]     ?? null,
      retake_arm_overhead:   screen["armOverhead"]   ?? null,
      retake_at:             new Date().toISOString(),
    };

    logger.info({ sessionId, row }, "saveRetake: attempting update");

    const { error, status } = await client
      .from("assessments")
      .update(row)
      .eq("session_id", sessionId);

    if (error) {
      logger.error(
        { code: error.code, message: error.message, details: error.details, hint: error.hint },
        "saveRetake: update failed"
      );
      return false;
    }

    logger.info({ sessionId, status }, "saveRetake: update succeeded");
    return true;
  } catch (err) {
    logger.error({ err }, "saveRetake: unexpected exception");
    return false;
  }
}
