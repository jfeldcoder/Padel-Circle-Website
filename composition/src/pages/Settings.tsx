import { useEffect, useMemo, useState } from "react";
import { differenceInYears, parseISO } from "date-fns";
import { useUser } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { fetchProfile, upsertProfile } from "../lib/db";
import { suggestTargets } from "../lib/calories";
import { supabase } from "../lib/supabase";
import Chips from "../components/Chips";

type Form = {
  display_name: string;
  height_cm: string;
  birth_date: string;
  sex: string;
  goal_weight_kg: string;
  goal_bf_pct: string;
  daily_calorie_target: string;
  protein_target_g: string;
  carbs_target_g: string;
  fat_target_g: string;
  activity_note: string;
  current_weight_kg: string; // for the TDEE helper only
};

const EMPTY: Form = {
  display_name: "",
  height_cm: "",
  birth_date: "",
  sex: "male",
  goal_weight_kg: "",
  goal_bf_pct: "",
  daily_calorie_target: "",
  protein_target_g: "",
  carbs_target_g: "",
  fat_target_g: "",
  activity_note: "",
  current_weight_kg: "",
};

const MULTIPLIERS = [1.6, 1.7, 1.8, 1.9] as const;
const DEFICITS = [300, 400, 500] as const;

export default function Settings() {
  const user = useUser();
  const toast = useToast();
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [multiplier, setMultiplier] = useState<number>(1.8);
  const [deficit, setDeficit] = useState<number>(400);

  useEffect(() => {
    void (async () => {
      const p = await fetchProfile(user.id);
      if (!p) return;
      setForm((f) => ({
        ...f,
        display_name: p.display_name ?? "",
        height_cm: p.height_cm ? String(p.height_cm) : "",
        birth_date: p.birth_date ?? "",
        sex: p.sex ?? "male",
        goal_weight_kg: p.goal_weight_kg ? String(p.goal_weight_kg) : "",
        goal_bf_pct: p.goal_bf_pct ? String(p.goal_bf_pct) : "",
        daily_calorie_target: p.daily_calorie_target ? String(p.daily_calorie_target) : "",
        protein_target_g: p.protein_target_g ? String(p.protein_target_g) : "",
        carbs_target_g: p.carbs_target_g ? String(p.carbs_target_g) : "",
        fat_target_g: p.fat_target_g ? String(p.fat_target_g) : "",
        activity_note: p.activity_note ?? "",
      }));
    })();
  }, [user.id]);

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const num = (s: string): number | null => {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };

  const suggestion = useMemo(() => {
    const w = num(form.current_weight_kg) ?? num(form.goal_weight_kg);
    const h = num(form.height_cm);
    const age = form.birth_date
      ? differenceInYears(new Date(), parseISO(form.birth_date))
      : null;
    if (!w || !h || age === null) return null;
    return suggestTargets(w, h, age, form.sex, multiplier, deficit);
  }, [form.current_weight_kg, form.goal_weight_kg, form.height_cm, form.birth_date, form.sex, multiplier, deficit]);

  const applySuggestion = () => {
    if (!suggestion) return;
    const protein = Math.round((suggestion.proteinLow + suggestion.proteinHigh) / 2);
    // Remaining calories split ~40/60 fat/carbs — editable below, never auto-saved.
    const fat = Math.round((suggestion.calorieTarget * 0.28) / 9);
    const carbs = Math.round((suggestion.calorieTarget - protein * 4 - fat * 9) / 4);
    setForm({
      ...form,
      daily_calorie_target: String(suggestion.calorieTarget),
      protein_target_g: String(protein),
      fat_target_g: String(fat),
      carbs_target_g: String(Math.max(carbs, 0)),
    });
    toast("Suggestion filled in — review and save");
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await upsertProfile(user.id, {
        display_name: form.display_name.trim() || null,
        height_cm: num(form.height_cm),
        birth_date: form.birth_date || null,
        sex: form.sex || null,
        goal_weight_kg: num(form.goal_weight_kg),
        goal_bf_pct: num(form.goal_bf_pct),
        daily_calorie_target: num(form.daily_calorie_target),
        protein_target_g: num(form.protein_target_g),
        carbs_target_g: num(form.carbs_target_g),
        fat_target_g: num(form.fat_target_g),
        activity_note: form.activity_note.trim() || null,
      });
      toast("Saved");
    } catch {
      toast("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof Form, props: Record<string, unknown> = {}) => (
    <label className="block">
      <span className="label block mb-1.5">{label}</span>
      <input className="field" value={form[key]} onChange={set(key)} {...props} />
    </label>
  );

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-medium">Settings</h1>

      <section className="card p-5 space-y-4">
        <span className="label">Profile</span>
        {field("Name", "display_name", { autoComplete: "name" })}
        <div className="grid grid-cols-2 gap-3">
          {field("Height (cm)", "height_cm", { inputMode: "decimal" })}
          {field("Birth date", "birth_date", { type: "date" })}
        </div>
        <div>
          <span className="label block mb-2">Sex (for BMR)</span>
          <Chips
            options={["male", "female"] as const}
            value={form.sex as "male" | "female"}
            onChange={(v) => setForm({ ...form, sex: v })}
          />
        </div>
        {field("Activity note", "activity_note", { placeholder: "e.g. 2h padel most days + lifting" })}
      </section>

      <section className="card p-5 space-y-4">
        <span className="label">Goals</span>
        <div className="grid grid-cols-2 gap-3">
          {field("Goal weight (kg)", "goal_weight_kg", { inputMode: "decimal" })}
          {field("Goal body fat (%)", "goal_bf_pct", { inputMode: "decimal" })}
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <span className="label">Daily targets</span>
        {field("Calories (kcal)", "daily_calorie_target", { inputMode: "numeric" })}
        <div className="grid grid-cols-3 gap-3">
          {field("Protein (g)", "protein_target_g", { inputMode: "numeric" })}
          {field("Carbs (g)", "carbs_target_g", { inputMode: "numeric" })}
          {field("Fat (g)", "fat_target_g", { inputMode: "numeric" })}
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <span className="label">TDEE helper</span>
        <p className="text-xs text-muted">
          Mifflin-St Jeor from your stats, with a high activity multiplier for heavy padel volume.
          Nothing is applied until you confirm and save.
        </p>
        {field("Current weight (kg)", "current_weight_kg", { inputMode: "decimal" })}
        <div>
          <span className="label block mb-2">Activity multiplier</span>
          <Chips options={MULTIPLIERS} value={multiplier} onChange={setMultiplier} format={(v) => `×${v}`} />
        </div>
        <div>
          <span className="label block mb-2">Deficit</span>
          <Chips options={DEFICITS} value={deficit} onChange={setDeficit} format={(v) => `−${v}`} />
        </div>
        {suggestion ? (
          <div className="border-t border-line pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">BMR</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{suggestion.bmr} kcal</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Estimated TDEE</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{suggestion.tdee} kcal</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Suggested target</span>
              <span className="font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
                {suggestion.calorieTarget} kcal
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Protein (1.8–2.2 g/kg)</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {suggestion.proteinLow}–{suggestion.proteinHigh} g
              </span>
            </div>
            <button className="btn-ghost mt-2" onClick={applySuggestion}>
              Fill targets with suggestion
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted">
            Enter current weight, height, and birth date to see a suggestion.
          </p>
        )}
      </section>

      <button className="btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save settings"}
      </button>

      <button
        className="w-full py-2 text-over text-sm font-medium"
        onClick={() => void supabase.auth.signOut()}
      >
        Sign out
      </button>

      <p className="text-center text-xs text-muted pb-4">
        Signed in as {user.email}
      </p>
    </div>
  );
}
