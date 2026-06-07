import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function Intake() {
  const [, setLocation] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    painArea: "",
    duration: "",
    worsens: [] as string[],
    goal: "",
  });

  const handleCheckbox = (value: string) => {
    setForm((prev) => ({
      ...prev,
      worsens: prev.worsens.includes(value)
        ? prev.worsens.filter((v) => v !== value)
        : [...prev.worsens, value],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const isValid =
    form.painArea !== "" && form.duration !== "" && form.goal !== "";

  if (submitted) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full pointer-events-none" />
        <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="max-w-lg w-full text-center relative z-10"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6">
            <Activity className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black mb-4">Your routine is being built.</h2>
          <p className="text-muted-foreground text-lg mb-8">
            We're analyzing your responses and crafting a personalized corrective exercise plan. Check back shortly.
          </p>
          <Button
            onClick={() => setLocation("/")}
            variant="outline"
            className="border-border/50 text-muted-foreground hover:text-foreground"
            data-testid="button-back-home"
          >
            Back to home
          </Button>
        </motion.div>
      </div>
    );
  }

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
            Answer four quick questions so we can build your personalized corrective routine.
          </p>

          <form onSubmit={handleSubmit} className="space-y-8" data-testid="form-intake">
            {/* Q1 */}
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <label className="block text-sm font-semibold text-primary mb-1 tracking-widest uppercase">
                Question 1 of 4
              </label>
              <p className="text-xl font-bold mb-4">Where do you feel pain or tightness?</p>
              <select
                value={form.painArea}
                onChange={(e) => setForm({ ...form, painArea: e.target.value })}
                required
                data-testid="select-pain-area"
                className="w-full h-12 px-4 rounded-xl bg-background border border-border/60 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors appearance-none"
              >
                <option value="" disabled>Select an area...</option>
                <option value="lower-back">Lower back</option>
                <option value="neck-shoulders">Neck / Shoulders</option>
                <option value="hips">Hips</option>
                <option value="knees">Knees</option>
                <option value="hamstrings">Hamstrings</option>
              </select>
            </div>

            {/* Q2 */}
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <label className="block text-sm font-semibold text-primary mb-1 tracking-widest uppercase">
                Question 2 of 4
              </label>
              <p className="text-xl font-bold mb-4">How long have you had this issue?</p>
              <select
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                required
                data-testid="select-duration"
                className="w-full h-12 px-4 rounded-xl bg-background border border-border/60 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors appearance-none"
              >
                <option value="" disabled>Select a duration...</option>
                <option value="just-started">Just started</option>
                <option value="few-weeks">A few weeks</option>
                <option value="months-plus">Months or longer</option>
              </select>
            </div>

            {/* Q3 */}
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <label className="block text-sm font-semibold text-primary mb-1 tracking-widest uppercase">
                Question 3 of 4
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

            {/* Q4 */}
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <label className="block text-sm font-semibold text-primary mb-1 tracking-widest uppercase">
                Question 4 of 4
              </label>
              <p className="text-xl font-bold mb-4">What's your main goal?</p>
              <select
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                required
                data-testid="select-goal"
                className="w-full h-12 px-4 rounded-xl bg-background border border-border/60 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors appearance-none"
              >
                <option value="" disabled>Select a goal...</option>
                <option value="reduce-pain">Reduce pain</option>
                <option value="improve-flexibility">Improve flexibility</option>
                <option value="sports-performance">Move better for sports</option>
                <option value="general-health">General health</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={!isValid}
              size="lg"
              className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-white border-0 shadow-[0_0_30px_-5px_rgba(37,99,235,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="button-submit"
            >
              Get My Personalized Routine
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
