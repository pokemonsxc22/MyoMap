import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Home, RotateCcw, Sunset, Sun, Moon, TrendingUp, RefreshCcw, MessageCircle, Send, CheckCircle2, LayoutDashboard, ChevronDown, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/contexts/UserContext";
import {
  checkAiChatAccess, incrementAiMessageCount, hasUnlimitedAiChat,
  getRateLimitCooldownSeconds, recordRateLimitedMessage, showsAds,
} from "@/lib/subscription";
import PaywallModal from "@/components/PaywallModal";
import AdBanner from "@/components/AdBanner";

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
  whatToAvoid: string[];
}

function extractName(raw: string): string {
  const match = raw.match(/^\*{1,2}([^*]+)\*{1,2}/);
  if (match) return match[1].trim();
  const colonIdx = raw.indexOf(":");
  if (colonIdx > 0) return raw.slice(0, colonIdx).replace(/\*+/g, "").trim();
  return raw.slice(0, 40).replace(/\*+/g, "").trim();
}

function parseRoutine(text: string): ParsedRoutine {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  type Section = "preamble" | "todo" | "avoid" | "why";
  let section: Section = "preamble";
  let foundList = false;

  const exercises: Exercise[] = [];
  const avoidItems: string[] = [];
  const whyLines: string[] = [];
  const preambleLines: string[] = [];

  for (const line of lines) {
    const heading = line.replace(/^#+\s*/, "").toLowerCase();
    if (/^(section\s*1[:\s]*)?(what to do|your routine|exercise routine)/.test(heading)) {
      section = "todo"; continue;
    }
    if (/^(section\s*2[:\s]*)?(what to avoid|things to avoid|avoid)/.test(heading)) {
      section = "avoid"; continue;
    }
    if (/^(section\s*3[:\s]*)?(why this works|why it works|explanation|root cause)/.test(heading)) {
      section = "why"; continue;
    }

    const numbered = line.match(/^(\d+)[.)]\s+(.+)$/);
    const bulleted = line.match(/^[-*•]\s+(.+)$/);

    if (section === "preamble" || section === "todo") {
      if (numbered) {
        foundList = true;
        exercises.push({ number: numbered[1], name: extractName(numbered[2]), raw: numbered[2] });
      } else if (!foundList) {
        preambleLines.push(line);
      }
    } else if (section === "avoid") {
      const item = bulleted ? bulleted[1] : line;
      if (!line.startsWith("#") && item.trim()) avoidItems.push(item.trim());
    } else if (section === "why") {
      if (!line.startsWith("#")) whyLines.push(line);
    }
  }

  const rootCause = whyLines.length > 0
    ? whyLines.join("\n\n")
    : preambleLines.join("\n\n");

  return { rootCause, exercises, whatToAvoid: avoidItems };
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
  whatToAvoid: [],
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
  interface ChatEntry { question: string; answer: string }
  const [chatInput, setChatInput] = useState("");
  const [chatThread, setChatThread] = useState<ChatEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [instructionCache, setInstructionCache] = useState<Record<string, string>>({});
  const [instructionLoading, setInstructionLoading] = useState<string | null>(null);
  const [showResultsOnboarding, setShowResultsOnboarding] = useState(false);

  // ── Streak tracking ────────────────────────────────────────────────────────
  const { userId: authUserId, plan } = useUser();
  const userId = authUserId ?? "";
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [streakError, setStreakError] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [adWatched, setAdWatched] = useState(false);

  useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    const t = setTimeout(() => setRateLimitCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [rateLimitCooldown]);

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
    if (!question || chatLoading || !userId) return;

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
      setTimeout(() => { if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; }, 30);
      void incrementAiMessageCount(userId);
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

  useEffect(() => {
    if (localStorage.getItem("myomap_results_seen")) return;
    const t = setTimeout(() => setShowResultsOnboarding(true), 900);
    return () => clearTimeout(t);
  }, []);

  const handleExerciseClick = async (exerciseNum: string, exerciseName: string) => {
    if (isPlaceholder) return;
    setExpandedExercise(prev => prev === exerciseNum ? null : exerciseNum);
    if (!instructionCache[exerciseNum] && instructionLoading !== exerciseNum) {
      setInstructionLoading(exerciseNum);
      try {
        const res = await fetch("/api/exercise-instructions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exerciseName }),
        });
        const data = (await res.json()) as { instructions?: string };
        if (data.instructions) {
          setInstructionCache(prev => ({ ...prev, [exerciseNum]: data.instructions! }));
        }
      } catch { /* silent */ } finally {
        setInstructionLoading(null);
      }
    }
  };

  if (!parsed) return null;

  if (showsAds(plan) && !isPlaceholder && !adWatched) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-foreground flex items-center justify-center px-4">
        <AdBanner onComplete={() => setAdWatched(true)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-foreground">
      <PaywallModal open={paywallOpen} reason="ai_chat" onClose={() => setPaywallOpen(false)} />
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="fixed top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-teal-600/10 blur-[160px]" />
        <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-teal-500/8 blur-[140px]" />
      </div>

      {/* ── Top Nav ── */}
      {/* ── Results Onboarding Modal ── */}
      <AnimatePresence>
        {showResultsOnboarding && !isPlaceholder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-md rounded-3xl bg-[#111827]/95 border border-teal-500/20 backdrop-blur-xl p-8 shadow-[0_0_60px_-12px_rgba(13,148,136,0.35)]"
            >
              <button
                onClick={() => { localStorage.setItem("myomap_results_seen", "true"); setShowResultsOnboarding(false); }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center mb-5">
                <Activity className="w-6 h-6 text-teal-400" />
              </div>
              <h2 className="text-xl font-extrabold mb-2">Your personalized routine is ready</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">Here's how to make the most of your results:</p>
              <div className="space-y-4 mb-7">
                {[
                  { icon: "→", text: "Click any exercise to see step-by-step how-to instructions" },
                  { icon: "→", text: "Chat with the AI about your results, pain, or routine questions" },
                  { icon: "→", text: "Save your routine to your dashboard to track long-term" },
                  { icon: "→", text: "Check in daily and build your streak for best results" },
                ].map((step) => (
                  <div key={step.text} className="flex items-start gap-3">
                    <span className="text-teal-400 font-bold text-sm mt-0.5">{step.icon}</span>
                    <p className="text-sm text-slate-300 leading-relaxed">{step.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => { localStorage.setItem("myomap_results_seen", "true"); setShowResultsOnboarding(false); }}
                  className="flex-1 bg-teal-600 hover:bg-teal-500 text-white border-0 font-bold shadow-[0_0_20px_-6px_rgba(13,148,136,0.5)]"
                >
                  Got it!
                </Button>
                <button
                  onClick={() => { localStorage.setItem("myomap_results_seen", "true"); setShowResultsOnboarding(false); }}
                  className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-slate-300 text-sm transition-colors"
                >
                  Don't show again
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="sticky top-0 w-full border-b border-teal-500/10 bg-[#0a0f1a]/85 backdrop-blur-xl z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div
            className="flex items-center gap-2 shrink-0 cursor-pointer"
            onClick={() => setLocation("/")}
          >
            <img
              src="https://okvnrbrnubtgplheyavw.supabase.co/storage/v1/object/public/assets/LOGO%20MYOMAP.png"
              alt="MyoMap"
              className="h-8 w-auto hover:opacity-90 transition-opacity"
            />
            <span className="text-sm font-extrabold text-white tracking-tight">MyoMap</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <button
              onClick={() => setLocation("/dashboard")}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-[0_0_14px_-4px_rgba(13,148,136,0.5)] hover:scale-[1.02]"
              data-testid="button-nav-dashboard"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </button>
            <button
              onClick={() => setLocation("/profile")}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold text-slate-400 hover:text-foreground border border-white/10 hover:border-white/20 transition-all"
              data-testid="button-nav-profile"
            >
              Profile
            </button>
            <button
              onClick={() => setLocation("/")}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold text-slate-400 hover:text-foreground border border-white/10 hover:border-white/20 transition-all"
              data-testid="button-nav-home"
            >
              <Home className="w-3.5 h-3.5" />
              Home
            </button>
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

          {/* ── AI Chat (top) ── */}
          {!isPlaceholder && (
            <motion.div variants={fadeUp} className="mb-8">
              <div className="rounded-2xl bg-[#111827]/80 border border-teal-500/20 overflow-hidden backdrop-blur-sm hover:shadow-[0_0_24px_-8px_rgba(13,148,136,0.2)] transition-shadow">
                <div className="px-5 pt-4 pb-3 border-b border-border/30 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-3.5 h-3.5 text-teal-500" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold leading-tight">Chat with MyoMap AI about your results</h2>
                    <p className="text-xs text-muted-foreground">Ask anything about your exercises, pain, or routine</p>
                  </div>
                </div>

                {/* Thread */}
                {chatThread.length > 0 && (
                  <div ref={chatContainerRef} className="px-5 pt-4 space-y-5 max-h-80 overflow-y-auto">
                    {chatThread.map((entry, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-end">
                          <div className="max-w-[82%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-primary/15 border border-primary/25 text-sm text-foreground">
                            {entry.question}
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mt-0.5">
                            <MessageCircle className="w-3.5 h-3.5 text-teal-500" />
                          </div>
                          <div className="max-w-[82%] px-4 py-2.5 rounded-2xl rounded-tl-sm bg-teal-500/10 border border-teal-500/20 text-sm text-foreground leading-relaxed">
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
                  <div className="px-5 pt-4 flex items-center gap-2">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                      <MessageCircle className="w-3.5 h-3.5 text-teal-500" />
                    </div>
                    <div className="flex gap-1.5 items-center px-4 py-3 rounded-2xl rounded-tl-sm bg-teal-500/10 border border-teal-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500/60 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500/60 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500/60 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}

                {/* Error */}
                {chatError && (
                  <div className="px-5 pt-3">
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                      {chatError}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="px-4 pb-4 pt-3">
                  <div className="flex gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 focus-within:border-teal-500/40 focus-within:ring-1 focus-within:ring-teal-500/30 transition-all">
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
                      disabled={!chatInput.trim() || chatLoading || rateLimitCooldown > 0}
                      className="self-end flex-shrink-0 w-9 h-9 rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_16px_-4px_rgba(13,148,136,0.5)]"
                      data-testid="followup-submit"
                    >
                      {rateLimitCooldown > 0 ? (
                        <span className="text-[10px] font-bold tabular-nums">{rateLimitCooldown}s</span>
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground/40 mt-2 pl-1">Enter to send · Shift+Enter for new line</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* What's Happening in Your Body */}
          <motion.div variants={fadeUp} className="mb-8">
            <h2 className="text-xs font-bold text-teal-500 tracking-widest uppercase mb-3">
              What&apos;s Happening in Your Body
            </h2>
            <div className="p-5 rounded-2xl bg-[#111827]/80 border border-teal-500/20 backdrop-blur-sm hover:shadow-[0_0_20px_-8px_rgba(13,148,136,0.2)] transition-shadow">
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
            <h2 className="text-xs font-bold text-teal-500 tracking-widest uppercase mb-3">
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
            <h2 className="text-xs font-bold text-teal-500 tracking-widest uppercase mb-3">
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
                <p className="text-xs text-teal-500/70 font-medium mb-3 flex items-center gap-1.5">
                  <RefreshCcw className="w-3 h-3" />
                  Updated by AI based on your conversation
                </p>
                {overrideExercises.map((ex, idx) => (
                  <div
                    key={idx}
                    className="flex gap-4 p-4 rounded-2xl bg-[#111827]/80 border border-teal-500/20 backdrop-blur-sm hover:shadow-[0_0_16px_-6px_rgba(13,148,136,0.2)] transition-shadow"
                    data-testid={`exercise-override-${idx + 1}`}
                  >
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center font-extrabold text-sm text-teal-400">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 text-sm leading-relaxed pt-0.5 flex-1">
                      <strong className="font-bold block mb-0.5 text-foreground">{ex.name}</strong>
                      {(ex.sets || ex.reps) && (
                        <p className="text-xs text-teal-400 font-medium mb-1">{[ex.sets, ex.reps].filter(Boolean).join(" · ")}</p>
                      )}
                      <p className="text-slate-400">{ex.instructions}</p>
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
                  const isExpanded = expandedExercise === ex.number;
                  const isLoadingThis = instructionLoading === ex.number;
                  return (
                    <motion.div
                      key={ex.number}
                      variants={fadeUp}
                      className="rounded-2xl bg-[#111827]/80 border border-teal-500/10 hover:border-teal-500/20 backdrop-blur-sm transition-all overflow-hidden"
                      data-testid={`exercise-${ex.number}`}
                    >
                      <div
                        className={`flex gap-4 p-4 ${!isPlaceholder ? "cursor-pointer hover:bg-teal-500/3" : ""} transition-colors`}
                        onClick={() => { if (!isPlaceholder) void handleExerciseClick(ex.number, ex.name); }}
                      >
                        <div className={`flex-shrink-0 w-9 h-9 rounded-full ${slot.bg} border ${slot.border} flex items-center justify-center font-extrabold text-sm ${slot.accent}`}>
                          {ex.number}
                        </div>
                        <div className="min-w-0 text-sm leading-relaxed pt-0.5 flex-1">
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
                            <span className="text-slate-600 italic text-xs">&nbsp;</span>
                          )}
                          {!isPlaceholder && !isExpanded && (
                            <p className="text-xs text-teal-500/50 mt-1">Click to see how to do this</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 self-start flex items-center gap-2 pt-0.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${slot.bg} ${slot.accent} border ${slot.border}`}>
                            {slot.label}
                          </span>
                          {!isPlaceholder && (
                            isLoadingThis
                              ? <Loader2 className="w-3.5 h-3.5 text-teal-500 animate-spin" />
                              : <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                          )}
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {isExpanded && !isPlaceholder && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4">
                              <div className="p-4 rounded-xl bg-teal-500/6 border border-teal-500/20">
                                <p className="text-[10px] font-bold text-teal-500 tracking-widest uppercase mb-3">Step-by-Step Instructions</p>
                                {isLoadingThis ? (
                                  <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                                    Generating step-by-step instructions...
                                  </div>
                                ) : instructionCache[ex.number] ? (
                                  <div className="text-sm text-slate-300 leading-relaxed">
                                    <ReactMarkdown
                                      components={{
                                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                        ol: ({ children }) => <ol className="space-y-2 list-decimal list-outside pl-4">{children}</ol>,
                                        ul: ({ children }) => <ul className="space-y-1.5 list-disc list-outside pl-4">{children}</ul>,
                                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                                      }}
                                    >
                                      {instructionCache[ex.number]}
                                    </ReactMarkdown>
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-500 italic">Loading instructions...</p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>

          {/* ── What to Avoid ── */}
          {!isPlaceholder && parsed && parsed.whatToAvoid.length > 0 && (
            <motion.div variants={fadeUp} className="mt-8">
              <h2 className="text-xs font-bold text-teal-500 tracking-widest uppercase mb-3">
                What to Avoid
              </h2>
              <div className="p-5 rounded-2xl bg-[#111827]/80 border border-red-500/20 backdrop-blur-sm">
                <ul className="space-y-2.5">
                  {parsed.whatToAvoid.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-destructive/60" />
                      <span className="leading-relaxed">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <span>{children}</span>,
                            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                          }}
                        >
                          {item}
                        </ReactMarkdown>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {/* ── Go to Dashboard CTA ── */}
          <motion.div variants={fadeUp} className="mt-10">
            <Button
              onClick={() => setLocation("/dashboard")}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white border-0 h-13 text-base font-bold shadow-[0_0_28px_-6px_rgba(13,148,136,0.6)] hover:scale-[1.01] transition-all"
              data-testid="button-go-to-dashboard"
            >
              <LayoutDashboard className="w-5 h-5" />
              Go to Dashboard
            </Button>
          </motion.div>

          {/* Bottom CTA (secondary actions) */}
          <motion.div variants={fadeUp} className="mt-3 pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-2.5 flex-wrap">
            <Button
              onClick={() => {
                sessionStorage.removeItem("mobilityRoutine");
                sessionStorage.removeItem("mobilityFormData");
                sessionStorage.removeItem("mobilitySessionId");
                sessionStorage.removeItem("mobilityAssessmentId");
                setLocation("/intake");
              }}
              variant="outline"
              className="flex items-center gap-2 bg-transparent border-white/10 text-slate-400 hover:border-white/20 hover:text-foreground hover:bg-white/5 transition-all"
              data-testid="button-new-assessment"
            >
              <RotateCcw className="w-4 h-4" />
              New Assessment
            </Button>
            {!isPlaceholder && (
              <>
                <Button
                  onClick={() => setLocation("/retake")}
                  variant="outline"
                  className="flex items-center gap-2 bg-transparent border-white/10 text-slate-400 hover:border-white/20 hover:text-foreground hover:bg-white/5 transition-all"
                  data-testid="button-retake-screen"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Retake Movement Screen
                </Button>
                <Button
                  onClick={() => setLocation("/progress")}
                  variant="outline"
                  className="flex items-center gap-2 bg-transparent border-white/10 text-slate-400 hover:border-white/20 hover:text-foreground hover:bg-white/5 transition-all"
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
