import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { useUser } from "../context/AuthContext";
import {
  fetchBodyMetrics,
  fetchFoodEntries,
  fetchProfile,
  fetchWorkouts,
} from "../lib/db";
import { localDate, shiftDate } from "../lib/dates";
import type { BodyMetric, FoodEntry, Profile, Workout } from "../lib/types";
import CalorieRing from "../components/CalorieRing";
import MacroBar from "../components/MacroBar";
import Sheet from "../components/Sheet";
import FoodComposer from "../components/FoodComposer";
import WorkoutSheet from "../components/WorkoutSheet";
import { useWorkoutSupport } from "../hooks/useWorkoutSupport";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Today() {
  const user = useUser();
  const today = localDate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [foodOpen, setFoodOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);

  const { weightKg, exerciseNames, refresh: refreshSupport } = useWorkoutSupport();

  const load = useCallback(async () => {
    const [p, e, w, m] = await Promise.all([
      fetchProfile(user.id),
      fetchFoodEntries(user.id, today),
      fetchWorkouts(user.id, today),
      fetchBodyMetrics(user.id),
    ]);
    setProfile(p);
    setEntries(e);
    setWorkouts(w);
    setMetrics(m);
  }, [user.id, today]);

  useEffect(() => {
    void load();
  }, [load]);

  const eaten = entries.reduce((s, e) => s + (e.total_calories || 0), 0);
  const burned = workouts.reduce((s, w) => s + (w.calories_burned || 0), 0);
  const protein = entries.reduce((s, e) => s + (e.total_protein_g || 0), 0);
  const carbs = entries.reduce((s, e) => s + (e.total_carbs_g || 0), 0);
  const fat = entries.reduce((s, e) => s + (e.total_fat_g || 0), 0);

  const latest = useMemo(() => [...metrics].reverse().find((m) => m.weight_kg || m.body_fat_pct), [metrics]);
  const weekAgo = useMemo(() => {
    const cutoff = shiftDate(today, -7);
    return [...metrics].reverse().find((m) => m.logged_date <= cutoff && (m.weight_kg || m.body_fat_pct));
  }, [metrics, today]);

  const weightDelta =
    latest?.weight_kg && weekAgo?.weight_kg
      ? Math.round((latest.weight_kg - weekAgo.weight_kg) * 10) / 10
      : null;
  const bfDelta =
    latest?.body_fat_pct && weekAgo?.body_fat_pct
      ? Math.round((latest.body_fat_pct - weekAgo.body_fat_pct) * 10) / 10
      : null;

  const delta = (d: number | null, unit: string) => {
    if (d === null) return null;
    const sign = d > 0 ? "+" : "";
    return (
      <span className={`text-xs ${d <= 0 ? "text-accent" : "text-over"}`}>
        {sign}
        {d} {unit} / 7d
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <p className="label">{format(parseISO(today), "EEEE, MMMM d")}</p>
          <h1 className="font-display text-3xl font-medium mt-1">
            {greeting()}
            {profile?.display_name ? `, ${profile.display_name}` : ""}
          </h1>
        </div>
        <Link to="/settings" aria-label="Settings" className="text-muted p-2 -mr-2 mt-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
          </svg>
        </Link>
      </header>

      <section className="card px-6 py-8">
        <CalorieRing eaten={eaten} burned={burned} target={profile?.daily_calorie_target ?? null} />
      </section>

      <section className="card p-5 space-y-4">
        <MacroBar label="Protein" value={protein} target={profile?.protein_target_g ?? null} />
        <MacroBar label="Carbs" value={carbs} target={profile?.carbs_target_g ?? null} />
        <MacroBar label="Fat" value={fat} target={profile?.fat_target_g ?? null} />
      </section>

      {workouts.length > 0 && (
        <section className="space-y-2">
          <span className="label">Training today</span>
          {workouts.map((w) => (
            <div key={w.id} className="card px-5 py-4 flex items-center justify-between">
              <div>
                <span className="font-medium capitalize">{w.type}</span>
                <span className="text-muted text-sm ml-2 capitalize">{w.intensity}</span>
              </div>
              <div className="text-right">
                <div className="stat text-lg">{w.duration_min} min</div>
                <div className="label">{w.calories_burned ?? 0} kcal</div>
              </div>
            </div>
          ))}
        </section>
      )}

      {latest && (
        <section className="card px-5 py-4 flex justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="stat text-2xl">{latest.weight_kg ?? "—"}</span>
              <span className="text-muted text-sm">kg</span>
            </div>
            <div className="mt-0.5">{delta(weightDelta, "kg") ?? <span className="label">weight</span>}</div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-2 justify-end">
              <span className="stat text-2xl">{latest.body_fat_pct ?? "—"}</span>
              <span className="text-muted text-sm">% fat</span>
            </div>
            <div className="mt-0.5">{delta(bfDelta, "pt") ?? <span className="label">body fat</span>}</div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <button className="btn-primary" onClick={() => setFoodOpen(true)}>
          Log food
        </button>
        <button className="btn-ghost" onClick={() => setWorkoutOpen(true)}>
          Log workout
        </button>
      </section>

      <Sheet open={foodOpen} onClose={() => setFoodOpen(false)} title="Log food">
        <FoodComposer
          date={today}
          autoFocus
          onSaved={() => {
            setFoodOpen(false);
            void load();
          }}
        />
      </Sheet>

      <WorkoutSheet
        open={workoutOpen}
        onClose={() => setWorkoutOpen(false)}
        date={today}
        weightKg={weightKg}
        exerciseNames={exerciseNames}
        onChanged={() => {
          void load();
          void refreshSupport();
        }}
      />
    </div>
  );
}
