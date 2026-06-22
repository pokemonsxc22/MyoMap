import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Home, RotateCcw, Sunset, Sun, Moon, TrendingUp, RefreshCcw, MessageCircle, Send, CheckCircle2, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, signOut } from "@/lib/supabaseClient";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

interface Exercise {
  number: string;
  name: string;
  raw: string;
}

interface ParsedRoutine {
  rootCause: string;
  exercises: Exercise[];
}

function extractName(raw: string): string {
  // Strip leading **...** markdown bold for the name
  const match = raw.match(/^\*{1,2}([^*]+)\*{1,2}/);
  if (match) return match[1].trim();
  // Fall back to text before first colon/dash
  const colonIdx = raw.indexOf(":");
  if (colonIdx > 0) return raw.slice(0, colonIdx).replace(/\*+/g, "").trim();
  return raw.slice(0, 40).replace(/\*+/g, "").trim();
}

function parseRoutine(text: string): ParsedRoutine {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const rootCauseLines: string[] = [];
  const exercises: Exercise[] = [];
  let foundList = false;

  for (const line of lines) {
    const match = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (match) {
      foundList = true;
      const raw = match[2];
      exercises.push({ number: match[1], name: extractName(raw), raw });
    } else if (!foundList) {
      rootCauseLines.push(line);
    }
  }

  return { rootCause: rootCauseLines.join("\n\n"), exercises };
}

interface ExerciseUpdate {
  name: string;
  sets?: string;
  reps?: string;
  instructions: string;
}

function parseExerciseUpdate(text: string): {
  cleanText: string;
  exercises: ExerciseUpdate[] | null;
} {
  const jsonMatch = text.match(/\{\s*"update_exercises"\s*:[\s\S]*\}\s*$/);
  if (!jsonMatch) return { cleanText: text, exercises: null };
  try {
    const parsed = JSON.parse(jsonMatch[0]) as { update_exercises?: ExerciseUpdate[] };
    if (!Array.isArray(parsed.update_exercises) || parsed.update_exercises.length === 0) {
      return { cleanText: text, exercises: null };
    }
    const idx = text.lastIndexOf(jsonMatch[0]);
    return {
      cleanText: text.slice(0, idx).trim(),
      exercises: parsed.update_exercises,
    };
  } catch {
    return { cleanText: text, exercises: null };
  }
}

// ── Placeholder data ──────────────────────────────────────────────
const PLACEHOLDER_EXERCISES: Exercise[] = Array.from({ length: 10 }, (_, i) => ({
  number: String(i + 1),
  name: "Exercise Name",
  raw: "**Exercise Name**: A one-sentence description of this corrective exercise and how it helps your specific issue.",
}));

const PLACEHOLDER: ParsedRoutine = {
  rootCause:
    "Based on your answers, we'll explain the biomechanical root cause of your pain or tightness here in plain English — no jargon.",
  exercises: PLACEHOLDER_EXERCISES,
};

// ── Time slot config ──────────────────────────────────────────────
const TIME_SLOTS = [
  {
    label: "Morning",
    time: "6 am – 12 pm",
    icon: Sunset,
    range: [0, 3] as [number, number], // exercises 1–4 (indices 0-3)
    duration: "~8 min",
    accent: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    dot: "bg-amber-400",
  },
  {
    label: "Afternoon",
    time: "12 pm – 5 pm",
    icon: Sun,
    range: [4, 6] as [number, number], // exercises 5–7
    duration: "~6 min",
    accent: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    dot: "bg-primary",
  },
  {
    label: "Evening",
    time: "5 pm – 10 pm",
    icon: Moon,
    range: [7, 9] as [number, number], // exercises 8–10
    duration: "~6 min",
    accent: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
    dot: "bg-violet-400",
  },
];

interface StreakData {
  streak: number;
  totalCompletions: number;
  completedToday: boolean;
}

function streakMessage(streak: number): string {
  if (streak >= 7) return "Unstoppable! Your body is thanking you.";
  if (streak >= 3) return "You're building a habit!";
  return "Great start! Keep it going.";
}

