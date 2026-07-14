import { useEffect, useMemo, useState, type ReactNode } from "react";
import { format, parseISO, startOfWeek } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useUser } from "../context/AuthContext";
import {
  fetchBodyMetrics,
  fetchFoodEntriesRange,
  fetchProfile,
  fetchWorkoutsRange,
} from "../lib/db";
import { localDate, shiftDate } from "../lib/dates";
import { averageInsight, movingAverage, trendInsight, type DatedValue } from "../lib/insights";
import type { BodyMetric, FoodEntry, Profile, Workout } from "../lib/types";
import Chips from "../components/Chips";
import EmptyState from "../components/EmptyState";

const RANGES = ["30d", "90d", "all"] as const;
type Range = (typeof RANGES)[number];

const AXIS = { fontSize: 10, fill: "var(--muted)" };
const GRID = { stroke: "var(--line)", vertical: false };

function ChartCard({
  title,
  insight,
  footer,
  children,
}: {
  title: string;
  insight: string | null;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card p-5">
      <h2 className="label mb-4">{title}</h2>
      <div className="h-48">{children}</div>
      {footer}
      {insight && <p className="text-xs text-muted mt-3">{insight}</p>}
    </section>
  );
}

const tickDate = (d: string) => format(parseISO(d), "M/d");

