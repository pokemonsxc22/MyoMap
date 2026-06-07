import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Activity, ChevronLeft, FlipHorizontal2 } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────
type View = "front" | "back";

// Which SVG region IDs to highlight for each pain area, per view
const MUSCLE_MAP: Record<string, { front: string[]; back: string[] }> = {
  "lower-back":     { front: [],                                     back: ["b-lower-back"] },
  "mid-back":       { front: [],                                     back: ["b-mid-back-l","b-mid-back-r"] },
  "upper-back":     { front: [],                                     back: ["b-upper-back-l","b-upper-back-r","b-traps-l","b-traps-r"] },
  "neck-shoulders": { front: ["f-trap-l","f-trap-r","f-delt-l","f-delt-r"], back: ["b-traps-l","b-traps-r","b-rdelt-l","b-rdelt-r"] },
  "chest":          { front: ["f-pec-l","f-pec-r"],                  back: [] },
  "arms":           { front: ["f-bicep-l","f-bicep-r","f-fore-l","f-fore-r"], back: ["b-tricep-l","b-tricep-r","b-fore-l","b-fore-r"] },
  "abs-core":       { front: ["f-abs-l","f-abs-r","f-obliq-l","f-obliq-r"], back: [] },
  "quads":          { front: ["f-quad-l","f-quad-r"],                back: [] },
  "hamstrings":     { front: [],                                     back: ["b-ham-l","b-ham-r"] },
  "calves":         { front: ["f-calf-l","f-calf-r"],                back: ["b-calf-l","b-calf-r"] },
  "knees":          { front: ["f-knee-l","f-knee-r"],                back: ["b-knee-l","b-knee-r"] },
  "hips":           { front: ["f-hip-l","f-hip-r"],                  back: ["b-glute-l","b-glute-r"] },
};

// Which view to open first for each area
const BACK_PRIMARY = new Set(["lower-back","mid-back","upper-back","hamstrings"]);

const PAIN_LABELS: Record<string, string> = {
  "lower-back":"Lower Back","mid-back":"Mid Back","upper-back":"Upper Back",
  "neck-shoulders":"Neck & Shoulders","chest":"Chest","arms":"Arms",
  "abs-core":"Abs & Core","quads":"Quads","hamstrings":"Hamstrings",
  "calves":"Calves","knees":"Knees","hips":"Hips",
};

// ── Style helpers ─────────────────────────────────────────────────────
const BASE_FILL   = "rgba(148,163,184,0.10)";
const BASE_STROKE = "rgba(148,163,184,0.40)";
const HL_FILL     = "rgba(59,130,246,0.35)";
const HL_STROKE   = "#3b82f6";
const BODY_FILL   = "rgba(15,23,42,0.70)";
const OUTLINE_CLR = "rgba(148,163,184,0.20)";

function styleFor(id: string, highlighted: Set<string>) {
  const on = highlighted.has(id);
  return {
    fill:            on ? HL_FILL   : BASE_FILL,
    stroke:          on ? HL_STROKE : BASE_STROKE,
    strokeWidth:     on ? 1.5       : 0.8,
    filter:          on ? "url(#glow)" : undefined,
    transition:      "all 0.3s ease",
    cursor:          "default" as const,
  };
}

