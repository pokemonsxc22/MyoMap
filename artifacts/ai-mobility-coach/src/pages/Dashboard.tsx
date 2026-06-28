import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, PlusCircle, Send, CheckCircle2,
  RefreshCcw, Flame, MessageCircle, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabaseClient";
import { formatDistanceToNow } from "date-fns";

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

function getWeekDateStrings(): string[] {
  const now = new Date();
  const dow = now.getDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(now.getTime() - daysFromMonday * 86_400_000);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(monday.getTime() + i * 86_400_000).toISOString().slice(0, 10)
  );
}

// ── Component ─────────────────────────────────────────────────────
export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { userId, userName, loading: userLoading, signOut } = useUser();

  // Section B — Daily Check-In
  const [chatInput, setChatInput]     = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError]     = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Section C — Streak
  const [weekDates]                         = useState<string[]>(getWeekDateStrings);
  const [checkedDates, setCheckedDates]     = useState<string[]>([]);
  const [streak, setStreak]                 = useState(0);
  const [completedToday, setCompletedToday] = useState(false);
  const [checkingIn, setCheckingIn]         = useState(false);

  // Section D — Routines
  const [routineGroups, setRoutineGroups] = useState<RoutineGroup[]>([]);
  const [loadingData, setLoadingData]     = useState(true);
  const [flashGroup, setFlashGroup]       = useState<string | null>(null);

  // Guard — redirect to welcome if no identity
  useEffect(() => {
    if (!userLoading && !userId) setLocation("/welcome");
  }, [userId, userLoading, setLocation]);

  // Load data once we have a userId
  useEffect(() => {
    if (!userId) return;

    // Streak week
    void fetch(`/api/streaks/${encodeURIComponent(userId)}/week`)
      .then((r) => (r.ok ? r.json() : { dates: [], streak: 0, completedToday: false }))
      .then((data: { dates: string[]; streak: number; completedToday: boolean }) => {
        setCheckedDates(data.dates ?? []);
        setStreak(data.streak ?? 0);
        setCompletedToday(data.completedToday ?? false);
      })
      .catch(() => {});

    // Assessments
    if (!supabase) { setLoadingData(false); return; }
    void supabase
      .from("assessments")
      .select("id, pain_location, created_at, exercises_json, routine_text")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!data) { setLoadingData(false); return; }
        const seen = new Set<string>();
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
        setLoadingData(false);
      });
  }, [userId]);

  // ── Handlers ───────────────────────────────────────────────────
  const handleSendMessage = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput("");
    setChatLoading(true);
    setChatError(null);

    const outgoing: ChatMessage[] = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(outgoing);

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

      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!userId || completedToday || checkingIn) return;
    setCheckingIn(true);
    try {
      const res = await fetch("/api/streaks/complete", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId }),
      });
      const data = (await res.json()) as { streak?: number };
      if (res.ok) {
        setCompletedToday(true);
        setStreak(data.streak ?? streak + 1);
        const today = new Date().toISOString().slice(0, 10);
        setCheckedDates((prev) => [...new Set([...prev, today])]);
      }
    } catch { /* silent */ } finally {
      setCheckingIn(false);
    }
  };

  if (userLoading || !userId) return null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] bg-teal-500/10 blur-[140px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/10 blur-[140px] rounded-full pointer-events-none z-0" />

      {/* Nav */}
      <nav className="sticky top-0 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center shrink-0">
            <img src="https://okvnrbrnubtgplheyavw.supabase.co/storage/v1/object/public/assets/LOGO%20MYOMAP.png" alt="MyoMap" className="h-9 w-auto" />
          </div>
          <button
            onClick={() => { void signOut().then(() => setLocation("/")); }}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors text-xs font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 relative z-10 space-y-6">

        {/* ── Section A: Header ─────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-teal-500 tracking-widest uppercase mb-1">Dashboard</p>
            <h1 className="text-2xl font-black">
              Welcome back{userName ? `, ${userName}` : ""}
            </h1>
          </div>
          <Button
            onClick={() => setLocation("/intake")}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white border-0 shadow-[0_0_20px_-5px_rgba(13,148,136,0.4)]"
            data-testid="button-new-assessment"
          >
            <PlusCircle className="w-4 h-4" />
            Start New Assessment
          </Button>
        </div>

        {/* ── Section B: Daily Check-In Chat ────────────────────── */}
        <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border/30">
            <div className="flex items-center gap-2 mb-0.5">
              <MessageCircle className="w-4 h-4 text-teal-500" />
              <h2 className="font-semibold text-sm">Ask MyoMap AI</h2>
            </div>
            <p className="text-xs text-muted-foreground">How&apos;s your body feeling? Ask anything — we&apos;ll update your routine or answer any question.</p>
          </div>

          {/* Message thread */}
          <div className="px-5 py-4 max-h-80 overflow-y-auto space-y-3">
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
                    className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-secondary/60 border border-border/40 text-foreground rounded-tr-sm"
                        : "bg-teal-500/10 border border-teal-500/20 text-foreground rounded-tl-sm"
                    }`}
                  >
                    {msg.content}
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
            <div ref={chatBottomRef} />
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
                disabled={!chatInput.trim() || chatLoading}
                className="self-end flex-shrink-0 w-8 h-8 rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="checkin-submit"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Section C: Weekly Streak ───────────────────────────── */}
        <div className="rounded-2xl bg-card border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-teal-500" />
            <h2 className="font-semibold text-sm">Your Streak</h2>
          </div>

          <div className="flex items-center justify-between gap-1 mb-4">
            {weekDates.map((date, i) => {
              const isChecked = checkedDates.includes(date);
              const isToday   = date === today;
              const isFuture  = date > today;
              return (
                <div key={date} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isChecked
                        ? "bg-teal-600 text-white"
                        : isToday
                        ? "bg-background border-2 border-teal-500 text-teal-500"
                        : isFuture
                        ? "bg-secondary/30 text-muted-foreground/30"
                        : "bg-secondary/50 text-muted-foreground"
                    }`}
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
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted-foreground">
              🔥 <span className="text-foreground">{streak}</span> day streak
            </p>
            <button
              onClick={() => void handleCheckIn()}
              disabled={completedToday || checkingIn}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                completedToday
                  ? "bg-secondary/50 text-muted-foreground cursor-default"
                  : "bg-teal-600 hover:bg-teal-700 text-white shadow-[0_0_16px_-4px_rgba(13,148,136,0.4)]"
              }`}
              data-testid="button-check-in"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {completedToday ? "Checked In Today" : "Check In Today"}
            </button>
          </div>
        </div>

        {/* ── Section D: My Routines ─────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-teal-500" />
            <h2 className="font-semibold text-sm">My Routines</h2>
          </div>

          {loadingData ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-card border border-border/50 animate-pulse" />
              ))}
            </div>
          ) : routineGroups.length === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-card border border-border/50">
              <p className="text-sm text-muted-foreground mb-4">No assessments yet.</p>
              <Button
                onClick={() => setLocation("/intake")}
                className="bg-teal-600 hover:bg-teal-700 text-white border-0"
              >
                Take your first assessment
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {routineGroups.map((group) => (
                <motion.div
                  key={group.painLocation}
                  animate={flashGroup === group.painLocation ? { borderColor: ["#0D9488", "#0D9488", "rgba(255,255,255,0.05)"] } : {}}
                  transition={{ duration: 1.6, ease: "easeOut" }}
                  className="rounded-2xl bg-card border border-border/50 overflow-hidden"
                  data-testid={`routine-card-${group.painLocation}`}
                >
                  <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-border/30">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-sm">
                          {AREA_LABELS[group.painLocation] ?? group.painLocation}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Last assessed{" "}
                        {formatDistanceToNow(new Date(group.lastDate), { addSuffix: true })}
                      </p>
                    </div>
                    <button
                      onClick={() => setLocation("/intake")}
                      className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-teal-500 hover:text-teal-400 transition-colors whitespace-nowrap"
                      data-testid={`button-reassess-${group.painLocation}`}
                    >
                      <RefreshCcw className="w-3 h-3" />
                      Re-assess
                    </button>
                  </div>

                  <div className="px-5 py-4">
                    {group.exercises.length > 0 ? (
                      <div className="space-y-2.5">
                        {group.exercises.slice(0, 5).map((ex, idx) => {
                          const setsReps = [ex.sets, ex.reps].filter(Boolean).join(" × ");
                          const desc     = ex.instructions ?? ex.notes ?? "";
                          return (
                            <div key={idx} className="flex gap-3 text-sm">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-[10px] font-bold text-teal-500 mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground leading-snug">{ex.name}</p>
                                {setsReps && <p className="text-xs text-teal-500 font-medium mt-0.5">{setsReps}</p>}
                                {desc && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{desc}</p>}
                              </div>
                            </div>
                          );
                        })}
                        {group.exercises.length > 5 && (
                          <p className="text-xs text-muted-foreground/50 pl-8">
                            +{group.exercises.length - 5} more exercises
                          </p>
                        )}
                      </div>
                    ) : group.routineText ? (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4 whitespace-pre-wrap">
                        {group.routineText}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/50">No exercise data available.</p>
                    )}

                    <button
                      onClick={() => setLocation(`/results?id=${group.id}`)}
                      className="mt-3 text-xs font-semibold text-teal-500 hover:text-teal-400 transition-colors flex items-center gap-1"
                    >
                      View full routine
                      <span className="text-base leading-none">›</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
