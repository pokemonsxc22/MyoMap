import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, Home, RotateCcw, CheckCircle2, MinusCircle,
  ArrowDownCircle, MessageCircle, Send, ChevronDown, ChevronUp,
  Calendar, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { type ComparisonResult } from "@/lib/movementScreen";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/contexts/UserContext";
import {
  checkAiChatAccess, incrementAiMessageCount, hasUnlimitedAiChat,
  getRateLimitCooldownSeconds, recordRateLimitedMessage,
} from "@/lib/subscription";
import PaywallModal from "@/components/PaywallModal";
import ReactMarkdown from "react-markdown";

const fadeInUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const stagger = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const STATUS_CONFIG = {
  improved: {
    label: "Improved", icon: CheckCircle2,
    iconClass: "text-green-400", bg: "bg-green-500/10",
    border: "border-green-500/20", labelClass: "text-green-400", suffix: "✓",
  },
  maintained: {
    label: "Maintained", icon: CheckCircle2,
    iconClass: "text-primary", bg: "bg-primary/10",
    border: "border-primary/20", labelClass: "text-primary", suffix: "✓",
  },
  "no-change": {
    label: "No change", icon: MinusCircle,
    iconClass: "text-muted-foreground", bg: "bg-secondary/30",
    border: "border-border/40", labelClass: "text-muted-foreground", suffix: "",
  },
  regressed: {
    label: "Needs attention", icon: ArrowDownCircle,
    iconClass: "text-amber-400", bg: "bg-amber-400/10",
    border: "border-amber-400/20", labelClass: "text-amber-400", suffix: "",
  },
} as const;

interface ProgressLog {
  id: string;
  user_id: string;
  assessment_id: string | null;
  difficulty: string | null;
  improvement: string | null;
  notes: string | null;
  created_at: string;
}

interface ChatEntry { question: string; answer: string }

const STARTER_CHIPS = [
  "Before I started I felt...",
  "After doing the exercises I noticed...",
  "I'm struggling with...",
  "I think I'm improving because...",
];

