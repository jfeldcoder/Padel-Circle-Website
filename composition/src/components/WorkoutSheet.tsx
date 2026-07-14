import { useEffect, useMemo, useState } from "react";
import type { Exercise, Intensity, Workout, WorkoutType } from "../lib/types";
import { deleteWorkout, insertWorkout, updateWorkout } from "../lib/db";
import { estimateCalories } from "../lib/calories";
import { useUser } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Chips from "./Chips";
import Sheet from "./Sheet";

const TYPES: readonly WorkoutType[] = ["padel", "strength", "cardio", "mobility", "other"];
const INTENSITIES: readonly Intensity[] = ["light", "moderate", "hard"];
const PADEL_DURATIONS = [60, 90, 120, 150, 180] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  date: string;
  weightKg: number | null;
  exerciseNames: string[];
  editing?: Workout | null;
  onChanged: () => void;
}

export default function WorkoutSheet({
  open,
  onClose,
  date,
  weightKg,
  exerciseNames,
  editing,
  onChanged,
}: Props) {
  const user = useUser();
  const toast = useToast();

  const [type, setType] = useState<WorkoutType>("padel");
  const [duration, setDuration] = useState(90);
  const [intensity, setIntensity] = useState<Intensity>("moderate");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setDuration(editing.duration_min);
      setIntensity(editing.intensity);
      setNotes(editing.notes ?? "");
      setExercises(editing.exercises ?? []);
    } else {
      setType("padel");
      setDuration(90);
      setIntensity("moderate");
      setNotes("");
      setExercises([]);
    }
  }, [open, editing]);

  const calories = useMemo(
    () => estimateCalories(type, intensity, duration, weightKg),
    [type, intensity, duration, weightKg]
  );

  const save = async () => {
    if (busy || duration <= 0) return;
    setBusy(true);
    const payload = {
      logged_date: editing?.logged_date ?? date,
      type,
      duration_min: duration,
      intensity,
      calories_burned: calories,
      notes: notes.trim() || null,
      exercises: type === "strength" && exercises.length > 0 ? exercises : null,
    };
    try {
      if (editing) await updateWorkout(editing.id, payload);
      else await insertWorkout(user.id, payload);
      onChanged();
      onClose();
    } catch {
      toast("Couldn't save workout — try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing || busy) return;
    setBusy(true);
    try {
      await deleteWorkout(editing.id);
      onChanged();
      onClose();
    } catch {
      toast("Couldn't delete — try again.");
    } finally {
      setBusy(false);
    }
  };

  const updateExercise = (idx: number, patch: Partial<Exercise>) =>
    setExercises(exercises.map((ex, i) => (i === idx ? { ...ex, ...patch } : ex)));

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Edit workout" : "Log workout"}>
      <div className="space-y-5">
        <div>
          <span className="label block mb-2">Type</span>
          <Chips options={TYPES} value={type} onChange={setType} />
        </div>

        <div>
          <span className="label block mb-2">Duration</span>
          {type === "padel" ? (
            <Chips
              options={PADEL_DURATIONS}
              value={(PADEL_DURATIONS as readonly number[]).includes(duration) ? duration : 90}
              onChange={setDuration}
              format={(v) => `${v} min`}
            />
          ) : (
            <input
              className="field"
              inputMode="numeric"
              placeholder="Minutes"
              value={duration || ""}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setDuration(Number.isFinite(n) ? n : 0);
              }}
            />
          )}
        </div>

        <div>
          <span className="label block mb-2">Intensity</span>
          <Chips options={INTENSITIES} value={intensity} onChange={setIntensity} />
        </div>

        {type === "strength" && (
          <div className="space-y-3">
            <span className="label block">Exercises</span>
            <datalist id="exercise-names">
              {exerciseNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            {exercises.map((ex, idx) => (
              <div key={idx} className="card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    className="field py-2 flex-1"
                    list="exercise-names"
                    placeholder="Exercise"
                    value={ex.name}
                    onChange={(e) => updateExercise(idx, { name: e.target.value })}
                  />
                  <button
                    type="button"
                    aria-label="Remove exercise"
                    className="text-muted p-1"
                    onClick={() => setExercises(exercises.filter((_, i) => i !== idx))}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
                {ex.sets.map((set, si) => (
                  <div key={si} className="flex items-center gap-2">
                    <span className="label w-10">Set {si + 1}</span>
                    <input
                      className="field py-1.5 text-center"
                      inputMode="numeric"
                      placeholder="reps"
                      value={set.reps || ""}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        const sets = ex.sets.map((s, j) =>
                          j === si ? { ...s, reps: Number.isFinite(n) ? n : 0 } : s
                        );
                        updateExercise(idx, { sets });
                      }}
                    />
                    <span className="text-muted text-sm">×</span>
                    <input
                      className="field py-1.5 text-center"
                      inputMode="decimal"
                      placeholder="kg"
                      value={set.weight_kg || ""}
                      onChange={(e) => {
                        const n = parseFloat(e.target.value);
                        const sets = ex.sets.map((s, j) =>
                          j === si ? { ...s, weight_kg: Number.isFinite(n) ? n : 0 } : s
                        );
                        updateExercise(idx, { sets });
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Remove set"
                      className="text-muted p-1"
                      onClick={() =>
                        updateExercise(idx, { sets: ex.sets.filter((_, j) => j !== si) })
                      }
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                ))}
                <div className="flex gap-4 pt-1">
                  <button
                    type="button"
                    className="text-accent text-sm font-medium"
                    onClick={() => {
                      const last = ex.sets[ex.sets.length - 1] ?? { reps: 8, weight_kg: 0 };
                      updateExercise(idx, { sets: [...ex.sets, { ...last }] });
                    }}
                  >
                    + Duplicate last set
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="text-accent text-sm font-medium"
              onClick={() =>
                setExercises([...exercises, { name: "", sets: [{ reps: 8, weight_kg: 0 }] }])
              }
            >
              + Add exercise
            </button>
          </div>
        )}

        <div>
          <span className="label block mb-2">Notes</span>
          <input
            className="field"
            placeholder="Optional"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-between items-baseline">
          <span className="label">Estimated burn</span>
          <span className="stat text-xl">{calories} kcal</span>
        </div>

        <button className="btn-primary" onClick={save} disabled={busy || duration <= 0}>
          {busy ? "Saving…" : editing ? "Save changes" : "Save workout"}
        </button>
        {editing && (
          <button className="w-full py-2 text-over text-sm font-medium" onClick={remove} disabled={busy}>
            Delete workout
          </button>
        )}
      </div>
    </Sheet>
  );
}
