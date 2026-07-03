import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { PLAN_DETAILS, markOnboardingComplete, type Plan } from "@/lib/subscription";

const ALL_PLANS: Plan[] = ["free", "pro_monthly", "pro_unlimited", "pro_annual"];

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export default function OnboardingPlan() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { userId, onboardingComplete, refreshPlan } = useUser();
  const [submittingPlan, setSubmittingPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (onboardingComplete === true) setLocation("/dashboard");
  }, [onboardingComplete, setLocation]);

  const finishOnboarding = async () => {
    if (!userId) return;
    await markOnboardingComplete(userId);
    await refreshPlan();
    setLocation("/dashboard");
  };

  const handleSelectFree = async () => {
    if (!userId || submittingPlan) return;
    setSubmittingPlan("free");
    await finishOnboarding();
  };

  const handleSelectPaid = async (planId: Plan) => {
    if (!userId || submittingPlan) return;
    setSubmittingPlan(planId);
    toast({
      title: "Stripe integration coming soon",
      description: `${PLAN_DETAILS[planId].name} checkout will be available shortly.`,
    });
    await finishOnboarding();
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-foreground flex items-center justify-center px-4 py-12 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-teal-600/12 blur-[160px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-teal-500/8 blur-[140px]" />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="relative z-10 w-full max-w-6xl"
      >
        <div className="mb-8 flex justify-center">
          <img
            src="https://okvnrbrnubtgplheyavw.supabase.co/storage/v1/object/public/assets/LOGO%20MYOMAP.png"
            alt="MyoMap"
            className="h-16 w-auto"
          />
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">Choose Your Plan</h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Start free or unlock the full MyoMap experience
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ALL_PLANS.map((planId) => {
            const plan = PLAN_DETAILS[planId];
            const isFree = planId === "free";
            const busy = submittingPlan === planId;

            return (
              <div
                key={planId}
                className={`relative flex flex-col rounded-2xl p-6 border transition-all bg-[#111827]/80 backdrop-blur-sm ${
                  plan.bestValue
                    ? "border-teal-500/50 shadow-[0_0_60px_-14px_rgba(13,148,136,0.45)]"
                    : "border-white/10 hover:border-teal-500/25 shadow-[0_0_40px_-20px_rgba(0,0,0,0.6)]"
                }`}
                data-testid={`onboarding-plan-card-${planId}`}
              >
                {plan.bestValue && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wide bg-teal-500 text-white px-3 py-1 rounded-full shadow-[0_0_20px_-4px_rgba(13,148,136,0.7)]">
                    Best Value
                  </span>
                )}

                <h3 className="text-lg font-bold mt-1">{plan.name}</h3>
                <p className="mt-2 mb-5">
                  <span className="text-3xl font-extrabold">{plan.price}</span>
                  <span className="text-sm text-slate-400">{plan.period}</span>
                </p>

                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                      <Check className="w-3.5 h-3.5 text-teal-500 mt-0.5 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={isFree ? handleSelectFree : () => handleSelectPaid(planId)}
                  disabled={submittingPlan !== null}
                  className={`w-full h-11 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                    isFree
                      ? "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                      : plan.bestValue
                        ? "bg-teal-600 hover:bg-teal-500 text-white shadow-[0_0_24px_-6px_rgba(13,148,136,0.5)]"
                        : "bg-teal-600/90 hover:bg-teal-500 text-white"
                  }`}
                  data-testid={`onboarding-button-select-${planId}`}
                >
                  {busy ? "Please wait…" : isFree ? "Continue with Free" : "Get Started"}
                </button>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
