import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, PlusCircle, Send, CheckCircle2,
  RefreshCcw, Flame, MessageCircle, LogOut,
  ChevronLeft, ChevronRight, X, Calendar as CalendarIcon,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabaseClient";
import {
  checkAiChatAccess, incrementAiMessageCount, hasUnlimitedAiChat,
  getRateLimitCooldownSeconds, recordRateLimitedMessage,
} from "@/lib/subscription";
import PaywallModal from "@/components/PaywallModal";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";

// ── Constants ─────────────────────────────────────────────────────
const AREA_LABELS: Record<string, string> = {
  "lower-back":     "Lower Back",
  "mid-back":       "Mid Back",
  "upper-back":     "Upper Back",
  "neck-shoulders": "Neck & Shoulders",
  "chest":          "Chest",
  "arms":           "Arms",
  "abs-core":       "Abs / Core",
  "quads":          "Quads",
  "hamstrings":     "Hamstrings",
  "calves":         "Calves",
  "knees":          "Knees",
  "hips":           "Hips",
};

const MUSCLE_GROUP_TO_SLUG: Record<string, string> = {
  lower_back:     "lower-back",
  mid_back:       "mid-back",
  upper_back:     "upper-back",
  neck_shoulders: "neck-shoulders",
  chest:          "chest",
  arms:           "arms",
  abs_core:       "abs-core",
  quads:          "quads",
  hamstrings:     "hamstrings",
  calves:         "calves",
  knees:          "knees",
  hips:           "hips",
};

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Types ─────────────────────────────────────────────────────────
interface Exercise {
  name: string;
  sets?: string | number;
  reps?: string | number;
  instructions?: string;
  notes?: string;
}

interface RoutineGroup {
  id: string;
  painLocation: string;
  lastDate: string;
  exercises: Exercise[];
  routineText: string | null;
}

interface RoutineUpdate {
  muscle_group: string;
  changes: string;
  new_exercises: Array<{ name: string; sets: string | number; reps: string | number; notes: string }>;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ── Helpers ───────────────────────────────────────────────────────
function parseRoutineUpdate(text: string): { cleanText: string; update: RoutineUpdate | null } {
  const match = text.match(/\{[\s\S]*?"update_routine"[\s\S]*?\}\s*$/);
  if (!match) return { cleanText: text, update: null };
  try {
    const parsed = JSON.parse(match[0]) as { update_routine?: RoutineUpdate };
    if (!parsed.update_routine) return { cleanText: text, update: null };
    const idx = text.lastIndexOf(match[0]);
    return { cleanText: text.slice(0, idx).trim(), update: parsed.update_routine };
  } catch {
    return { cleanText: text, update: null };
  }
}

function parseExercisesFromRow(row: {
  exercises_json?: unknown;
  routine_text?: string | null;
}): Exercise[] {
  if (Array.isArray(row.exercises_json) && row.exercises_json.length > 0) {
    return row.exercises_json as Exercise[];
  }
  if (!row.routine_text) return [];
  const lines = row.routine_text.split("\n").map((l) => l.trim()).filter(Boolean);
  const exercises: Exercise[] = [];
  for (const line of lines) {
    const match = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (match) {
      exercises.push({ name: match[2].replace(/\*+/g, "").split(":")[0].trim(), notes: match[2] });
    }
  }
  return exercises;
}

function getWeekDateStrings(offset = 0): string[] {
  const now = new Date();
  const dow = now.getDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(now.getTime() - (daysFromMonday + offset * 7) * 86_400_000);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(monday.getTime() + i * 86_400_000).toISOString().slice(0, 10)
  );
}

function formatDateRange(dates: string[]): string {
  if (dates.length === 0) return "";
  const start = new Date(dates[0] + "T12:00:00");
  const end   = new Date(dates[dates.length - 1] + "T12:00:00");
  return `${SHORT_MONTHS[start.getMonth()]} ${start.getDate()} – ${SHORT_MONTHS[end.getMonth()]} ${end.getDate()}`;
}

