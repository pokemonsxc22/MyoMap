import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useUser } from "@/contexts/UserContext";

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export default function OnboardingPlan() {
  const [, setLocation] = useLocation();
  const { userId, onboardingComplete, completeOnboarding } = useUser();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (onboardingComplete === true) setLocation("/dashboard");
  }, [onboardingComplete, setLocation]);

  const handleContinue = async () => {
    if (!userId || loading) return;
    setLoading(true);
    await completeOnboarding();
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-foreground flex items-center justify-center px-4 py-12 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-teal-600/12 blur-[160px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-teal-500/8 blur-[140px]" />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="relative z-10 w-full max-w-md text-center"
      >
        <div className="mb-8 flex justify-center">
          <img
            src="https://okvnrbrnubtgplheyavw.supabase.co/storage/v1/object/public/assets/LOGO%20MYOMAP.png"
            alt="MyoMap"
            className="h-16 w-auto"
          />
        </div>

        <h1 className="text-3xl font-extrabold mb-3">You're all set!</h1>
        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          MyoMap will generate a personalized corrective exercise routine based on your pain area and movement patterns.
          All features are available — let's get started.
        </p>

        <button
          onClick={() => void handleContinue()}
          disabled={loading}
          className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-[0.98] text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_24px_-6px_rgba(13,148,136,0.5)] hover:shadow-[0_0_30px_-4px_rgba(13,148,136,0.6)] hover:scale-[1.02]"
          data-testid="onboarding-button-continue"
        >
          {loading ? "Setting up…" : "Go to Dashboard →"}
        </button>
      </motion.div>
    </div>
  );
}
