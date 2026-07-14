-- Composition — Supabase schema
-- Paste this whole file into the Supabase SQL editor and run it.

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  created_at timestamptz default now(),
  display_name text,
  height_cm numeric,
  birth_date date,
  sex text,
  goal_weight_kg numeric,
  goal_bf_pct numeric,
  daily_calorie_target int,
  protein_target_g int,
  carbs_target_g int,
  fat_target_g int,
  activity_note text
);

create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  created_at timestamptz default now(),
  logged_date date not null,
  meal text check (meal in ('breakfast','lunch','dinner','snack')),
  description text not null,
  items jsonb not null,
  total_calories int,
  total_protein_g numeric,
  total_carbs_g numeric,
  total_fat_g numeric,
  parsed_by_ai boolean default true
);

create index if not exists food_entries_user_date_idx
  on public.food_entries (user_id, logged_date);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  created_at timestamptz default now(),
  logged_date date not null,
  type text check (type in ('padel','strength','cardio','mobility','other')),
  duration_min int,
  intensity text check (intensity in ('light','moderate','hard')),
  calories_burned int,
  notes text,
  exercises jsonb
);

create index if not exists workouts_user_date_idx
  on public.workouts (user_id, logged_date);

create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  created_at timestamptz default now(),
  logged_date date not null,
  weight_kg numeric,
  body_fat_pct numeric,
  photo_path text,
  unique (user_id, logged_date)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.food_entries enable row level security;
alter table public.workouts enable row level security;
alter table public.body_metrics enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['profiles','food_entries','workouts','body_metrics'] loop
    execute format('drop policy if exists "own rows select" on public.%I', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);
    execute format(
      'create policy "own rows select" on public.%I for select using (user_id = auth.uid())', t);
    execute format(
      'create policy "own rows insert" on public.%I for insert with check (user_id = auth.uid())', t);
    execute format(
      'create policy "own rows update" on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format(
      'create policy "own rows delete" on public.%I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

-- ============================================================
-- Storage: private bucket for progress photos
-- ============================================================

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

drop policy if exists "own photos select" on storage.objects;
drop policy if exists "own photos insert" on storage.objects;
drop policy if exists "own photos update" on storage.objects;
drop policy if exists "own photos delete" on storage.objects;

-- Objects are stored under a per-user folder: {user_id}/{filename}.jpg
create policy "own photos select" on storage.objects for select
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos insert" on storage.objects for insert
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos update" on storage.objects for update
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos delete" on storage.objects for delete
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
