import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, MessageCircle, ClipboardList, User as UserIcon,
  Check, AlertTriangle, Loader2, KeyRound,
} from "lucide-react";
import { useLocation } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { getUsageData } from "@/lib/subscription";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

interface AssessmentHistoryRow {
  id: string;
  created_at: string;
  pain_location: string | null;
  goal: string | null;
}

interface UsageState {
  assessmentsToday: number;
  aiMessagesToday: number;
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const { userId, userName, userEmail, signOut } = useUser();
  const { toast } = useToast();

  const [usage, setUsage] = useState<UsageState | null>(null);
  const [history, setHistory] = useState<AssessmentHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [pwResetSending, setPwResetSending] = useState(false);
  const [pwResetSent, setPwResetSent] = useState(false);
  const [pwResetError, setPwResetError] = useState<string | null>(null);

  const handlePasswordReset = async () => {
    if (!supabase || !userEmail || pwResetSending) return;
    setPwResetSending(true);
    setPwResetError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setPwResetError("Failed to send reset email. Please try again.");
    } else {
      setPwResetSent(true);
    }
    setPwResetSending(false);
  };

  useEffect(() => {
    if (!userId) return;
    void getUsageData(userId).then((data) => {
      setUsage({
        assessmentsToday: data.assessments_today,
        aiMessagesToday:  data.ai_messages_today,
      });
    });
  }, [userId]);

  useEffect(() => {
    if (!userId || !supabase) { setHistoryLoading(false); return; }
    void supabase
      .from("assessments")
      .select("id, created_at, pain_location, goal")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setHistory((data as AssessmentHistoryRow[] | null) ?? []);
        setHistoryLoading(false);
      });
  }, [userId]);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE" || !userId || !supabase) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await supabase.from("assessments").delete().eq("user_id", userId);
      await supabase.from("users").delete().eq("id", userId);
      localStorage.clear();
      await signOut();
      setLocation("/");
    } catch {
      setDeleteError("Something went wrong deleting your account. Please try again.");
      setDeleting(false);
    }
  };

  const displayName = userName ?? userEmail ?? "there";

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-foreground">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-teal-600/10 blur-[160px] rounded-full" />
        <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-teal-500/8 blur-[140px] rounded-full" />
      </div>

      <nav className="sticky top-0 w-full border-b border-teal-500/10 bg-[#0a0f1a]/80 backdrop-blur-xl z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-1.5 text-slate-400 hover:text-foreground transition-colors text-xs font-medium"
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 relative z-10 space-y-5">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center shrink-0">
            <UserIcon className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">{displayName}</h1>
            {userEmail && <p className="text-xs text-slate-500">{userEmail}</p>}
          </div>
        </motion.div>

        {/* ── AI Usage ───────────────────────────────────────────── */}
        <motion.div
          initial="hidden" animate="visible" variants={fadeUp}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
          data-testid="section-ai-usage"
        >
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold">Today's Activity</h2>
          </div>

          {!usage ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading usage…
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Assessments today</span>
                <span className="font-bold text-foreground">{usage.assessmentsToday}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">AI messages today</span>
                <span className="font-bold text-foreground">{usage.aiMessagesToday}</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Assessment History ─────────────────────────────────── */}
        <motion.div
          initial="hidden" animate="visible" variants={fadeUp}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
          data-testid="section-assessment-history"
        >
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold">Assessment History</h2>
          </div>

          {historyLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading history…
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No assessments yet.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-xs cursor-pointer hover:border-teal-500/25 transition-colors"
                  onClick={() => setLocation(`/results?id=${row.id}`)}
                  data-testid={`history-row-${row.id}`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {row.pain_location ?? "Assessment"}
                    </p>
                    {row.goal && <p className="text-slate-500 truncate">{row.goal}</p>}
                  </div>
                  <span className="text-slate-500 shrink-0 ml-3">
                    {new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* ── Security / Change Password ─────────────────────────── */}
        <motion.div
          initial="hidden" animate="visible" variants={fadeUp}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
          data-testid="section-security"
        >
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold">Security</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Send a password reset link to <span className="text-slate-300 font-medium">{userEmail}</span>.
          </p>

          {pwResetSent ? (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-teal-500/10 border border-teal-500/25">
              <Check className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
              <p className="text-xs text-teal-300 font-medium">
                Password reset email sent — check your inbox.
              </p>
            </div>
          ) : (
            <>
              {pwResetError && (
                <p className="text-xs text-red-400 mb-3">{pwResetError}</p>
              )}
              <button
                onClick={() => void handlePasswordReset()}
                disabled={pwResetSending || !userEmail}
                className="h-9 px-4 rounded-xl border border-teal-500/30 text-teal-400 hover:bg-teal-500/10 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                data-testid="button-change-password"
              >
                {pwResetSending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {pwResetSending ? "Sending…" : "Send Password Reset Email"}
              </button>
            </>
          )}
        </motion.div>

        {/* ── Account ────────────────────────────────────────────── */}
        <motion.div
          initial="hidden" animate="visible" variants={fadeUp}
          className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-5"
          data-testid="section-account"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-bold">Account</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Deleting your account permanently removes your assessments, routines, and progress data. This cannot be undone.
          </p>

          {!deleteOpen ? (
            <button
              onClick={() => setDeleteOpen(true)}
              className="h-9 px-4 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-all"
              data-testid="button-open-delete-account"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Type <span className="font-bold text-red-400">DELETE</span> to confirm.
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full h-10 px-3 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-foreground placeholder:text-slate-600 outline-none focus:border-red-500/40"
                data-testid="input-delete-confirm"
              />
              {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => void handleDeleteAccount()}
                  disabled={deleteConfirmText !== "DELETE" || deleting}
                  className="h-9 px-4 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  data-testid="button-confirm-delete-account"
                >
                  {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {deleting ? "Deleting…" : "Permanently Delete"}
                </button>
                <button
                  onClick={() => { setDeleteOpen(false); setDeleteConfirmText(""); setDeleteError(null); }}
                  className="h-9 px-4 rounded-xl border border-white/10 text-slate-400 hover:text-foreground text-xs font-bold transition-all"
                  data-testid="button-cancel-delete-account"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </motion.div>

        <button
          onClick={() => { void signOut().then(() => setLocation("/")); toast({ title: "Signed out" }); }}
          className="w-full h-10 rounded-xl border border-white/10 text-slate-400 hover:text-foreground hover:border-white/20 text-xs font-bold transition-all"
          data-testid="button-signout-profile"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
