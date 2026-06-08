import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    logger.warn("SUPABASE_URL or SUPABASE_ANON_KEY not set — Supabase writes disabled");
    return null;
  }

  _client = createClient(url, key);
  return _client;
}

export interface AssessmentRow {
  pain_location: string;
  duration: string | null;
  worsens: string[] | null;
  goal: string | null;
  severity: number | null;
  gender: string | null;
}

export async function saveAssessment(row: AssessmentRow): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client.from("assessments").insert(row);

  if (error) {
    logger.error({ code: error.code, message: error.message }, "Failed to save assessment to Supabase");
  } else {
    logger.info({ pain_location: row.pain_location }, "Assessment saved to Supabase");
  }
}
