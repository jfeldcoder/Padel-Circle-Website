export type Meal = "breakfast" | "lunch" | "dinner" | "snack";
export type WorkoutType = "padel" | "strength" | "cardio" | "mobility" | "other";
export type Intensity = "light" | "moderate" | "hard";

export interface FoodItem {
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface FoodEntry {
  id: string;
  user_id: string;
  created_at: string;
  logged_date: string;
  meal: Meal;
  description: string;
  items: FoodItem[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  parsed_by_ai: boolean;
}

export interface ExerciseSet {
  reps: number;
  weight_kg: number;
}

export interface Exercise {
  name: string;
  sets: ExerciseSet[];
}

export interface Workout {
  id: string;
  user_id: string;
  created_at: string;
  logged_date: string;
  type: WorkoutType;
  duration_min: number;
  intensity: Intensity;
  calories_burned: number | null;
  notes: string | null;
  exercises: Exercise[] | null;
}

export interface BodyMetric {
  id: string;
  user_id: string;
  created_at: string;
  logged_date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  photo_path: string | null;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  height_cm: number | null;
  birth_date: string | null;
  sex: string | null;
  goal_weight_kg: number | null;
  goal_bf_pct: number | null;
  daily_calorie_target: number | null;
  protein_target_g: number | null;
  carbs_target_g: number | null;
  fat_target_g: number | null;
  activity_note: string | null;
}

export interface ParseFoodResponse {
  items: FoodItem[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}
