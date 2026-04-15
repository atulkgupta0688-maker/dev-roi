-- DevROI Supabase Schema
-- Run this in your Supabase SQL editor

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  team_size int not null default 1,
  avg_annual_salary numeric not null default 100000,
  monthly_hours int not null default 160,
  metric_type text not null default 'tickets' check (metric_type in ('tickets', 'prs')),
  rolling_window int not null default 30 check (rolling_window in (30, 60, 90)),
  baseline_per_dev numeric,
  ai_adoption_month text,
  current_per_dev numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.ai_platforms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  monthly_cost numeric not null,
  seats int not null default 1,
  adopted_date text not null,
  created_at timestamptz default now()
);

create table public.developers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  baseline_tickets numeric,
  current_tickets numeric,
  platform_ids text[] default '{}',
  created_at timestamptz default now()
);

create table public.workspace_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  recorded_at timestamptz default now(),
  roi_multiple numeric not null,
  velocity_lift_pct numeric not null,
  net_monthly_value numeric not null,
  total_spend numeric not null
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  provider text not null check (provider in ('jira', 'linear', 'github')),
  config jsonb not null default '{}',
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  unique(workspace_id, provider)
);

-- Row Level Security
alter table public.workspaces enable row level security;
alter table public.ai_platforms enable row level security;
alter table public.developers enable row level security;
alter table public.workspace_snapshots enable row level security;
alter table public.integrations enable row level security;

create policy "Users manage own workspaces" on public.workspaces
  for all using (auth.uid() = user_id);

create policy "Users manage own platforms" on public.ai_platforms
  for all using (
    workspace_id in (select id from public.workspaces where user_id = auth.uid())
  );

create policy "Users manage own developers" on public.developers
  for all using (
    workspace_id in (select id from public.workspaces where user_id = auth.uid())
  );

create policy "Users manage own snapshots" on public.workspace_snapshots
  for all using (
    workspace_id in (select id from public.workspaces where user_id = auth.uid())
  );

create policy "Users manage own integrations" on public.integrations
  for all using (
    workspace_id in (select id from public.workspaces where user_id = auth.uid())
  );

-- Updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_workspaces_updated_at
  before update on public.workspaces
  for each row execute function update_updated_at_column();
