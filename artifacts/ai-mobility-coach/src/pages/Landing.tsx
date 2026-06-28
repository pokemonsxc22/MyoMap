import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Brain, Dumbbell, TrendingUp, ChevronRight, ArrowRight,
  Zap, Shield, Star, LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useUser } from "@/contexts/UserContext";

const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};
const stagger = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.13 } },
};

const FEATURES = [
  {
    icon: Brain,
    title: "AI-Powered Assessment",
    desc: "Describe your pain and movement restrictions. Our AI maps them to exact muscle imbalances using applied kinesiology principles.",
    gradient: "from-teal-500/20 to-teal-600/5",
    border: "border-teal-500/20",
    iconBg: "bg-teal-500/15",
    iconColor: "text-teal-400",
  },
  {
    icon: Dumbbell,
    title: "Corrective Exercise Routines",
    desc: "No generic stretches. A science-backed protocol of releases, activations, and integrations built for your exact biomechanics.",
    gradient: "from-emerald-500/15 to-emerald-600/5",
    border: "border-emerald-500/20",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
  },
  {
    icon: TrendingUp,
    title: "Track Your Progress",
    desc: "Log sessions, chat with AI about your recovery, build streaks, and compare movement screens to see real improvement.",
    gradient: "from-cyan-500/15 to-cyan-600/5",
    border: "border-cyan-500/20",
    iconBg: "bg-cyan-500/15",
    iconColor: "text-cyan-400",
  },
];

const STEPS = [
  {
    num: "1",
    title: "Describe your pain",
    desc: "Tell us where it hurts, how long, what makes it worse, and your activity level. Takes under 3 minutes.",
    icon: Zap,
  },
  {
    num: "2",
    title: "Get your routine",
    desc: "Our AI generates a personalized corrective exercise plan with step-by-step instructions and the science behind each move.",
    icon: Shield,
  },
  {
    num: "3",
    title: "Track your recovery",
    desc: "Log sessions, chat with the AI coach, retake movement screens, and watch your mobility improve week by week.",
    icon: TrendingUp,
  },
];

