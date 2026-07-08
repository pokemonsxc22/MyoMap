import { supabase } from "@/lib/supabaseClient";

interface UsageRow {
  ai_messages_today: number;
  ai_messages_reset_at: string | null;
  assessments_today: number;
  assessments_reset_at: string | null;
  onboarding_complete: boolean;
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

// Fetches current usage for a user, resetting daily counters when the day
// rolls over. `onboarding_complete` is fetched in a separate query so that a
// missing column doesn't wipe out core usage data.
export async function getUsageData(userId: string): Promise<UsageRow> {
  const fallback: UsageRow = {
    ai_messages_today: 0,
    ai_messages_reset_at: null,
    assessments_today: 0,
    assessments_reset_at: null,
    onboarding_complete: true,
  };

  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from("users")
    .select("ai_messages_today, ai_messages_reset_at, assessments_today, assessments_reset_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return fallback;

  const row: UsageRow = {
    ...(data as Omit<UsageRow, "onboarding_complete">),
    onboarding_complete: true,
  };

  const { data: onboardingRow } = await supabase
    .from("users")
    .select("onboarding_complete")
    .eq("id", userId)
    .maybeSingle();

  if (onboardingRow && typeof onboardingRow.onboarding_complete === "boolean") {
    row.onboarding_complete = onboardingRow.onboarding_complete;
  }

  const now = new Date();
  let needsUpdate = false;
  const patch: Record<string, unknown> = {};

  if (!row.ai_messages_reset_at || !isSameUtcDay(new Date(row.ai_messages_reset_at), now)) {
    row.ai_messages_today = 0;
    row.ai_messages_reset_at = now.toISOString();
    patch.ai_messages_today = 0;
    patch.ai_messages_reset_at = row.ai_messages_reset_at;
    needsUpdate = true;
  }

  if (!row.assessments_reset_at || !isSameUtcDay(new Date(row.assessments_reset_at), now)) {
    row.assessments_today = 0;
    row.assessments_reset_at = now.toISOString();
    patch.assessments_today = 0;
    patch.assessments_reset_at = row.assessments_reset_at;
    needsUpdate = true;
  }

  if (needsUpdate) {
    await supabase.from("users").update(patch).eq("id", userId);
  }

  return row;
}

export async function markOnboardingComplete(userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("users").update({ onboarding_complete: true }).eq("id", userId);
}

export async function incrementAssessmentCount(userId: string): Promise<void> {
  if (!supabase) return;
  const usage = await getUsageData(userId);
  await supabase
    .from("users")
    .update({ assessments_today: usage.assessments_today + 1 })
    .eq("id", userId);
}

export async function incrementAiMessageCount(userId: string): Promise<void> {
  if (!supabase) return;
  const usage = await getUsageData(userId);
  await supabase
    .from("users")
    .update({ ai_messages_today: usage.ai_messages_today + 1 })
    .eq("id", userId);
}
