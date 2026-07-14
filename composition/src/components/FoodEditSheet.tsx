import { useEffect, useState } from "react";
import type { FoodEntry, FoodItem, Meal } from "../lib/types";
import { deleteFoodEntry, updateFoodEntry } from "../lib/db";
import { useToast } from "../context/ToastContext";
import ItemsEditor, { itemTotals } from "./ItemsEditor";
import Chips from "./Chips";
import Sheet from "./Sheet";

const MEALS: readonly Meal[] = ["breakfast", "lunch", "dinner", "snack"];

interface Props {
  entry: FoodEntry | null;
  onClose: () => void;
  onChanged: () => void;
}

export default function FoodEditSheet({ entry, onClose, onChanged }: Props) {
  const toast = useToast();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [meal, setMeal] = useState<Meal>("lunch");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (entry) {
      setItems(entry.items);
      setMeal(entry.meal);
    }
  }, [entry]);

  const save = async () => {
    if (!entry || busy) return;
    const cleaned = items.filter((i) => i.name.trim());
    if (cleaned.length === 0) return;
    setBusy(true);
    const totals = itemTotals(cleaned);
    try {
      await updateFoodEntry(entry.id, {
        items: cleaned,
        meal,
        total_calories: totals.calories,
        total_protein_g: totals.protein_g,
        total_carbs_g: totals.carbs_g,
        total_fat_g: totals.fat_g,
      });
      onChanged();
      onClose();
    } catch {
      toast("Couldn't save — try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!entry || busy) return;
    setBusy(true);
    try {
      await deleteFoodEntry(entry.id);
      onChanged();
      onClose();
    } catch {
      toast("Couldn't delete — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={entry !== null} onClose={onClose} title="Edit entry">
      {entry && (
        <div className="space-y-4">
          <p className="text-sm text-muted">{entry.description}</p>
          <div>
            <span className="label block mb-2">Meal</span>
            <Chips options={MEALS} value={meal} onChange={setMeal} />
          </div>
          <ItemsEditor items={items} onChange={setItems} />
          <button className="btn-primary" onClick={save} disabled={busy}>
            Save changes
          </button>
          <button className="w-full py-2 text-over text-sm font-medium" onClick={remove} disabled={busy}>
            Delete entry
          </button>
        </div>
      )}
    </Sheet>
  );
}
