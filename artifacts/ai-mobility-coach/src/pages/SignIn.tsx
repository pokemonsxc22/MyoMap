import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { USER_NAME_KEY } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabaseClient";

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

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

    const { data: userRow } = await supabase
      .from("users")
      .select("name")
      .eq("id", authUser.id)
      .maybeSingle();

    if (userRow?.name) {
      localStorage.setItem(USER_NAME_KEY, userRow.name as string);
    }

    setLocation("/dashboard");
  };

  if (loading || userId) return null;

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
          <h1 className="text-2xl font-black mb-2">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Sign in to continue tracking your progress.
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
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="Password"
                autoComplete="current-password"
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
              disabled={submitting || !email.trim() || !password}
              className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(13,148,136,0.4)]"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setLocation("/forgot-password")}
              className="text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-5">
          Don't have an account?{" "}
          <button
            onClick={() => setLocation("/welcome")}
            className="text-teal-500 hover:text-teal-400 font-medium transition-colors"
          >
            Sign up
          </button>
        </p>
      </motion.div>
    </div>
  );
}
