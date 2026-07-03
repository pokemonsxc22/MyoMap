import { useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { applyDiscountCode } from "@/lib/subscription";

interface DiscountCodeSectionProps {
  onApplied?: () => void;
}

export default function DiscountCodeSection({ onApplied }: DiscountCodeSectionProps) {
  const [, setLocation] = useLocation();
  const { userId, refreshPlan } = useUser();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "applying" | "error" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleApply = async () => {
    if (!userId || !code.trim() || status === "applying") return;
    setStatus("applying");
    setMessage(null);

    const result = await applyDiscountCode(userId, code);

    if (!result.ok) {
      setStatus("error");
      setMessage(result.error ?? "Invalid discount code");
      return;
    }

    setStatus("success");
    setMessage("Code applied! Taking you to your dashboard…");
    await refreshPlan();
    onApplied?.();
    setTimeout(() => setLocation("/dashboard"), 900);
  };

  return (
    <div className="mt-8 pt-6 border-t border-white/10" data-testid="section-discount-code">
      <p className="text-sm font-semibold text-slate-300 mb-3">Have a discount code?</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (status !== "applying") {
              setStatus("idle");
              setMessage(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleApply();
          }}
          placeholder="Enter code"
          disabled={status === "applying" || status === "success"}
          className="flex-1 h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all text-sm uppercase disabled:opacity-60"
          data-testid="input-discount-code"
        />
        <button
          onClick={handleApply}
          disabled={!code.trim() || status === "applying" || status === "success"}
          className="h-11 px-6 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-[0.98] text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          data-testid="button-apply-discount"
        >
          {status === "applying" ? "Applying…" : "Apply"}
        </button>
      </div>
      {status === "error" && message && (
        <p className="mt-2 text-xs font-medium text-red-400" data-testid="text-discount-error">
          {message}
        </p>
      )}
      {status === "success" && message && (
        <p className="mt-2 text-xs font-medium text-teal-400" data-testid="text-discount-success">
          {message}
        </p>
      )}
    </div>
  );
}
