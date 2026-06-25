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

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { userId, loading } = useUser();

  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && userId) setLocation("/dashboard");
  }, [userId, loading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimName  = name.trim();
    const trimEmail = email.trim();
    if (!trimName)         { setError("First name is required."); return; }
    if (!trimEmail)        { setError("Email address is required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setSubmitting(true);
    setError(null);

    if (!supabase) {
      setError("Authentication is not configured. Check your environment variables.");
      setSubmitting(false);
      return;
    }

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: trimEmail,
      password,
      options: { data: { name: trimName } },
    });

    if (signUpErr) {
      const msg = signUpErr.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists")) {
        setError("An account with this email already exists. Sign in instead.");
      } else {
        setError(signUpErr.message);
      }
      setSubmitting(false);
      return;
    }

    const authUser = data.user;
    if (!authUser) {
      setError("Sign up failed. Please try again.");
      setSubmitting(false);
      return;
    }

    await supabase
      .from("users")
      .upsert({ id: authUser.id, name: trimName, email: trimEmail })
      .then(({ error: dbErr }) => {
        if (dbErr) console.warn("users table insert:", dbErr.message);
      });

    localStorage.setItem(USER_NAME_KEY, trimName);

    if (data.session) {
      setLocation("/intake");
    } else {
      setConfirmMsg(`We sent a confirmation link to ${trimEmail}. Check your inbox to activate your account.`);
      setSubmitting(false);
    }
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
          {confirmMsg ? (
            <div className="text-center space-y-3 py-4">
              <div className="w-12 h-12 rounded-full bg-teal-500/15 flex items-center justify-center mx-auto">
                <Activity className="w-6 h-6 text-teal-500" />
              </div>
              <h2 className="text-lg font-bold">Check your inbox</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{confirmMsg}</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-black mb-2">Create your account</h1>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Sign up to track your progress and access your routines.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(null); }}
                  placeholder="First name"
                  autoFocus
                  autoComplete="given-name"
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/60 transition-colors text-sm"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="Email address"
                  autoComplete="email"
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/60 transition-colors text-sm"
                />
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    placeholder="Password (min 6 characters)"
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

                {error && <p className="text-xs text-destructive leading-relaxed">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting || !name.trim() || !email.trim() || password.length < 6}
                  className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(13,148,136,0.4)]"
                >
                  {submitting ? "Creating account…" : "Get Started"}
                </button>
              </form>

              <p className="text-center text-xs text-muted-foreground/70 mt-5">
                Already have an account?{" "}
                <button
                  onClick={() => setLocation("/signin")}
                  className="text-teal-500 hover:text-teal-400 font-medium transition-colors"
                >
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
