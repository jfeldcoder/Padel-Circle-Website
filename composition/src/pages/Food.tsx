import { useCallback, useEffect, useState } from "react";
import { useUser } from "../context/AuthContext";
import { fetchFoodEntries } from "../lib/db";
import { localDate } from "../lib/dates";
import type { FoodEntry, Meal } from "../lib/types";
import DaySelector from "../components/DaySelector";
import FoodComposer from "../components/FoodComposer";
import FoodEditSheet from "../components/FoodEditSheet";
import EmptyState from "../components/EmptyState";

const MEAL_ORDER: readonly Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export default function Food() {
  const user = useUser();
  const [date, setDate] = useState(localDate());
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [editing, setEditing] = useState<FoodEntry | null>(null);

  const load = useCallback(async () => {
    setEntries(await fetchFoodEntries(user.id, date));
  }, [user.id, date]);

  useEffect(() => {
    void load();
  }, [load]);

  const dayTotal = entries.reduce((s, e) => s + (e.total_calories || 0), 0);

  return (
    <div className="space-y-6">
      <DaySelector date={date} onChange={setDate} />

      <section className="card p-5">
        <FoodComposer date={date} onSaved={() => void load()} />
      </section>

      {entries.length === 0 ? (
        <EmptyState message="Nothing logged yet — describe your first meal above." />
      ) : (
        <>
          {MEAL_ORDER.map((meal) => {
            const mealEntries = entries.filter((e) => e.meal === meal);
            if (mealEntries.length === 0) return null;
            const mealCalories = mealEntries.reduce((s, e) => s + (e.total_calories || 0), 0);
            return (
              <section key={meal} className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="label">{meal}</span>
                  <span className="text-sm text-muted" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {mealCalories} kcal
                  </span>
                </div>
                {mealEntries.map((entry) => (
                  <button
                    key={entry.id}
                    className="card w-full text-left px-5 py-4"
                    onClick={() => setEditing(entry)}
                  >
                    <div className="flex justify-between gap-3">
                      <span className="text-sm flex-1">
                        {entry.items.map((i) => i.name).join(", ") || entry.description}
                      </span>
                      <span className="stat text-lg shrink-0">{entry.total_calories}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted">
                        {Math.round(entry.total_protein_g)}p · {Math.round(entry.total_carbs_g)}c ·{" "}
                        {Math.round(entry.total_fat_g)}f
                      </span>
                      {entry.parsed_by_ai && <span className="label">estimated</span>}
                    </div>
                  </button>
                ))}
              </section>
            );
          })}

          <div className="flex justify-between items-baseline pt-2 border-t border-line">
            <span className="label">Day total</span>
            <span className="stat text-xl">{dayTotal} kcal</span>
          </div>
        </>
      )}

      <FoodEditSheet entry={editing} onClose={() => setEditing(null)} onChanged={() => void load()} />
    </div>
  );
}
