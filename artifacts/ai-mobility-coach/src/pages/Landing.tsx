import { motion } from "framer-motion";
import { Activity, Cpu, LineChart, MessageSquare, Target, Zap, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      {/* Absolute Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2" data-testid="nav-logo">
            <Activity className="w-6 h-6 text-primary" />
            <span className="font-outfit font-bold text-xl tracking-tight">AI Mobility Coach</span>
          </div>
          <Button 
            variant="default" 
            className="font-semibold bg-primary hover:bg-primary/90 text-white border-0"
            data-testid="button-nav-cta"
            onClick={() => setLocation('/intake')}
          >
            Start Now
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="relative z-10"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border/50 text-sm font-medium mb-6 text-muted-foreground">
              <Zap className="w-4 h-4 text-primary" />
              <span>The future of athletic recovery</span>
            </motion.div>
            
            <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-6">
              Stop guessing why <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">
                your body hurts.
              </span>
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              We use AI and advanced kinesiology to diagnose tightness and pain, building a personalized, science-backed corrective exercise routine specifically for your body.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="w-full sm:w-auto text-lg h-14 px-8 font-bold bg-primary hover:bg-primary/90 text-white border-0 shadow-[0_0_30px_-5px_rgba(37,99,235,0.4)]"
                data-testid="button-hero-cta"
                onClick={() => setLocation('/intake')}
              >
                Start Now
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 px-6 bg-secondary/20 border-y border-border/30 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            <motion.div variants={fadeInUp} className="p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Understand the Root Cause</h3>
              <p className="text-muted-foreground">
                Stop treating symptoms. We analyze your movement restrictions to identify the exact muscle imbalances causing your pain.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Kinesiology-Based Routines</h3>
              <p className="text-muted-foreground">
                No generic stretches. Receive a highly personalized protocol of releases, activations, and integrations designed for your unique biomechanics.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                <LineChart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Track Your Progress</h3>
              <p className="text-muted-foreground">
                Log your daily compliance and monitor your mobility metrics. Feel the difference in your lifts and daily life in just weeks.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Precision Recovery in 3 Steps</h2>
            <p className="text-xl text-muted-foreground">The most advanced digital mobility assessment available.</p>
          </div>

          <div className="space-y-12">
            {[
              {
                step: "01",
                title: "Describe your symptoms",
                desc: "Tell our AI engine exactly where it hurts, when it hurts, and what specific movements (like overhead pressing or deep squats) feel restricted.",
                icon: MessageSquare
              },
              {
                step: "02",
                title: "Get your diagnosis",
                desc: "Using applied kinesiology principles, the AI maps your pain points to specific fascial restrictions and muscle imbalances.",
                icon: Cpu
              },
              {
                step: "03",
                title: "Follow your routine",
                desc: "Receive a dynamic, daily corrective exercise plan built specifically for you. Less than 15 minutes a day to rebuild your foundation.",
                icon: Zap
              }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeInUp}
                className="flex flex-col md:flex-row gap-6 md:gap-12 items-start md:items-center p-8 rounded-3xl bg-secondary/10 border border-border/30 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-2 h-full bg-primary/20"></div>
                
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <item.icon className="w-8 h-8 text-primary" />
                </div>
                
                <div className="flex-1">
                  <div className="text-sm font-bold text-primary mb-2 tracking-widest">STEP {item.step}</div>
                  <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground text-lg">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/30 bg-background text-center relative z-10">
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
          <Activity className="w-5 h-5" />
          <span className="font-outfit font-bold tracking-tight">AI Mobility Coach</span>
        </div>
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} AI Mobility Coach. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
