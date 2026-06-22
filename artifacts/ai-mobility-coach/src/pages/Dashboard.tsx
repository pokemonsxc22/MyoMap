import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, PlusCircle, LogOut, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, signOut } from "@/lib/supabaseClient";
import { formatDistanceToNow } from "date-fns";

const AREA_LABELS: Record<string, string> = {
  "lower-back":     "Lower Back",
  "mid-back":       "Mid Back",
  "upper-back":     "Upper Back",
  "neck-shoulders": "Neck & Shoulders",
  "chest":          "Chest",
  "arms":           "Arms",
  "abs-core":       "Abs / Core",
  "quads":          "Quads",
  "hamstrings":     "Hamstrings",
  "calves":         "Calves",
  "knees":          "Knees",
  "hips":           "Hips",
};

interface Assessment {
  id: string;
  pain_location: string;
  created_at: string;
  goal: string | null;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: "easeOut" as const },
  }),
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) setLocation("/auth");
  }, [user, loading, setLocation]);

  useEffect(() => {
    if (!user || !supabase) {
      setLoadingData(false);
      return;
    }
    void supabase
      .from("assessments")
      .select("id, pain_location, created_at, goal")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setAssessments((data ?? []) as Assessment[]);
        setLoadingData(false);
      });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    setLocation("/auth");
  };

  const handleNewAssessment = () => {
    sessionStorage.removeItem("mobilityRoutine");
    sessionStorage.removeItem("mobilityFormData");
    sessionStorage.removeItem("mobilitySessionId");
    sessionStorage.removeItem("mobilityAssessmentId");
    setLocation("/intake");
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* Nav */}
      <nav className="sticky top-0 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <Activity className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm tracking-tight hidden sm:block">AI Mobility Coach</span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
            data-testid="button-sign-out"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10 relative z-10">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-1">Dashboard</p>
            <h1 className="text-2xl font-black">
              Hey, {user?.email?.split("@")[0] ?? "there"}
            </h1>
          </div>
          <Button
            onClick={handleNewAssessment}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white border-0 shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)]"
            data-testid="button-new-assessment"
          >
            <PlusCircle className="w-4 h-4" />
            New assessment
          </Button>
        </div>

        {/* History */}
        <h2 className="text-xs font-semibold text-primary tracking-widest uppercase mb-4">
          Assessment History
        </h2>

        {loadingData ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-card border border-border/50 animate-pulse" />
            ))}
          </div>
        ) : assessments.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground text-sm mb-4">No assessments yet.</p>
            <Button
              onClick={handleNewAssessment}
              variant="outline"
              className="border-border/50"
            >
              Take your first assessment
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {assessments.map((a, i) => (
              <motion.div
                key={a.id}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="p-4 rounded-2xl bg-card border border-border/50 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    {AREA_LABELS[a.pain_location] ?? a.pain_location}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </p>
                </div>
                <button
                  onClick={() => setLocation(`/results?id=${a.id}`)}
                  className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  data-testid={`button-view-${a.id}`}
                >
                  View results
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
