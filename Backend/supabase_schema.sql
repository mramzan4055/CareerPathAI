-- Enable the pgvector extension
create extension if not exists vector;

-- Create the CVs table
create table if not exists cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  linkedin text,
  github text,
  summary text,
  parsed_data jsonb not null,
  target_job_id uuid references jobs(id) on delete set null,
  skill_gap_cache jsonb,
  embedding vector(384), -- 384 dimensions for Supabase's default gte-small model
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_cvs_user_id on cvs(user_id);

-- ==============================================================================
-- MIGRATION (run this against an existing database that already has a `cvs`
-- table without `user_id` — safe to run before or after the CREATE TABLE above):
--
--   alter table cvs add column if not exists user_id uuid references auth.users(id) on delete cascade;
--   create index if not exists idx_cvs_user_id on cvs(user_id);
--
-- Existing rows will have user_id = NULL until re-saved; the backend now treats
-- a NULL user_id as "no owner" and will deny GET/PUT access to those legacy rows.
-- ==============================================================================

-- Enable RLS for CVs. The backend normally writes with the service-role key
-- (which bypasses RLS), so this is defense-in-depth: it also protects the table
-- if the anon key is ever used directly (e.g. database.py falls back to the
-- anon key when SUPABASE_SERVICE_ROLE_KEY is unset).
alter table cvs enable row level security;

create policy "Users can view own CVs."
  on cvs for select
  using ( auth.uid() = user_id );

create policy "Users can insert own CVs."
  on cvs for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own CVs."
  on cvs for update
  using ( auth.uid() = user_id );

create policy "Users can delete own CVs."
  on cvs for delete
  using ( auth.uid() = user_id );

-- Create the Jobs table
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  adzuna_id text unique,
  query_used text not null,
  job_title text not null,
  company text not null,
  location text not null,
  clean_description text not null,
  salary_min numeric,
  salary_max numeric,
  contract_time text,
  contract_type text,
  url text,
  embedding vector(384),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Jobs. Listings are public data — anyone may read them. Writes
-- only happen via the backend's service-role key (bypasses RLS), so no
-- insert/update/delete policy is defined, which blocks those actions for the
-- anon/authenticated roles by default.
alter table jobs enable row level security;

create policy "Anyone can view jobs."
  on jobs for select
  using ( true );

-- ==============================================================================
-- IMPORTANT NOTE ON HNSW INDEXES:
-- Do not run the CREATE INDEX commands on completely empty tables. 
-- Please insert at least 10-20 CVs and Jobs first, and then run these below commands 
-- for optimal memory initialization and performance.
-- ==============================================================================
-- create index on jobs using hnsw (embedding vector_cosine_ops);
-- create index on cvs using hnsw (embedding vector_cosine_ops);

-- Create the matching function (Cosine Similarity)
create or replace function match_jobs (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  adzuna_id text,
  job_title text,
  company text,
  location text,
  clean_description text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    jobs.id,
    jobs.adzuna_id,
    jobs.job_title,
    jobs.company,
    jobs.location,
    jobs.clean_description,
    1 - (jobs.embedding <=> query_embedding) as similarity
  from jobs
  where jobs.embedding is not null and 1 - (jobs.embedding <=> query_embedding) > match_threshold
  order by jobs.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Create the saved_jobs table
create table if not exists saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  status text not null default 'saved',
  notes text,
  status_updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, job_id)
);

alter table saved_jobs
  add constraint saved_jobs_status_check
  check (status in ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn'));

-- ==============================================================================
-- MIGRATION (run this against an existing database whose saved_jobs.user_id has
-- no FK constraint yet, or that predates the status/notes columns below):
--
--   -- First, remove any orphaned rows (saved jobs for users that no longer
--   -- exist) or the FK constraint below will fail to apply:
--   delete from saved_jobs where user_id not in (select id from auth.users);
--
--   alter table saved_jobs
--     add constraint saved_jobs_user_id_fkey
--     foreign key (user_id) references auth.users(id) on delete cascade;
--
--   -- Job Application Tracker (Phase 2): status/notes on existing saved_jobs rows
--   alter table saved_jobs add column if not exists status text not null default 'saved';
--   alter table saved_jobs add column if not exists notes text;
--   alter table saved_jobs add column if not exists status_updated_at timestamp with time zone default timezone('utc'::text, now()) not null;
--   alter table saved_jobs add constraint if not exists saved_jobs_status_check
--     check (status in ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn'));
-- ==============================================================================

-- Add indexes to prevent Sequential Scans on large datasets
create index if not exists idx_saved_jobs_user_id on saved_jobs(user_id);
create index if not exists idx_saved_jobs_job_id on saved_jobs(job_id);

-- Enable RLS for Saved Jobs.
alter table saved_jobs enable row level security;

create policy "Users can view own saved jobs."
  on saved_jobs for select
  using ( auth.uid() = user_id );

create policy "Users can insert own saved jobs."
  on saved_jobs for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own saved jobs."
  on saved_jobs for update
  using ( auth.uid() = user_id );

create policy "Users can delete own saved jobs."
  on saved_jobs for delete
  using ( auth.uid() = user_id );

-- Create the Profiles table for user data
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  target_role text,
  phone text,
  location text,
  linkedin text,
  github text,
  summary text,
  skills text,
  interests text, -- comma-separated career interests, prioritized in job/skill-gap matching
  education text,
  experience text,
  projects jsonb,
  certifications jsonb,
  cv_id uuid references cvs(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- MIGRATION (run this against an existing database whose profiles table
-- predates the interests column):
--
--   alter table profiles add column if not exists interests text;
-- ==============================================================================

-- Enable RLS for Profiles
alter table profiles enable row level security;

create policy "Users can view own profile."
  on profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

create policy "Users can insert own profile."
  on profiles for insert
  with check ( auth.uid() = id );

-- ==============================================================================
-- Phase 2: Saved Learning Plans + AI Cover Letter Generator
-- ==============================================================================

-- Create the learning_plans table (persisted skill-gap study roadmaps)
create table if not exists learning_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cv_id uuid references cvs(id) on delete set null,
  target_job_id uuid references jobs(id) on delete set null,
  title text not null,
  plan_data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_learning_plans_user_id on learning_plans(user_id);

alter table learning_plans enable row level security;

create policy "Users can view own learning plans."
  on learning_plans for select
  using ( auth.uid() = user_id );

create policy "Users can insert own learning plans."
  on learning_plans for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete own learning plans."
  on learning_plans for delete
  using ( auth.uid() = user_id );

-- Create the cover_letters table (AI-generated, saved on demand)
create table if not exists cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cv_id uuid references cvs(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  title text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_cover_letters_user_id on cover_letters(user_id);

alter table cover_letters enable row level security;

create policy "Users can view own cover letters."
  on cover_letters for select
  using ( auth.uid() = user_id );

create policy "Users can insert own cover letters."
  on cover_letters for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete own cover letters."
  on cover_letters for delete
  using ( auth.uid() = user_id );
