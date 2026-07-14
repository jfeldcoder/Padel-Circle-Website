import { useCallback, useEffect, useState } from "react";
import { fetchBodyMetrics, fetchStrengthHistory } from "../lib/db";
import { useUser } from "../context/AuthContext";
import type { Exercise } from "../lib/types";

/** Latest logged weight (for MET calorie estimates) and the user's previously
 *  logged exercise names (for the strength-logger autocomplete). */
export function useWorkoutSupport() {
  const user = useUser();
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [metrics, strength] = await Promise.all([
        fetchBodyMetrics(user.id),
        fetchStrengthHistory(user.id),
      ]);
      const withWeight = [...metrics].reverse().find((m) => m.weight_kg);
      setWeightKg(withWeight?.weight_kg ?? null);
      const names = new Set<string>();
      for (const w of strength) {
        for (const ex of (w.exercises ?? []) as Exercise[]) {
          if (ex.name.trim()) names.add(ex.name.trim());
        }
      }
      setExerciseNames([...names].sort());
    } catch {
      // non-fatal — estimates fall back to a default weight
    }
  }, [user.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { weightKg, exerciseNames, refresh };
}
