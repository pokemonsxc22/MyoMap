import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  // ready = true once we have a valid PASSWORD_RECOVERY session
  const [ready, setReady]       = useState(false);

  useEffect(() => {
    if (!supabase) return;

    console.log("[MyoMap] ResetPassword — mounted, subscribing to auth events");

    // Listen for the PASSWORD_RECOVERY event. Supabase fires this (instead of
    // SIGNED_IN) when it processes a password-reset token from the URL.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[MyoMap] ResetPassword — auth event:", event, "session:", !!session);
      if (event === "PASSWORD_RECOVERY") {
        console.log("[MyoMap] ResetPassword — PASSWORD_RECOVERY received, showing form");
        setReady(true);
      }
    });

    // Fallback: if the token was processed before the listener mounted (e.g.
    // the Supabase client initialised synchronously and already exchanged the
    // code), getSession returns the recovery session and we can show the form.
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[MyoMap] ResetPassword — getSession:", !!session, session?.user?.email);
      if (session) {
        console.log("[MyoMap] ResetPassword — session present, marking ready");
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setSaving(true);
    setError(null);

    console.log("[MyoMap] ResetPassword — calling updateUser");
    const { error: updateErr } = await supabase!.auth.updateUser({ password });
    setSaving(false);

    if (updateErr) {
      console.error("[MyoMap] ResetPassword — updateUser error:", updateErr.message);
      setError(updateErr.message);
      return;
    }

    console.log("[MyoMap] ResetPassword — password updated, redirecting to /dashboard");
    setDone(true);
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-teal-500/15 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <img src="https://okvnrbrnubtgplheyavw.supabase.co/storage/v1/object/public/assets/LOGO%20MYOMAP.png" alt="MyoMap" className="h-20 w-auto" />
        </div>

        <div className="p-8 rounded-2xl bg-card border border-border/50 shadow-[0_0_80px_-20px_rgba(13,148,136,0.15)]">
          {done ? (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="w-10 h-10 text-teal-500 mx-auto" />
              <h2 className="text-lg font-bold">Password updated</h2>
              <p className="text-sm text-muted-foreground">Redirecting you to the dashboard…</p>
            </div>
          ) : !ready ? (
            <div className="text-center space-y-3 py-4">
              <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-black mb-2">Set a new password</h1>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Choose a new password for your account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    placeholder="New password (min 6 characters)"
                    autoFocus
                    autoComplete="new-password"
                    className="w-full h-11 px-4 pr-11 rounded-xl bg-background border border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/60 transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <button
                  type="submit"
                  disabled={saving || password.length < 6}
                  className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(13,148,136,0.4)]"
                >
                  {saving ? "Updating…" : "Update password"}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