// Mirrors the server-side streak logic — works on sorted date strings YYYY-MM-DD.
function computeStreakFromDates(dates: string[]): number {
  if (dates.length === 0) return 0;
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const unique    = [...new Set(dates)].sort().reverse();
  if (unique[0] !== today && unique[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const diff = Math.round(
      (new Date(unique[i - 1]).getTime() - new Date(unique[i]).getTime()) / 86_400_000
    );
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function getStreakConfig(streak: number) {
  if (streak >= 10) return { color: "#0D9488", glow: "rgba(13,148,136,0.65)", emoji: "⚡", label: "Legendary" };
  if (streak >= 7)  return { color: "#3B82F6", glow: "rgba(59,130,246,0.65)",  emoji: "💎", label: "Elite" };
  if (streak >= 5)  return { color: "#8B5CF6", glow: "rgba(139,92,246,0.65)", emoji: "🚀", label: "On Fire" };
  if (streak >= 3)  return { color: "#EF4444", glow: "rgba(239,68,68,0.65)",   emoji: "🔥", label: "Heating Up" };
  return { color: "#0D9488", glow: "rgba(13,148,136,0.45)", emoji: "🔥", label: "" };
}

function getCalendarDays(month: Date): Array<{ dateStr: string | null; day: number }> {
  const year = month.getFullYear();
  const m    = month.getMonth();
  const firstDay   = new Date(year, m, 1);
  const lastDay    = new Date(year, m + 1, 0);
  const startDow   = firstDay.getDay();
  const offsetFromMon = startDow === 0 ? 6 : startDow - 1;
  const days: Array<{ dateStr: string | null; day: number }> = [];
  for (let i = 0; i < offsetFromMon; i++) days.push({ dateStr: null, day: 0 });
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ dateStr, day: d });
  }
  return days;
}

// ── InfoTooltip ───────────────────────────────────────────────────
// Portals the tooltip into document.body so it is never clipped by
// overflow-hidden ancestors. No AnimatePresence — portal children are
// plain React elements and AnimatePresence cannot manage their exit
// lifecycle reliably when they live outside its DOM subtree.
function InfoTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const show = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setCoords({ top: r.top, left: r.left + r.width / 2 });
    }
    setVisible(true);
  };

  return (
    <div className="inline-flex items-center">
      <button
        ref={btnRef}
        onMouseEnter={show}
        onMouseLeave={() => setVisible(false)}
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "1.5px solid white",
          color: "white",
          fontSize: 9,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          background: "transparent",
          cursor: "default",
          padding: 0,
          transition: "box-shadow 0.2s",
          boxShadow: visible ? "0 0 6px #0D9488, 0 0 12px rgba(13,148,136,0.4)" : "none",
          flexShrink: 0,
        }}
        aria-label="More info"
      >
        i
      </button>
      {visible && createPortal(
        <div
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            transform: "translate(-50%, calc(-100% - 8px))",
            width: 216,
            padding: "8px 12px",
            background: "#1E293B",
            border: "1px solid #0D9488",
            borderRadius: 8,
            color: "white",
            fontSize: 12,
            lineHeight: 1.5,
            zIndex: 99999,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(13,148,136,0.1)",
            pointerEvents: "none",
            textAlign: "center",
            whiteSpace: "normal",
          }}
        >
          {text}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid #0D9488",
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Streak Particle ───────────────────────────────────────────────
function StreakParticles({ color, count = 6 }: { color: string; count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * 360;
        const radius = 28 + (i % 2) * 8;
        const size   = 3 + (i % 3);
        const delay  = i * 0.3;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;
        return (
          <motion.div
            key={i}
            style={{ backgroundColor: color, width: size, height: size, left: "50%", top: "50%", marginLeft: -size / 2, marginTop: -size / 2 }}
            className="absolute rounded-full"
            animate={{
              x: [x * 0.7, x, x * 0.7],
              y: [y * 0.7, y, y * 0.7],
              opacity: [0.4, 0.9, 0.4],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{ repeat: Infinity, duration: 2 + i * 0.3, delay, ease: "easeInOut" }}
          />
        );
      })}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────
