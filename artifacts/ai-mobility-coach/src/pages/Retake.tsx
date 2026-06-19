import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { SCREEN_QUESTIONS, computeComparison } from "@/lib/movementScreen";

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

type ScreenAnswer = "yes" | "no";

export default function Retake() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Record<string, ScreenAnswer>>({});

  const { originalData, sessionId } = useMemo(() => {
    const raw = sessionStorage.getItem("mobilityFormData");
    const sid = sessionStorage.getItem("mobilitySessionId");
    if (!raw) return { originalData: null, sessionId: sid };
    try {
      return { originalData: JSON.parse(raw) as { painArea: string; screen: Record<string, ScreenAnswer> }, sessionId: sid };
    } catch {
      return { originalData: null, sessionId: sid };
    }
  }, []);

  const activeQuestions = originalData?.painArea ? (SCREEN_QUESTIONS[originalData.painArea] ?? []) : [];
  const isComplete = activeQuestions.length > 0 && activeQuestions.every((q) => screen[q.id] !== undefined);

  const handleSubmit = async () => {
    if (!isComplete) return;
    setLoading(true);
    setError(null);
    try {
      // Persist to Supabase if we have a session ID (best-effort)
      if (sessionId) {
        await fetch("/api/retake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, screen }),
        });
      }

      // Compute comparison client-side and store for the progress page
      const originalScreen = originalData?.screen ?? {};
      const comparison = computeComparison(originalScreen, screen);
      sessionStorage.setItem("mobilityProgress", JSON.stringify(comparison));
      setLocation("/progress");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const btnClass = (id: string, value: ScreenAnswer) =>
    `py-3 rounded-xl border font-semibold text-base transition-all ${
      screen[id] === value
        ? "border-primary bg-primary/10 text-primary"
        : "border-border/50 bg-background text-muted-foreground hover:border-border"
    }`;

  if (!originalData) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">No assessment found.</p>
          <p className="text-muted-foreground text-sm">Complete the intake form first to access the movement screen retake.</p>
          <Button onClick={() => setLocation("/intake")} className="mt-4">Go to Intake</Button>
        </div>
      </div>
    );
  }

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

            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-medium">
                {error}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!isComplete || loading}
              size="lg"
              className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-white border-0 shadow-[0_0_30px_-5px_rgba(37,99,235,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="button-submit-retake"
            >
              {loading ? (
                <span className="flex items-center gap-3">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Comparing results...
                </span>
              ) : (
                <>
                  Submit & See My Progress
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
