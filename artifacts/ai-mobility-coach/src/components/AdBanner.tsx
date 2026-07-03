import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

interface AdBannerProps {
  onComplete: () => void;
  seconds?: number;
}

export default function AdBanner({ onComplete, seconds = 5 }: AdBannerProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onComplete();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onComplete]);

  const progress = ((seconds - remaining) / seconds) * 100;

  return (
    <div
      className="w-full max-w-md mx-auto rounded-2xl bg-[#111827]/90 border-2 border-teal-500/40 shadow-[0_0_60px_-15px_rgba(13,148,136,0.4)] p-8 text-center"
      data-testid="ad-banner"
    >
      <div className="w-14 h-14 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center mx-auto mb-4">
        <Megaphone className="w-7 h-7 text-teal-500" />
      </div>
      <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-teal-400 bg-teal-500/10 border border-teal-500/25 rounded-full px-3 py-1 mb-3">
        Ad
      </span>
      <h3 className="text-lg font-extrabold mb-2">Your results are almost ready</h3>
      <p className="text-sm text-slate-400 mb-6">
        Upgrade to MyoMap Pro to skip ads and unlock unlimited assessments.
      </p>

      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
        <div
          className="h-full bg-teal-500 transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-slate-500" data-testid="ad-countdown">
        Revealing results in {remaining}s…
      </p>
    </div>
  );
}
