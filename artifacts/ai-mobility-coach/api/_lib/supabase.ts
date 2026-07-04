import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key);
  return _client;
}

export interface AssessmentRow {
  id?: string;
  user_id?: string | null;
  session_id: string | null;
  pain_location: string;
  duration: string | null;
  worsens: string[] | null;
  goal: string | null;
  severity: number | null;
  gender: string | null;
  sport: string | null;
  screen_json: Record<string, string> | null;
  routine_text?: string | null;
}

export async function saveAssessment(row: AssessmentRow): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  await client.from("assessments").insert(row);
}

export async function saveRetake(
  sessionId: string,
  screen: Record<string, "yes" | "no">,
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  const { error } = await client
    .from("assessments")
    .update({ retake_screen_json: screen, retake_at: new Date().toISOString() })
    .eq("session_id", sessionId);
  return !error;
}