export default function Trends() {
  const user = useUser();
  const today = localDate();
  const [range, setRange] = useState<Range>("30d");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  const days = range === "30d" ? 30 : range === "90d" ? 90 : Infinity;
  const fromDate = days === Infinity ? "1970-01-01" : shiftDate(today, -days);

  useEffect(() => {
    void (async () => {
      const [p, m, e, w] = await Promise.all([
        fetchProfile(user.id),
        fetchBodyMetrics(user.id, fromDate),
        fetchFoodEntriesRange(user.id, fromDate),
        fetchWorkoutsRange(user.id, fromDate),
      ]);
      setProfile(p);
      setMetrics(m);
      setEntries(e);
      setWorkouts(w);
    })();
  }, [user.id, fromDate]);

  // 1 & 2 — weight and body fat with 7-day moving average
  const weightData = useMemo(() => {
    const pts: DatedValue[] = metrics
      .filter((m) => m.weight_kg)
      .map((m) => ({ date: m.logged_date, value: m.weight_kg! }));
    const ma = movingAverage(pts);
    return pts.map((p, i) => ({ date: p.date, daily: p.value, avg: ma[i].value }));
  }, [metrics]);

  const bfData = useMemo(() => {
    const pts: DatedValue[] = metrics
      .filter((m) => m.body_fat_pct)
      .map((m) => ({ date: m.logged_date, value: m.body_fat_pct! }));
    const ma = movingAverage(pts);
    return pts.map((p, i) => ({ date: p.date, daily: p.value, avg: ma[i].value }));
  }, [metrics]);

  // 3 & 4 — daily calories and protein vs targets
  const dailyFood = useMemo(() => {
    const byDate = new Map<string, { calories: number; protein: number }>();
    for (const e of entries) {
      const d = byDate.get(e.logged_date) ?? { calories: 0, protein: 0 };
      d.calories += e.total_calories || 0;
      d.protein += e.total_protein_g || 0;
      byDate.set(e.logged_date, d);
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, calories: v.calories, protein: Math.round(v.protein) }));
  }, [entries]);

  // 5 — weekly training volume, stacked minutes by type
  const weekly = useMemo(() => {
    const byWeek = new Map<string, { padel: number; strength: number; other: number }>();
    for (const w of workouts) {
      const wk = format(startOfWeek(parseISO(w.logged_date), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const d = byWeek.get(wk) ?? { padel: 0, strength: 0, other: 0 };
      if (w.type === "padel") d.padel += w.duration_min || 0;
      else if (w.type === "strength") d.strength += w.duration_min || 0;
      else d.other += w.duration_min || 0;
      byWeek.set(wk, d);
    }
    return [...byWeek.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, v]) => ({ week, ...v }));
  }, [workouts]);

  const calorieTarget = profile?.daily_calorie_target ?? null;
  const proteinTarget = profile?.protein_target_g ?? null;

  const weightPts = weightData.map((d) => ({ date: d.date, value: d.daily }));
  const bfPts = bfData.map((d) => ({ date: d.date, value: d.daily }));
  const proteinPts = dailyFood.map((d) => ({ date: d.date, value: d.protein }));
  const caloriePts = dailyFood.map((d) => ({ date: d.date, value: d.calories }));

  const weeklyAvgMin =
    weekly.length > 0
      ? Math.round(
          weekly.reduce((s, w) => s + w.padel + w.strength + w.other, 0) / weekly.length
        )
      : 0;

  const noData =
    weightData.length === 0 && bfData.length === 0 && dailyFood.length === 0 && weekly.length === 0;

  const tooltipStyle = {
    fontSize: 12,
    border: "1px solid var(--line)",
    borderRadius: 8,
    background: "var(--bg)",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-medium">Trends</h1>
        <Chips options={RANGES} value={range} onChange={setRange} />
      </div>

      {noData ? (
        <EmptyState message="Nothing to chart yet — log a meal, a workout, or a weigh-in to see trends here." />
      ) : (
        <>
          <ChartCard title="Weight" insight={trendInsight(weightPts, "kg", days)}>
            {weightData.length === 0 ? (
              <p className="text-muted text-sm pt-16 text-center">Log your first weigh-in on the Body tab.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={tickDate} minTickGap={28} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={tickDate} />
                  <Line dataKey="daily" stroke="var(--muted)" strokeWidth={0} dot={{ r: 1.5, fill: "var(--muted)", strokeWidth: 0 }} isAnimationActive={false} />
                  <Line dataKey="avg" stroke="var(--accent)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Body fat %" insight={trendInsight(bfPts, "pt", days)}>
            {bfData.length === 0 ? (
              <p className="text-muted text-sm pt-16 text-center">Log body fat % on the Body tab.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bfData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={tickDate} minTickGap={28} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={tickDate} />
                  <Line dataKey="daily" stroke="var(--muted)" strokeWidth={0} dot={{ r: 1.5, fill: "var(--muted)", strokeWidth: 0 }} isAnimationActive={false} />
                  <Line dataKey="avg" stroke="var(--accent)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Daily calories"
            insight={averageInsight(caloriePts, "intake", " kcal", calorieTarget)}
          >
            {dailyFood.length === 0 ? (
              <p className="text-muted text-sm pt-16 text-center">Log your first meal on the Food tab.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyFood} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={tickDate} minTickGap={28} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={tickDate} cursor={{ fill: "var(--surface)" }} />
                  {calorieTarget && (
                    <ReferenceLine y={calorieTarget} stroke="var(--ink)" strokeDasharray="4 4" strokeWidth={1} />
                  )}
                  <Bar dataKey="calories" fill="var(--accent)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Protein per day"
            insight={averageInsight(proteinPts, "protein", "g", proteinTarget)}
          >
            {dailyFood.length === 0 ? (
              <p className="text-muted text-sm pt-16 text-center">Log your first meal on the Food tab.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyFood} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={tickDate} minTickGap={28} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={tickDate} cursor={{ fill: "var(--surface)" }} />
                  {proteinTarget && (
                    <ReferenceLine y={proteinTarget} stroke="var(--ink)" strokeDasharray="4 4" strokeWidth={1} />
                  )}
                  <Bar dataKey="protein" fill="var(--accent)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Weekly training volume"
            insight={weekly.length > 0 ? `Avg ${weeklyAvgMin} min per week` : null}
            footer={
              weekly.length > 0 ? (
                <div className="flex gap-4 mt-2">
                  {[
                    ["Padel", "var(--accent)"],
                    ["Strength", "#7A9285"],
                    ["Other", "var(--line)"],
                  ].map(([label, color]) => (
                    <span key={label} className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                      {label}
                    </span>
                  ))}
                </div>
              ) : undefined
            }
          >
            {weekly.length === 0 ? (
              <p className="text-muted text-sm pt-16 text-center">Log your first workout on the Train tab.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={tickDate} minTickGap={28} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(d) => `Week of ${tickDate(String(d))}`} cursor={{ fill: "var(--surface)" }} />
                  <Bar dataKey="padel" stackId="v" fill="var(--accent)" isAnimationActive={false} />
                  <Bar dataKey="strength" stackId="v" fill="#7A9285" isAnimationActive={false} />
                  <Bar dataKey="other" stackId="v" fill="var(--line)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
}
