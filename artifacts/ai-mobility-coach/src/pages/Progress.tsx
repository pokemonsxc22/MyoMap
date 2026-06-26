import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, TrendingUp, RotateCcw, Home, CheckCircle2, MinusCircle, ArrowDownCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { type ComparisonResult } from "@/lib/movementScreen";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const STATUS_CONFIG = {
  improved: {
    label: "Improved",
    icon: CheckCircle2,
    iconClass: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    labelClass: "text-green-400",
    suffix: "✓",
  },
  maintained: {
    label: "Maintained",
    icon: CheckCircle2,
    iconClass: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    labelClass: "text-primary",
    suffix: "✓",
  },
  "no-change": {
    label: "No change",
    icon: MinusCircle,
    iconClass: "text-muted-foreground",
    bg: "bg-secondary/30",
    border: "border-border/40",
    labelClass: "text-muted-foreground",
    suffix: "",
  },
  regressed: {
    label: "Needs attention",
    icon: ArrowDownCircle,
    iconClass: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    labelClass: "text-amber-400",
    suffix: "",
  },
} as const;

export default function Progress() {
  const [, setLocation] = useLocation();
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);

  useEffect(() => {
    const raw = sessionStorage.getItem("mobilityProgress");
    if (raw) {
      try {
        setComparisons(JSON.parse(raw) as ComparisonResult[]);
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  const improved  = comparisons.filter((c) => c.status === "improved").length;
  const maintained = comparisons.filter((c) => c.status === "maintained").length;

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* Nav */}
      <nav className="sticky top-0 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center">
            <img src="https://okvnrbrnubtgplheyavw.supabase.co/storage/v1/object/public/assets/LOGO%20MYOMAP.png" alt="MyoMap" className="h-9 w-auto" />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLocation("/")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              Home
            </button>
            <button
              onClick={() => setLocation("/results")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
              data-testid="button-nav-results"
            >
              My Routine
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10 relative z-10">
        <motion.div initial="hidden" animate="visible" variants={stagger}>

          {/* Header */}
          <motion.div variants={fadeInUp} className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-xs font-semibold text-primary tracking-widest uppercase">Progress</span>
            </div>
            <h1 className="text-3xl font-black leading-tight">Your Movement Progress</h1>
            {comparisons.length > 0 && (
              <p className="text-muted-foreground mt-2">
                {improved > 0
                  ? `${improved} improvement${improved > 1 ? "s" : ""} since your last assessment${maintained > 0 ? ` · ${maintained} maintained` : ""}.`
                  : maintained > 0
                  ? `${maintained} movement${maintained > 1 ? "s" : ""} maintained — keep up the routine.`
                  : "Keep working your routine — progress takes consistency."}
              </p>
            )}
          </motion.div>

          {comparisons.length === 0 ? (
            <motion.div variants={fadeInUp} className="p-8 rounded-2xl bg-card border border-border/50 text-center space-y-4">
              <p className="text-lg font-semibold">No comparison data yet.</p>
              <p className="text-muted-foreground text-sm">
                Retake your movement screen to see how you've improved since your original assessment.
              </p>
              <Button
                onClick={() => setLocation("/retake")}
                className="mt-2 bg-primary text-white hover:bg-primary/90"
                data-testid="button-go-retake"
              >
                Retake Movement Screen
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Comparison cards */}
              <motion.div variants={stagger} className="space-y-3 mb-8">
                {comparisons.map((c) => {
                  const cfg = STATUS_CONFIG[c.status];
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={c.id}
                      variants={fadeInUp}
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
                            {cfg.suffix && (
                              <span className={`ml-1.5 ${cfg.labelClass}`}>{cfg.suffix}</span>
                            )}
                          </p>
                        </div>
                        <div className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.labelClass} border ${cfg.border}`}>
                          <Icon className={`w-3.5 h-3.5 ${cfg.iconClass}`} />
                          {cfg.label}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* CTAs */}
              <motion.div variants={fadeInUp} className="pt-6 border-t border-border/30 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => setLocation("/retake")}
                  variant="outline"
                  className="flex items-center gap-2 border-border/50"
                  data-testid="button-retake-again"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retake Again
                </Button>
                <Button
                  onClick={() => setLocation("/results")}
                  variant="outline"
                  className="flex items-center gap-2 border-border/50"
                  data-testid="button-back-results"
                >
                  Back to My Routine
                </Button>
              </motion.div>
            </>
          )}

        </motion.div>
      </div>
    </div>
  );
}
