import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { USER_ID_KEY, USER_NAME_KEY } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabaseClient";

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type View = "register" | "recover";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { userId, loading, setUser } = useUser();

  const [view, setView] = useState<View>("register");

  // --- register state ---
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- recover state ---
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recovering, setRecovering]     = useState(false);
  const [recoverError, setRecoverError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && userId) setLocation("/dashboard");
  }, [userId, loading, setLocation]);

  // ---- Register submit ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName  = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) { setError("Please enter your first name."); return; }
    if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) {
      setError("Please enter a valid email address, or leave it blank.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const id = crypto.randomUUID();

    if (supabase) {
      const { error: dbErr } = await supabase
        .from("users")
        .insert({ id, name: trimmedName, email: trimmedEmail || null });
      if (dbErr) console.warn("Supabase insert error:", dbErr.message);
    }

    setUser(id, trimmedName);
    setLocation("/intake");
  };

  // ---- Recover submit ----
  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = recoverEmail.trim();
    if (!trimmed) { setRecoverError("Please enter your email."); return; }
    if (!EMAIL_RE.test(trimmed)) { setRecoverError("Please enter a valid email address."); return; }

    setRecovering(true);
    setRecoverError(null);

    if (!supabase) {
      setRecoverError("Recovery is unavailable right now. Please try again later.");
      setRecovering(false);
      return;
    }

    const { data, error: dbErr } = await supabase
      .from("users")
      .select("id, name")
      .eq("email", trimmed)
      .maybeSingle();

    setRecovering(false);

    if (dbErr || !data) {
      setRecoverError("No account found with that email.");
      return;
    }

    localStorage.setItem(USER_ID_KEY, data.id as string);
    localStorage.setItem(USER_NAME_KEY, data.name as string);
    setUser(data.id as string, data.name as string);
    setLocation("/dashboard");
  };

  if (loading || userId) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-teal-500/15 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Activity className="w-5 h-5 text-teal-500" />
          <span className="font-black text-lg tracking-tight">MyoMap</span>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Register view ── */}
          {view === "register" && (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
              exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
            >
              <div className="p-8 rounded-2xl bg-card border border-border/50 shadow-[0_0_80px_-20px_rgba(13,148,136,0.15)]">
                <h1 className="text-2xl font-black mb-2">Welcome to MyoMap</h1>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Enter your name to get started and track your progress.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name field */}
                  <div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setError(null); }}
                      placeholder="Your first name"
                      autoFocus
                      autoComplete="given-name"
                      className="w-full h-11 px-4 rounded-xl bg-background border border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/60 transition-colors text-sm"
                      data-testid="input-name"
                    />
                  </div>

                  {/* Email field */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-1">
                      Email address
                      <span className="text-[10px] text-muted-foreground/60 bg-muted/50 rounded px-1.5 py-0.5 leading-none">
                        optional
                      </span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full h-11 px-4 rounded-xl bg-background border border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/60 transition-colors text-sm"
                      data-testid="input-email"
                    />
                    <p className="text-[11px] text-muted-foreground/70 leading-relaxed px-1">
                      If you add your email, your progress will be saved and recoverable on any device. Without it, progress is stored only on this browser.
                    </p>
                  </div>

                  {error && <p className="text-xs text-destructive">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting || !name.trim()}
                    className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(13,148,136,0.4)]"
                    data-testid="button-get-started"
                  >
                    {submitting ? "Setting up…" : "Get Started"}
                  </button>
                </form>

                <p className="text-center text-[11px] text-muted-foreground/60 mt-4">
                  No email? No problem — you can always add one later.
                </p>
              </div>

              {/* Recover link */}
              <p className="text-center text-xs text-muted-foreground/60 mt-5">
                Used MyoMap before?{" "}
                <button
                  onClick={() => { setView("recover"); setRecoverError(null); }}
                  className="text-teal-500 hover:text-teal-400 underline underline-offset-2 transition-colors"
                >
                  Recover my progress
                </button>
              </p>
            </motion.div>
          )}

          {/* ── Recover view ── */}
          {view === "recover" && (
            <motion.div
              key="recover"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
              exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
            >
              <div className="p-8 rounded-2xl bg-card border border-border/50 shadow-[0_0_80px_-20px_rgba(13,148,136,0.15)]">
                <button
                  onClick={() => { setView("register"); setRecoverError(null); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>

                <h1 className="text-xl font-black mb-2">Recover your progress</h1>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Enter your email to restore your progress on this device.
                </p>

                <form onSubmit={handleRecover} className="space-y-4">
                  <input
                    type="email"
                    value={recoverEmail}
                    onChange={(e) => { setRecoverEmail(e.target.value); setRecoverError(null); }}
                    placeholder="you@example.com"
                    autoFocus
                    autoComplete="email"
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/60 transition-colors text-sm"
                    data-testid="input-recover-email"
                  />
                  {recoverError && <p className="text-xs text-destructive">{recoverError}</p>}
                  <button
                    type="submit"
                    disabled={recovering || !recoverEmail.trim()}
                    className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(13,148,136,0.4)]"
                    data-testid="button-recover"
                  >
                    {recovering ? "Looking up…" : "Restore my progress"}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
