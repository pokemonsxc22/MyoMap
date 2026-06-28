import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { USER_NAME_KEY } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabaseClient";

const PENDING_EMAIL_KEY = "myomap_pending_email";
const PENDING_PW_KEY    = "myomap_pending_pw";

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const inputClass =
  "w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all text-sm hover:border-white/20";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { userId, loading } = useUser();

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [emailConflict, setEmailConflict] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && userId) setLocation("/dashboard");
  }, [userId, loading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimName  = name.trim();
    const trimEmail = email.trim();
    if (!trimName)           { setError("First name is required."); return; }
    if (!trimEmail)          { setError("Email address is required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setSubmitting(true);
    setError(null);
    setEmailConflict(false);

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
        setEmailConflict(true);
        setError("An account with this email already exists.");
      } else {
        setError(signUpErr.message);
      }
      setSubmitting(false);
      return;
    }

    const authUser = data.user;

    if (authUser && (authUser.identities?.length ?? 0) === 0) {
      setEmailConflict(true);
      setError("An account with this email already exists.");
      setSubmitting(false);
      return;
    }

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
      sessionStorage.setItem(PENDING_EMAIL_KEY, trimEmail);
      sessionStorage.setItem(PENDING_PW_KEY, password);
      setConfirmMsg(
        `We sent a confirmation link to ${trimEmail}. Check your inbox to activate your account.`
      );
      setSubmitting(false);
    }
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
          {confirmMsg ? (
            <div className="text-center space-y-3 py-4">
              <div className="w-12 h-12 rounded-full bg-teal-500/15 border border-teal-500/25 flex items-center justify-center mx-auto">
                <Activity className="w-6 h-6 text-teal-500" />
              </div>
              <h2 className="text-lg font-bold">Check your inbox</h2>
              <p className="text-sm text-slate-400 leading-relaxed">{confirmMsg}</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold mb-2">Create your account</h1>
              <p className="text-sm text-slate-400 mb-7 leading-relaxed">
                Sign up to track your progress and access your routines.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(null); setEmailConflict(false); }}
                  placeholder="First name"
                  autoFocus
                  autoComplete="given-name"
                  className={inputClass}
                  data-testid="input-name"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); setEmailConflict(false); }}
                  placeholder="Email address"
                  autoComplete="email"
                  className={inputClass}
                  data-testid="input-email"
                />
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    placeholder="Password (min 6 characters)"
                    autoComplete="new-password"
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

                {error && (
                  <p className="text-xs text-red-400 leading-relaxed pt-0.5">
                    {error}{" "}
                    {emailConflict && (
                      <button
                        type="button"
                        onClick={() => setLocation("/signin")}
                        className="underline font-medium hover:text-red-300 transition-colors"
                      >
                        Sign in instead
                      </button>
                    )}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !name.trim() || !email.trim() || password.length < 6}
                  className="w-full h-12 mt-1 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-[0.98] text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_24px_-6px_rgba(13,148,136,0.5)] hover:shadow-[0_0_30px_-4px_rgba(13,148,136,0.6)] hover:scale-[1.02]"
                  data-testid="button-signup"
                >
                  {submitting ? "Creating account…" : "Get Started"}
                </button>
              </form>

              <p className="text-center text-xs text-slate-500 mt-6">
                Already have an account?{" "}
                <button
                  onClick={() => setLocation("/signin")}
                  className="text-teal-400 hover:text-teal-300 font-semibold transition-colors"
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
