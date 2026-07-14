import { useCallback, useEffect, useState } from "react";
import { useUser } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { fetchWorkouts, insertWorkout } from "../lib/db";
import { estimateCalories } from "../lib/calories";
import { localDate } from "../lib/dates";
import type { Intensity, Workout } from "../lib/types";
import DaySelector from "../components/DaySelector";
import Chips from "../components/Chips";
import WorkoutSheet from "../components/WorkoutSheet";
import EmptyState from "../components/EmptyState";
import { useWorkoutSupport } from "../hooks/useWorkoutSupport";

const PADEL_DURATIONS = [60, 90, 120, 150, 180] as const;
const INTENSITIES: readonly Intensity[] = ["light", "moderate", "hard"];

export default function Train() {
  const user = useUser();
  const toast = useToast();
  const [date, setDate] = useState(localDate());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Workout | null>(null);

  // Padel quick-log state — sensible defaults preselected so logging is one tap.
  const [padelDuration, setPadelDuration] = useState<number>(90);
  const [padelIntensity, setPadelIntensity] = useState<Intensity>("moderate");
  const [padelSaving, setPadelSaving] = useState(false);

  const { weightKg, exerciseNames, refresh: refreshSupport } = useWorkoutSupport();

  const load = useCallback(async () => {
    setWorkouts(await fetchWorkouts(user.id, date));
  }, [user.id, date]);

  useEffect(() => {
    void load();
  }, [load]);

  const logPadel = async () => {
    if (padelSaving) return;
    setPadelSaving(true);
    const calories = estimateCalories("padel", padelIntensity, padelDuration, weightKg);
    // Optimistic: show it immediately, roll back if the insert fails.
    const optimistic: Workout = {
      id: `optimistic-${Date.now()}`,
      user_id: user.id,
      created_at: new Date().toISOString(),
      logged_date: date,
      type: "padel",
      duration_min: padelDuration,
      intensity: padelIntensity,
      calories_burned: calories,
      notes: null,
      exercises: null,
    };
    setWorkouts((w) => [...w, optimistic]);
    try {
      await insertWorkout(user.id, {
        logged_date: date,
        type: "padel",
        duration_min: padelDuration,
        intensity: padelIntensity,
        calories_burned: calories,
        notes: null,
        exercises: null,
      });
      await load();
    } catch {
      setWorkouts((w) => w.filter((x) => x.id !== optimistic.id));
      toast("Couldn't log padel — try again.");
    } finally {
      setPadelSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <DaySelector date={date} onChange={setDate} />

      <section className="card p-5 space-y-4">
        <div className="flex justify-between items-baseline">
          <h2 className="font-display text-xl font-medium">Padel</h2>
          <span className="label">
            ~{estimateCalories("padel", padelIntensity, padelDuration, weightKg)} kcal
          </span>
        </div>
        <Chips
          options={PADEL_DURATIONS}
          value={padelDuration}
          onChange={setPadelDuration}
          format={(v) => `${v}′`}
        />
        <Chips options={INTENSITIES} value={padelIntensity} onChange={setPadelIntensity} />
        <button className="btn-primary" onClick={logPadel} disabled={padelSaving}>
          {padelSaving ? "Logging…" : "Log padel"}
        </button>
      </section>

      <button
        className="btn-ghost"
        onClick={() => {
          setEditing(null);
          setSheetOpen(true);
        }}
      >
        Log strength / cardio / other
      </button>

      <section className="space-y-2">
        <span className="label">Logged on this day</span>
        {workouts.length === 0 ? (
          <EmptyState message="No training logged for this day." />
        ) : (
          workouts.map((w) => (
            <button
              key={w.id}
              className="card w-full text-left px-5 py-4"
              onClick={() => {
                if (w.id.startsWith("optimistic-")) return;
                setEditing(w);
                setSheetOpen(true);
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium capitalize">{w.type}</span>
                  <span className="text-muted text-sm ml-2 capitalize">{w.intensity}</span>
                </div>
                <div className="text-right">
                  <div className="stat text-lg">{w.duration_min} min</div>
                  <div className="label">{w.calories_burned ?? 0} kcal</div>
                </div>
              </div>
              {w.exercises && w.exercises.length > 0 && (
                <p className="text-xs text-muted mt-2">
                  {w.exercises
                    .map((ex) => `${ex.name} ×${ex.sets.length}`)
                    .join(" · ")}
                </p>
              )}
              {w.notes && <p className="text-xs text-muted mt-1">{w.notes}</p>}
            </button>
          ))
        )}
      </section>

      <WorkoutSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        date={date}
        weightKg={weightKg}
        exerciseNames={exerciseNames}
        editing={editing}
        onChanged={() => {
          void load();
          void refreshSupport();
        }}
      />
    </div>
  );
}
