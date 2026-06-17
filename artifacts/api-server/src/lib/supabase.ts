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
  pain_location: string;
  duration: string | null;
  worsens: string[] | null;
  goal: string | null;
  severity: number | null;
  gender: string | null;
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
