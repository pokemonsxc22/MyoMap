import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const inputClass =
  "w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all text-sm hover:border-white/20";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail]     = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) { setError("Please enter your email."); return; }

    setSending(true);
    setError(null);

    if (!supabase) {
      setError("Authentication is not configured.");
      setSending(false);
      return;
    }

    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    const redirectTo = `${window.location.origin}${base}/reset-password`;

    console.log("[MyoMap] ForgotPassword — redirectTo:", redirectTo);

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });

    setSending(false);

    if (resetErr) {
      setError(resetErr.message);
      return;
    }

    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-foreground flex items-center justify-center px-4 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-teal-600/12 blur-[160px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-teal-500/8 blur-[140px]" />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="mb-8 flex justify-center">
          <img
            src="https://okvnrbrnubtgplheyavw.supabase.co/storage/v1/object/public/assets/LOGO%20MYOMAP.png"
            alt="MyoMap"
            className="h-20 w-auto"
          />
        </div>

        <div className="p-8 rounded-2xl bg-[#111827]/80 border border-teal-500/15 backdrop-blur-sm shadow-[0_0_80px_-20px_rgba(13,148,136,0.2)] hover:shadow-[0_0_100px_-16px_rgba(13,148,136,0.25)] transition-shadow">
          {sent ? (
            <div className="text-center space-y-3 py-4">
              <div className="w-12 h-12 rounded-full bg-teal-500/15 border border-teal-500/25 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-teal-500" />
              </div>
              <h2 className="text-lg font-extrabold">Check your inbox</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                We sent a reset link to <span className="text-foreground font-medium">{email}</span>.
              </p>
              <button
                onClick={() => setLocation("/signin")}
                className="mt-3 text-xs text-teal-400 hover:text-teal-300 font-medium transition-colors"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setLocation("/signin")}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-6"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to sign in
              </button>

              <h1 className="text-2xl font-extrabold mb-2">Reset your password</h1>
              <p className="text-sm text-slate-400 mb-7 leading-relaxed">
                Enter your email and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="Email address"
                  autoFocus
                  autoComplete="email"
                  className={inputClass}
                />
                {error && <p className="text-xs text-red-400 pt-0.5">{error}</p>}
                <button
                  type="submit"
                  disabled={sending || !email.trim()}
                  className="w-full h-12 mt-1 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-[0.98] text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_24px_-6px_rgba(13,148,136,0.5)] hover:shadow-[0_0_30px_-4px_rgba(13,148,136,0.6)] hover:scale-[1.02]"
                >
                  {sending ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
