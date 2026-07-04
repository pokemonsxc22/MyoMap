import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/contexts/UserContext";
import InfoTooltip from "@/components/InfoTooltip";

interface ScoreRow {
  id: string;
  score: number;
  created_at: string;
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000);
    return d.toISOString().slice(0, 10);
  });
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function scoreLabel(n: number): string {
  if (n <= 2) return "Very Poor";
  if (n <= 4) return "Poor";
  if (n === 5) return "Neutral";
  if (n <= 7) return "Good";
  if (n <= 9) return "Great";
  return "Excellent";
}

export default function MobilityScoreCard() {
  const { user } = useUser();
  const userId = user?.id;
  const today = new Date().toISOString().slice(0, 10);

  const [selected, setSelected]         = useState<number | null>(null);
  const [todayEntry, setTodayEntry]     = useState<{ id: string; score: number } | null>(null);
  const [chartData, setChartData]       = useState<{ date: string; score: number }[]>([]);
  const [saving, setSaving]             = useState(false);
  const [loaded, setLoaded]             = useState(false);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);

  const loadScores = async () => {
    if (!supabase || !userId) { setLoaded(true); return; }

    const { data, error } = await supabase
      .from("mobility_scores")
      .select("id, score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) {
      const isMissing = error.message?.includes("does not exist") || error.code === "PGRST205";
      setErrorMsg(
        isMissing
          ? "Run supabase/008_create_mobility_scores.sql in your Supabase SQL Editor to set up this feature."
          : `Failed to load scores: ${error.message}`
      );
      setLoaded(true);
      return;
    }

    const rows = (data ?? []) as ScoreRow[];

    const todayRow = rows.find((r) => r.created_at.slice(0, 10) === today);
    if (todayRow) {
      setTodayEntry({ id: todayRow.id, score: todayRow.score });
      setSelected(todayRow.score);
    }

    const days = getLast7Days();
    const byDay: Record<string, number> = {};
    for (const row of rows) {
      const day = row.created_at.slice(0, 10);
      if (byDay[day] === undefined) byDay[day] = row.score;
    }
    const points = days
      .filter((d) => byDay[d] !== undefined)
      .map((d) => ({ date: shortDate(d), score: byDay[d] }));

    setChartData(points);
    setLoaded(true);
  };

  useEffect(() => {
    void loadScores();
  }, [userId]);

  const handleLog = async () => {
    if (!selected || !supabase || !userId) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      if (todayEntry) {
        const { error } = await supabase
          .from("mobility_scores")
          .update({ score: selected })
          .eq("id", todayEntry.id);
        if (error) throw error;
        setTodayEntry({ id: todayEntry.id, score: selected });
      } else {
        const { data, error } = await supabase
          .from("mobility_scores")
          .insert({ user_id: userId, score: selected })
          .select("id")
          .single();
        if (error) throw error;
        setTodayEntry({ id: (data as { id: string }).id, score: selected });
      }
      await loadScores();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save score";
      const isMissing = msg.includes("does not exist");
      setErrorMsg(
        isMissing
          ? "The mobility_scores table is missing — run supabase/008_create_mobility_scores.sql in Supabase SQL Editor."
          : msg
      );
    } finally {
      setSaving(false);
    }
  };

  const alreadyLogged   = !!todayEntry && selected === todayEntry.score;
  const isUpdate        = !!todayEntry && selected !== null && selected !== todayEntry.score;
  const btnLabel        = saving ? "Saving…" : alreadyLogged ? "Logged ✓" : isUpdate ? "Update Score" : "Log Score";

  return (
    <div className="rounded-2xl bg-[#111827]/80 border border-teal-500/15 p-5 backdrop-blur-sm hover:shadow-[0_0_24px_-8px_rgba(13,148,136,0.2)] transition-shadow">

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-teal-400" />
        <h2 className="font-bold text-sm">Daily Mobility Score</h2>
        <InfoTooltip text="Rate how your body feels today (1 = very poor, 10 = excellent). Scores are saved and charted over time." />
      </div>

      {/* Today's logged score banner */}
      {todayEntry && (
        <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-teal-400 font-bold uppercase tracking-wide mb-0.5">Today&apos;s Score</p>
            <p className="text-2xl font-extrabold text-white leading-none">
              {todayEntry.score}
              <span className="text-sm font-normal text-slate-400 ml-0.5">/10</span>
            </p>
          </div>
          <span className="text-sm font-semibold text-slate-300">{scoreLabel(todayEntry.score)}</span>
        </div>
      )}

      {/* Score selector — 10 clickable buttons */}
      <div className="mb-3">
        <div className="flex gap-1 mb-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setSelected(n)}
              className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all ${
                selected === n
                  ? "text-white shadow-[0_0_12px_-2px_rgba(13,148,136,0.5)] scale-105"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
              style={selected === n ? { backgroundColor: "#0D9488" } : {}}
              aria-label={`Score ${n}`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 px-0.5 select-none">
          <span>Very Poor</span>
          <span>Neutral</span>
          <span>Excellent</span>
        </div>
      </div>

      {/* Log / Update button */}
      <button
        onClick={() => void handleLog()}
        disabled={!selected || saving || alreadyLogged}
        className="w-full h-10 rounded-xl text-sm font-bold transition-all mb-4 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: "#0D9488", color: "white", boxShadow: "0 0 16px -4px rgba(13,148,136,0.45)" }}
      >
        {btnLabel}
      </button>

      {/* Error message */}
      {errorMsg && (
        <p className="text-xs text-red-400 mb-3 leading-relaxed">{errorMsg}</p>
      )}

      {/* Chart / empty state */}
      {loaded && chartData.length === 0 && !errorMsg && (
        <p className="text-xs text-slate-500 text-center py-4">
          No scores logged yet — rate your mobility today
        </p>
      )}

      {chartData.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-2">Last 7 days</p>
          <ResponsiveContainer width="100%" height={96}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[1, 10]}
                ticks={[1, 5, 10]}
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#1E293B",
                  border: "1px solid #0D9488",
                  borderRadius: 8,
                  fontSize: 11,
                  padding: "4px 10px",
                }}
                labelStyle={{ color: "#94a3b8" }}
                itemStyle={{ color: "#0D9488", fontWeight: 700 }}
                formatter={(value: number) => [`${value}/10 — ${scoreLabel(value)}`, "Score"]}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#0D9488"
                strokeWidth={2}
                dot={{ fill: "#0D9488", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#0D9488", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
