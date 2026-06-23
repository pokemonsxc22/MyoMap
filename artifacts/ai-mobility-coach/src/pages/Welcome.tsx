import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { useLocation } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabaseClient";

const fadeUp = {
  hidden:   { opacity: 0, y: 20 },
  visible:  { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { userId, loading, setUser } = useUser();
  const [name, setName]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // If user already identified, skip to app
  useEffect(() => {
    if (!loading && userId) setLocation("/dashboard");
  }, [userId, loading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError("Please enter your name."); return; }

    setSubmitting(true);
    setError(null);

    const id = crypto.randomUUID();

    // Persist to Supabase (best-effort — localStorage is the source of truth)
    if (supabase) {
      await supabase
        .from("users")
        .insert({ id, name: trimmed })
        .then(({ error: dbErr }) => {
          if (dbErr) console.warn("Could not save user to Supabase:", dbErr.message);
        });
    }

    setUser(id, trimmed);
    setLocation("/intake");
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

        <div className="p-8 rounded-2xl bg-card border border-border/50 shadow-[0_0_80px_-20px_rgba(13,148,136,0.15)]">
          <h1 className="text-2xl font-black mb-2">Welcome to MyoMap</h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Enter your name to get started and track your progress.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your first name"
              autoFocus
              autoComplete="given-name"
              className="w-full h-11 px-4 rounded-xl bg-background border border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/60 transition-colors text-sm"
              data-testid="input-name"
            />
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
        </div>
      </motion.div>
    </div>
  );
}
