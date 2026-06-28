import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { USER_NAME_KEY } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabaseClient";

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const inputClass =
  "w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all text-sm hover:border-white/20";

export default function SignIn() {
  const [, setLocation] = useLocation();
  const { userId, loading } = useUser();

  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!loading && userId) setLocation("/dashboard");
  }, [userId, loading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setSubmitting(true);
    setError(null);

    if (!supabase) {
      setError("Authentication is not configured.");
      setSubmitting(false);
      return;
    }

    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInErr) {
      setError("Incorrect email or password. Please try again.");
      setSubmitting(false);
      return;
    }

    const authUser = data.user;
    if (!authUser) {
      setError("Sign in failed. Please try again.");
      setSubmitting(false);
      return;
    }

    setLocation("/dashboard");
  };

  if (loading || userId) return null;

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-foreground flex items-center justify-center px-4 relative">
      {/* Animated bg */}
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
          <h1 className="text-2xl font-extrabold mb-2">Welcome back</h1>
          <p className="text-sm text-slate-400 mb-7 leading-relaxed">
            Sign in to continue tracking your progress.
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
              data-testid="input-email"
            />
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="Password"
                autoComplete="current-password"
                className={`${inputClass} pr-11`}
                data-testid="input-password"
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
              disabled={submitting || !email.trim() || !password}
              className="w-full h-12 mt-1 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-[0.98] text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_24px_-6px_rgba(13,148,136,0.5)] hover:shadow-[0_0_30px_-4px_rgba(13,148,136,0.6)] hover:scale-[1.02]"
              data-testid="button-signin"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setLocation("/forgot-password")}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Don&apos;t have an account?{" "}
          <button
            onClick={() => setLocation("/welcome")}
            className="text-teal-400 hover:text-teal-300 font-semibold transition-colors"
          >
            Sign up
          </button>
        </p>
      </motion.div>
    </div>
  );
}
