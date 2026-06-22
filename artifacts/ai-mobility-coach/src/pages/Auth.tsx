import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { signInWithEmail } from "@/lib/supabaseClient";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function Auth() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) setLocation("/dashboard");
  }, [user, loading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const redirectTo = `${window.location.origin}${base}/auth`;
      await signInWithEmail(email.trim(), redirectTo);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send magic link.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Activity className="w-5 h-5 text-primary" />
          <span className="font-black text-lg tracking-tight">AI Mobility Coach</span>
        </div>

        <div className="p-8 rounded-2xl bg-card border border-border/50 shadow-[0_0_80px_-20px_rgba(37,99,235,0.15)]">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We sent a sign-in link to{" "}
                <strong className="text-foreground">{email}</strong>. Click it to continue.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-black mb-1">Sign in</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your email and we&rsquo;ll send you a magic link — no password needed.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm"
                  data-testid="input-email"
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button
                  type="submit"
                  disabled={submitting || !email.trim()}
                  className="w-full bg-primary hover:bg-primary/90 text-white border-0 shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)]"
                  data-testid="button-send-magic-link"
                >
                  {submitting ? "Sending..." : "Send magic link"}
                </Button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
