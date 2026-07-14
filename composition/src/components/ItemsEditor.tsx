import type { FoodItem } from "../lib/types";

interface Props {
  items: FoodItem[];
  onChange: (items: FoodItem[]) => void;
}

export function itemTotals(items: FoodItem[]) {
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return {
    calories: Math.round(items.reduce((s, i) => s + (i.calories || 0), 0)),
    protein_g: r1(items.reduce((s, i) => s + (i.protein_g || 0), 0)),
    carbs_g: r1(items.reduce((s, i) => s + (i.carbs_g || 0), 0)),
    fat_g: r1(items.reduce((s, i) => s + (i.fat_g || 0), 0)),
  };
}

export function emptyItem(): FoodItem {
  return { name: "", quantity: "", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
}

const MACROS = [
  { key: "calories", label: "kcal" },
  { key: "protein_g", label: "protein" },
  { key: "carbs_g", label: "carbs" },
  { key: "fat_g", label: "fat" },
] as const;

/** Editable list of parsed food items — every number can be adjusted. */
export default function ItemsEditor({ items, onChange }: Props) {
  const update = (idx: number, patch: Partial<FoodItem>) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const totals = itemTotals(items);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="card p-4">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <input
                className="field py-2"
                placeholder="Food"
                value={item.name}
                onChange={(e) => update(idx, { name: e.target.value })}
              />
              <input
                className="field py-2"
                placeholder="Quantity (e.g. 2 eggs)"
                value={item.quantity}
                onChange={(e) => update(idx, { quantity: e.target.value })}
              />
            </div>
            <button
              type="button"
              aria-label="Remove item"
              className="text-muted p-1 mt-1"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {MACROS.map((m) => (
              <label key={m.key} className="block">
                <span className="label block text-center mb-1">{m.label}</span>
                <input
                  className="field py-1.5 px-1 text-center"
                  inputMode="decimal"
                  value={item[m.key] === 0 ? "" : String(item[m.key])}
                  placeholder="0"
                  onChange={(e) => {
                    const n = parseFloat(e.target.value);
                    update(idx, { [m.key]: Number.isFinite(n) ? n : 0 } as Partial<FoodItem>);
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        className="text-accent text-sm font-medium"
        onClick={() => onChange([...items, emptyItem()])}
      >
        + Add item
      </button>

      <div className="flex justify-between items-baseline pt-2 border-t border-line">
        <span className="label">Total</span>
        <span className="text-sm font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
          {totals.calories} kcal · {totals.protein_g}p / {totals.carbs_g}c / {totals.fat_g}f
        </span>
      </div>
    </div>
  );
}