const DIFFICULTY_OPTIONS = [
  { value: "easy",     label: "Easy",     color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/25" },
  { value: "moderate", label: "Moderate", color: "text-amber-400",  bg: "bg-amber-400/10",  border: "border-amber-400/25" },
  { value: "hard",     label: "Hard",     color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/25" },
];

const IMPROVEMENT_OPTIONS = [
  { value: "better", label: "Better", color: "text-green-400",          bg: "bg-green-500/10",  border: "border-green-500/25" },
  { value: "same",   label: "Same",   color: "text-muted-foreground",   bg: "bg-secondary/30",  border: "border-border/40" },
  { value: "worse",  label: "Worse",  color: "text-destructive",        bg: "bg-destructive/10", border: "border-destructive/25" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Progress() {
  const [, setLocation] = useLocation();
  const { userId } = useUser();

  const assessmentId = sessionStorage.getItem("mobilityAssessmentId");
  const formDataRaw  = sessionStorage.getItem("mobilityFormData");
  const formData     = formDataRaw ? (JSON.parse(formDataRaw) as Record<string, unknown>) : {};

  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const [showComparisons, setShowComparisons] = useState(false);

  const [difficulty,   setDifficulty]  = useState("");
  const [improvement,  setImprovement] = useState("");
  const [notes,        setNotes]       = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [feedbackSaved,  setFeedbackSaved]  = useState(false);
  const [feedbackError,  setFeedbackError]  = useState<string | null>(null);

  const [logs,        setLogs]        = useState<ProgressLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const [chatInput,    setChatInput]    = useState("");
  const [chatThread,   setChatThread]   = useState<ChatEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatLoading,  setChatLoading]  = useState(false);
  const [chatError,    setChatError]    = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);

  useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    const t = setTimeout(() => setRateLimitCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [rateLimitCooldown]);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("mobilityProgress");
    if (raw) {
      try { setComparisons(JSON.parse(raw) as ComparisonResult[]); } catch { }
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    if (!supabase) { setLogsLoading(false); return; }
    void (async () => {
      try {
        const { data } = await supabase
          .from("progress_logs")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        setLogs((data ?? []) as ProgressLog[]);
      } finally {
        setLogsLoading(false);
      }
    })();
  }, [userId]);

  const refreshLogs = async () => {
    if (!supabase || !userId) return;
    const { data } = await supabase
      .from("progress_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setLogs((data ?? []) as ProgressLog[]);
  };

  const handleSaveFeedback = async () => {
    if (!supabase || !userId || !difficulty || !improvement) return;
    setSavingFeedback(true);
    setFeedbackError(null);
    const { error } = await supabase.from("progress_logs").insert({
      user_id:       userId,
      assessment_id: assessmentId || null,
      difficulty,
      improvement,
      notes:         notes.trim() || null,
    });
    if (error) {
      setFeedbackError(error.message);
    } else {
      setFeedbackSaved(true);
      setDifficulty("");
      setImprovement("");
      setNotes("");
      await refreshLogs();
    }
    setSavingFeedback(false);
  };

  const handleChat = async () => {
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
      const res = await fetch("/api/progress-chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: outgoing,
          context: {
            painArea:    formData.painArea ?? "",
            goal:        formData.goal ?? "",
            recentLogs:  logs.slice(0, 5),
          },
        }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok || !data.answer) throw new Error(data.error ?? "Something went wrong");
      setChatMessages([...outgoing, { role: "assistant", content: data.answer }]);
      setChatThread((prev) => [...prev, { question, answer: data.answer! }]);
      setTimeout(() => { if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; }, 30);
      void incrementAiMessageCount(userId);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setChatLoading(false);
    }
  };

  const improved   = comparisons.filter((c) => c.status === "improved").length;
  const maintained = comparisons.filter((c) => c.status === "maintained").length;

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-foreground relative">
      <PaywallModal open={paywallOpen} reason="ai_chat" onClose={() => setPaywallOpen(false)} />
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-teal-600/10 blur-[160px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-teal-500/8 blur-[140px]" />
      </div>

      {/* Nav */}
      <nav className="sticky top-0 w-full border-b border-teal-500/10 bg-[#0a0f1a]/85 backdrop-blur-xl z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
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
              onClick={() => setLocation("/dashboard")}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-[0_0_14px_-4px_rgba(13,148,136,0.5)] hover:scale-[1.02]"
            >
              Dashboard
            </button>
            <button
              onClick={() => setLocation("/profile")}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold text-slate-400 hover:text-foreground border border-white/10 hover:border-white/20 transition-all"
            >
              Profile
            </button>
            <button
              onClick={() => setLocation("/")}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold text-slate-400 hover:text-foreground border border-white/10 hover:border-white/20 transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              Home
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10 relative z-10">
        <motion.div initial="hidden" animate="visible" variants={stagger}>

          {/* Header */}
          <motion.div variants={fadeInUp} className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-teal-500" />
              <span className="text-xs font-semibold text-teal-500 tracking-widest uppercase">Progress</span>
            </div>
            <h1 className="text-3xl font-black leading-tight">Track Your Progress</h1>
            <p className="text-muted-foreground mt-2">Log how your session went and chat with AI about your recovery.</p>
          </motion.div>

          {/* ── Session Feedback Card ── */}
          <motion.div variants={fadeInUp} className="mb-6">
            <div className="rounded-2xl bg-[#111827]/80 border border-teal-500/20 overflow-hidden backdrop-blur-sm hover:shadow-[0_0_24px_-8px_rgba(13,148,136,0.2)] transition-shadow">
              <div className="px-5 pt-5 pb-4 border-b border-white/5">
                <div className="flex items-center gap-2 mb-0.5">
                  <Activity className="w-4 h-4 text-teal-500" />
                  <h2 className="text-sm font-bold">Log Today's Session</h2>
                </div>
                <p className="text-xs text-slate-500">Record how your exercises felt after completing your routine</p>
              </div>

              {feedbackSaved ? (
                <div className="px-5 py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-teal-500" />
                  </div>
                  <p className="font-bold text-base mb-1">Session logged!</p>
                  <p className="text-sm text-muted-foreground mb-4">Your progress has been saved.</p>
                  <button
                    onClick={() => setFeedbackSaved(false)}
                    className="text-xs text-teal-500 hover:text-teal-400 font-medium transition-colors"
                  >
                    Log another session
                  </button>
                </div>
              ) : (
                <div className="px-5 pt-5 pb-5 space-y-5">
                  {/* Difficulty */}
                  <div>
                    <p className="text-sm font-semibold mb-2.5">How hard were the exercises?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {DIFFICULTY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setDifficulty(opt.value)}
                          className={`py-3 rounded-xl border font-semibold text-sm transition-all ${
                            difficulty === opt.value
                              ? `${opt.bg} ${opt.border} ${opt.color}`
                              : "border-white/10 bg-white/3 text-slate-400 hover:border-white/20"
                          }`}
                          data-testid={`difficulty-${opt.value}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Improvement */}
                  <div>
                    <p className="text-sm font-semibold mb-2.5">Did your pain or mobility improve?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {IMPROVEMENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setImprovement(opt.value)}
                          className={`py-3 rounded-xl border font-semibold text-sm transition-all ${
                            improvement === opt.value
                              ? `${opt.bg} ${opt.border} ${opt.color}`
                              : "border-white/10 bg-white/3 text-slate-400 hover:border-white/20"
                          }`}
                          data-testid={`improvement-${opt.value}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <p className="text-sm font-semibold mb-2">Anything else to note? <span className="font-normal text-muted-foreground">(optional)</span></p>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value.slice(0, 300))}
                      placeholder="e.g. My lower back felt looser after the cat-cow stretch..."
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-slate-600 resize-none outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/30 transition-all leading-relaxed"
                      data-testid="notes-input"
                    />
                    <p className="text-xs text-muted-foreground/50 text-right mt-1">{notes.length}/300</p>
                  </div>

                  {feedbackError && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                      {feedbackError}
                    </div>
                  )}

                  <Button
                    onClick={() => void handleSaveFeedback()}
                    disabled={savingFeedback || !difficulty || !improvement || !userId}
                    className="w-full h-11 bg-teal-600 hover:bg-teal-500 text-white border-0 font-bold shadow-[0_0_20px_-6px_rgba(13,148,136,0.5)] hover:scale-[1.01] transition-all disabled:opacity-40"
                    data-testid="button-save-feedback"
                  >
                    {savingFeedback ? "Saving..." : "Save Progress"}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Progress Chat ── */}
          <motion.div variants={fadeInUp} className="mb-6">
            <div className="rounded-2xl bg-[#111827]/80 border border-teal-500/20 overflow-hidden backdrop-blur-sm hover:shadow-[0_0_24px_-8px_rgba(13,148,136,0.2)] transition-shadow">
              <div className="px-5 pt-5 pb-4 border-b border-white/5 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-teal-500/15 border border-teal-500/25 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-3.5 h-3.5 text-teal-500" />
                </div>
                <div>
                  <h2 className="text-sm font-bold leading-tight">Progress Chat</h2>
                  <p className="text-xs text-muted-foreground">Tell MyoMap AI how you felt before and after your routine</p>
                </div>
              </div>

              {/* Chat Thread */}
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
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-500/15 border border-teal-500/25 flex items-center justify-center mt-0.5">
                          <MessageCircle className="w-3.5 h-3.5 text-teal-500" />
                        </div>
                        <div className="max-w-[82%] px-4 py-2.5 rounded-2xl rounded-tl-sm bg-teal-500/8 border border-teal-500/15 text-sm text-foreground leading-relaxed">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
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
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-500/15 border border-teal-500/25 flex items-center justify-center">
                    <MessageCircle className="w-3.5 h-3.5 text-teal-500" />
                  </div>
                  <div className="flex gap-1.5 items-center px-4 py-3 rounded-2xl rounded-tl-sm bg-teal-500/8 border border-teal-500/15">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500/60 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500/60 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500/60 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              {chatError && (
                <div className="px-5 pt-3">
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    {chatError}
                  </div>
                </div>
              )}

              {/* Starter chips */}
              {chatThread.length === 0 && !chatLoading && (
                <div className="px-4 pt-4 flex flex-wrap gap-2">
                  {STARTER_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setChatInput(chip)}
                      className="px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-medium text-teal-400 hover:bg-teal-500/20 transition-all"
                    >
                      {chip}
                    </button>
                  ))}
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
                        void handleChat();
                      }
                    }}
                    placeholder="Share how your routine went..."
                    rows={2}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 resize-none outline-none leading-relaxed"
                    data-testid="progress-chat-input"
                  />
                  <button
                    onClick={() => void handleChat()}
                    disabled={!chatInput.trim() || chatLoading || rateLimitCooldown > 0}
                    className="self-end flex-shrink-0 w-9 h-9 rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    data-testid="progress-chat-submit"
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

          {/* ── Progress History ── */}
          <motion.div variants={fadeInUp} className="mb-6">
            <h2 className="text-xs font-semibold text-teal-500 tracking-widest uppercase mb-3 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Session History
            </h2>

            {logsLoading ? (
              <div className="p-6 rounded-2xl bg-[#111827]/80 border border-teal-500/10 backdrop-blur-sm text-center">
                <p className="text-sm text-slate-500">Loading history...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#111827]/80 border border-teal-500/10 backdrop-blur-sm text-center">
                <p className="text-sm text-slate-500">No sessions logged yet. Complete your first routine above to start tracking.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => {
                  const diffOpt = DIFFICULTY_OPTIONS.find((o) => o.value === log.difficulty);
                  const imprOpt = IMPROVEMENT_OPTIONS.find((o) => o.value === log.improvement);
                  return (
                    <div key={log.id} className="p-4 rounded-2xl bg-[#111827]/80 border border-teal-500/10 backdrop-blur-sm hover:border-teal-500/20 transition-all" data-testid={`log-${log.id}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground">{formatDate(log.created_at)}</span>
                        <div className="flex items-center gap-2">
                          {diffOpt && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${diffOpt.bg} ${diffOpt.color} border ${diffOpt.border}`}>
                              {diffOpt.label}
                            </span>
                          )}
                          {imprOpt && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${imprOpt.bg} ${imprOpt.color} border ${imprOpt.border}`}>
                              {imprOpt.label}
                            </span>
                          )}
                        </div>
                      </div>
                      {log.notes && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{log.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* ── Movement Comparison (collapsible) ── */}
          {comparisons.length > 0 && (
            <motion.div variants={fadeInUp} className="mb-6">
              <button
                onClick={() => setShowComparisons((v) => !v)}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#111827]/80 border border-teal-500/15 backdrop-blur-sm hover:border-teal-500/25 hover:shadow-[0_0_16px_-6px_rgba(13,148,136,0.2)] transition-all"
                data-testid="button-toggle-comparisons"
              >
                <div className="text-left">
                  <p className="text-sm font-bold">Movement Screen Comparison</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {improved > 0 ? `${improved} improvement${improved > 1 ? "s" : ""}` : ""}
                    {improved > 0 && maintained > 0 ? " · " : ""}
                    {maintained > 0 ? `${maintained} maintained` : ""}
                    {improved === 0 && maintained === 0 ? "Retake to see your progress" : ""}
                  </p>
                </div>
                {showComparisons
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              </button>

              {showComparisons && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-3 space-y-3"
                >
                  {comparisons.map((c) => {
                    const cfg = STATUS_CONFIG[c.status];
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={c.id}
                        className={`p-5 rounded-2xl border ${cfg.bg} ${cfg.border}`}
                        data-testid={`progress-card-${c.id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-base mb-1">{c.shortLabel}</p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground/70">{c.originalText}</span>
                              <span className="mx-2 text-muted-foreground/50">→</span>
                              <span className={`font-semibold ${c.status === "improved" || c.status === "maintained" ? "text-foreground" : "text-muted-foreground"}`}>
                                {c.retakeText}
                              </span>
                              {cfg.suffix && <span className={`ml-1.5 ${cfg.labelClass}`}>{cfg.suffix}</span>}
                            </p>
                          </div>
                          <div className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.labelClass} border ${cfg.border}`}>
                            <Icon className={`w-3.5 h-3.5 ${cfg.iconClass}`} />
                            {cfg.label}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* CTAs */}
          <motion.div variants={fadeInUp} className="pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-2.5">
            <Button
              onClick={() => setLocation("/retake")}
              variant="outline"
              className="flex items-center gap-2 bg-transparent border-white/10 text-slate-400 hover:border-white/20 hover:text-foreground hover:bg-white/5 transition-all"
              data-testid="button-retake-again"
            >
              <RotateCcw className="w-4 h-4" />
              Retake Movement Screen
            </Button>
            <Button
              onClick={() => setLocation("/results")}
              variant="outline"
              className="flex items-center gap-2 bg-transparent border-white/10 text-slate-400 hover:border-white/20 hover:text-foreground hover:bg-white/5 transition-all"
              data-testid="button-back-results"
            >
              Back to My Routine
            </Button>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
