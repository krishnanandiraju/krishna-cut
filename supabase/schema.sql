-- Krishna Cut: portable Supabase/Postgres schema
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default 'Krishna',
  age integer default 43,
  height_cm numeric(5,1) default 177.0,
  calorie_target integer default 1650,
  protein_target integer default 120,
  created_at timestamptz not null default now()
);

create table if not exists foods (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  name text not null,
  brand text,
  serving_text text not null,
  serving_grams numeric(7,2),
  calories numeric(8,2) not null,
  protein_grams numeric(7,2) not null default 0,
  source text default 'manual',
  created_at timestamptz not null default now()
);

create table if not exists food_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  food_id uuid references foods(id) on delete set null,
  logged_on date not null default current_date,
  meal text not null check (meal in ('Breakfast','Lunch','Dinner','Snack')),
  quantity_text text not null,
  calories numeric(8,2) not null,
  protein_grams numeric(7,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists weigh_ins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(6,2) not null,
  waist_cm numeric(6,2),
  steps integer,
  notes text,
  created_at timestamptz not null default now(),
  unique(profile_id, measured_on)
);

alter table profiles enable row level security;
alter table foods enable row level security;
alter table food_entries enable row level security;
alter table weigh_ins enable row level security;

-- Add Supabase Auth policies when login is enabled. For a single-user private deployment,
-- keep the project private or add policies scoped to auth.uid() = profile_id.