// ── Front-view SVG ────────────────────────────────────────────────────
function FrontBody({ highlighted }: { highlighted: Set<string> }) {
  const s = (id: string) => styleFor(id, highlighted);
  return (
    <svg viewBox="0 0 160 430" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      <defs>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* ── Body silhouette ── */}
      <path
        d="M 80 8
           C 56 8 54 28 54 42 C 54 58 62 68 74 70
           L 66 72 C 54 76 44 82 36 88
           C 22 94 14 104 14 120 C 14 132 18 140 28 144
           L 28 210 C 28 242 36 254 50 256
           L 44 268 C 38 282 34 306 36 328 C 38 344 46 354 56 356
           L 50 360 C 44 372 40 390 42 410 C 44 420 52 426 62 424
           C 72 422 78 414 78 402 L 82 402
           C 82 414 88 422 98 424 C 108 426 116 420 118 410
           C 120 390 116 372 110 360 L 104 356
           C 114 354 122 344 124 328 C 126 306 122 282 116 268
           L 110 256 C 124 254 132 242 132 210
           L 132 144 C 142 140 146 132 146 120
           C 146 104 138 94 124 88 C 116 82 106 76 94 72
           L 86 70 C 98 68 106 58 106 42 C 106 28 104 8 80 8 Z"
        fill={BODY_FILL} stroke={OUTLINE_CLR} strokeWidth="1"
      />

      {/* ── Head ── */}
      <ellipse cx="80" cy="40" rx="26" ry="32" fill={BODY_FILL} stroke={OUTLINE_CLR} strokeWidth="1"/>

      {/* ── Neck / Traps ── */}
      <path id="f-trap-l" d="M 66 70 C 58 74 50 82 44 90 L 54 90 C 58 84 64 78 72 74 Z" {...s("f-trap-l")}/>
      <path id="f-trap-r" d="M 94 70 C 102 74 108 78 106 90 L 116 90 C 110 82 102 74 94 70 Z" {...s("f-trap-r")}/>
      {/* Neck */}
      <rect x="68" y="68" width="24" height="14" rx="4" fill={BODY_FILL} stroke={OUTLINE_CLR} strokeWidth="0.8"/>

      {/* ── Shoulders / Deltoids ── */}
      <path id="f-delt-l" d="M 30 90 C 20 96 14 108 14 122 C 14 132 20 140 30 142 C 38 144 44 138 46 130 L 50 90 Z" {...s("f-delt-l")}/>
      <path id="f-delt-r" d="M 130 90 C 140 96 146 108 146 122 C 146 132 140 140 130 142 C 122 144 116 138 114 130 L 110 90 Z" {...s("f-delt-r")}/>

      {/* ── Chest (Pectorals) ── */}
      <path id="f-pec-l"
        d="M 52 90 C 52 104 50 120 52 134 C 54 142 62 148 74 148 L 80 148 L 80 90 Z"
        {...s("f-pec-l")}/>
      <path id="f-pec-r"
        d="M 108 90 C 108 104 110 120 108 134 C 106 142 98 148 86 148 L 80 148 L 80 90 Z"
        {...s("f-pec-r")}/>

      {/* ── Biceps ── */}
      <path id="f-bicep-l"
        d="M 28 142 C 22 152 18 166 18 182 C 18 194 22 202 30 204 C 38 206 46 200 50 190 C 54 180 52 164 48 150 L 42 142 Z"
        {...s("f-bicep-l")}/>
      <path id="f-bicep-r"
        d="M 132 142 C 138 152 142 166 142 182 C 142 194 138 202 130 204 C 122 206 114 200 110 190 C 106 180 108 164 112 150 L 118 142 Z"
        {...s("f-bicep-r")}/>

      {/* ── Forearms ── */}
      <path id="f-fore-l"
        d="M 26 208 C 20 220 16 238 18 256 C 20 264 26 268 34 268 C 42 268 48 264 50 256 C 52 246 50 228 46 212 L 38 208 Z"
        {...s("f-fore-l")}/>
      <path id="f-fore-r"
        d="M 134 208 C 140 220 144 238 142 256 C 140 264 134 268 126 268 C 118 268 112 264 110 256 C 108 246 110 228 114 212 L 122 208 Z"
        {...s("f-fore-r")}/>

      {/* ── Abs ── */}
      <path id="f-abs-l"
        d="M 58 150 C 54 162 52 178 54 196 L 80 196 L 80 150 Z"
        {...s("f-abs-l")}/>
      <path id="f-abs-r"
        d="M 102 150 C 106 162 108 178 106 196 L 80 196 L 80 150 Z"
        {...s("f-abs-r")}/>
      {/* Ab separating line (decorative) */}
      <line x1="80" y1="150" x2="80" y2="196" stroke={OUTLINE_CLR} strokeWidth="0.6"/>
      <line x1="55" y1="168" x2="105" y2="168" stroke={OUTLINE_CLR} strokeWidth="0.6"/>
      <line x1="54" y1="182" x2="106" y2="182" stroke={OUTLINE_CLR} strokeWidth="0.6"/>

      {/* ── Obliques ── */}
      <path id="f-obliq-l"
        d="M 48 150 C 42 162 38 180 40 200 C 42 210 48 216 56 216 L 58 196 C 56 180 56 162 58 150 Z"
        {...s("f-obliq-l")}/>
      <path id="f-obliq-r"
        d="M 112 150 C 118 162 122 180 120 200 C 118 210 112 216 104 216 L 102 196 C 104 180 104 162 102 150 Z"
        {...s("f-obliq-r")}/>

      {/* ── Hips ── */}
      <path id="f-hip-l"
        d="M 42 218 C 36 228 34 242 36 256 L 56 258 L 62 218 Z"
        {...s("f-hip-l")}/>
      <path id="f-hip-r"
        d="M 118 218 C 124 228 126 242 124 256 L 104 258 L 98 218 Z"
        {...s("f-hip-r")}/>

      {/* ── Quads ── */}
      <path id="f-quad-l"
        d="M 40 260 C 34 276 30 300 32 322 C 34 336 42 344 54 344 C 66 344 74 336 78 322 L 80 260 Z"
        {...s("f-quad-l")}/>
      <path id="f-quad-r"
        d="M 120 260 C 126 276 130 300 128 322 C 126 336 118 344 106 344 C 94 344 86 336 82 322 L 80 260 Z"
        {...s("f-quad-r")}/>

      {/* ── Knees ── */}
      <ellipse id="f-knee-l" cx="58" cy="352" rx="18" ry="12" {...s("f-knee-l")}/>
      <ellipse id="f-knee-r" cx="102" cy="352" rx="18" ry="12" {...s("f-knee-r")}/>

      {/* ── Calves (tibialis) ── */}
      <path id="f-calf-l"
        d="M 42 366 C 36 378 34 398 36 414 C 38 422 46 426 56 424 C 66 422 72 414 74 404 C 76 390 74 370 70 358 L 58 364 Z"
        {...s("f-calf-l")}/>
      <path id="f-calf-r"
        d="M 118 366 C 124 378 126 398 124 414 C 122 422 114 426 104 424 C 94 422 88 414 86 404 C 84 390 86 370 90 358 L 102 364 Z"
        {...s("f-calf-r")}/>

      {/* ── Label ── */}
    </svg>
  );
}

