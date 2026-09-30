create extension if not exists pgcrypto;

create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  original_rows integer not null default 0,
  cleaned_rows integer not null default 0,
  issue_count integer not null default 0,
  actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analysis_runs enable row level security;

-- 브라우저에서 직접 접근하지 않습니다.
-- Vercel 서버 함수가 SUPABASE_SECRET_KEY로만 접근합니다.
