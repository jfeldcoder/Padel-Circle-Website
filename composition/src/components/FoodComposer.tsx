import { useState } from "react";
import type { FoodItem, Meal, ParseFoodResponse } from "../lib/types";
import { insertFoodEntry } from "../lib/db";
import { useUser } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import ItemsEditor, { emptyItem, itemTotals } from "./ItemsEditor";
import Chips from "./Chips";

const MEALS: readonly Meal[] = ["breakfast", "lunch", "dinner", "snack"];

function defaultMeal(): Meal {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

interface Props {
  date: string;
  onSaved: () => void;
  autoFocus?: boolean;
}

/** The primary food-logging flow: natural-language text → AI parse → editable
 *  review card → save. Includes a manual-entry fallback. */
export default function FoodComposer({ date, onSaved, autoFocus }: Props) {
  const user = useUser();
  const toast = useToast();

  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<{ items: FoodItem[]; ai: boolean } | null>(null);
  const [meal, setMeal] = useState<Meal>(defaultMeal());

  const parse = async () => {
    if (!text.trim() || parsing) return;
    setParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/parse-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const body = (await res.json()) as ParseFoodResponse & { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Couldn't parse that — try rephrasing.");
        return;
      }
      setReview({ items: body.items, ai: true });
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setParsing(false);
    }
  };

  const save = async () => {
    if (!review || saving) return;
    const items = review.items.filter((i) => i.name.trim());
    if (items.length === 0) {
      setError("Add at least one item.");
      return;
    }
    setSaving(true);
    const totals = itemTotals(items);
    try {
      await insertFoodEntry(user.id, {
        logged_date: date,
        meal,
        description: text.trim() || items.map((i) => i.name).join(", "),
        items,
        total_calories: totals.calories,
        total_protein_g: totals.protein_g,
        total_carbs_g: totals.carbs_g,
        total_fat_g: totals.fat_g,
        parsed_by_ai: review.ai,
      });
      setText("");
      setReview(null);
      setMeal(defaultMeal());
      onSaved();
    } catch {
      toast("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  };

  if (review) {
    return (
      <div className="space-y-4">
        <div>
          <span className="label block mb-2">Meal</span>
          <Chips options={MEALS} value={meal} onChange={setMeal} />
        </div>
        <ItemsEditor items={review.items} onChange={(items) => setReview({ ...review, items })} />
        {error && <p className="text-over text-sm">{error}</p>}
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save to " + meal}
        </button>
        <button className="btn-ghost" onClick={() => { setReview(null); setError(null); }}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        className="field min-h-[92px] resize-none"
        placeholder={'What did you eat? e.g. "2 eggs, sourdough toast with butter, cortado"'}
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
      />
      {error && <p className="text-over text-sm">{error}</p>}
      <button className="btn-primary" onClick={parse} disabled={parsing || !text.trim()}>
        {parsing ? "Estimating…" : "Estimate nutrition"}
      </button>
      <button
        className="text-muted text-sm font-medium w-full py-1"
        onClick={() => {
          setError(null);
          setReview({ items: [emptyItem()], ai: false });
        }}
      >
        Enter manually instead
      </button>
    </div>
  );
}
