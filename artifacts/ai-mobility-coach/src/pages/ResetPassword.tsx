import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const inputClass =
  "w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all text-sm hover:border-white/20";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [ready, setReady]       = useState(false);

  useEffect(() => {
    if (!supabase) return;

    console.log("[MyoMap] ResetPassword — mounted");

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[MyoMap] ResetPassword — auth event:", event, "session:", !!session);
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setSaving(true);
    setError(null);

    const { error: updateErr } = await supabase!.auth.updateUser({ password });
    setSaving(false);

    if (updateErr) {
      setError(updateErr.message);
      return;
    }

    setDone(true);
    setLocation("/dashboard");
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
          {done ? (
            <div className="text-center space-y-3 py-4">
              <div className="w-12 h-12 rounded-full bg-teal-500/15 border border-teal-500/25 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-teal-500" />
              </div>
              <h2 className="text-lg font-extrabold">Password updated</h2>
              <p className="text-sm text-slate-400">Redirecting you to the dashboard…</p>
            </div>
          ) : !ready ? (
            <div className="text-center space-y-3 py-6">
              <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin mx-auto" />
              <p className="text-sm text-slate-400">Verifying your reset link…</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold mb-2">Set a new password</h1>
              <p className="text-sm text-slate-400 mb-7 leading-relaxed">
                Choose a new password for your account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    placeholder="New password (min 6 characters)"
                    autoFocus
                    autoComplete="new-password"
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {error && <p className="text-xs text-red-400 pt-0.5">{error}</p>}

                <button
                  type="submit"
                  disabled={saving || password.length < 6}
                  className="w-full h-12 mt-1 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-[0.98] text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_24px_-6px_rgba(13,148,136,0.5)] hover:shadow-[0_0_30px_-4px_rgba(13,148,136,0.6)] hover:scale-[1.02]"
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