// ── Back-view SVG ─────────────────────────────────────────────────────
function BackBody({ highlighted }: { highlighted: Set<string> }) {
  const s = (id: string) => styleFor(id, highlighted);
  return (
    <svg viewBox="0 0 160 430" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      <defs>
        <filter id="glow-b" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* ── Body silhouette (same shape as front) ── */}
      <path
        d="M 80 8
           C 56 8 54 28 54 42 C 54 58 62 68 74 70
           L 66 72 C 54 76 44 82 36 88
           C 22 94 14 104 14 120 C 14 132 18 140 28 144
           L 28 210 C 28 242 36 254 50 256
           L 44 268 C 38 282 34 306 36 328 C 38 344 46 354 56 356
           L 50 360 C 44 372 40 390 42 410 C 44 420 52 426 62 424
           C 72 422 78 414 78 402 L 82 402
           C 82 414 88 422 98 424 C 108 426 116 420 118 410
           C 120 390 116 372 110 360 L 104 356
           C 114 354 122 344 124 328 C 126 306 122 282 116 268
           L 110 256 C 124 254 132 242 132 210
           L 132 144 C 142 140 146 132 146 120
           C 146 104 138 94 124 88 C 116 82 106 76 94 72
           L 86 70 C 98 68 106 58 106 42 C 106 28 104 8 80 8 Z"
        fill={BODY_FILL} stroke={OUTLINE_CLR} strokeWidth="1"
      />
      <ellipse cx="80" cy="40" rx="26" ry="32" fill={BODY_FILL} stroke={OUTLINE_CLR} strokeWidth="1"/>
      <rect x="68" y="68" width="24" height="14" rx="4" fill={BODY_FILL} stroke={OUTLINE_CLR} strokeWidth="0.8"/>

      {/* ── Upper Traps (neck/shoulders) ── */}
      <path id="b-traps-l"
        d="M 68 70 C 58 74 48 82 42 90 L 52 90 C 56 84 62 78 70 74 Z"
        {...s("b-traps-l")} filter={highlighted.has("b-traps-l") ? "url(#glow-b)" : undefined}/>
      <path id="b-traps-r"
        d="M 92 70 C 102 74 108 78 108 90 L 118 90 C 112 82 102 74 92 70 Z"
        {...s("b-traps-r")} filter={highlighted.has("b-traps-r") ? "url(#glow-b)" : undefined}/>

      {/* ── Rear Deltoids ── */}
      <path id="b-rdelt-l"
        d="M 30 90 C 20 96 14 108 14 122 C 14 132 20 140 30 142 C 38 144 44 138 46 130 L 50 90 Z"
        {...s("b-rdelt-l")} filter={highlighted.has("b-rdelt-l") ? "url(#glow-b)" : undefined}/>
      <path id="b-rdelt-r"
        d="M 130 90 C 140 96 146 108 146 122 C 146 132 140 140 130 142 C 122 144 116 138 114 130 L 110 90 Z"
        {...s("b-rdelt-r")} filter={highlighted.has("b-rdelt-r") ? "url(#glow-b)" : undefined}/>

      {/* ── Upper Back (rhomboids / upper traps) ── */}
      <path id="b-upper-back-l"
        d="M 52 90 C 52 104 50 120 52 132 C 54 140 60 146 74 148 L 80 148 L 80 90 Z"
        {...s("b-upper-back-l")} filter={highlighted.has("b-upper-back-l") ? "url(#glow-b)" : undefined}/>
      <path id="b-upper-back-r"
        d="M 108 90 C 108 104 110 120 108 132 C 106 140 100 146 86 148 L 80 148 L 80 90 Z"
        {...s("b-upper-back-r")} filter={highlighted.has("b-upper-back-r") ? "url(#glow-b)" : undefined}/>

      {/* ── Triceps ── */}
      <path id="b-tricep-l"
        d="M 28 142 C 22 152 18 166 18 182 C 18 194 22 202 30 204 C 38 206 46 200 50 190 C 54 180 52 164 48 150 L 40 142 Z"
        {...s("b-tricep-l")} filter={highlighted.has("b-tricep-l") ? "url(#glow-b)" : undefined}/>
      <path id="b-tricep-r"
        d="M 132 142 C 138 152 142 166 142 182 C 142 194 138 202 130 204 C 122 206 114 200 110 190 C 106 180 108 164 112 150 L 120 142 Z"
        {...s("b-tricep-r")} filter={highlighted.has("b-tricep-r") ? "url(#glow-b)" : undefined}/>

      {/* ── Rear Forearms ── */}
      <path id="b-fore-l"
        d="M 26 208 C 20 220 16 238 18 256 C 20 264 26 268 34 268 C 42 268 48 264 50 256 C 52 246 50 228 46 212 L 36 208 Z"
        {...s("b-fore-l")} filter={highlighted.has("b-fore-l") ? "url(#glow-b)" : undefined}/>
      <path id="b-fore-r"
        d="M 134 208 C 140 220 144 238 142 256 C 140 264 134 268 126 268 C 118 268 112 264 110 256 C 108 246 110 228 114 212 L 124 208 Z"
        {...s("b-fore-r")} filter={highlighted.has("b-fore-r") ? "url(#glow-b)" : undefined}/>

      {/* ── Mid Back (lats) ── */}
      <path id="b-mid-back-l"
        d="M 48 150 C 40 166 36 186 40 208 C 44 218 52 222 62 220 L 66 218 L 68 150 Z"
        {...s("b-mid-back-l")} filter={highlighted.has("b-mid-back-l") ? "url(#glow-b)" : undefined}/>
      <path id="b-mid-back-r"
        d="M 112 150 C 120 166 124 186 120 208 C 116 218 108 222 98 220 L 94 218 L 92 150 Z"
        {...s("b-mid-back-r")} filter={highlighted.has("b-mid-back-r") ? "url(#glow-b)" : undefined}/>

      {/* ── Lower Back (erector spinae) ── */}
      <path id="b-lower-back"
        d="M 62 220 C 58 232 56 246 58 260 L 80 262 L 102 260 C 104 246 102 232 98 220 L 80 218 Z"
        {...s("b-lower-back")} filter={highlighted.has("b-lower-back") ? "url(#glow-b)" : undefined}/>

      {/* ── Glutes ── */}
      <path id="b-glute-l"
        d="M 42 262 C 36 274 34 290 36 306 C 38 316 46 322 58 322 L 70 318 L 76 262 Z"
        {...s("b-glute-l")} filter={highlighted.has("b-glute-l") ? "url(#glow-b)" : undefined}/>
      <path id="b-glute-r"
        d="M 118 262 C 124 274 126 290 124 306 C 122 316 114 322 102 322 L 90 318 L 84 262 Z"
        {...s("b-glute-r")} filter={highlighted.has("b-glute-r") ? "url(#glow-b)" : undefined}/>

      {/* ── Hamstrings ── */}
      <path id="b-ham-l"
        d="M 38 328 C 32 344 30 368 32 386 C 34 398 42 406 54 404 C 66 402 74 394 76 380 L 78 328 Z"
        {...s("b-ham-l")} filter={highlighted.has("b-ham-l") ? "url(#glow-b)" : undefined}/>
      <path id="b-ham-r"
        d="M 122 328 C 128 344 130 368 128 386 C 126 398 118 406 106 404 C 94 402 86 394 84 380 L 82 328 Z"
        {...s("b-ham-r")} filter={highlighted.has("b-ham-r") ? "url(#glow-b)" : undefined}/>

      {/* ── Back Knees ── */}
      <ellipse id="b-knee-l" cx="58" cy="348" rx="18" ry="12" {...s("b-knee-l")} filter={highlighted.has("b-knee-l") ? "url(#glow-b)" : undefined}/>
      <ellipse id="b-knee-r" cx="102" cy="348" rx="18" ry="12" {...s("b-knee-r")} filter={highlighted.has("b-knee-r") ? "url(#glow-b)" : undefined}/>

      {/* ── Back Calves (gastrocnemius) ── */}
      <path id="b-calf-l"
        d="M 40 362 C 34 376 30 398 34 414 C 36 422 44 426 54 424 C 64 422 72 414 74 402 L 76 362 Z"
        {...s("b-calf-l")} filter={highlighted.has("b-calf-l") ? "url(#glow-b)" : undefined}/>
      <path id="b-calf-r"
        d="M 120 362 C 126 376 130 398 126 414 C 124 422 116 426 106 424 C 96 422 88 414 86 402 L 84 362 Z"
        {...s("b-calf-r")} filter={highlighted.has("b-calf-r") ? "url(#glow-b)" : undefined}/>

    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function Visual() {
  const [, setLocation] = useLocation();
  const [painArea, setPainArea] = useState("lower-back");
  const [view, setView] = useState<View>("front");

  useEffect(() => {
    let area = "lower-back";
    try {
      const stored = sessionStorage.getItem("mobilityFormData");
      if (stored) {
        const d = JSON.parse(stored) as { painArea?: string };
        if (d.painArea) area = d.painArea;
      }
    } catch { /* ignore */ }
    setPainArea(area);
    setView(BACK_PRIMARY.has(area) ? "back" : "front");
  }, []);

  const highlighted = new Set([
    ...(MUSCLE_MAP[painArea]?.front ?? []),
    ...(MUSCLE_MAP[painArea]?.back  ?? []),
  ]);

  const frontHighlighted = new Set(MUSCLE_MAP[painArea]?.front ?? []);
  const backHighlighted  = new Set(MUSCLE_MAP[painArea]?.back  ?? []);

  const hasBack  = (MUSCLE_MAP[painArea]?.back  ?? []).length > 0;
  const hasFront = (MUSCLE_MAP[painArea]?.front ?? []).length > 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg,#060c18 0%,#0a1220 60%,#060c18 100%)" }}
    >
      {/* ── Top Nav ── */}
      <nav className="w-full border-b border-white/10 bg-black/30 backdrop-blur-xl z-20">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm tracking-tight">AI Mobility Coach</span>
          </div>
          <button
            onClick={() => setLocation("/results")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
            data-testid="button-back-results"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Results
          </button>
        </div>
      </nav>

      {/* ── Content ── */}
      <div className="flex-1 flex flex-col items-center px-4 py-8 max-w-2xl mx-auto w-full">

        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-xs font-semibold text-primary tracking-widest uppercase block mb-2">
            Body Visual
          </span>
          <h1 className="text-2xl font-black">
            {PAIN_LABELS[painArea] ?? painArea}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Highlighted region shown in blue
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center gap-1.5 bg-secondary/40 border border-border/50 rounded-xl p-1 mb-6">
          <button
            onClick={() => setView("front")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              view === "front"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="toggle-front"
          >
            Front View
            {hasFront && view !== "front" && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
          <button
            onClick={() => setView("back")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              view === "back"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="toggle-back"
          >
            <FlipHorizontal2 className="w-3.5 h-3.5" />
            Back View
            {hasBack && view !== "back" && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
        </div>

        {/* SVG Diagram — height-first so it never overflows the viewport */}
        <div className="w-full flex items-center justify-center">
          <div
            className="rounded-2xl border border-white/10 overflow-hidden"
            style={{
              background: "rgba(10,18,32,0.8)",
              height: "min(58vh, 480px)",
              aspectRatio: "160 / 430",
            }}
          >
            {view === "front"
              ? <FrontBody highlighted={frontHighlighted} />
              : <BackBody  highlighted={backHighlighted}  />
            }
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded border" style={{ background: BASE_FILL, borderColor: BASE_STROKE }} />
            Muscle group
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded border" style={{ background: HL_FILL, borderColor: HL_STROKE }} />
            Affected area
          </div>
          {hasFront && hasBack && (
            <div className="flex items-center gap-2 text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Appears in both views
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