const TESTIMONIALS = [
  { name: "Marcus T.", role: "Marathon runner", quote: "My IT band pain went from a 4/5 to barely noticeable after two weeks of following the routine MyoMap built me.", stars: 5 },
  { name: "Priya K.", role: "Software engineer", quote: "I had lower back pain from sitting 10 hours a day. The AI caught exactly what my physio missed — hip flexor tightness.", stars: 5 },
  { name: "Jordan R.", role: "CrossFit coach", quote: "Recommend this to all my athletes now. The movement screen comparison is a game changer for tracking rehab progress.", stars: 5 },
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const { userId } = useUser();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroY = useTransform(scrollY, [0, 400], [0, 80]);

  const handleCTA = () => setLocation(userId ? "/dashboard" : "/welcome");

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-foreground overflow-x-hidden selection:bg-teal-500/30">

      {/* Animated mesh gradient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-30%] left-[-15%] w-[800px] h-[800px] rounded-full bg-teal-600/12 blur-[180px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-20%] right-[-15%] w-[700px] h-[700px] rounded-full bg-teal-500/8 blur-[160px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
        <div className="absolute top-[40%] left-[50%] w-[500px] h-[500px] rounded-full bg-cyan-600/6 blur-[140px] animate-[pulse_12s_ease-in-out_infinite_4s]" />
      </div>

      {/* ── Navbar ────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 border-b border-teal-500/10 bg-[#0a0f1a]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            data-testid="nav-logo"
          >
            <img
              src="https://okvnrbrnubtgplheyavw.supabase.co/storage/v1/object/public/assets/LOGO%20MYOMAP.png"
              alt="MyoMap"
              className="h-10 w-auto hover:opacity-90 transition-opacity cursor-pointer"
              onClick={() => setLocation("/")}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center gap-2"
          >
            {userId ? (
              <Button
                variant="outline"
                onClick={() => setLocation("/dashboard")}
                className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10 hover:text-teal-300 hover:border-teal-500/50 transition-all font-semibold"
                data-testid="button-nav-dashboard"
              >
                <LayoutDashboard className="w-4 h-4 mr-1.5" />
                Dashboard
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setLocation("/signin")}
                className="text-muted-foreground hover:text-foreground hover:bg-white/5 font-medium"
                data-testid="button-nav-signin"
              >
                Sign In
              </Button>
            )}
            <Button
              onClick={handleCTA}
              className="bg-teal-600 hover:bg-teal-500 text-white border-0 font-bold shadow-[0_0_24px_-6px_rgba(13,148,136,0.6)] hover:shadow-[0_0_32px_-4px_rgba(13,148,136,0.7)] transition-all hover:scale-[1.03]"
              data-testid="button-nav-cta"
            >
              Start Now
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center px-6 pt-16">
        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-sm font-semibold text-teal-400 mb-8 tracking-wide">
                <Zap className="w-3.5 h-3.5" />
                AI-Powered Mobility Coaching
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6">
              Stop guessing why{" "}
              <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-teal-300 to-cyan-400">
                your body hurts.
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              We use AI and advanced kinesiology to diagnose tightness and pain, building a personalized, science-backed corrective exercise routine specifically for your body.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={handleCTA}
                className="w-full sm:w-auto h-14 px-10 text-lg font-bold bg-teal-600 hover:bg-teal-500 text-white border-0 shadow-[0_0_40px_-8px_rgba(13,148,136,0.7)] hover:shadow-[0_0_50px_-4px_rgba(13,148,136,0.8)] hover:scale-[1.03] transition-all"
                data-testid="button-hero-cta"
              >
                Start Now — It's Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              {!userId && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setLocation("/signin")}
                  className="w-full sm:w-auto h-14 px-8 text-base font-semibold border-white/10 text-slate-300 hover:bg-white/5 hover:border-white/20 hover:text-white transition-all"
                  data-testid="button-hero-signin"
                >
                  Sign In
                </Button>
              )}
            </motion.div>

            <motion.div variants={fadeUp} className="mt-14 flex items-center justify-center gap-8 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                Results in under 3 minutes
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                Science-backed
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-600"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-teal-500/40" />
        </motion.div>
      </section>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section className="relative z-10 py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-xs font-bold text-teal-500 tracking-[0.2em] uppercase mb-3">What We Offer</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-extrabold mb-4">Everything your body needs</motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-slate-400 max-w-xl mx-auto">The most advanced digital mobility assessment — built for athletes, desk workers, and everyone in between.</motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-6"
          >
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={`relative p-8 rounded-2xl bg-gradient-to-br ${f.gradient} border ${f.border} backdrop-blur-sm hover:shadow-[0_0_30px_-8px_rgba(13,148,136,0.25)] transition-shadow group cursor-default`}
              >
                <div className={`w-12 h-12 rounded-xl ${f.iconBg} flex items-center justify-center mb-6 border ${f.border} group-hover:scale-110 transition-transform`}>
                  <f.icon className={`w-6 h-6 ${f.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────── */}
      <section className="relative z-10 py-28 px-6 border-y border-teal-500/8 bg-teal-950/10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-20"
          >
            <motion.p variants={fadeUp} className="text-xs font-bold text-teal-500 tracking-[0.2em] uppercase mb-3">Simple Process</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-extrabold mb-4">How it works</motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-slate-400">From first symptom to personalized routine in minutes.</motion.p>
          </motion.div>

          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-6 md:left-1/2 top-8 bottom-8 w-px bg-gradient-to-b from-teal-500/50 via-teal-500/20 to-transparent -translate-x-px hidden md:block" />

            <div className="space-y-8">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                  variants={fadeUp}
                  className={`flex flex-col md:flex-row gap-8 items-center ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}
                >
                  <div className="flex-1 md:text-right" style={{ textAlign: i % 2 === 1 ? "left" : undefined }}>
                    <div className={`p-7 rounded-2xl bg-[#111827]/80 border border-teal-500/15 hover:border-teal-500/30 hover:shadow-[0_0_24px_-8px_rgba(13,148,136,0.2)] transition-all ${i % 2 === 1 ? "text-left" : "md:text-right"}`}>
                      <div className={`text-xs font-bold text-teal-500 tracking-widest uppercase mb-2`}>Step {step.num}</div>
                      <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                      <p className="text-slate-400 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>

                  {/* Center node */}
                  <div className="flex-shrink-0 w-14 h-14 rounded-full bg-teal-600 border-4 border-[#0a0f1a] flex items-center justify-center shadow-[0_0_20px_-4px_rgba(13,148,136,0.6)] z-10">
                    <step.icon className="w-6 h-6 text-white" />
                  </div>

                  <div className="flex-1 hidden md:block" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials / Social Proof ───────────────────────────── */}
      <section className="relative z-10 py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-xs font-bold text-teal-500 tracking-[0.2em] uppercase mb-3">Social Proof</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-extrabold mb-4">
              Join thousands mapping{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
                their movement
              </span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-6"
          >
            {TESTIMONIALS.map((t) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="p-7 rounded-2xl bg-[#111827]/70 border border-teal-500/10 hover:border-teal-500/25 hover:shadow-[0_0_24px_-8px_rgba(13,148,136,0.2)] transition-all backdrop-blur-sm"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-teal-400 text-teal-400" />
                  ))}
                </div>
                <p className="text-slate-300 leading-relaxed text-sm mb-5">"{t.quote}"</p>
                <div>
                  <p className="font-bold text-sm">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Banner */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="mt-16 p-10 rounded-3xl bg-gradient-to-br from-teal-900/40 to-teal-800/20 border border-teal-500/20 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-transparent pointer-events-none" />
            <h3 className="text-3xl font-extrabold mb-3 relative z-10">Ready to stop guessing?</h3>
            <p className="text-slate-400 mb-8 max-w-md mx-auto relative z-10">Get your personalized corrective routine in under 3 minutes — completely free.</p>
            <Button
              size="lg"
              onClick={handleCTA}
              className="h-13 px-10 text-base font-bold bg-teal-600 hover:bg-teal-500 text-white border-0 shadow-[0_0_30px_-6px_rgba(13,148,136,0.6)] hover:scale-[1.03] transition-all relative z-10"
              data-testid="button-final-cta"
            >
              Start Now — It's Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-10 px-6 border-t border-teal-500/8 bg-[#070c14]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img
            src="https://okvnrbrnubtgplheyavw.supabase.co/storage/v1/object/public/assets/LOGO%20MYOMAP.png"
            alt="MyoMap"
            className="h-8 w-auto opacity-60"
          />
          <p className="text-sm text-slate-600 order-last md:order-none">
            © {new Date().getFullYear()} MyoMap. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-xs text-slate-600">
            <button className="hover:text-slate-400 transition-colors">Terms of Service</button>
            <button className="hover:text-slate-400 transition-colors">Privacy Policy</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
