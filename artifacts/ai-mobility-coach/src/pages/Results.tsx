import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, ChevronLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import ReactMarkdown from "react-markdown";

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

interface Exercise {
  number: string;
  raw: string;
}

interface ParsedRoutine {
  rootCause: string;
  exercises: Exercise[];
}

function parseRoutine(text: string): ParsedRoutine {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const rootCauseLines: string[] = [];
  const exerciseLines: Exercise[] = [];
  let foundList = false;

  for (const line of lines) {
    const match = line.match(/^([1-5])[.)]\s+(.+)$/);
    if (match) {
      foundList = true;
      exerciseLines.push({ number: match[1], raw: match[2] });
    } else if (!foundList) {
      rootCauseLines.push(line);
    }
  }

  return {
    rootCause: rootCauseLines.join("\n\n"),
    exercises: exerciseLines,
  };
}

const PLACEHOLDER: ParsedRoutine = {
  rootCause:
    "Based on your answers, we'll analyze the likely biomechanical root cause of your pain or tightness here. This section will explain what's happening in plain English — no jargon — so you understand exactly why your body feels the way it does.",
  exercises: [
    { number: "1", raw: "**Exercise Name** — A one-sentence description of this corrective exercise and how it helps your specific issue." },
    { number: "2", raw: "**Exercise Name** — A one-sentence description of this corrective exercise and how it helps your specific issue." },
    { number: "3", raw: "**Exercise Name** — A one-sentence description of this corrective exercise and how it helps your specific issue." },
    { number: "4", raw: "**Exercise Name** — A one-sentence description of this corrective exercise and how it helps your specific issue." },
    { number: "5", raw: "**Exercise Name** — A one-sentence description of this corrective exercise and how it helps your specific issue." },
  ],
};

export default function Results() {
  const [, setLocation] = useLocation();
  const [parsed, setParsed] = useState<ParsedRoutine | null>(null);
  const [isPlaceholder, setIsPlaceholder] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("mobilityRoutine");
    if (stored) {
      setParsed(parseRoutine(stored));
      setIsPlaceholder(false);
    } else {
      setParsed(PLACEHOLDER);
      setIsPlaceholder(true);
    }
  }, []);

  if (!parsed) return null;

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
          {/* Header */}
          <motion.div variants={fadeInUp} className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary tracking-widest uppercase">
              Results
            </span>
          </motion.div>
          <motion.h1 variants={fadeInUp} className="text-4xl font-black mb-10">
            Your Mobility Assessment
          </motion.h1>

          {/* What's Happening in Your Body */}
          <motion.div variants={fadeInUp} className="mb-8">
            <h2 className="text-xs font-semibold text-primary tracking-widest uppercase mb-4">
              What's Happening in Your Body
            </h2>
            <div className="p-6 rounded-2xl bg-card border border-primary/20">
              <div className={`leading-relaxed text-sm ${isPlaceholder ? "text-muted-foreground/50 italic" : "text-muted-foreground"}`}>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => (
                      <strong className="font-semibold text-foreground">{children}</strong>
                    ),
                  }}
                >
                  {parsed.rootCause}
                </ReactMarkdown>
              </div>
            </div>
          </motion.div>

          {/* Your 5-Exercise Routine */}
          <motion.div variants={fadeInUp}>
            <h2 className="text-xs font-semibold text-primary tracking-widest uppercase mb-4">
              Your 5-Exercise Routine
            </h2>
            <motion.div variants={stagger} className="space-y-4">
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
                  <div className={`min-w-0 text-sm leading-relaxed pt-1 ${isPlaceholder ? "text-muted-foreground/40 italic" : "text-muted-foreground"}`}>
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p>{children}</p>,
                        strong: ({ children }) => (
                          <strong className={`font-bold block mb-1 ${isPlaceholder ? "text-foreground/30" : "text-foreground"}`}>
                            {children}
                          </strong>
                        ),
                      }}
                    >
                      {ex.raw}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Actions */}
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
              {isPlaceholder ? "Take the assessment" : "Retake assessment"}
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
