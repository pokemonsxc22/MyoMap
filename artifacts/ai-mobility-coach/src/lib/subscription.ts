import { supabase } from "@/lib/supabaseClient";

export type Plan = "free" | "pro_monthly" | "pro_unlimited" | "pro_annual";

export interface PlanInfo {
  id: Plan;
  name: string;
  price: string;
  period: string;
  bestValue?: boolean;
  savingsBadge?: string;
  popularBadge?: string;
  benefits: string[];
}

export const PLAN_DETAILS: Record<Plan, PlanInfo> = {
  free: {
    id: "free",
    name: "Free",
    price: "$0",
    period: "",
    benefits: ["2 assessments per day", "Ad before results", "No AI chat access"],
  },
  pro_monthly: {
    id: "pro_monthly",
    name: "Pro Monthly",
    price: "$4.99",
    period: "/mo",
    benefits: ["Unlimited assessments", "AI chat — up to 20 messages/day", "No ads"],
  },
  pro_unlimited: {
    id: "pro_unlimited",
    name: "Pro Unlimited",
    price: "$7.99",
    period: "/mo",
    popularBadge: "Most Popular",
    benefits: ["Unlimited assessments", "Unlimited AI chat", "No ads"],
  },
  pro_annual: {
    id: "pro_annual",
    name: "Pro Annual",
    price: "$49.99",
    period: "/yr",
    bestValue: true,
    savingsBadge: "Save 48% vs monthly",
    benefits: ["Unlimited assessments", "Unlimited AI chat", "No ads", "Best value — save over paying monthly"],
  },
};

export type DiscountType = "lifetime" | "trial_7" | "trial_30";

const DISCOUNT_CODES: Record<string, { type: DiscountType; days?: number }> = {
  FREEFRVRFL: { type: "lifetime" },
  LAUNCHWEEK: { type: "trial_7", days: 7 },
  MAXMONTH: { type: "trial_30", days: 30 },
};

export const FREE_ASSESSMENTS_PER_DAY = 2;
export const PRO_MONTHLY_AI_MESSAGES_PER_DAY = 20;
export const UNLIMITED_RATE_LIMIT_MAX = 5;
export const UNLIMITED_RATE_LIMIT_WINDOW_MS = 60_000;

export function hasAiChatAccess(plan: Plan): boolean {
  return plan !== "free";
}

export function hasUnlimitedAssessments(plan: Plan): boolean {
  return plan !== "free";
}

export function hasUnlimitedAiChat(plan: Plan): boolean {
  return plan === "pro_unlimited" || plan === "pro_annual";
}

export function showsAds(plan: Plan): boolean {
  return plan === "free";
}

