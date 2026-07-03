import { X, Check, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PLAN_DETAILS, type Plan } from "@/lib/subscription";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  reason?: "assessments" | "ai_chat";
}

const PAID_PLANS: Plan[] = ["pro_monthly", "pro_unlimited", "pro_annual"];

export default function PaywallModal({ open, onClose, reason }: PaywallModalProps) {
  const { toast } = useToast();

  if (!open) return null;

  const headline =
    reason === "assessments"
      ? "You've reached your 2 free assessments today."
      : reason === "ai_chat"
        ? "AI chat is a Pro feature."
        : null;

  const handleSelectPlan = (planName: string) => {
    onClose();
    toast({
      title: "Stripe integration coming soon",
      description: `${planName} checkout will be available shortly.`,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-8 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      data-testid="paywall-modal-backdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111827] border border-teal-500/20 shadow-[0_0_100px_-20px_rgba(13,148,136,0.35)]"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10"
          data-testid="button-close-paywall"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-8 pb-6 text-center border-b border-white/5">
          <div className="w-12 h-12 rounded-full bg-teal-500/15 border border-teal-500/25 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-teal-500" />
          </div>
          <h2 className="text-2xl font-extrabold mb-2">Upgrade to MyoMap Pro</h2>
          {headline && <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">{headline}</p>}
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PAID_PLANS.map((planId) => {
            const plan = PLAN_DETAILS[planId];
            return (
              <div
                key={planId}
                className={`relative flex flex-col rounded-xl p-5 border transition-all ${
                  plan.bestValue
                    ? "bg-teal-500/10 border-teal-500/40 shadow-[0_0_40px_-10px_rgba(13,148,136,0.4)]"
                    : "bg-white/[0.03] border-white/10 hover:border-teal-500/25"
                }`}
                data-testid={`plan-card-${planId}`}
              >
                {plan.bestValue && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wide bg-teal-500 text-white px-3 py-1 rounded-full shadow-[0_0_20px_-4px_rgba(13,148,136,0.7)]">
                    Best Value
                  </span>
                )}

                <h3 className="text-base font-bold mt-1">{plan.name}</h3>
                <p className="mt-1 mb-4">
                  <span className="text-2xl font-extrabold">{plan.price}</span>
                  <span className="text-sm text-slate-400">{plan.period}</span>
                </p>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                      <Check className="w-3.5 h-3.5 text-teal-500 mt-0.5 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.name)}
                  className={`w-full h-11 rounded-xl font-bold text-sm transition-all active:scale-[0.98] ${
                    plan.bestValue
                      ? "bg-teal-600 hover:bg-teal-500 text-white shadow-[0_0_24px_-6px_rgba(13,148,136,0.5)]"
                      : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                  }`}
                  data-testid={`button-select-${planId}`}
                >
                  Choose {plan.name}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