export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, userId, userName, loading: userLoading, signOut } = useUser();
  const { toast } = useToast();

  // Section B — Daily Check-In
  const [chatInput, setChatInput]     = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError]     = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);

  useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    const t = setTimeout(() => setRateLimitCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [rateLimitCooldown]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Section C — Streak
  const [weekOffset, setWeekOffset]               = useState(0);
  const [checkedDates, setCheckedDates]           = useState<string[]>([]);
  const [streak, setStreak]                       = useState(0);
  const [completedToday, setCompletedToday]       = useState(false);
  const [checkingIn, setCheckingIn]               = useState(false);
  const [calendarOpen, setCalendarOpen]           = useState(false);
  const [calendarMonth, setCalendarMonth]         = useState(new Date());

  // Section D — Routines
  const [routineGroups, setRoutineGroups] = useState<RoutineGroup[]>([]);
  const [loadingData, setLoadingData]     = useState(true);
  const [flashGroup, setFlashGroup]       = useState<string | null>(null);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Guard — redirect to welcome if no identity
  useEffect(() => {
    if (!userLoading && !userId) setLocation("/welcome");
  }, [userId, userLoading, setLocation]);

  // Onboarding check
  useEffect(() => {
    if (localStorage.getItem("myomap_dashboard_seen")) return;
    const t = setTimeout(() => setShowOnboarding(true), 800);
    return () => clearTimeout(t);
  }, []);

  // Load data once we have a userId
  useEffect(() => {
    if (!userId) return;

    void fetch(`/api/streaks/${encodeURIComponent(userId)}/week`)
      .then((r) => (r.ok ? r.json() : { dates: [], streak: 0, completedToday: false }))
      .then((data: { dates: string[]; streak: number; completedToday: boolean }) => {
        setCheckedDates(data.dates ?? []);
        setStreak(data.streak ?? 0);
        setCompletedToday(data.completedToday ?? false);
      })
      .catch(() => {});

    if (!supabase) { setLoadingData(false); return; }

    void (async () => {
      try {
        const { data, error } = await supabase
          .from("assessments")
          .select("id, pain_location, created_at, exercises_json, routine_text")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error || !data || data.length === 0) {
          setRoutineGroups([]);
          setLoadingData(false);
          return;
        }

        const seen  = new Set<string>();
        const groups: RoutineGroup[] = [];
        for (const row of data) {
          const loc = row.pain_location as string;
          if (!seen.has(loc)) {
            seen.add(loc);
            groups.push({
              id:           row.id as string,
              painLocation: loc,
              lastDate:     row.created_at as string,
              exercises:    parseExercisesFromRow(row),
              routineText:  (row.routine_text as string | null) ?? null,
            });
          }
        }
        setRoutineGroups(groups);
      } catch {
        // silent
      } finally {
        setLoadingData(false);
      }
    })();
  }, [userId]);

  // Derived
  const weekDates   = getWeekDateStrings(weekOffset);
  const streakCfg   = getStreakConfig(streak);
  const calendarDays = getCalendarDays(calendarMonth);
  const today = new Date().toISOString().slice(0, 10);

  // ── Scroll chat to bottom ──────────────────────────────────────
  function scrollChatToBottom() {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }

  // ── Handlers ───────────────────────────────────────────────────
  const handleSendMessage = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading || !userId) return;

    const access = await checkAiChatAccess(userId);
    if (access.reason === "no_access") { setPaywallOpen(true); return; }
    if (access.reason === "daily_limit") {
      setChatError("You've used all 20 AI messages today. Upgrade to Pro Unlimited for unlimited chat.");
      return;
    }
    if (hasUnlimitedAiChat(access.plan)) {
      const cooldown = getRateLimitCooldownSeconds();
      if (cooldown > 0) {
        setRateLimitCooldown(cooldown);
        setChatError(`You're sending messages too quickly. Please wait ${cooldown}s.`);
        return;
      }
      recordRateLimitedMessage();
    }

    setChatInput("");
    setChatLoading(true);
    setChatError(null);

    const outgoing: ChatMessage[] = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(outgoing);
    setTimeout(scrollChatToBottom, 30);

    try {
      const res = await fetch("/api/daily-checkin", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: msg, conversationHistory: outgoing.slice(0, -1) }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error ?? "Something went wrong");

      const { cleanText, update } = parseRoutineUpdate(data.reply);
      setChatHistory([...outgoing, { role: "assistant", content: cleanText }]);
      setTimeout(scrollChatToBottom, 30);
      void incrementAiMessageCount(userId);

      if (update) {
        const slug = MUSCLE_GROUP_TO_SLUG[update.muscle_group];
        if (slug) {
          const newExercises: Exercise[] = update.new_exercises.map((e) => ({
            name:         e.name,
            sets:         String(e.sets),
            reps:         String(e.reps),
            instructions: e.notes,
          }));
          setRoutineGroups((prev) =>
            prev.map((g) => g.painLocation === slug ? { ...g, exercises: newExercises } : g)
          );
          setFlashGroup(slug);
          setTimeout(() => setFlashGroup(null), 1800);
          const target = routineGroups.find((g) => g.painLocation === slug);
          if (target) {
            void fetch(`/api/assessments/${target.id}/exercises`, {
              method:  "PUT",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({ exercises: newExercises }),
            });
          }
        }
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!userId || completedToday || checkingIn) return;
    setCheckingIn(true);

    // Optimistic update so the UI responds immediately.
    setCompletedToday(true);
    setCheckedDates((prev) => [...new Set([...prev, today])]);
    setStreak((s) => s + 1);

    try {
      // Always go through the API route — it uses the service-role key so it
      // bypasses RLS entirely.
      // Dev:  Express api-server handles POST /api/streaks/complete
      // Prod: Vercel serverless function api/streaks/complete.ts handles it
      //
      // Explicitly send user.id (the Supabase auth UUID) so the serverless
      // function stores the exact same identifier that auth.uid() would return.
      const authId = user?.id ?? userId ?? "";
      const res = await fetch("/api/streaks/complete", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId: authId }),
      });

      const data = (await res.json()) as {
        streak?: number;
        error?: string;
        supabase_code?: string;
        supabase_message?: string;
      };

      if (!res.ok) {
        // Revert the optimistic update — the write did not persist.
        setCompletedToday(false);
        setCheckedDates((prev) => prev.filter((d) => d !== today));
        setStreak((s) => Math.max(0, s - 1));

        // Build a description that includes the raw Supabase error so the
        // user can see exactly what failed (table missing, RLS, etc.).
        const errMsg = data.error ?? "Check-in failed. Please try again.";
        const rawDetail = data.supabase_message
          ? ` (Supabase: ${data.supabase_message})`
          : "";

        toast({
          variant: "destructive",
          title: "Check-in didn't save",
          description: `${errMsg}${rawDetail}`,
        });
        return;
      }

      // Update streak from server-computed value.
      if (data.streak !== undefined) setStreak(data.streak);
    } catch {
      // Network failure — keep optimistic state visible but warn the user.
      toast({
        variant: "destructive",
        title: "Check-in may not have saved",
        description: "Couldn't reach the server. Check your connection and try again.",
      });
    } finally {
      setCheckingIn(false);
    }
  };

  const dismissOnboarding = () => {
    localStorage.setItem("myomap_dashboard_seen", "true");
    setShowOnboarding(false);
  };

  if (userLoading || !userId) return null;

  const sectionVariants = {
    hidden:  { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    }),
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-foreground">
      <PaywallModal open={paywallOpen} reason="ai_chat" onClose={() => setPaywallOpen(false)} />
      {/* Animated glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-teal-600/10 blur-[160px] rounded-full" />
        <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-teal-500/8 blur-[140px] rounded-full" />
      </div>

      {/* ── Onboarding Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-md rounded-3xl bg-[#111827]/95 border border-teal-500/20 backdrop-blur-xl p-8 shadow-[0_0_60px_-12px_rgba(13,148,136,0.35)]"
            >
              <button
                onClick={dismissOnboarding}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center mb-5">
                <Activity className="w-6 h-6 text-teal-400" />
              </div>

              <h2 className="text-xl font-extrabold mb-2">Here's how MyoMap works</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Your AI-powered mobility coach — here's what you can do:
              </p>

              <div className="space-y-4 mb-7">
                {[
                  { icon: "1", text: "Start an assessment to get your personalized corrective routine" },
                  { icon: "2", text: "Get your routine — exercises tailored to your exact body and pain" },
                  { icon: "3", text: "Use the AI chat to ask questions or update your exercises anytime" },
                  { icon: "4", text: "Track your progress — log sessions and build daily streaks" },
                ].map((step) => (
                  <div key={step.icon} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-500/15 border border-teal-500/25 flex items-center justify-center text-xs font-bold text-teal-400">
                      {step.icon}
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed pt-0.5">{step.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={dismissOnboarding}
                  className="flex-1 bg-teal-600 hover:bg-teal-500 text-white border-0 font-bold shadow-[0_0_20px_-6px_rgba(13,148,136,0.5)]"
                >
                  Let's Go!
                </Button>
                <button
                  onClick={dismissOnboarding}
                  className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-slate-300 text-sm transition-colors"
                >
                  Don't show again
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Calendar Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {calendarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setCalendarOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm rounded-3xl bg-[#111827]/95 border border-teal-500/20 backdrop-blur-xl p-6 shadow-[0_0_60px_-12px_rgba(13,148,136,0.35)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  className="w-8 h-8 rounded-lg bg-white/6 hover:bg-white/12 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="font-bold text-sm">
                  {MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                </h3>
                <button
                  onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  className="w-8 h-8 rounded-lg bg-white/6 hover:bg-white/12 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {["M","T","W","T","F","S","S"].map((d, i) => (
                  <div key={i} className="text-center text-[11px] font-bold text-slate-600 py-1">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell, i) => {
                  if (!cell.dateStr) return <div key={i} />;
                  const isChecked = checkedDates.includes(cell.dateStr);
                  const isToday   = cell.dateStr === today;
                  return (
                    <div
                      key={i}
                      className={`aspect-square flex items-center justify-center rounded-full text-xs font-semibold transition-all ${
                        isChecked
                          ? "text-white shadow-[0_0_12px_-2px_rgba(13,148,136,0.6)]"
                          : isToday
                          ? "border-2 border-teal-500 text-teal-400"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                      style={isChecked ? { backgroundColor: streakCfg.color } : {}}
                    >
                      {cell.day}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: streakCfg.color }} />
                  Check-in day
                </div>
                <button
                  onClick={() => setCalendarOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-white/6 hover:bg-white/12 text-xs font-semibold text-slate-400 hover:text-white transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="sticky top-0 w-full border-b border-teal-500/10 bg-[#0a0f1a]/80 backdrop-blur-xl z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div
            className="flex items-center gap-2.5 shrink-0 cursor-pointer"
            onClick={() => setLocation("/")}
          >
            <img
              src="https://okvnrbrnubtgplheyavw.supabase.co/storage/v1/object/public/assets/LOGO%20MYOMAP.png"
              alt="MyoMap"
              className="h-8 w-auto hover:opacity-90 transition-opacity"
            />
            <span className="text-sm font-extrabold text-white tracking-tight">MyoMap</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLocation("/profile")}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-white/10 text-slate-400 hover:text-foreground hover:border-white/20 transition-all text-xs font-medium"
              data-testid="button-nav-profile"
            >
              <UserIcon className="w-3.5 h-3.5" />
              Profile
            </button>
            <button
              onClick={() => { void signOut().then(() => setLocation("/")); }}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-white/10 text-slate-400 hover:text-foreground hover:border-white/20 transition-all text-xs font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 relative z-10 space-y-5">

        {/* ── Section A: Header ─────────────────────────────────── */}
        <motion.div
          custom={0} initial="hidden" animate="visible" variants={sectionVariants}
          className="flex items-center justify-between gap-4 flex-wrap"
        >
          <div>
            <h1 className="text-2xl font-extrabold">
              Welcome back{userName ? `, ${userName}` : ""} 👋
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">Here&apos;s your mobility overview.</p>
          </div>
          <motion.div
            animate={{ boxShadow: ["0 0 16px -4px rgba(13,148,136,0.4)", "0 0 28px -2px rgba(13,148,136,0.6)", "0 0 16px -4px rgba(13,148,136,0.4)"] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
            className="rounded-xl"
          >
            <Button
              onClick={() => setLocation("/intake")}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white border-0 font-bold hover:scale-[1.03] transition-transform"
              data-testid="button-new-assessment"
            >
              <PlusCircle className="w-4 h-4" />
              Start New Assessment
            </Button>
          </motion.div>
        </motion.div>

        {/* ── Section B: Daily Check-In Chat ────────────────────── */}
        <motion.div
          custom={1} initial="hidden" animate="visible" variants={sectionVariants}
          className="rounded-2xl bg-[#111827]/80 border border-teal-500/15 overflow-hidden backdrop-blur-sm hover:shadow-[0_0_24px_-8px_rgba(13,148,136,0.2)] transition-shadow"
        >
          <div className="px-5 pt-5 pb-3 border-b border-border/30">
            <div className="flex items-center gap-2 mb-0.5">
              <MessageCircle className="w-4 h-4 text-teal-500" />
              <h2 className="font-semibold text-sm">Ask MyoMap AI</h2>
              <InfoTooltip text="Chat with our AI about your pain, routine, or recovery — it can update your exercises too." />
            </div>
            <p className="text-xs text-muted-foreground">How&apos;s your body feeling? Ask anything — we&apos;ll update your routine or answer any question.</p>
          </div>

          {/* Message thread */}
          <div ref={chatContainerRef} className="px-5 py-4 max-h-80 overflow-y-auto space-y-3">
            {chatHistory.length === 0 && (
              <p className="text-xs text-muted-foreground/50 text-center py-6">
                Send a message to get started — describe any soreness, tightness, or how your workout went.
              </p>
            )}
            <AnimatePresence initial={false}>
              {chatHistory.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start items-start gap-2"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-teal-500" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-secondary/60 border border-border/40 text-foreground rounded-tr-sm"
                        : "bg-teal-500/10 border border-teal-500/20 text-foreground rounded-tl-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                          ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
                          li: ({ children }) => <li className="text-sm">{children}</li>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {chatLoading && (
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-teal-500" />
                </div>
                <div className="flex gap-1.5 items-center px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-teal-500/10 border border-teal-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500/60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500/60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500/60 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {chatError && <p className="text-xs text-destructive px-1">{chatError}</p>}
          </div>

          {/* Input */}
          <div className="px-4 pb-4">
            <div className="flex gap-2 p-3 rounded-xl bg-background border border-border/50 focus-within:border-teal-500/40 transition-colors">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSendMessage(); }
                }}
                placeholder="How's your body feeling today?"
                rows={2}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 resize-none outline-none leading-relaxed"
                data-testid="checkin-input"
              />
              <button
                onClick={() => void handleSendMessage()}
                disabled={!chatInput.trim() || chatLoading || rateLimitCooldown > 0}
                className="self-end flex-shrink-0 w-8 h-8 rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="checkin-submit"
              >
                {rateLimitCooldown > 0 ? (
                  <span className="text-[10px] font-bold tabular-nums">{rateLimitCooldown}s</span>
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Section C: Weekly Streak ───────────────────────────── */}
        <motion.div
          custom={2} initial="hidden" animate="visible" variants={sectionVariants}
          className="rounded-2xl bg-[#111827]/80 border border-teal-500/15 p-5 backdrop-blur-sm hover:shadow-[0_0_24px_-8px_rgba(13,148,136,0.2)] transition-shadow"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4" style={{ color: streakCfg.color }} />
              <h2 className="font-bold text-sm">Your Streak</h2>
              <InfoTooltip text="Check in daily to build your streak and stay consistent with your routine." />
            </div>
            <button
              onClick={() => { setCalendarMonth(new Date()); setCalendarOpen(true); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-400 transition-colors"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              View Calendar
            </button>
          </div>

          {/* Week navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setWeekOffset(o => o + 1)}
              className="w-7 h-7 rounded-lg bg-white/6 hover:bg-white/12 flex items-center justify-center text-slate-500 hover:text-white transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-semibold text-slate-500">
              {weekOffset === 0 ? "This week" : formatDateRange(weekDates)}
            </span>
            <button
              onClick={() => setWeekOffset(o => Math.max(0, o - 1))}
              disabled={weekOffset === 0}
              className="w-7 h-7 rounded-lg bg-white/6 hover:bg-white/12 flex items-center justify-center text-slate-500 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Week dots */}
          <AnimatePresence mode="wait">
            <motion.div
              key={weekOffset}
              initial={{ opacity: 0, x: weekOffset > 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between gap-1 mb-5"
            >
              {weekDates.map((date, i) => {
                const isChecked = checkedDates.includes(date);
                const isToday   = date === today;
                const isFuture  = date > today;
                return (
                  <div key={date} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isChecked
                          ? "text-white shadow-[0_0_14px_-2px_rgba(13,148,136,0.65)]"
                          : isToday
                          ? "bg-transparent border-2 text-teal-400"
                          : isFuture
                          ? "bg-white/3 text-slate-600"
                          : "bg-white/5 text-slate-500"
                      }`}
                      style={
                        isChecked
                          ? { backgroundColor: streakCfg.color, boxShadow: `0 0 14px -2px ${streakCfg.glow}` }
                          : isToday
                          ? { borderColor: streakCfg.color, color: streakCfg.color }
                          : {}
                      }
                    >
                      {isChecked ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span className="text-xs font-bold">{DAY_LABELS[i]}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between gap-3">
            {/* Streak count with particles */}
            <div className="flex items-center gap-2">
              <div className="relative">
                {streak >= 3 && (
                  <StreakParticles color={streakCfg.color} />
                )}
                <motion.p
                  className="text-sm font-semibold relative z-10"
                  animate={{ textShadow: streak >= 3 ? `0 0 16px ${streakCfg.glow}` : "none" }}
                >
                  <span className="text-lg">{streakCfg.emoji}</span>{" "}
                  <motion.span
                    className="font-extrabold text-base"
                    style={{ color: streak >= 3 ? streakCfg.color : undefined }}
                    animate={streak >= 3 ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  >
                    {streak}
                  </motion.span>
                  <span className="text-slate-400 font-normal ml-1.5">day streak</span>
                </motion.p>
              </div>
              {streak >= 3 && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{ color: streakCfg.color, borderColor: `${streakCfg.color}40`, backgroundColor: `${streakCfg.color}15` }}
                >
                  {streakCfg.label}
                </span>
              )}
            </div>
            <button
              onClick={() => void handleCheckIn()}
              disabled={completedToday || checkingIn}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                completedToday
                  ? "bg-white/5 text-slate-500 cursor-default border border-white/10"
                  : "text-white hover:scale-[1.02]"
              }`}
              style={!completedToday ? {
                backgroundColor: streakCfg.color,
                boxShadow: `0 0 16px -4px ${streakCfg.glow}`,
              } : {}}
              data-testid="button-check-in"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {completedToday ? "Checked In Today ✓" : "Check In Today"}
            </button>
          </div>
        </motion.div>

        {/* ── Section D: My Routines ─────────────────────────────── */}
        <motion.div
          custom={3} initial="hidden" animate="visible" variants={sectionVariants}
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-teal-400" />
            <h2 className="font-bold text-sm">My Routines</h2>
            <InfoTooltip text="Your saved assessment routines — click View full routine to see all exercises." />
          </div>

          {loadingData ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-[#111827]/60 border border-teal-500/10 animate-pulse" />
              ))}
            </div>
          ) : routineGroups.length === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-[#111827]/80 border border-teal-500/15 backdrop-blur-sm">
              <p className="text-sm text-slate-400 mb-4">No assessments yet.</p>
              <Button
                onClick={() => setLocation("/intake")}
                className="bg-teal-600 hover:bg-teal-500 text-white border-0 font-bold"
              >
                Take your first assessment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {routineGroups.map((group, idx) => (
                <motion.div
                  key={group.painLocation}
                  initial={{ opacity: 0, y: 20 }}
                  animate={
                    flashGroup === group.painLocation
                      ? { opacity: 1, y: 0, borderColor: ["#0D9488", "#0D9488", "rgba(13,148,136,0.15)"] }
                      : { opacity: 1, y: 0 }
                  }
                  transition={{ duration: 0.5, delay: idx * 0.08, ease: "easeOut" }}
                  whileHover={{ boxShadow: "0 0 24px -8px rgba(13,148,136,0.25)" }}
                  className="rounded-2xl bg-[#111827]/80 border border-teal-500/15 overflow-hidden backdrop-blur-sm transition-shadow"
                  data-testid={`routine-card-${group.painLocation}`}
                >
                  <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-teal-500/10">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-sm">
                          {AREA_LABELS[group.painLocation] ?? group.painLocation}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 uppercase tracking-wide">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Last assessed{" "}
                        {formatDistanceToNow(new Date(group.lastDate), { addSuffix: true })}
                      </p>
                    </div>
                    <button
                      onClick={() => setLocation("/intake")}
                      className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors whitespace-nowrap"
                      data-testid={`button-reassess-${group.painLocation}`}
                    >
                      <RefreshCcw className="w-3 h-3" />
                      Re-assess
                    </button>
                  </div>

                  <div className="px-5 py-4">
                    {group.exercises.length > 0 ? (
                      <div className="space-y-3">
                        {group.exercises.slice(0, 5).map((ex, i) => {
                          const setsReps = [ex.sets, ex.reps].filter(Boolean).join(" × ");
                          const desc     = ex.instructions ?? ex.notes ?? "";
                          return (
                            <div key={i} className="flex gap-3 text-sm">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-[10px] font-bold text-teal-400 mt-0.5">
                                {i + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground leading-snug">{ex.name}</p>
                                {setsReps && <p className="text-xs text-teal-400 font-medium mt-0.5">{setsReps}</p>}
                                {desc && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{desc}</p>}
                              </div>
                            </div>
                          );
                        })}
                        {group.exercises.length > 5 && (
                          <p className="text-xs text-slate-600 pl-8">
                            +{group.exercises.length - 5} more exercises
                          </p>
                        )}
                      </div>
                    ) : group.routineText ? (
                      <p className="text-sm text-slate-400 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                        {group.routineText}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-600">No exercise data available.</p>
                    )}

                    <button
                      onClick={() => setLocation(`/results?id=${group.id}`)}
                      className="mt-4 text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-1"
                    >
                      View full routine
                      <span className="text-base leading-none">›</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
