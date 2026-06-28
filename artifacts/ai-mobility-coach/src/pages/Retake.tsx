import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, ChevronLeft, ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { SCREEN_QUESTIONS, computeComparison } from "@/lib/movementScreen";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/contexts/UserContext";

const fadeInUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

type ScreenAnswer = "yes" | "no";

interface AssessmentData {
  painArea:  string;
  screen:    Record<string, ScreenAnswer>;
  sessionId: string | null;
}

export default function Retake() {
  const [, setLocation] = useLocation();
  const { userId, loading: userLoading } = useUser();

  const [fetchState, setFetchState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [originalData, setOriginalData] = useState<AssessmentData | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError]     = useState<string | null>(null);
  const [screen, setScreen]               = useState<Record<string, ScreenAnswer>>({});

  // ── Step 1: Try sessionStorage first ──────────────────────────────
  const sessionData = useMemo<AssessmentData | null>(() => {
    const raw = sessionStorage.getItem("mobilityFormData");
    const sid = sessionStorage.getItem("mobilitySessionId");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { painArea?: string; screen?: Record<string, ScreenAnswer> };
      if (!parsed.painArea) return null;
      return {
        painArea:  parsed.painArea,
        screen:    parsed.screen ?? {},
        sessionId: sid,
      };
    } catch {
      return null;
    }
  }, []);

  // ── Step 2: Fetch from Supabase if sessionStorage is empty ─────────
  useEffect(() => {
    if (userLoading) return;

    // If sessionStorage already has what we need, use it immediately
    if (sessionData) {
      console.log("[MyoMap Retake] Using sessionStorage data:", sessionData);
      setOriginalData(sessionData);
      setFetchState("done");
      return;
    }

    // Need Supabase fallback
    if (!supabase) {
      console.warn("[MyoMap Retake] No Supabase client available.");
      setFetchState("done");
      return;
    }

    if (!userId) {
      console.warn("[MyoMap Retake] No authenticated userId — cannot fetch assessment.");
      setFetchState("done");
      return;
    }

    setFetchState("loading");

    void (async () => {
      try {
        console.log("[MyoMap Retake] Fetching latest assessment for userId:", userId);

        const { data, error } = await supabase
          .from("assessments")
          .select("id, pain_location, screen_json, session_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log("[MyoMap Retake] Supabase result:", { data, error });

        if (error) {
          console.error("[MyoMap Retake] Supabase error:", error.message, error.details);
          setFetchState("error");
          return;
        }

        if (!data) {
          console.log("[MyoMap Retake] No assessment found for this user.");
          setOriginalData(null);
          setFetchState("done");
          return;
        }

        const painArea  = data.pain_location as string;
        const screenRaw = (data.screen_json ?? {}) as Record<string, ScreenAnswer>;
        const sessionId = (data.session_id as string | null) ?? null;

        console.log("[MyoMap Retake] Assessment loaded:", { painArea, screenRaw, sessionId });

        // Hydrate sessionStorage so handleSubmit can use it
        sessionStorage.setItem("mobilitySessionId", sessionId ?? crypto.randomUUID());
        sessionStorage.setItem("mobilityFormData", JSON.stringify({ painArea, screen: screenRaw }));
        sessionStorage.setItem("mobilityAssessmentId", data.id as string);

        setOriginalData({ painArea, screen: screenRaw, sessionId });
        setFetchState("done");
      } catch (err) {
        console.error("[MyoMap Retake] Unexpected error:", err);
        setFetchState("error");
      }
    })();
  }, [userId, userLoading, sessionData]);

  // ── Derived ────────────────────────────────────────────────────────
  const activeQuestions = originalData?.painArea
    ? (SCREEN_QUESTIONS[originalData.painArea] ?? [])
    : [];
  const isComplete = activeQuestions.length > 0 && activeQuestions.every((q) => screen[q.id] !== undefined);

  // ── Submit ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isComplete || !originalData) return;
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      const sid = originalData.sessionId ?? sessionStorage.getItem("mobilitySessionId");
      if (sid) {
        await fetch("/api/retake", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ sessionId: sid, screen }),
        });
      }
      const comparison = computeComparison(originalData.screen, screen);
      sessionStorage.setItem("mobilityProgress", JSON.stringify(comparison));
      setLocation("/progress");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const btnClass = (id: string, value: ScreenAnswer) =>
    `py-3 rounded-xl border font-semibold text-base transition-all ${
      screen[id] === value
        ? "border-primary bg-primary/10 text-primary"
        : "border-border/50 bg-background text-muted-foreground hover:border-border"
    }`;

  // ── Loading state ──────────────────────────────────────────────────
  if (userLoading || fetchState === "idle" || fetchState === "loading") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your assessment…</p>
        </div>
      </div>
    );
  }

  // ── No assessment found ────────────────────────────────────────────
  if (fetchState === "done" && !originalData) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-secondary/50 border border-border/50 flex items-center justify-center mx-auto">
            <Activity className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold">No assessment yet</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Complete your first assessment to unlock the retake screen — we need a baseline to compare against.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={() => setLocation("/intake")}
              className="bg-primary hover:bg-primary/90 text-white border-0"
              data-testid="button-go-to-intake"
            >
              Start My First Assessment
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/dashboard")}
              className="flex items-center gap-1.5"
            >
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Supabase error state ───────────────────────────────────────────
  if (fetchState === "error") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-sm">
          <h2 className="text-xl font-bold">Couldn't load your assessment</h2>
          <p className="text-muted-foreground text-sm">
            There was a problem fetching your data. Please try again.
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  // ── Main retake UI ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-16 relative">
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">
        <button
          onClick={() => setLocation("/results")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Results
        </button>

        <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary tracking-widest uppercase">
              Movement Screen Retake
            </span>
          </div>
          <h1 className="text-4xl font-black mb-2">Check your progress.</h1>
          <p className="text-muted-foreground text-lg mb-10">
            Answer the same movement checks as your original assessment. We'll show you a before-and-after comparison.
          </p>

          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-1">Movement Screen</p>
              <p className="text-xl font-bold mb-2">Repeat your movement checks</p>
              <p className="text-sm text-muted-foreground mb-6">
                These are the same checks you did during your intake — answer them honestly right now.
              </p>

              <div className="space-y-5" data-testid="retake-screen">
                {activeQuestions.map((q, i) => (
                  <div key={q.id}>
                    {i > 0 && <div className="border-t border-border/30 mb-5" />}
                    <p className="text-sm font-semibold mb-3" data-testid={`retake-label-${q.id}`}>
                      {q.label}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setScreen((prev) => ({ ...prev, [q.id]: "yes" }))}
                        data-testid={`retake-${q.id}-yes`}
                        className={btnClass(q.id, "yes")}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setScreen((prev) => ({ ...prev, [q.id]: "no" }))}
                        data-testid={`retake-${q.id}-no`}
                        className={btnClass(q.id, "no")}
                      >
                        No
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {submitError && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-medium">
                {submitError}
              </div>
            )}

            <Button
              onClick={() => void handleSubmit()}
              disabled={!isComplete || submitLoading}
              size="lg"
              className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-white border-0 shadow-[0_0_30px_-5px_rgba(37,99,235,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="button-submit-retake"
            >
              {submitLoading ? (
                <span className="flex items-center gap-3">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Comparing results…
                </span>
              ) : (
                <>
                  Submit &amp; See My Progress
                  <ChevronRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
