import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const SEVERITY_LABELS: Record<number, string> = {
  1: "Barely noticeable",
  2: "Mild",
  3: "Moderate",
  4: "Quite painful",
  5: "Very painful",
};

export default function Intake() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    painArea: "",
    duration: "",
    worsens: [] as string[],
    goal: "",
    severity: 0,
    sex: "",
  });

  const handleCheckbox = (value: string) => {
    setForm((prev) => ({
      ...prev,
      worsens: prev.worsens.includes(value)
        ? prev.worsens.filter((v) => v !== value)
        : [...prev.worsens, value],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { routine?: string; error?: string };
      if (!res.ok || !data.routine) {
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      sessionStorage.setItem("mobilityRoutine", data.routine);
      sessionStorage.setItem("mobilityFormData", JSON.stringify(form));
      setLocation("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isValid =
    form.painArea !== "" &&
    form.duration !== "" &&
    form.goal !== "" &&
    form.severity > 0 &&
    form.sex !== "";

  const selectClass =
    "w-full h-12 px-4 rounded-xl bg-background border border-border/60 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors appearance-none";

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-16 relative">
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary tracking-widest uppercase">
              Assessment
            </span>
          </div>
          <h1 className="text-4xl font-black mb-2">Tell us about your body.</h1>
          <p className="text-muted-foreground text-lg mb-10">
            Answer six quick questions so we can build your personalized corrective routine.
          </p>

          <form onSubmit={handleSubmit} className="space-y-8" data-testid="form-intake">
            {/* Q1 — Pain area */}
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <label className="block text-sm font-semibold text-primary mb-1 tracking-widest uppercase">
                Question 1 of 6
              </label>
              <p className="text-xl font-bold mb-4">Where do you feel pain or tightness?</p>
              <select
                value={form.painArea}
                onChange={(e) => setForm({ ...form, painArea: e.target.value })}
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
              </select>
            </div>

            {/* Q2 — Duration */}
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <label className="block text-sm font-semibold text-primary mb-1 tracking-widest uppercase">
                Question 2 of 6
              </label>
              <p className="text-xl font-bold mb-4">How long have you had this issue?</p>
              <select
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                required
                data-testid="select-duration"
                className={selectClass}
              >
                <option value="" disabled>Select a duration...</option>
                <option value="just-started">Just started</option>
                <option value="few-weeks">A few weeks</option>
                <option value="months-plus">Months or longer</option>
              </select>
            </div>

            {/* Q3 — Severity */}
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <label className="block text-sm font-semibold text-primary mb-1 tracking-widest uppercase">
                Question 3 of 6
              </label>
              <p className="text-xl font-bold mb-2">How severe is your pain or tightness?</p>
              <p className="text-sm text-muted-foreground mb-6">
                1 = Barely noticeable &nbsp;·&nbsp; 3 = Moderate &nbsp;·&nbsp; 5 = Very painful
              </p>
              <div className="flex gap-3" data-testid="severity-scale">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm({ ...form, severity: n })}
                    data-testid={`severity-${n}`}
                    className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border font-black text-xl transition-all ${
                      form.severity === n
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 bg-background text-muted-foreground hover:border-border"
                    }`}
                  >
                    {n}
                    <span className="text-[10px] font-semibold tracking-wide uppercase opacity-70 leading-tight text-center">
                      {SEVERITY_LABELS[n]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Q4 — What makes it worse */}
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <label className="block text-sm font-semibold text-primary mb-1 tracking-widest uppercase">
                Question 4 of 6
              </label>
              <p className="text-xl font-bold mb-4">What makes it worse?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { value: "sitting", label: "Sitting too long" },
                  { value: "after-workouts", label: "After workouts" },
                  { value: "morning", label: "In the morning" },
                  { value: "no-pattern", label: "No clear pattern" },
                ].map(({ value, label }) => {
                  const checked = form.worsens.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleCheckbox(value)}
                      data-testid={`checkbox-worsens-${value}`}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                        checked
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/50 bg-background text-muted-foreground hover:border-border"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                          checked ? "bg-primary border-primary" : "border-border/60"
                        }`}
                      >
                        {checked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                            <path
                              d="M2 6l3 3 5-5"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span className="font-medium text-sm">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Q5 — Main goal */}
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <label className="block text-sm font-semibold text-primary mb-1 tracking-widest uppercase">
                Question 5 of 6
              </label>
              <p className="text-xl font-bold mb-4">What's your main goal?</p>
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
              </select>
            </div>

            {/* Q6 — Biological sex */}
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <label className="block text-sm font-semibold text-primary mb-1 tracking-widest uppercase">
                Question 6 of 6
              </label>
              <p className="text-xl font-bold mb-2">What is your biological sex?</p>
              <p className="text-sm text-muted-foreground mb-5">
                Used to display an accurate body visual on your results page.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, sex: value })}
                    data-testid={`sex-${value}`}
                    className={`py-4 rounded-xl border font-semibold text-base transition-all ${
                      form.sex === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 bg-background text-muted-foreground hover:border-border"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div
                className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-medium"
                data-testid="error-message"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={!isValid || loading}
              size="lg"
              className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-white border-0 shadow-[0_0_30px_-5px_rgba(37,99,235,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="button-submit"
            >
              {loading ? (
                <span className="flex items-center gap-3">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
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
          </form>
        </motion.div>
      </div>
    </div>
  );
}
