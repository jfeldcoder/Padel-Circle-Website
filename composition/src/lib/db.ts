import { supabase } from "./supabase";
import type { BodyMetric, FoodEntry, Profile, Workout } from "./types";

function throwIf(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

// --- Profile ---

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  throwIf(error);
  return data as Profile | null;
}

export async function upsertProfile(
  userId: string,
  patch: Partial<Profile>
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ ...patch, user_id: userId }, { onConflict: "user_id" })
    .select()
    .single();
  throwIf(error);
  return data as Profile;
}

// --- Food entries ---

export async function fetchFoodEntries(userId: string, date: string): Promise<FoodEntry[]> {
  const { data, error } = await supabase
    .from("food_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("logged_date", date)
    .order("created_at");
  throwIf(error);
  return (data ?? []) as FoodEntry[];
}

export async function fetchFoodEntriesRange(
  userId: string,
  fromDate: string
): Promise<FoodEntry[]> {
  const { data, error } = await supabase
    .from("food_entries")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_date", fromDate)
    .order("logged_date");
  throwIf(error);
  return (data ?? []) as FoodEntry[];
}

export type FoodEntryInput = Omit<FoodEntry, "id" | "user_id" | "created_at">;

export async function insertFoodEntry(
  userId: string,
  entry: FoodEntryInput
): Promise<FoodEntry> {
  const { data, error } = await supabase
    .from("food_entries")
    .insert({ ...entry, user_id: userId })
    .select()
    .single();
  throwIf(error);
  return data as FoodEntry;
}

export async function updateFoodEntry(
  id: string,
  patch: Partial<FoodEntryInput>
): Promise<FoodEntry> {
  const { data, error } = await supabase
    .from("food_entries")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  throwIf(error);
  return data as FoodEntry;
}

export async function deleteFoodEntry(id: string): Promise<void> {
  const { error } = await supabase.from("food_entries").delete().eq("id", id);
  throwIf(error);
}

// --- Workouts ---

export async function fetchWorkouts(userId: string, date: string): Promise<Workout[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .eq("logged_date", date)
    .order("created_at");
  throwIf(error);
  return (data ?? []) as Workout[];
}

export async function fetchWorkoutsRange(userId: string, fromDate: string): Promise<Workout[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_date", fromDate)
    .order("logged_date");
  throwIf(error);
  return (data ?? []) as Workout[];
}

/** All strength workouts, newest first — used for exercise-name autocomplete. */
export async function fetchStrengthHistory(userId: string, limit = 100): Promise<Workout[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "strength")
    .order("logged_date", { ascending: false })
    .limit(limit);
  throwIf(error);
  return (data ?? []) as Workout[];
}

export type WorkoutInput = Omit<Workout, "id" | "user_id" | "created_at">;

export async function insertWorkout(userId: string, w: WorkoutInput): Promise<Workout> {
  const { data, error } = await supabase
    .from("workouts")
    .insert({ ...w, user_id: userId })
    .select()
    .single();
  throwIf(error);
  return data as Workout;
}

export async function updateWorkout(id: string, patch: Partial<WorkoutInput>): Promise<Workout> {
  const { data, error } = await supabase
    .from("workouts")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  throwIf(error);
  return data as Workout;
}

export async function deleteWorkout(id: string): Promise<void> {
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  throwIf(error);
}

// --- Body metrics ---

export async function fetchBodyMetric(userId: string, date: string): Promise<BodyMetric | null> {
  const { data, error } = await supabase
    .from("body_metrics")
    .select("*")
    .eq("user_id", userId)
    .eq("logged_date", date)
    .maybeSingle();
  throwIf(error);
  return data as BodyMetric | null;
}

export async function fetchBodyMetrics(userId: string, fromDate?: string): Promise<BodyMetric[]> {
  let q = supabase
    .from("body_metrics")
    .select("*")
    .eq("user_id", userId)
    .order("logged_date");
  if (fromDate) q = q.gte("logged_date", fromDate);
  const { data, error } = await q;
  throwIf(error);
  return (data ?? []) as BodyMetric[];
}

export async function upsertBodyMetric(
  userId: string,
  metric: Partial<BodyMetric> & { logged_date: string }
): Promise<BodyMetric> {
  const { data, error } = await supabase
    .from("body_metrics")
    .upsert({ ...metric, user_id: userId }, { onConflict: "user_id,logged_date" })
    .select()
    .single();
  throwIf(error);
  return data as BodyMetric;
}

export async function deleteBodyMetric(id: string): Promise<void> {
  const { error } = await supabase.from("body_metrics").delete().eq("id", id);
  throwIf(error);
}
