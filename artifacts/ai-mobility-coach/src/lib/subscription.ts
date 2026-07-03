import { supabase } from "@/lib/supabaseClient";

export type Plan = "free" | "pro_monthly" | "pro_unlimited" | "pro_annual";

export interface PlanInfo {
  id: Plan;
  name: string;
  price: string;
  period: string;
  bestValue?: boolean;
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
    benefits: ["Unlimited assessments", "Unlimited AI chat", "No ads"],
  },
  pro_annual: {
    id: "pro_annual",
    name: "Pro Annual",
    price: "$49.99",
    period: "/yr",
    bestValue: true,
    benefits: ["Unlimited assessments", "Unlimited AI chat", "No ads", "Best value — save over paying monthly"],
  },
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
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

// Fetches current usage/plan for a user, resetting daily counters if the
// stored reset timestamp is from a previous day.
export async function getUsageData(userId: string): Promise<UsageRow> {
  const fallback: UsageRow = {
    plan: "free",
    ai_messages_today: 0,
    ai_messages_reset_at: null,
    assessments_today: 0,
    assessments_reset_at: null,
  };

  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from("users")
    .select("plan, ai_messages_today, ai_messages_reset_at, assessments_today, assessments_reset_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return fallback;

  const row = data as UsageRow;
  const now = new Date();
  let needsUpdate = false;
  const patch: Partial<UsageRow> = {};

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
