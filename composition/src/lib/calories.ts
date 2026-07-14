import type { Intensity, WorkoutType } from "./types";

/** MET values per the spec: padel by intensity, strength flat 5.0; sensible
 *  defaults for the rest. */
const PADEL_MET: Record<Intensity, number> = { light: 6.0, moderate: 7.5, hard: 9.0 };
const CARDIO_MET: Record<Intensity, number> = { light: 5.0, moderate: 7.0, hard: 10.0 };

export function metFor(type: WorkoutType, intensity: Intensity): number {
  switch (type) {
    case "padel":
      return PADEL_MET[intensity];
    case "strength":
      return 5.0;
    case "cardio":
      return CARDIO_MET[intensity];
    case "mobility":
      return 2.5;
    case "other":
      return 4.0;
  }
}

export const FALLBACK_WEIGHT_KG = 75;

/** calories = duration_hr × weight_kg × MET */
export function estimateCalories(
  type: WorkoutType,
  intensity: Intensity,
  durationMin: number,
  weightKg: number | null
): number {
  const w = weightKg && weightKg > 0 ? weightKg : FALLBACK_WEIGHT_KG;
  return Math.round((durationMin / 60) * w * metFor(type, intensity));
}

// --- TDEE helper (Mifflin-St Jeor) ---

export function mifflinStJeor(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: string | null
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(sex === "female" ? base - 161 : base + 5);
}

export interface TdeeSuggestion {
  bmr: number;
  tdee: number;
  calorieTarget: number;
  proteinLow: number;
  proteinHigh: number;
}

/** Activity multiplier defaults high (1.8) given 1.5–3 hrs padel/day + lifting. */
export function suggestTargets(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: string | null,
  activityMultiplier = 1.8,
  deficit = 400
): TdeeSuggestion {
  const bmr = mifflinStJeor(weightKg, heightCm, ageYears, sex);
  const tdee = Math.round(bmr * activityMultiplier);
  return {
    bmr,
    tdee,
    calorieTarget: tdee - deficit,
    proteinLow: Math.round(weightKg * 1.8),
    proteinHigh: Math.round(weightKg * 2.2),
  };
}
