import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, ChevronLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

interface ParsedRoutine {
  rootCause: string;
  exercises: { number: string; name: string; description: string }[];
}

function parseRoutine(text: string): ParsedRoutine {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const exerciseLines: typeof lines = [];
  const rootCauseLines: typeof lines = [];
  let foundFirst = false;

  for (const line of lines) {
    if (/^[1-5][.)]\s/.test(line)) {
      foundFirst = true;
      exerciseLines.push(line);
    } else if (!foundFirst) {
      rootCauseLines.push(line);
    }
  }

  const exercises = exerciseLines.map((line) => {
    const match = line.match(/^([1-5])[.)]\s+\*{0,2}([^:*–-]+?)\*{0,2}[:\s–-]+(.+)$/);
    if (match) {
      return { number: match[1], name: match[2].trim(), description: match[3].trim() };
    }
    const fallback = line.replace(/^[1-5][.)]\s+/, "");
    const colonIdx = fallback.indexOf(":");
    if (colonIdx > 0) {
      return {
        number: line[0],
        name: fallback.slice(0, colonIdx).replace(/\*+/g, "").trim(),
        description: fallback.slice(colonIdx + 1).trim(),
      };
    }
    return { number: line[0], name: fallback, description: "" };
  });

  return {
    rootCause: rootCauseLines.join(" "),
    exercises,
  };
}

export default function Results() {
  const [, setLocation] = useLocation();
  const [routine, setRoutine] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedRoutine | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("mobilityRoutine");
    if (!stored) {
      setLocation("/intake");
      return;
    }
    setRoutine(stored);
    setParsed(parseRoutine(stored));
  }, [setLocation]);

  if (!routine || !parsed) return null;

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-16 relative">
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
          data-testid="button-back-home"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to home
        </button>

        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeInUp} className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary tracking-widest uppercase">
              Your Personalized Routine
            </span>
          </motion.div>

          <motion.h1 variants={fadeInUp} className="text-4xl font-black mb-10">
            Here's your recovery plan.
          </motion.h1>

          {/* Root Cause */}
          {parsed.rootCause && (
            <motion.div
              variants={fadeInUp}
              className="p-6 rounded-2xl bg-card border border-primary/20 mb-8"
            >
              <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-3">
                Root Cause
              </p>
              <p className="text-muted-foreground leading-relaxed">{parsed.rootCause}</p>
            </motion.div>
          )}

          {/* Exercises */}
          {parsed.exercises.length > 0 && (
            <motion.div variants={stagger} className="space-y-4">
              <motion.p
                variants={fadeInUp}
                className="text-sm font-semibold text-primary tracking-widest uppercase mb-2"
              >
                Your 5-Exercise Routine
              </motion.p>
              {parsed.exercises.map((ex) => (
                <motion.div
                  key={ex.number}
                  variants={fadeInUp}
                  className="flex gap-4 p-5 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors"
                  data-testid={`exercise-${ex.number}`}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-sm">
                    {ex.number}
                  </div>
                  <div>
                    <p className="font-bold mb-1">{ex.name}</p>
                    {ex.description && (
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {ex.description}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Fallback: show raw text if parsing failed */}
          {parsed.exercises.length === 0 && (
            <motion.div
              variants={fadeInUp}
              className="p-6 rounded-2xl bg-card border border-border/50 whitespace-pre-wrap text-muted-foreground leading-relaxed"
            >
              {routine}
            </motion.div>
          )}

          <motion.div variants={fadeInUp} className="mt-10 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => {
                sessionStorage.removeItem("mobilityRoutine");
                setLocation("/intake");
              }}
              variant="outline"
              className="flex items-center gap-2 border-border/50"
              data-testid="button-retake"
            >
              <RotateCcw className="w-4 h-4" />
              Retake assessment
            </Button>
            <Button
              onClick={() => setLocation("/")}
              className="bg-primary hover:bg-primary/90 text-white"
              data-testid="button-home"
            >
              Back to home
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