export default function Results() {
  const [, setLocation] = useLocation();
  const [parsed, setParsed] = useState<ParsedRoutine | null>(null);
  const [isPlaceholder, setIsPlaceholder] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [overrideExercises, setOverrideExercises] = useState<ExerciseUpdate[] | null>(null);
  const { user, loading: authLoading } = useAuth();

  interface ChatEntry { question: string; answer: string }
  const [chatInput, setChatInput] = useState("");
  const [chatThread, setChatThread] = useState<ChatEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── Streak tracking ────────────────────────────────────────────────────────
  const [userId] = useState<string>(() => {
    let id = localStorage.getItem("mobilityUserId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("mobilityUserId", id);
    }
    return id;
  });
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [streakError, setStreakError] = useState<string | null>(null);

  const handleMarkComplete = async () => {
    setMarkingComplete(true);
    setStreakError(null);
    try {
      const res = await fetch("/api/streaks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const body = (await res.json()) as StreakData & { error?: string };
      if (!res.ok) {
        setStreakError(body.error ?? "Could not save — please try again.");
        return;
      }
      // Only update state when the response has a valid shape
      if (typeof body.streak === "number") {
        setStreakData(body);
      }
    } catch {
      setStreakError("Network error — please try again.");
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleFollowup = async () => {
    const question = chatInput.trim();
    if (!question || chatLoading) return;
    setChatInput("");
    setChatLoading(true);
    setChatError(null);

    const outgoing = [...chatMessages, { role: "user" as const, content: question }];

    try {
      const stored = sessionStorage.getItem("mobilityFormData");
      const formCtx = stored ? (JSON.parse(stored) as Record<string, unknown>) : {};

      const res = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: outgoing,
          context: { ...formCtx, routine: sessionStorage.getItem("mobilityRoutine") ?? "" },
        }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok || !data.answer) throw new Error(data.error ?? "Something went wrong");
      const { cleanText, exercises } = parseExerciseUpdate(data.answer);
      setChatMessages([...outgoing, { role: "assistant" as const, content: cleanText }]);
      setChatThread((prev) => [...prev, { question, answer: cleanText }]);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      if (exercises !== null) {
        setOverrideExercises(exercises);
        if (assessmentId) {
          void fetch(`/api/assessments/${assessmentId}/exercises`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ exercises }),
          });
        }
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!supabase) return;
    if (!user) setLocation("/auth");
  }, [user, authLoading, setLocation]);

  useEffect(() => {
    const idParam = new URLSearchParams(window.location.search).get("id");

    if (idParam && supabase) {
      setAssessmentId(idParam);
      void (async () => {
        try {
          const { data } = await supabase
            .from("assessments")
            .select("routine_text, exercises_json")
            .eq("id", idParam)
            .single();
          const row = data as { routine_text?: string | null; exercises_json?: ExerciseUpdate[] | null } | null;
          if (row?.exercises_json) setOverrideExercises(row.exercises_json);
          const text = row?.routine_text ?? null;
          if (text) {
            setParsed(parseRoutine(text));
            setIsPlaceholder(false);
          } else {
            setParsed(PLACEHOLDER);
            setIsPlaceholder(true);
          }
        } catch {
          setParsed(PLACEHOLDER);
          setIsPlaceholder(true);
        }
      })();
      return;
    }

    const storedId = sessionStorage.getItem("mobilityAssessmentId");
    if (storedId) setAssessmentId(storedId);

    const stored = sessionStorage.getItem("mobilityRoutine");
    if (stored) {
      setParsed(parseRoutine(stored));
      setIsPlaceholder(false);
    } else {
      setParsed(PLACEHOLDER);
      setIsPlaceholder(true);
    }
  }, []);

  useEffect(() => {
    fetch(`/api/streaks/${encodeURIComponent(userId)}`)
      .then((r) => (r.ok ? r.json() : { streak: 0, totalCompletions: 0, completedToday: false }))
      .then((data) => setStreakData(data as StreakData))
      .catch(() => setStreakData({ streak: 0, totalCompletions: 0, completedToday: false }));
  }, [userId]);

  if (!parsed) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* ── Top Nav ── */}
      <nav className="sticky top-0 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <Activity className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm tracking-tight hidden sm:block">MyoMap</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <button
              onClick={() => setLocation("/dashboard")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
              data-testid="button-nav-dashboard"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </button>
            <button
              onClick={() => setLocation("/")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
              data-testid="button-nav-home"
            >
              <Home className="w-3.5 h-3.5" />
              Home
            </button>
            {user && (
              <button
                onClick={() => { void signOut(); setLocation("/auth"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                data-testid="button-nav-sign-out"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Page Content ── */}
      <div className="max-w-2xl mx-auto px-4 py-10 relative z-10">
        <motion.div initial="hidden" animate="visible" variants={stagger}>

          {/* Header */}
          <motion.div variants={fadeUp} className="mb-8">
            <span className="text-xs font-semibold text-primary tracking-widest uppercase block mb-2">
              Results
            </span>
            <h1 className="text-3xl font-black leading-tight">Your Mobility Assessment</h1>
          </motion.div>

          {/* ── Streak Card ── */}
          {!isPlaceholder && (
            <motion.div variants={fadeUp} className="mb-8">
              <div className="p-5 rounded-2xl bg-card border border-border/50 flex flex-col sm:flex-row sm:items-center gap-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                {/* Streak info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1 mb-1">
                    <span className="text-2xl font-black tracking-tight" data-testid="streak-count">
                      {streakData != null ? `🔥 ${streakData.streak ?? 0}` : "🔥 0"}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">day streak</span>
                    {streakData != null && (streakData.totalCompletions ?? 0) > 0 && (
                      <span className="text-xs text-muted-foreground pl-2 border-l border-border/50" data-testid="total-completions">
                        {streakData.totalCompletions} total
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="streak-message">
                    {streakData != null
                      ? streakMessage(streakData.streak ?? 0)
                      : "Complete your first routine to start your streak."}
                  </p>
                </div>

                {/* CTA */}
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  {streakData?.completedToday ? (
                    <div
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold"
                      data-testid="completed-today-badge"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Completed today
                    </div>
                  ) : (
                    <Button
                      onClick={() => void handleMarkComplete()}
                      disabled={markingComplete}
                      className="bg-primary hover:bg-primary/90 text-white border-0 shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)] whitespace-nowrap"
                      data-testid="button-mark-complete"
                    >
                      {markingComplete ? "Saving..." : "Mark Today Complete"}
                    </Button>
                  )}
                  {streakError && (
                    <p className="text-xs text-destructive text-right max-w-[180px]" data-testid="streak-error">
                      {streakError}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* What's Happening in Your Body */}
          <motion.div variants={fadeUp} className="mb-8">
            <h2 className="text-xs font-semibold text-primary tracking-widest uppercase mb-3">
              What's Happening in Your Body
            </h2>
            <div className="p-5 rounded-2xl bg-card border border-primary/20">
              <div className={`text-sm leading-relaxed ${isPlaceholder ? "text-muted-foreground/50 italic" : "text-muted-foreground"}`}>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  }}
                >
                  {parsed.rootCause}
                </ReactMarkdown>
              </div>
            </div>
          </motion.div>

          {/* Your Daily Schedule */}
          <motion.div variants={fadeUp} className="mb-8">
            <h2 className="text-xs font-semibold text-primary tracking-widest uppercase mb-3">
              Your Daily Schedule
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TIME_SLOTS.map((slot) => {
                const slotExercises = parsed.exercises.slice(slot.range[0], slot.range[1] + 1);
                const Icon = slot.icon;
                return (
                  <div
                    key={slot.label}
                    className={`p-4 rounded-2xl border ${slot.bg} ${slot.border}`}
                    data-testid={`schedule-${slot.label.toLowerCase()}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${slot.accent}`} />
                      <span className={`text-sm font-bold ${slot.accent}`}>{slot.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {slot.time} · {slot.duration}
                    </p>
                    <ul className="space-y-1.5">
                      {slotExercises.map((ex) => (
                        <li key={ex.number} className="flex items-start gap-2">
                          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${slot.dot} ${isPlaceholder ? "opacity-30" : ""}`} />
                          <span className={`text-xs leading-snug ${isPlaceholder ? "text-muted-foreground/40 italic" : "text-foreground/80"}`}>
                            {ex.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Full Exercise Routine */}
          <motion.div variants={fadeUp}>
            <h2 className="text-xs font-semibold text-primary tracking-widest uppercase mb-3">
              Your Full Routine
            </h2>
            {overrideExercises !== null ? (
              <motion.div
                key="override"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-3"
              >
                <p className="text-xs text-primary/60 font-medium mb-3 flex items-center gap-1.5">
                  <RefreshCcw className="w-3 h-3" />
                  Updated by AI based on your conversation
                </p>
                {overrideExercises.map((ex, idx) => (
                  <div
                    key={idx}
                    className="flex gap-4 p-4 rounded-2xl bg-card border border-primary/20 hover:border-primary/30 transition-colors"
                    data-testid={`exercise-override-${idx + 1}`}
                  >
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-sm text-primary">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 text-sm leading-relaxed pt-0.5 flex-1">
                      <strong className="font-bold block mb-0.5 text-foreground">{ex.name}</strong>
                      {(ex.sets || ex.reps) && (
                        <p className="text-xs text-primary font-medium mb-1">{[ex.sets, ex.reps].filter(Boolean).join(" · ")}</p>
                      )}
                      <p className="text-muted-foreground">{ex.instructions}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div variants={stagger} className="space-y-3">
                {parsed.exercises.map((ex) => {
                  const slotIndex = TIME_SLOTS.findIndex(
                    (s) => Number(ex.number) - 1 >= s.range[0] && Number(ex.number) - 1 <= s.range[1]
                  );
                  const slot = slotIndex >= 0 ? TIME_SLOTS[slotIndex] : TIME_SLOTS[0];
                  return (
                    <motion.div
                      key={ex.number}
                      variants={fadeUp}
                      className="flex gap-4 p-4 rounded-2xl bg-card border border-border/50 hover:border-border transition-colors"
                      data-testid={`exercise-${ex.number}`}
                    >
                      <div className={`flex-shrink-0 w-9 h-9 rounded-full ${slot.bg} border ${slot.border} flex items-center justify-center font-black text-sm ${slot.accent}`}>
                        {ex.number}
                      </div>
                      <div className="min-w-0 text-sm leading-relaxed pt-0.5">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p>{children}</p>,
                            strong: ({ children }) => (
                              <strong className={`font-bold block mb-0.5 ${isPlaceholder ? "text-foreground/30" : "text-foreground"}`}>
                                {children}
                              </strong>
                            ),
                          }}
                        >
                          {ex.raw}
                        </ReactMarkdown>
                        {isPlaceholder && (
                          <span className="text-muted-foreground/30 italic text-xs">&nbsp;</span>
                        )}
                      </div>
                      <div className="flex-shrink-0 self-start">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${slot.bg} ${slot.accent} border ${slot.border}`}>
                          {slot.label}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>

          {/* ── Follow-Up Chat ── */}
          {!isPlaceholder && (
            <motion.div variants={fadeUp} className="mt-10">
              <h2 className="text-xs font-semibold text-primary tracking-widest uppercase mb-3 flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5" />
                Ask a Follow-Up Question
              </h2>

              {/* Thread */}
              {chatThread.length > 0 && (
                <div className="space-y-5 mb-4">
                  {chatThread.map((entry, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-end">
                        <div className="max-w-[82%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-primary/15 border border-primary/25 text-sm text-foreground">
                          {entry.question}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mt-0.5">
                          <MessageCircle className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="max-w-[82%] px-4 py-2.5 rounded-2xl rounded-tl-sm bg-card border border-border/50 text-sm text-muted-foreground leading-relaxed">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                            }}
                          >
                            {entry.answer}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatBottomRef} />
                </div>
              )}

              {/* Typing indicator */}
              {chatLoading && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <MessageCircle className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex gap-1.5 items-center px-4 py-3 rounded-2xl rounded-tl-sm bg-card border border-border/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              {/* Error */}
              {chatError && (
                <div className="p-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  {chatError}
                </div>
              )}

              {/* Input */}
              <div className="flex gap-3 p-4 rounded-2xl bg-card border border-border/50 focus-within:border-primary/40 transition-colors">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleFollowup();
                    }
                  }}
                  placeholder="Ask anything about your routine, pain, or exercises..."
                  rows={2}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 resize-none outline-none leading-relaxed"
                  data-testid="followup-input"
                />
                <button
                  onClick={() => void handleFollowup()}
                  disabled={!chatInput.trim() || chatLoading}
                  className="self-end flex-shrink-0 w-9 h-9 rounded-xl bg-primary hover:bg-primary/90 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)]"
                  data-testid="followup-submit"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground/40 mt-2 pl-1">
                Enter to send · Shift+Enter for a new line
              </p>
            </motion.div>
          )}

          {/* Bottom CTA */}
          <motion.div variants={fadeUp} className="mt-10 pt-6 border-t border-border/30 flex flex-col sm:flex-row gap-3 flex-wrap">
            <Button
              onClick={() => {
                sessionStorage.removeItem("mobilityRoutine");
                sessionStorage.removeItem("mobilityFormData");
                sessionStorage.removeItem("mobilitySessionId");
                sessionStorage.removeItem("mobilityAssessmentId");
                setLocation("/intake");
              }}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white border-0"
              data-testid="button-new-assessment"
            >
              <RotateCcw className="w-4 h-4" />
              New Assessment
            </Button>
            <Button
              onClick={() => setLocation("/dashboard")}
              variant="outline"
              className="flex items-center gap-2 border-border/50"
              data-testid="button-back-to-dashboard"
            >
              <LayoutDashboard className="w-4 h-4" />
              Back to Dashboard
            </Button>
            {!isPlaceholder && (
              <>
                <Button
                  onClick={() => setLocation("/retake")}
                  variant="outline"
                  className="flex items-center gap-2 border-border/50"
                  data-testid="button-retake-screen"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Retake Movement Screen
                </Button>
                <Button
                  onClick={() => setLocation("/progress")}
                  variant="outline"
                  className="flex items-center gap-2 border-border/50"
                  data-testid="button-progress"
                >
                  <TrendingUp className="w-4 h-4" />
                  Track Your Progress
                </Button>
              </>
            )}
          </motion.div>

          {/* Disclaimer */}
          <motion.p
            variants={fadeUp}
            className="mt-8 text-center text-xs text-muted-foreground/40 leading-relaxed px-4"
          >
            MyoMap is not a substitute for professional medical advice. Consult a physician or licensed healthcare provider before beginning any new exercise program.
          </motion.p>

        </motion.div>
      </div>
    </div>
  );
}
