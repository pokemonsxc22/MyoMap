import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { SCREEN_QUESTIONS } from "@/lib/movementScreen";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabaseClient";
import { checkAssessmentLimit, incrementAssessmentCount } from "@/lib/subscription";
import PaywallModal from "@/components/PaywallModal";

const cardVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.45, delay: i * 0.05, ease: "easeOut" as const },
  }),
};

const SEVERITY_LABELS: Record<number, string> = {
  1: "Barely noticeable",
  2: "Mild",
  3: "Moderate",
  4: "Quite painful",
  5: "Very painful",
};

type ScreenAnswer = "yes" | "no";

export default function Intake() {
  const [, setLocation] = useLocation();
  const { userId, loading: userLoading } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [checkingLimit, setCheckingLimit] = useState(true);

  const [sessionId] = useState<string>(() => {
    const existing = sessionStorage.getItem("mobilitySessionId");
    if (existing) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem("mobilitySessionId", next);
    return next;
  });

  const [form, setForm] = useState({
    painArea:       "",
    duration:       "",
    worsens:        [] as string[],
    betters:        [] as string[],
    injuryHistory:  "" as "" | "yes" | "no",
    injuryDetails:  "",
    activityLevel:  "",
    goal:           "",
    severity:       0,
    sex:            "",
    sport:          "",
    screen:         {} as Record<string, ScreenAnswer>,
  });

  useEffect(() => {
    if (!userLoading && !userId) setLocation("/welcome");
  }, [userId, userLoading, setLocation]);

  useEffect(() => {
    if (userLoading || !userId) return;
    checkAssessmentLimit(userId).then(({ allowed }) => {
      setCheckingLimit(false);
      if (!allowed) setPaywallOpen(true);
    });
  }, [userId, userLoading]);

  const handleCheckbox = (value: string) => {
    setForm((prev) => ({
      ...prev,
      worsens: prev.worsens.includes(value)
        ? prev.worsens.filter((v) => v !== value)
        : [...prev.worsens, value],
    }));
  };

  const handleBetterCheckbox = (value: string) => {
    setForm((prev) => ({
      ...prev,
      betters: prev.betters.includes(value)
        ? prev.betters.filter((v) => v !== value)
        : [...prev.betters, value],
    }));
  };

  const handlePainArea = (value: string) => {
    setForm((prev) => ({ ...prev, painArea: value, screen: {} }));
  };

  const handleScreen = (id: string, value: ScreenAnswer) => {
    setForm((prev) => ({ ...prev, screen: { ...prev.screen, [id]: value } }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const { allowed } = await checkAssessmentLimit(userId);
    if (!allowed) {
      setPaywallOpen(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ...form, sessionId,
          userId:        userId ?? null,
          betters:       form.betters,
          injuryHistory: form.injuryHistory,
          injuryDetails: form.injuryDetails,
          activityLevel: form.activityLevel,
        }),
      });
      const data = (await res.json()) as { routine?: string; error?: string; assessmentId?: string };
      if (!res.ok || !data.routine) {
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }

      const assessmentId = data.assessmentId ?? crypto.randomUUID();

      if (supabase && userId) {
        const { error: sbError } = await supabase.from("assessments").upsert({
          id:            assessmentId,
          user_id:       userId,
          session_id:    sessionId,
          pain_location: form.painArea,
          duration:      form.duration || null,
          worsens:       form.worsens.length > 0 ? form.worsens : null,
          goal:          form.goal || null,
          severity:      form.severity > 0 ? form.severity : null,
          gender:        form.sex || null,
          sport:         form.sport || null,
          screen_json:   Object.keys(form.screen).length > 0 ? form.screen : null,
          routine_text:  data.routine,
        });
        if (sbError) {
          console.error("[MyoMap] Assessment save failed:", sbError.message, sbError.details, sbError.hint);
        }
      }

      sessionStorage.setItem("mobilityRoutine",     data.routine);
      sessionStorage.setItem("mobilityFormData",    JSON.stringify(form));
      sessionStorage.setItem("mobilityAssessmentId", assessmentId);
      if (userId) void incrementAssessmentCount(userId);
      setLocation("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const activeQuestions = form.painArea ? (SCREEN_QUESTIONS[form.painArea] ?? []) : [];
  const screenComplete  = activeQuestions.length === 0
    ? false
    : activeQuestions.every((q) => form.screen[q.id] !== undefined);

  const isValid =
    form.painArea      !== "" &&
    form.duration      !== "" &&
    form.goal          !== "" &&
    form.severity      >   0  &&
    form.sex           !== "" &&
    form.sport         !== "" &&
    form.activityLevel !== "" &&
    form.injuryHistory !== "" &&
    screenComplete;

  // Progress calculation — 11 questions
  const answeredCount = [
    form.painArea !== "",
    form.duration !== "",
    form.severity > 0,
    form.worsens.length > 0,
    form.betters.length > 0,
    form.injuryHistory !== "",
    form.activityLevel !== "",
    form.goal !== "",
    form.sex !== "",
    form.sport !== "",
    screenComplete,
  ].filter(Boolean).length;
  const progressPct = Math.round((answeredCount / 11) * 100);

  const glassCard = "p-6 rounded-2xl bg-[#111827]/80 border border-teal-500/15 backdrop-blur-sm hover:shadow-[0_0_20px_-8px_rgba(13,148,136,0.2)] transition-shadow";
  const labelClass = "block text-[10px] font-bold text-teal-500 tracking-[0.15em] uppercase mb-1";
  const selectClass = "w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all appearance-none cursor-pointer hover:border-white/20 text-sm";

  const toggleBtn = (active: boolean) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all font-medium text-sm ${
      active
        ? "border-teal-500/50 bg-teal-500/10 text-foreground shadow-[0_0_12px_-4px_rgba(13,148,136,0.3)]"
        : "border-white/10 bg-white/3 text-slate-400 hover:border-white/20 hover:text-slate-300"
    }`;

  const selectorBtn = (active: boolean) =>
    `py-4 rounded-xl border font-semibold text-base transition-all ${
      active
        ? "border-teal-500/50 bg-teal-500/10 text-teal-300 shadow-[0_0_12px_-4px_rgba(13,148,136,0.3)]"
        : "border-white/10 bg-white/3 text-slate-400 hover:border-white/20 hover:text-slate-300"
    }`;

  const yesNoBtnClass = (qId: string, value: ScreenAnswer) =>
    `py-3 rounded-xl border font-semibold text-base transition-all ${
      form.screen[qId] === value
        ? "border-teal-500/50 bg-teal-500/10 text-teal-300 shadow-[0_0_12px_-4px_rgba(13,148,136,0.3)]"
        : "border-white/10 bg-white/3 text-slate-400 hover:border-white/20"
    }`;

  if (userLoading || !userId) return null;

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-foreground relative">
      <PaywallModal
        open={paywallOpen}
        reason="assessments"
        onClose={() => { setPaywallOpen(false); setLocation("/dashboard"); }}
      />
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-teal-600/10 blur-[160px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-teal-500/8 blur-[140px]" />
      </div>

      {/* Sticky Nav */}
      <nav className="sticky top-0 w-full z-50 border-b border-teal-500/10 bg-[#0a0f1a]/85 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <img
            src="https://okvnrbrnubtgplheyavw.supabase.co/storage/v1/object/public/assets/LOGO%20MYOMAP.png"
            alt="MyoMap"
            className="h-9 w-auto cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setLocation("/")}
          />
          <div className="flex items-center gap-3 flex-1 max-w-xs">
            {/* Progress bar */}
            <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs font-bold text-teal-400 tabular-nums w-8 text-right">
              {progressPct}%
            </span>
          </div>
          <button
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-white/10 text-slate-400 hover:text-foreground hover:border-white/20 transition-all text-xs font-medium"
            data-testid="button-back"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10 relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <p className="text-xs font-bold text-teal-500 tracking-[0.15em] uppercase mb-2">Movement Assessment</p>
          <h1 className="text-4xl font-extrabold mb-3 leading-tight">Tell us about your body.</h1>
          <p className="text-slate-400 text-lg">
            11 quick questions — we'll build your personalized corrective routine.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-5" data-testid="form-intake">

          {/* Q1 — Pain area */}
          <motion.div custom={0} initial="hidden" animate="visible" variants={cardVariants} className={glassCard}>
            <label className={labelClass}>Question 1 of 11</label>
            <p className="text-xl font-bold mb-4">Where do you feel pain or tightness?</p>
            <div className="relative">
              <select
                value={form.painArea}
                onChange={(e) => handlePainArea(e.target.value)}
                required
                data-testid="select-pain-area"
                className={selectClass}
              >
                <option value="" disabled>Select a muscle group...</option>
                <option value="lower-back">Lower back</option>
                <option value="mid-back">Mid back</option>
                <option value="upper-back">Upper back</option>
                <option value="neck-shoulders">Neck / Shoulders</option>
                <option value="chest">Chest</option>
                <option value="arms">Arms</option>
                <option value="abs-core">Abs / Core</option>
                <option value="quads">Quads</option>
                <option value="hamstrings">Hamstrings</option>
                <option value="calves">Calves</option>
                <option value="knees">Knees</option>
                <option value="hips">Hips</option>
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
            </div>
          </motion.div>

          {/* Q2 — Duration */}
          <motion.div custom={1} initial="hidden" animate="visible" variants={cardVariants} className={glassCard}>
            <label className={labelClass}>Question 2 of 11</label>
            <p className="text-xl font-bold mb-4">How long have you had this issue?</p>
            <div className="relative">
              <select
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                required
                data-testid="select-duration"
                className={selectClass}
              >
                <option value="" disabled>Select a duration...</option>
                <option value="just-started">Just started (less than a week)</option>
                <option value="few-weeks">A few weeks (1–4 weeks)</option>
                <option value="months-plus">Months or longer</option>
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
            </div>
          </motion.div>

          {/* Q3 — Severity */}
          <motion.div custom={2} initial="hidden" animate="visible" variants={cardVariants} className={glassCard}>
            <label className={labelClass}>Question 3 of 11</label>
            <p className="text-xl font-bold mb-1.5">How severe is your pain or tightness?</p>
            <p className="text-sm text-slate-500 mb-5">
              1 = Barely noticeable &nbsp;·&nbsp; 3 = Moderate &nbsp;·&nbsp; 5 = Very painful
            </p>
            <div className="flex gap-2.5" data-testid="severity-scale">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, severity: n })}
                  data-testid={`severity-${n}`}
                  className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border font-extrabold text-xl transition-all ${
                    form.severity === n
                      ? "border-teal-500/50 bg-teal-500/10 text-teal-300 shadow-[0_0_16px_-4px_rgba(13,148,136,0.35)]"
                      : "border-white/10 bg-white/3 text-slate-400 hover:border-white/20 hover:text-slate-300"
                  }`}
                >
                  {n}
                  <span className="text-[9px] font-semibold tracking-wide uppercase opacity-70 leading-tight text-center px-1">
                    {SEVERITY_LABELS[n]}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Q4 — What makes it worse */}
          <motion.div custom={3} initial="hidden" animate="visible" variants={cardVariants} className={glassCard}>
            <label className={labelClass}>Question 4 of 11</label>
            <p className="text-xl font-bold mb-4">What makes it worse?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { value: "sitting",        label: "Sitting too long" },
                { value: "after-workouts", label: "After workouts" },
                { value: "morning",        label: "In the morning" },
                { value: "no-pattern",     label: "No clear pattern" },
              ].map(({ value, label }) => {
                const checked = form.worsens.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleCheckbox(value)}
                    data-testid={`checkbox-worsens-${value}`}
                    className={toggleBtn(checked)}
                  >
                    <span className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border transition-all ${
                      checked ? "bg-teal-600 border-teal-500" : "border-white/20 bg-white/5"
                    }`}>
                      {checked && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Q5 — What makes it better */}
          <motion.div custom={4} initial="hidden" animate="visible" variants={cardVariants} className={glassCard}>
            <label className={labelClass}>Question 5 of 11</label>
            <p className="text-xl font-bold mb-1">What makes it better? <span className="text-base font-normal text-slate-500">(select all that apply)</span></p>
            <p className="text-sm text-slate-500 mb-4">Helps calibrate your routine intensity.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { value: "rest",        label: "Rest" },
                { value: "movement",    label: "Movement / walking" },
                { value: "heat",        label: "Heat" },
                { value: "ice",         label: "Ice" },
                { value: "stretching",  label: "Stretching" },
                { value: "nothing-yet", label: "Nothing yet" },
              ].map(({ value, label }) => {
                const checked = form.betters.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleBetterCheckbox(value)}
                    data-testid={`checkbox-betters-${value}`}
                    className={toggleBtn(checked)}
                  >
                    <span className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border transition-all ${
                      checked ? "bg-teal-600 border-teal-500" : "border-white/20 bg-white/5"
                    }`}>
                      {checked && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Q6 — Injury history */}
          <motion.div custom={5} initial="hidden" animate="visible" variants={cardVariants} className={glassCard}>
            <label className={labelClass}>Question 6 of 11</label>
            <p className="text-xl font-bold mb-4">Have you had any injuries or surgeries in this area?</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { value: "yes" as const, label: "Yes" },
                { value: "no"  as const, label: "No" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, injuryHistory: value })}
                  data-testid={`injury-history-${value}`}
                  className={selectorBtn(form.injuryHistory === value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <AnimatePresence>
              {form.injuryHistory === "yes" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="text-sm font-medium text-slate-400 mb-2">Briefly describe the injury or surgery:</p>
                  <textarea
                    value={form.injuryDetails}
                    onChange={(e) => setForm({ ...form, injuryDetails: e.target.value.slice(0, 300) })}
                    placeholder="e.g. Herniated disc L4-L5, ACL surgery 2 years ago..."
                    rows={2}
                    data-testid="injury-details"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-slate-600 resize-none outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/30 transition-all leading-relaxed"
                  />
                  <p className="text-xs text-slate-600 text-right mt-1">{form.injuryDetails.length}/300</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Q7 — Activity level */}
          <motion.div custom={6} initial="hidden" animate="visible" variants={cardVariants} className={glassCard}>
            <label className={labelClass}>Question 7 of 11</label>
            <p className="text-xl font-bold mb-4">What is your activity level?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { value: "sedentary",         label: "Sedentary",         sub: "Mostly sitting, little movement" },
                { value: "lightly-active",    label: "Lightly active",    sub: "Light walking or movement" },
                { value: "moderately-active", label: "Moderately active", sub: "Exercise 3–4× per week" },
                { value: "very-active",       label: "Very active",       sub: "Daily intense training" },
              ].map(({ value, label, sub }) => {
                const active = form.activityLevel === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, activityLevel: value })}
                    data-testid={`activity-${value}`}
                    className={`flex flex-col items-start px-4 py-4 rounded-xl border text-left transition-all ${
                      active
                        ? "border-teal-500/50 bg-teal-500/10 shadow-[0_0_12px_-4px_rgba(13,148,136,0.3)]"
                        : "border-white/10 bg-white/3 hover:border-white/20"
                    }`}
                  >
                    <span className={`font-semibold text-sm mb-0.5 ${active ? "text-teal-300" : "text-slate-300"}`}>{label}</span>
                    <span className="text-xs text-slate-500 leading-snug">{sub}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Q8 — Main goal */}
          <motion.div custom={7} initial="hidden" animate="visible" variants={cardVariants} className={glassCard}>
            <label className={labelClass}>Question 8 of 11</label>
            <p className="text-xl font-bold mb-4">What&apos;s your main goal?</p>
            <div className="relative">
              <select
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                required
                data-testid="select-goal"
                className={selectClass}
              >
                <option value="" disabled>Select a goal...</option>
                <option value="reduce-pain">Reduce pain</option>
                <option value="improve-flexibility">Improve flexibility</option>
                <option value="sports-performance">Move better for sports</option>
                <option value="general-health">General health</option>
                <option value="return-to-sport">Return to sport</option>
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
            </div>
          </motion.div>

          {/* Q9 — Biological sex */}
          <motion.div custom={8} initial="hidden" animate="visible" variants={cardVariants} className={glassCard}>
            <label className={labelClass}>Question 9 of 11</label>
            <p className="text-xl font-bold mb-4">What is your biological sex?</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "male",   label: "Male" },
                { value: "female", label: "Female" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, sex: value })}
                  data-testid={`sex-${value}`}
                  className={selectorBtn(form.sex === value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Q10 — Sport / Main Activity */}
          <motion.div custom={9} initial="hidden" animate="visible" variants={cardVariants} className={glassCard}>
            <label className={labelClass}>Question 10 of 11</label>
            <p className="text-xl font-bold mb-1.5">What is your sport or main activity?</p>
            <p className="text-sm text-slate-500 mb-4">
              Helps us tailor exercises to the demands your body faces most often.
            </p>
            <div className="relative">
              <select
                value={form.sport}
                onChange={(e) => setForm({ ...form, sport: e.target.value })}
                required
                data-testid="select-sport"
                className={selectClass}
              >
                <option value="" disabled>Select an activity...</option>
                <option value="running">Running</option>
                <option value="basketball">Basketball</option>
                <option value="weightlifting">Weightlifting</option>
                <option value="swimming">Swimming</option>
                <option value="soccer">Soccer</option>
                <option value="general-fitness">General fitness</option>
                <option value="other">Other</option>
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 rotate-90 pointer-events-none" />
            </div>
          </motion.div>

          {/* Q11 — Movement Screen */}
          <motion.div custom={10} initial="hidden" animate="visible" variants={cardVariants} className={glassCard}>
            <label className={labelClass}>Question 11 of 11</label>
            <p className="text-xl font-bold mb-1.5">Quick movement screen</p>
            <p className="text-sm text-slate-500 mb-6">
              A short physical check tailored to your pain area — reveals specific restrictions we&apos;ll target in your routine.
            </p>

            {activeQuestions.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-500/5 border border-teal-500/10">
                <div className="w-2 h-2 rounded-full bg-teal-500/40 flex-shrink-0" />
                <p className="text-sm text-slate-500 italic">
                  Select your pain area above to see your personalised movement check.
                </p>
              </div>
            ) : (
              <div className="space-y-5" data-testid="movement-screen">
                {activeQuestions.map((q, i) => (
                  <div key={q.id}>
                    {i > 0 && <div className="border-t border-white/5 mb-5" />}
                    <p className="text-sm font-semibold mb-3 text-slate-300" data-testid={`screen-label-${q.id}`}>
                      {q.label}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => handleScreen(q.id, "yes")} data-testid={`screen-${q.id}-yes`} className={yesNoBtnClass(q.id, "yes")}>Yes</button>
                      <button type="button" onClick={() => handleScreen(q.id, "no")}  data-testid={`screen-${q.id}-no`}  className={yesNoBtnClass(q.id, "no")}>No</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm font-medium"
              data-testid="error-message"
            >
              {error}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
          >
            <Button
              type="submit"
              disabled={!isValid || loading}
              size="lg"
              className="w-full h-14 text-lg font-bold bg-teal-600 hover:bg-teal-500 text-white border-0 shadow-[0_0_30px_-6px_rgba(13,148,136,0.6)] hover:shadow-[0_0_40px_-4px_rgba(13,148,136,0.7)] disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] transition-all"
              data-testid="button-submit"
            >
              {loading ? (
                <span className="flex items-center gap-3">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Building your routine...
                </span>
              ) : (
                <>
                  Get My Personalized Routine
                  <ChevronRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
            {!isValid && (
              <p className="text-xs text-slate-600 text-center mt-3">
                {11 - answeredCount} question{11 - answeredCount !== 1 ? "s" : ""} remaining
              </p>
            )}
          </motion.div>
        </form>
      </div>
    </div>
  );
}