interface UsageRow {
  plan: Plan;
  ai_messages_today: number;
  ai_messages_reset_at: string | null;
  assessments_today: number;
  assessments_reset_at: string | null;
  onboarding_complete: boolean;
  discount_code: string | null;
  discount_type: DiscountType | null;
  discount_expires_at: string | null;
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

// Fetches current usage/plan for a user, resetting daily counters if the
// stored reset timestamp is from a previous day, and reverting expired
// discount-code plans back to free.
//
// `onboarding_complete` and the `discount_*` columns are fetched in separate
// queries from the core usage columns. This is intentional: those columns
// were added in later migrations, and if a project hasn't applied one of
// those migrations yet, we don't want an "unknown column" error on that
// query to also wipe out the core plan/usage data (which would incorrectly
// reset a paying user back to the free plan). Missing onboarding/discount
// columns degrade gracefully instead (onboarding treated as already done,
// discount treated as none).
export async function getUsageData(userId: string): Promise<UsageRow> {
  const fallback: UsageRow = {
    plan: "free",
    ai_messages_today: 0,
    ai_messages_reset_at: null,
    assessments_today: 0,
    assessments_reset_at: null,
    onboarding_complete: true,
    discount_code: null,
    discount_type: null,
    discount_expires_at: null,
  };

  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from("users")
    .select("plan, ai_messages_today, ai_messages_reset_at, assessments_today, assessments_reset_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return fallback;

  const row: UsageRow = {
    ...(data as Omit<UsageRow, "onboarding_complete" | "discount_code" | "discount_type" | "discount_expires_at">),
    onboarding_complete: true,
    discount_code: null,
    discount_type: null,
    discount_expires_at: null,
  };

  const [{ data: onboardingRow }, { data: discountRow }] = await Promise.all([
    supabase.from("users").select("onboarding_complete").eq("id", userId).maybeSingle(),
    supabase.from("users").select("discount_code, discount_type, discount_expires_at").eq("id", userId).maybeSingle(),
  ]);

  if (onboardingRow && typeof onboardingRow.onboarding_complete === "boolean") {
    row.onboarding_complete = onboardingRow.onboarding_complete;
  }
  if (discountRow) {
    row.discount_code = (discountRow.discount_code as string | null) ?? null;
    row.discount_type = (discountRow.discount_type as DiscountType | null) ?? null;
    row.discount_expires_at = (discountRow.discount_expires_at as string | null) ?? null;
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

  // Expired time-limited discount (lifetime codes have no expiry and are skipped).
  if (row.discount_expires_at && new Date(row.discount_expires_at) <= now) {
    row.plan = "free";
    row.discount_code = null;
    row.discount_type = null;
    row.discount_expires_at = null;
    patch.plan = "free";
    patch.discount_code = null;
    patch.discount_type = null;
    patch.discount_expires_at = null;
    needsUpdate = true;
  }

  if (needsUpdate) {
    await supabase.from("users").update(patch).eq("id", userId);
  }

  return row;
}

// Validates and applies a discount code for the given user, updating their
// plan (and discount metadata) in Supabase. Returns a friendly error message
// on failure so the UI can surface it directly.
export async function applyDiscountCode(
  userId: string,
  rawCode: string,
): Promise<{ ok: boolean; error?: string }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a discount code." };

  const entry = DISCOUNT_CODES[code];
  if (!entry) return { ok: false, error: "Invalid discount code" };

  if (!supabase) return { ok: false, error: "Discount codes aren't available right now." };

  const patch: Record<string, unknown> = {
    plan: "pro_annual" satisfies Plan,
    discount_code: code,
    discount_type: entry.type,
    discount_expires_at:
      entry.type === "lifetime"
        ? null
        : new Date(Date.now() + (entry.days ?? 0) * 24 * 60 * 60 * 1000).toISOString(),
  };

  const { error } = await supabase.from("users").update(patch).eq("id", userId);
  if (error) {
    // Full patch failed (discount columns may not exist yet — run migrations.sql).
    // Fall back to plan-only update.
    const { error: planError } = await supabase
      .from("users")
      .update({ plan: "pro_annual" satisfies Plan })
      .eq("id", userId);
    if (planError) {
      const detail = planError.message ?? planError.code ?? "unknown";
      const hint = error.message?.includes("column") || error.code === "PGRST205"
        ? " The discount columns may be missing — run api/_lib/migrations.sql in your Supabase SQL Editor."
        : "";
      return { ok: false, error: `Failed to apply code: ${detail}.${hint}` };
    }
    // Plan updated but discount columns missing — partial success.
    return { ok: true };
  }

  return { ok: true };
}

export async function checkAssessmentLimit(
  userId: string,
): Promise<{ allowed: boolean; used: number; limit: number | null; plan: Plan }> {
  const usage = await getUsageData(userId);
  if (hasUnlimitedAssessments(usage.plan)) {
    return { allowed: true, used: usage.assessments_today, limit: null, plan: usage.plan };
  }
  return {
    allowed: usage.assessments_today < FREE_ASSESSMENTS_PER_DAY,
    used: usage.assessments_today,
    limit: FREE_ASSESSMENTS_PER_DAY,
    plan: usage.plan,
  };
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

export async function checkAiChatAccess(
  userId: string,
): Promise<{ allowed: boolean; reason?: "no_access" | "daily_limit"; used: number; limit: number | null; plan: Plan }> {
  const usage = await getUsageData(userId);

  if (!hasAiChatAccess(usage.plan)) {
    return { allowed: false, reason: "no_access", used: 0, limit: 0, plan: usage.plan };
  }

  if (hasUnlimitedAiChat(usage.plan)) {
    return { allowed: true, used: usage.ai_messages_today, limit: null, plan: usage.plan };
  }

  // pro_monthly
  const allowed = usage.ai_messages_today < PRO_MONTHLY_AI_MESSAGES_PER_DAY;
  return {
    allowed,
    reason: allowed ? undefined : "daily_limit",
    used: usage.ai_messages_today,
    limit: PRO_MONTHLY_AI_MESSAGES_PER_DAY,
    plan: usage.plan,
  };
}

export async function incrementAiMessageCount(userId: string): Promise<void> {
  if (!supabase) return;
  const usage = await getUsageData(userId);
  await supabase
    .from("users")
    .update({ ai_messages_today: usage.ai_messages_today + 1 })
    .eq("id", userId);
}

// ── Client-side rate limiter for pro_unlimited / pro_annual (5 msgs/min) ──
const RATE_LIMIT_KEY = "myomap_ai_rate_limit_timestamps";

export function getRateLimitCooldownSeconds(): number {
  const raw = localStorage.getItem(RATE_LIMIT_KEY);
  const timestamps: number[] = raw ? JSON.parse(raw) : [];
  const now = Date.now();
  const recent = timestamps.filter((t) => now - t < UNLIMITED_RATE_LIMIT_WINDOW_MS);

  if (recent.length < UNLIMITED_RATE_LIMIT_MAX) return 0;

  const oldest = Math.min(...recent);
  const msLeft = UNLIMITED_RATE_LIMIT_WINDOW_MS - (now - oldest);
  return Math.max(0, Math.ceil(msLeft / 1000));
}

export function recordRateLimitedMessage(): void {
  const raw = localStorage.getItem(RATE_LIMIT_KEY);
  const timestamps: number[] = raw ? JSON.parse(raw) : [];
  const now = Date.now();
  const recent = timestamps.filter((t) => now - t < UNLIMITED_RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
}
