import { motion } from "framer-motion";
import { Activity, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Visual() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative">
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Nav */}
      <nav className="w-full border-b border-border/40 bg-background/80 backdrop-blur-xl z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm tracking-tight">AI Mobility Coach</span>
          </div>
          <button
            onClick={() => setLocation("/results")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-back-results"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Results
          </button>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-sm w-full text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <Activity className="w-10 h-10 text-primary" />
          </div>
          <span className="text-xs font-semibold text-primary tracking-widest uppercase block mb-3">
            Coming Soon
          </span>
          <h1 className="text-3xl font-black mb-4">Body Visual</h1>
          <p className="text-muted-foreground leading-relaxed mb-8">
            An interactive body map highlighting your affected muscle groups is on the way. Check back after your next update.
          </p>
          <Button
            onClick={() => setLocation("/results")}
            className="bg-primary hover:bg-primary/90 text-white"
            data-testid="button-back-to-results"
          >
            Back to Results
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
