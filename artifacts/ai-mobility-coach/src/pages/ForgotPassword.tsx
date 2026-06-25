import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail]   = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState<string | null>(null);

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

    const redirectTo = `${window.location.origin}/reset-password`;
    console.log("[MyoMap] Password reset redirectTo:", redirectTo);

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo,
    });

    setSending(false);

    if (resetErr) {
      setError(resetErr.message);
      return;
    }

    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-teal-500/15 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="relative z-10 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Activity className="w-5 h-5 text-teal-500" />
          <span className="font-black text-lg tracking-tight">MyoMap</span>
        </div>

        <div className="p-8 rounded-2xl bg-card border border-border/50 shadow-[0_0_80px_-20px_rgba(13,148,136,0.15)]">
          {sent ? (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="w-10 h-10 text-teal-500 mx-auto" />
              <h2 className="text-lg font-bold">Check your inbox</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We sent a reset link to <span className="text-foreground font-medium">{email}</span>.
              </p>
              <button
                onClick={() => setLocation("/signin")}
                className="mt-4 text-xs text-teal-500 hover:text-teal-400 transition-colors"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setLocation("/signin")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to sign in
              </button>

              <h1 className="text-2xl font-black mb-2">Reset your password</h1>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Enter your email and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="Email address"
                  autoFocus
                  autoComplete="email"
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/60 transition-colors text-sm"
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={sending || !email.trim()}
                  className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(13,148,136,0.4)]"
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
