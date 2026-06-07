import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Home, RotateCcw, Sunset, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import ReactMarkdown from "react-markdown";

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
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* ── Top Nav ── */}
      <nav className="sticky top-0 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <Activity className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm tracking-tight hidden sm:block">AI Mobility Coach</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <button
              onClick={() => setLocation("/")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
              data-testid="button-nav-home"
            >
              <Home className="w-3.5 h-3.5" />
              Home
            </button>
            <button
              onClick={() => { sessionStorage.removeItem("mobilityRoutine"); setLocation("/intake"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
              data-testid="button-nav-retake"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retake Assessment
            </button>
            <button
              onClick={() => setLocation("/visual")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all"
              data-testid="button-nav-visual"
            >
              View Body Visual
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
          </motion.div>

          {/* Bottom CTA */}
          <motion.div variants={fadeUp} className="mt-10 pt-6 border-t border-border/30 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => { sessionStorage.removeItem("mobilityRoutine"); setLocation("/intake"); }}
              variant="outline"
              className="flex items-center gap-2 border-border/50 flex-1"
              data-testid="button-retake"
            >
              <RotateCcw className="w-4 h-4" />
              {isPlaceholder ? "Take the Assessment" : "Retake Assessment"}
            </Button>
            <Button
              onClick={() => setLocation("/visual")}
              className="bg-primary hover:bg-primary/90 text-white flex-1"
              data-testid="button-visual"
            >
              View Body Visual
            </Button>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
