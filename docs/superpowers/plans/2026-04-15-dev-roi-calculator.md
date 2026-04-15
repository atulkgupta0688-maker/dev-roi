# Dev ROI Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Dev ROI Calculator so engineering managers can enter team data manually, see which AI subscriptions are worth keeping, and track ROI trends month over month.

**Architecture:** Pre-auth flow — wizard collects data into Zustand store (no login required), dashboard is shown immediately with results, a "Save workspace" banner triggers account creation which persists data to Supabase. On subsequent visits, authenticated users load their saved workspace and update numbers monthly, generating snapshot records used for trend charts.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Zustand, Supabase, React Router v6, Recharts, Framer Motion, React Hook Form + Zod, Sonner

---

> **Note on testing:** This project has no test runner configured. Verification steps use `npm run build` (runs `tsc` + Vite build) as the type-safety check. For UI components, run `npm run dev` and visually verify in the browser.

---

## File Map

### Modified
- `src/lib/types.ts` — add `metric_type`, `rolling_window` to `Workspace`; add `WorkspaceSnapshot`; update `PlatformROI` labels
- `src/lib/roiEngine.ts` — update recommendation labels to match new types; add `getSnapshotFromMetrics()`
- `src/lib/store.ts` — add `snapshots`, `hasPendingData` flag, `setHasPendingData`, `setSnapshots`
- `src/lib/hooks/useWorkspace.ts` — add `loadSnapshots()`, `saveSnapshot()` helpers
- `src/lib/demoData.ts` — add `metric_type`, `rolling_window` fields to demo workspace; add demo snapshots
- `src/App.tsx` — remove old routes (`/platforms`, `/team`, `/report`, `/integrations`); handle pending data save on auth
- `src/components/Sidebar.tsx` — trim nav to: Dashboard, Settings only
- `src/components/KPICard.tsx` — add optional `trend` prop (previous period value + delta indicator)
- `supabase/schema.sql` — add `workspace_snapshots` table + RLS

### Created
- `src/components/SubscriptionTable.tsx` — ranked subscription table with Keep/Monitor/Cut badges
- `src/components/WhatIfSimulator.tsx` — toggle subscriptions on/off, KPIs update in real time
- `src/components/DeveloperTable.tsx` — per-developer breakdown with leverage score
- `src/components/TrendChart.tsx` — line chart of ROI multiple + velocity lift over time
- `src/components/SaveWorkspaceBanner.tsx` — "Save your results" prompt shown to unauthenticated users

### Replaced (full rewrite)
- `src/pages/Landing.tsx` — simplified: headline, two CTAs only
- `src/pages/Setup.tsx` — 4-step wizard (team basics → baseline → subscriptions → current numbers)
- `src/pages/Dashboard.tsx` — KPIs → trend chart → subscription table → what-if → developer breakdown

### Deleted
- `src/pages/Integrations.tsx`
- `src/pages/Platforms.tsx`
- `src/pages/Team.tsx`
- `src/pages/Report.tsx`
- `src/components/WaitlistModal.tsx`
- `src/components/InsightCard.tsx`
- `src/components/PlatformBadge.tsx`

---

## Task 1: Update types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Replace `src/lib/types.ts` with the updated version**

```typescript
// src/lib/types.ts

export type PlatformName =
  | 'GitHub Copilot'
  | 'ChatGPT Plus'
  | 'Gemini Advanced'
  | 'Cursor'
  | 'Claude'
  | 'Other';

export type MetricType = 'tickets' | 'prs';
export type RollingWindow = 30 | 60 | 90;
export type Recommendation = 'Keep' | 'Monitor' | 'Cut';

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  team_size: number;
  avg_annual_salary: number;
  monthly_hours: number;                      // default 160
  metric_type: MetricType;                    // 'tickets' | 'prs'
  rolling_window: RollingWindow;              // 30 | 60 | 90 days
  baseline_per_dev: number | null;            // avg tickets/PRs per dev per month before AI
  ai_adoption_month: string | null;           // "YYYY-MM" — when AI tools were introduced
  current_per_dev: number | null;             // avg tickets/PRs per dev per month now
  created_at: string;
  updated_at: string;
}

export interface AIPlatform {
  id: string;
  workspace_id: string;
  name: PlatformName;
  monthly_cost: number;                       // total monthly cost (flat or seats × per_seat)
  seats: number;
  adopted_date: string;                       // "YYYY-MM"
  created_at: string;
}

export interface Developer {
  id: string;
  workspace_id: string;
  name: string;
  baseline_tickets: number | null;
  current_tickets: number | null;
  platform_ids: string[];
  created_at: string;
}

export interface WorkspaceData {
  workspace: Workspace;
  platforms: AIPlatform[];
  developers: Developer[];
}

export interface ROIMetrics {
  totalMonthlySpend: number;
  monthlyValue: number;
  netROI: number;
  roiMultiple: number;
  velocityLift: number;
  hourlyRate: number;
  paybackWeeks: number;
}

export interface PlatformROI {
  platform: AIPlatform;
  roiIndex: number;
  recommendation: Recommendation;
  velocityAttribution: number;
  platformValue: number;
}

export interface DeveloperWithScore extends Developer {
  leverageScore: number;
  leverageStatus: { label: string; color: string };
  velocityChangePct: number;
  attributedAICost: number;
}

export interface WorkspaceSnapshot {
  id: string;
  workspace_id: string;
  recorded_at: string;                        // ISO date string
  roi_multiple: number;
  velocity_lift_pct: number;
  net_monthly_value: number;
  total_spend: number;
}

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    is_manager?: boolean;
  };
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd "C:/Users/HP/Desktop/Testing Ai/dev-roi" && npx tsc --noEmit 2>&1 | head -40
```

Expected: errors about files that still reference old type shapes (e.g. `baseline_tickets_per_dev`). That's expected — we'll fix them task by task. The types file itself should have no errors.

- [ ] **Step 3: Commit**

```bash
git init && git add src/lib/types.ts
git commit -m "feat: update types for new ROI calculator design"
```

---

## Task 2: Update Supabase schema

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Replace `supabase/schema.sql` with the updated version**

```sql
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add workspace_snapshots table, update workspaces schema"
```

---

## Task 3: Update ROI engine

**Files:**
- Modify: `src/lib/roiEngine.ts`

- [ ] **Step 1: Replace the full contents of `src/lib/roiEngine.ts`**

```typescript
import type {
  Workspace,
  AIPlatform,
  Developer,
  WorkspaceData,
  ROIMetrics,
  PlatformROI,
  DeveloperWithScore,
  WorkspaceSnapshot,
  Recommendation,
} from './types';

// ─── Core Calculations ────────────────────────────────────────────────────────

export function calculateVelocityLift(baseline: number, current: number): number {
  if (baseline === 0) return 0;
  return ((current - baseline) / baseline) * 100;
}

export function calculateHourlyRate(annualSalary: number, monthlyHours: number): number {
  if (monthlyHours === 0) return 0;
  return annualSalary / 12 / monthlyHours;
}

export function calculateMonthlyValue(
  velocityLiftPct: number,
  teamSize: number,
  hourlyRate: number,
  monthlyHours: number
): number {
  return (velocityLiftPct / 100) * teamSize * hourlyRate * monthlyHours;
}

export function calculatePaybackWeeks(monthlyValue: number, monthlySpend: number): number {
  if (monthlyValue <= 0) return 999;
  return (monthlySpend / monthlyValue) * 4.33;
}

export function getRecommendation(roiIndex: number): Recommendation {
  if (roiIndex > 2) return 'Keep';
  if (roiIndex >= 0.8) return 'Monitor';
  return 'Cut';
}

// ─── Composite Metrics ────────────────────────────────────────────────────────

export function calculateROIMetrics(data: WorkspaceData): ROIMetrics {
  const { workspace, platforms } = data;

  const baseline = workspace.baseline_per_dev ?? 0;
  const current = workspace.current_per_dev ?? 0;

  const velocityLift = calculateVelocityLift(baseline, current);
  const hourlyRate = calculateHourlyRate(workspace.avg_annual_salary, workspace.monthly_hours);
  const monthlyValue = calculateMonthlyValue(
    velocityLift,
    workspace.team_size,
    hourlyRate,
    workspace.monthly_hours
  );
  const totalMonthlySpend = platforms.reduce((sum, p) => sum + p.monthly_cost, 0);
  const netROI = monthlyValue - totalMonthlySpend;
  const roiMultiple = totalMonthlySpend > 0 ? monthlyValue / totalMonthlySpend : 0;
  const paybackWeeks = calculatePaybackWeeks(monthlyValue, totalMonthlySpend);

  return {
    totalMonthlySpend,
    monthlyValue,
    netROI,
    roiMultiple,
    velocityLift,
    hourlyRate,
    paybackWeeks,
  };
}

// ─── Platform Attribution ─────────────────────────────────────────────────────

function parseYearMonth(ym: string): Date {
  const [year, month] = ym.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function monthsBetween(start: Date, end: Date): number {
  return Math.max(
    0,
    (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth()
  );
}

export function calculatePlatformROIs(data: WorkspaceData): PlatformROI[] {
  const { workspace, platforms } = data;
  const metrics = calculateROIMetrics(data);

  if (platforms.length === 0) return [];

  const adoptionStart = workspace.ai_adoption_month
    ? parseYearMonth(workspace.ai_adoption_month)
    : new Date();
  const now = new Date();

  const platformMonths = platforms.map((p) => {
    const adopted = parseYearMonth(p.adopted_date);
    const monthsActive = Math.max(0, monthsBetween(adopted, now) + 1);
    const monthsSinceAdoption = Math.max(0, monthsBetween(adoptionStart, now) + 1);
    return { platform: p, monthsActive: Math.min(monthsActive, monthsSinceAdoption) };
  });

  const totalWeighted = platformMonths.reduce(
    (sum, pm) => sum + pm.platform.monthly_cost * pm.monthsActive,
    0
  );

  return platforms
    .map((p) => {
      const pm = platformMonths.find((x) => x.platform.id === p.id)!;
      const weighted = p.monthly_cost * pm.monthsActive;
      const attribution = totalWeighted > 0 ? weighted / totalWeighted : 1 / platforms.length;
      const platformValue = metrics.monthlyValue * attribution;
      const roiIndex = p.monthly_cost > 0 ? platformValue / p.monthly_cost : 0;

      return {
        platform: p,
        roiIndex,
        recommendation: getRecommendation(roiIndex),
        velocityAttribution: attribution * 100,
        platformValue,
      };
    })
    .sort((a, b) => b.roiIndex - a.roiIndex);
}

// ─── Developer Leverage ───────────────────────────────────────────────────────

function getLeverageStatus(score: number): { label: string; color: string } {
  if (score > 30) return { label: 'High leverage', color: '#00FF94' };
  if (score >= 10) return { label: 'On track', color: 'rgba(255,255,255,0.5)' };
  return { label: 'Low leverage', color: '#F59E0B' };
}

export function enrichDevelopers(
  devs: Developer[],
  workspace: Workspace,
  platforms: AIPlatform[]
): DeveloperWithScore[] {
  return devs.map((dev) => {
    const baseline = dev.baseline_tickets ?? 0;
    const current = dev.current_tickets ?? 0;
    const velocityChangePct = baseline > 0 ? calculateVelocityLift(baseline, current) : 0;

    const devPlatforms = platforms.filter((p) => dev.platform_ids.includes(p.id));
    const attributedAICost = devPlatforms.reduce(
      (sum, p) => sum + p.monthly_cost / Math.max(p.seats, 1),
      0
    );

    const monthlySalaryCost = workspace.avg_annual_salary / 12;
    const velocityChangeFraction = baseline > 0 ? (current - baseline) / baseline : 0;
    const leverageScore =
      attributedAICost > 0
        ? velocityChangeFraction / (attributedAICost / monthlySalaryCost)
        : 0;

    return {
      ...dev,
      leverageScore,
      leverageStatus: getLeverageStatus(leverageScore),
      velocityChangePct,
      attributedAICost,
    };
  });
}

// ─── What-if Simulator ────────────────────────────────────────────────────────

export function calculateWhatIf(
  data: WorkspaceData,
  disabledPlatformIds: Set<string>
): ROIMetrics {
  const activePlatforms = data.platforms.filter((p) => !disabledPlatformIds.has(p.id));
  return calculateROIMetrics({ ...data, platforms: activePlatforms });
}

// ─── Snapshot Helper ──────────────────────────────────────────────────────────

export function getSnapshotFromMetrics(
  workspaceId: string,
  metrics: ROIMetrics
): Omit<WorkspaceSnapshot, 'id' | 'recorded_at'> {
  return {
    workspace_id: workspaceId,
    roi_multiple: metrics.roiMultiple,
    velocity_lift_pct: metrics.velocityLift,
    net_monthly_value: metrics.netROI,
    total_spend: metrics.totalMonthlySpend,
  };
}
```

- [ ] **Step 2: Verify no type errors in the engine**

```bash
cd "C:/Users/HP/Desktop/Testing Ai/dev-roi" && npx tsc --noEmit 2>&1 | grep "roiEngine"
```

Expected: no errors on `roiEngine.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/roiEngine.ts
git commit -m "feat: update ROI engine for new types, add getSnapshotFromMetrics"
```

---

## Task 4: Update Zustand store

**Files:**
- Modify: `src/lib/store.ts`

- [ ] **Step 1: Replace `src/lib/store.ts`**

```typescript
import { create } from 'zustand';
import type { Workspace, AIPlatform, Developer, AuthUser, WorkspaceSnapshot } from './types';
import { DEMO_DATA, saveDemoToSession, clearDemoSession, isDemoSession, loadDemoFromSession } from './demoData';

interface AppState {
  // Auth
  user: AuthUser | null;
  isDemoMode: boolean;
  hasPendingData: boolean;   // true when wizard complete but user not yet saved

  // Data
  workspace: Workspace | null;
  platforms: AIPlatform[];
  developers: Developer[];
  snapshots: WorkspaceSnapshot[];

  // UI
  isAuthModalOpen: boolean;
  authModalTab: 'signin' | 'signup';

  // Actions
  setUser: (user: AuthUser | null) => void;
  setDemoMode: (demo: boolean) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  setPlatforms: (platforms: AIPlatform[]) => void;
  setDevelopers: (developers: Developer[]) => void;
  setSnapshots: (snapshots: WorkspaceSnapshot[]) => void;
  addDeveloper: (dev: Developer) => void;
  updateDeveloper: (dev: Developer) => void;
  removeDeveloper: (devId: string) => void;
  setHasPendingData: (pending: boolean) => void;
  loadDemoData: () => void;
  clearData: () => void;
  setAuthModalOpen: (open: boolean, tab?: 'signin' | 'signup') => void;
  initFromSession: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isDemoMode: false,
  hasPendingData: false,
  workspace: null,
  platforms: [],
  developers: [],
  snapshots: [],
  isAuthModalOpen: false,
  authModalTab: 'signin',

  setUser: (user) => {
    if (user) {
      clearDemoSession();
      set({ user, isDemoMode: false });
    } else {
      set({ user });
    }
  },

  setDemoMode: (demo) => set({ isDemoMode: demo }),
  setWorkspace: (workspace) => set({ workspace }),
  setPlatforms: (platforms) => set({ platforms }),
  setDevelopers: (developers) => set({ developers }),
  setSnapshots: (snapshots) => set({ snapshots }),
  setHasPendingData: (hasPendingData) => set({ hasPendingData }),

  addDeveloper: (dev) =>
    set((state) => ({ developers: [...state.developers, dev] })),

  updateDeveloper: (dev) =>
    set((state) => ({
      developers: state.developers.map((d) => (d.id === dev.id ? dev : d)),
    })),

  removeDeveloper: (devId) =>
    set((state) => ({
      developers: state.developers.filter((d) => d.id !== devId),
    })),

  loadDemoData: () => {
    saveDemoToSession();
    set({
      isDemoMode: true,
      hasPendingData: false,
      workspace: DEMO_DATA.workspace,
      platforms: DEMO_DATA.platforms,
      developers: DEMO_DATA.developers,
      snapshots: DEMO_DATA.snapshots,
    });
  },

  clearData: () => {
    clearDemoSession();
    set({
      isDemoMode: false,
      hasPendingData: false,
      workspace: null,
      platforms: [],
      developers: [],
      snapshots: [],
    });
  },

  setAuthModalOpen: (open, tab) =>
    set({ isAuthModalOpen: open, ...(tab ? { authModalTab: tab } : {}) }),

  initFromSession: () => {
    if (isDemoSession()) {
      const data = loadDemoFromSession();
      if (data) {
        set({
          isDemoMode: true,
          workspace: data.workspace,
          platforms: data.platforms,
          developers: data.developers,
          snapshots: data.snapshots ?? [],
        });
      }
    }
  },
}));

export const selectWorkspaceData = (state: AppState) => ({
  workspace: state.workspace,
  platforms: state.platforms,
  developers: state.developers,
});

export const selectHasData = (state: AppState) =>
  state.workspace !== null &&
  state.workspace.baseline_per_dev !== null &&
  state.workspace.current_per_dev !== null;
```

- [ ] **Step 2: Verify**

```bash
cd "C:/Users/HP/Desktop/Testing Ai/dev-roi" && npx tsc --noEmit 2>&1 | grep "store.ts"
```

Expected: no errors on `store.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat: add snapshots and hasPendingData to store"
```

---

## Task 5: Update data layer

**Files:**
- Modify: `src/lib/hooks/useWorkspace.ts`

- [ ] **Step 1: Replace `src/lib/hooks/useWorkspace.ts`**

```typescript
import { useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAppStore } from '../store';
import type { Workspace, AIPlatform, Developer, WorkspaceSnapshot } from '../types';

// ─── Hook: load workspace on auth ─────────────────────────────────────────────

export function useWorkspace() {
  const { user, isDemoMode, setWorkspace, setPlatforms, setDevelopers, setSnapshots } = useAppStore();

  const fetchWorkspace = useCallback(async () => {
    if (!user || isDemoMode) return;

    const { data: wsData, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (wsError && wsError.code !== 'PGRST116') throw wsError;
    if (!wsData) return;

    setWorkspace(wsData as Workspace);

    const [platformRes, devRes, snapshotRes] = await Promise.all([
      supabase.from('ai_platforms').select('*').eq('workspace_id', wsData.id).order('created_at'),
      supabase.from('developers').select('*').eq('workspace_id', wsData.id).order('created_at'),
      supabase.from('workspace_snapshots').select('*').eq('workspace_id', wsData.id).order('recorded_at'),
    ]);

    if (platformRes.error) throw platformRes.error;
    if (devRes.error) throw devRes.error;
    if (snapshotRes.error) throw snapshotRes.error;

    setPlatforms((platformRes.data as AIPlatform[]) ?? []);
    setDevelopers((devRes.data as Developer[]) ?? []);
    setSnapshots((snapshotRes.data as WorkspaceSnapshot[]) ?? []);
  }, [user, isDemoMode, setWorkspace, setPlatforms, setDevelopers, setSnapshots]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  return { refetch: fetchWorkspace };
}

// ─── Workspace CRUD ───────────────────────────────────────────────────────────

export async function saveWorkspace(
  userId: string,
  data: Partial<Workspace>
): Promise<Workspace> {
  const { data: existing } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing?.id) {
    const { data: updated, error } = await supabase
      .from('workspaces')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return updated as Workspace;
  } else {
    const { data: created, error } = await supabase
      .from('workspaces')
      .insert({ ...data, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return created as Workspace;
  }
}

export async function savePlatforms(
  workspaceId: string,
  platforms: Partial<AIPlatform>[]
): Promise<AIPlatform[]> {
  await supabase.from('ai_platforms').delete().eq('workspace_id', workspaceId);
  if (platforms.length === 0) return [];
  const { data, error } = await supabase
    .from('ai_platforms')
    .insert(platforms.map((p) => ({ ...p, workspace_id: workspaceId })))
    .select();
  if (error) throw error;
  return (data as AIPlatform[]) ?? [];
}

export async function upsertDeveloper(
  workspaceId: string,
  dev: Partial<Developer>
): Promise<Developer> {
  if (dev.id) {
    const { data, error } = await supabase
      .from('developers')
      .update({ ...dev, workspace_id: workspaceId })
      .eq('id', dev.id)
      .select()
      .single();
    if (error) throw error;
    return data as Developer;
  } else {
    const { data, error } = await supabase
      .from('developers')
      .insert({ ...dev, workspace_id: workspaceId })
      .select()
      .single();
    if (error) throw error;
    return data as Developer;
  }
}

export async function deleteDeveloper(devId: string): Promise<void> {
  const { error } = await supabase.from('developers').delete().eq('id', devId);
  if (error) throw error;
}

// ─── Snapshot CRUD ────────────────────────────────────────────────────────────

export async function saveSnapshot(
  workspaceId: string,
  metrics: { roiMultiple: number; velocityLift: number; netROI: number; totalMonthlySpend: number }
): Promise<WorkspaceSnapshot> {
  const { data, error } = await supabase
    .from('workspace_snapshots')
    .insert({
      workspace_id: workspaceId,
      roi_multiple: metrics.roiMultiple,
      velocity_lift_pct: metrics.velocityLift,
      net_monthly_value: metrics.netROI,
      total_spend: metrics.totalMonthlySpend,
    })
    .select()
    .single();
  if (error) throw error;
  return data as WorkspaceSnapshot;
}

// ─── Save pending data after auth ────────────────────────────────────────────

export async function savePendingWorkspace(
  userId: string,
  workspace: Workspace,
  platforms: AIPlatform[],
  developers: Developer[]
): Promise<{ workspace: Workspace; platforms: AIPlatform[]; developers: Developer[] }> {
  const savedWorkspace = await saveWorkspace(userId, {
    name: workspace.name,
    team_size: workspace.team_size,
    avg_annual_salary: workspace.avg_annual_salary,
    monthly_hours: workspace.monthly_hours,
    metric_type: workspace.metric_type,
    rolling_window: workspace.rolling_window,
    baseline_per_dev: workspace.baseline_per_dev,
    ai_adoption_month: workspace.ai_adoption_month,
    current_per_dev: workspace.current_per_dev,
  });

  const savedPlatforms = await savePlatforms(savedWorkspace.id, platforms);

  const savedDevelopers = await Promise.all(
    developers.map((dev) => upsertDeveloper(savedWorkspace.id, { ...dev, id: undefined }))
  );

  return { workspace: savedWorkspace, platforms: savedPlatforms, developers: savedDevelopers };
}
```

- [ ] **Step 2: Verify**

```bash
cd "C:/Users/HP/Desktop/Testing Ai/dev-roi" && npx tsc --noEmit 2>&1 | grep "useWorkspace"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/useWorkspace.ts
git commit -m "feat: add saveSnapshot, savePendingWorkspace to data layer"
```

---

## Task 6: Update demo data

**Files:**
- Modify: `src/lib/demoData.ts`

- [ ] **Step 1: Replace `src/lib/demoData.ts`**

```typescript
import type { WorkspaceData, WorkspaceSnapshot } from './types';

const DEMO_WORKSPACE_ID = 'demo-workspace-001';
const DEMO_COPILOT_ID = 'demo-platform-copilot';
const DEMO_CHATGPT_ID = 'demo-platform-chatgpt';
const DEMO_GEMINI_ID = 'demo-platform-gemini';

export const DEMO_DATA: WorkspaceData & { snapshots: WorkspaceSnapshot[] } = {
  workspace: {
    id: DEMO_WORKSPACE_ID,
    user_id: 'demo-user-001',
    name: 'Acme Engineering',
    team_size: 8,
    avg_annual_salary: 130000,
    monthly_hours: 160,
    metric_type: 'tickets',
    rolling_window: 30,
    baseline_per_dev: 11,
    ai_adoption_month: '2024-07',
    current_per_dev: 16,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  platforms: [
    {
      id: DEMO_COPILOT_ID,
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'GitHub Copilot',
      monthly_cost: 400,
      seats: 8,
      adopted_date: '2024-07',
      created_at: new Date().toISOString(),
    },
    {
      id: DEMO_CHATGPT_ID,
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'ChatGPT Plus',
      monthly_cost: 200,
      seats: 8,
      adopted_date: '2024-07',
      created_at: new Date().toISOString(),
    },
    {
      id: DEMO_GEMINI_ID,
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Gemini Advanced',
      monthly_cost: 600,
      seats: 8,
      adopted_date: '2024-09',
      created_at: new Date().toISOString(),
    },
  ],
  developers: [
    {
      id: 'dev-001',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Arjun Mehta',
      baseline_tickets: 10,
      current_tickets: 17,
      platform_ids: [DEMO_COPILOT_ID, DEMO_CHATGPT_ID],
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-002',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Sara Kim',
      baseline_tickets: 12,
      current_tickets: 20,
      platform_ids: [DEMO_COPILOT_ID, DEMO_CHATGPT_ID, DEMO_GEMINI_ID],
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-003',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Dev Patel',
      baseline_tickets: 11,
      current_tickets: 15,
      platform_ids: [DEMO_COPILOT_ID],
      created_at: new Date().toISOString(),
    },
    {
      id: 'dev-004',
      workspace_id: DEMO_WORKSPACE_ID,
      name: 'Jamie Torres',
      baseline_tickets: 9,
      current_tickets: 10,
      platform_ids: [DEMO_GEMINI_ID],
      created_at: new Date().toISOString(),
    },
  ],
  snapshots: [
    {
      id: 'snap-001',
      workspace_id: DEMO_WORKSPACE_ID,
      recorded_at: '2024-08-01T00:00:00Z',
      roi_multiple: 2.1,
      velocity_lift_pct: 18,
      net_monthly_value: 3200,
      total_spend: 600,
    },
    {
      id: 'snap-002',
      workspace_id: DEMO_WORKSPACE_ID,
      recorded_at: '2024-10-01T00:00:00Z',
      roi_multiple: 2.8,
      velocity_lift_pct: 27,
      net_monthly_value: 4100,
      total_spend: 1200,
    },
    {
      id: 'snap-003',
      workspace_id: DEMO_WORKSPACE_ID,
      recorded_at: '2025-01-01T00:00:00Z',
      roi_multiple: 3.2,
      velocity_lift_pct: 45,
      net_monthly_value: 6200,
      total_spend: 1200,
    },
  ],
};

export const CHART_COLORS = ['#00D4FF', '#00FF94', '#6366F1', '#F59E0B', '#FF4D6D'];

const SESSION_KEY = 'dev-roi-demo';

export function saveDemoToSession(): void {
  sessionStorage.setItem(SESSION_KEY, 'true');
}

export function clearDemoSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isDemoSession(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function loadDemoFromSession(): typeof DEMO_DATA | null {
  return isDemoSession() ? DEMO_DATA : null;
}
```

- [ ] **Step 2: Verify**

```bash
cd "C:/Users/HP/Desktop/Testing Ai/dev-roi" && npx tsc --noEmit 2>&1 | grep "demoData"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/demoData.ts
git commit -m "feat: update demo data to match new types, add demo snapshots"
```

---

## Task 7: Clean up routing and remove dead code

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`
- Delete: `src/pages/Integrations.tsx`, `src/pages/Platforms.tsx`, `src/pages/Team.tsx`, `src/pages/Report.tsx`
- Delete: `src/components/WaitlistModal.tsx`, `src/components/InsightCard.tsx`, `src/components/PlatformBadge.tsx`

- [ ] **Step 1: Delete dead page and component files**

```bash
rm "C:/Users/HP/Desktop/Testing Ai/dev-roi/src/pages/Integrations.tsx"
rm "C:/Users/HP/Desktop/Testing Ai/dev-roi/src/pages/Platforms.tsx"
rm "C:/Users/HP/Desktop/Testing Ai/dev-roi/src/pages/Team.tsx"
rm "C:/Users/HP/Desktop/Testing Ai/dev-roi/src/pages/Report.tsx"
rm "C:/Users/HP/Desktop/Testing Ai/dev-roi/src/components/WaitlistModal.tsx"
rm "C:/Users/HP/Desktop/Testing Ai/dev-roi/src/components/InsightCard.tsx"
rm "C:/Users/HP/Desktop/Testing Ai/dev-roi/src/components/PlatformBadge.tsx"
```

- [ ] **Step 2: Replace `src/App.tsx`**

```typescript
import { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './components/AuthModal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MeshBackground } from './components/MeshBackground';
import { Landing } from './pages/Landing';
import { Setup } from './pages/Setup';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { useAppStore } from './lib/store';
import { supabase } from './lib/supabase';
import { useWorkspace, savePendingWorkspace } from './lib/hooks/useWorkspace';

const SIDEBAR_ROUTES = ['/dashboard', '/settings'];

function AppLayout() {
  const location = useLocation();
  const showSidebar = SIDEBAR_ROUTES.some((r) => location.pathname.startsWith(r));

  useWorkspace();

  return (
    <div className="min-h-screen bg-obsidian flex">
      {showSidebar && <Sidebar />}
      <main className={`flex-1 min-h-screen relative ${showSidebar ? 'ml-[220px]' : ''}`}>
        {showSidebar && <MeshBackground />}
        <div className="relative z-10 p-6 max-w-7xl mx-auto">
          <AnimatePresence mode="wait" initial={false}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Landing />} />
              <Route path="/setup" element={<Setup />} />
              <Route path="/dashboard" element={
                <ProtectedRoute requireAuth={false}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>
      <AuthModal />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0F1117',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.87)',
          },
        }}
      />
    </div>
  );
}

export function App() {
  const { setUser, initFromSession } = useAppStore();

  useEffect(() => {
    initFromSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            user_metadata: session.user.user_metadata,
          });

          // Read store state at callback time (avoids stale closure)
          const { hasPendingData, workspace, platforms, developers, setWorkspace, setPlatforms, setDevelopers, setHasPendingData } = useAppStore.getState();

          if (hasPendingData && workspace) {
            try {
              const saved = await savePendingWorkspace(
                session.user.id,
                workspace,
                platforms,
                developers
              );
              setWorkspace(saved.workspace);
              setPlatforms(saved.platforms);
              setDevelopers(saved.developers);
              setHasPendingData(false);
              toast.success('Workspace saved!');
            } catch {
              toast.error('Failed to save workspace. Please try again.');
            }
          }
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser, initFromSession]);

  return <AppLayout />;
}
```

- [ ] **Step 3: Replace `src/components/Sidebar.tsx` with simplified version**

```typescript
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings } from 'lucide-react';
import { clsx } from 'clsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-obsidian border-r border-white/[0.06] flex flex-col z-40">
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <span className="font-heading font-bold text-white text-lg tracking-tight">DevROI</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
              )
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 4: Verify build with dead code removed**

```bash
cd "C:/Users/HP/Desktop/Testing Ai/dev-roi" && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only on pages/components we haven't rewritten yet (`Dashboard.tsx`, `Setup.tsx`, `Landing.tsx`). No errors on the files edited in this task.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/Sidebar.tsx
git commit -m "feat: simplify routing, remove dead pages and components"
```

---

## Task 8: Rebuild Landing page

**Files:**
- Modify: `src/pages/Landing.tsx`

- [ ] **Step 1: Replace `src/pages/Landing.tsx`**

```typescript
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, BarChart3, ArrowRight } from 'lucide-react';
import { MeshBackground } from '../components/MeshBackground';
import { useAppStore } from '../lib/store';

const FEATURES = [
  { icon: TrendingUp, text: 'Measure velocity lift from baseline to today' },
  { icon: DollarSign, text: 'See net ROI per subscription — Keep, Monitor, or Cut' },
  { icon: BarChart3, text: 'Track whether ROI improves month over month' },
];

export function Landing() {
  const navigate = useNavigate();
  const { loadDemoData } = useAppStore();

  const handleDemo = () => {
    loadDemoData();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden flex flex-col items-center justify-center">
      <MeshBackground />
      <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-heading text-5xl font-bold text-white mb-4 leading-tight">
            Is your AI spend<br />paying off?
          </h1>
          <p className="text-white/50 text-lg mb-10 max-w-md mx-auto">
            Enter your team's numbers. Get a clear answer on which subscriptions to keep, monitor, or cut.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <button
              onClick={() => navigate('/setup')}
              className="btn-primary flex items-center justify-center gap-2 px-8 py-3 text-base"
            >
              Calculate ROI <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleDemo}
              className="btn-ghost flex items-center justify-center gap-2 px-8 py-3 text-base"
            >
              See a demo
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-white/40">
                <Icon className="w-4 h-4 text-white/20 flex-shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run dev server and verify page renders**

```bash
cd "C:/Users/HP/Desktop/Testing Ai/dev-roi" && npm run dev
```

Open `http://localhost:5173` — should see headline, two buttons, three feature bullets. No console errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Landing.tsx
git commit -m "feat: rebuild landing page with two CTAs"
```

---

## Task 9: Rebuild Setup wizard

**Files:**
- Modify: `src/pages/Setup.tsx`

- [ ] **Step 1: Replace `src/pages/Setup.tsx`**

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '../lib/store';
import type { AIPlatform, Developer, MetricType, RollingWindow, PlatformName } from '../lib/types';
import { MeshBackground } from '../components/MeshBackground';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(1, 'Team name is required'),
  team_size: z.coerce.number().min(1, 'At least 1 developer'),
  avg_annual_salary: z.coerce.number().min(1, 'Salary is required'),
  monthly_hours: z.coerce.number().min(1).max(744).default(160),
  rolling_window: z.coerce.number().refine((v) => [30, 60, 90].includes(v)) as z.ZodType<RollingWindow>,
});

const step2Schema = z.object({
  metric_type: z.enum(['tickets', 'prs']) as z.ZodType<MetricType>,
  baseline_per_dev: z.coerce.number().min(0, 'Enter a baseline number'),
  ai_adoption_month: z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM format'),
});

const step4Schema = z.object({
  current_per_dev: z.coerce.number().min(0, 'Enter current number'),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step4Data = z.infer<typeof step4Schema>;

// ─── Platform form ────────────────────────────────────────────────────────────

interface PlatformDraft {
  name: PlatformName;
  cost_type: 'flat' | 'per_seat';
  flat_cost: number;
  per_seat_cost: number;
  seats: number;
  adopted_date: string;
}

const PLATFORM_OPTIONS: PlatformName[] = [
  'GitHub Copilot',
  'ChatGPT Plus',
  'Gemini Advanced',
  'Cursor',
  'Claude',
  'Other',
];

function emptyPlatform(): PlatformDraft {
  return {
    name: 'GitHub Copilot',
    cost_type: 'per_seat',
    flat_cost: 0,
    per_seat_cost: 19,
    seats: 1,
    adopted_date: '',
  };
}

function platformToAIPlatform(draft: PlatformDraft, workspaceId: string): Omit<AIPlatform, 'id' | 'created_at'> {
  const monthly_cost =
    draft.cost_type === 'flat' ? draft.flat_cost : draft.per_seat_cost * draft.seats;
  return {
    workspace_id: workspaceId,
    name: draft.name,
    monthly_cost,
    seats: draft.seats,
    adopted_date: draft.adopted_date,
  };
}

// ─── Developer form ───────────────────────────────────────────────────────────

interface DeveloperDraft {
  name: string;
  baseline_tickets: number;
  current_tickets: number;
}

function emptyDeveloper(): DeveloperDraft {
  return { name: '', baseline_tickets: 0, current_tickets: 0 };
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i < current ? 'bg-accent flex-1' : i === current ? 'bg-accent/60 flex-1' : 'bg-white/10 flex-1'
          }`}
        />
      ))}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-400 mt-1">{message}</p>;
}

// ─── Main Setup component ─────────────────────────────────────────────────────

export function Setup() {
  const navigate = useNavigate();
  const { setWorkspace, setPlatforms, setDevelopers, setHasPendingData } = useAppStore();

  const [step, setStep] = useState(0);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const [platforms, setPlatformDrafts] = useState<PlatformDraft[]>([emptyPlatform()]);
  const [developers, setDeveloperDrafts] = useState<DeveloperDraft[]>([]);
  const [showDevForm, setShowDevForm] = useState(false);

  // Step 1 form
  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { monthly_hours: 160, rolling_window: 30 },
  });

  // Step 2 form
  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { metric_type: 'tickets' },
  });

  // Step 4 form
  const form4 = useForm<Step4Data>({ resolver: zodResolver(step4Schema) });

  const metricLabel = form2.watch('metric_type') === 'prs' ? 'merged PRs' : 'tickets';

  // ── Step handlers ──

  const onStep1 = form1.handleSubmit((data) => {
    setStep1Data(data);
    setStep(1);
  });

  const onStep2 = form2.handleSubmit((data) => {
    setStep2Data(data);
    setStep(2);
  });

  const onStep3 = () => {
    const valid = platforms.every((p) => p.adopted_date);
    if (!valid) {
      toast.error('Every subscription needs an adoption date (YYYY-MM)');
      return;
    }
    if (platforms.length === 0) {
      toast.error('Add at least one AI subscription');
      return;
    }
    setStep(3);
  };

  const onStep4 = form4.handleSubmit((data) => {
    if (!step1Data || !step2Data) return;

    const workspaceId = `pending-${Date.now()}`;

    const workspace = {
      id: workspaceId,
      user_id: '',
      name: step1Data.name,
      team_size: step1Data.team_size,
      avg_annual_salary: step1Data.avg_annual_salary,
      monthly_hours: step1Data.monthly_hours,
      metric_type: step2Data.metric_type,
      rolling_window: step1Data.rolling_window,
      baseline_per_dev: step2Data.baseline_per_dev,
      ai_adoption_month: step2Data.ai_adoption_month,
      current_per_dev: data.current_per_dev,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const aiPlatforms: AIPlatform[] = platforms.map((p, i) => ({
      ...platformToAIPlatform(p, workspaceId),
      id: `pending-platform-${i}`,
      created_at: new Date().toISOString(),
    }));

    const devs: Developer[] = showDevForm
      ? developers
          .filter((d) => d.name.trim())
          .map((d, i) => ({
            id: `pending-dev-${i}`,
            workspace_id: workspaceId,
            name: d.name,
            baseline_tickets: d.baseline_tickets,
            current_tickets: d.current_tickets,
            platform_ids: aiPlatforms.map((p) => p.id),
            created_at: new Date().toISOString(),
          }))
      : [];

    setWorkspace(workspace);
    setPlatforms(aiPlatforms);
    setDevelopers(devs);
    setHasPendingData(true);
    navigate('/dashboard');
  });

  // ── Platform helpers ──

  const updatePlatform = (i: number, patch: Partial<PlatformDraft>) => {
    setPlatformDrafts((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  const removePlatform = (i: number) => {
    setPlatformDrafts((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ── Developer helpers ──

  const updateDeveloper = (i: number, patch: Partial<DeveloperDraft>) => {
    setDeveloperDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  };

  const removeDeveloper = (i: number) => {
    setDeveloperDrafts((prev) => prev.filter((_, idx) => idx !== i));
  };

  const STEPS = ['Team basics', 'Baseline', 'Subscriptions', 'Current numbers'];

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6">
      <MeshBackground />
      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-2 text-xs text-white/30 font-mono uppercase tracking-widest">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </div>
        <StepIndicator current={step} total={STEPS.length} />

        <AnimatePresence mode="wait">
          {/* ── Step 1: Team basics ── */}
          {step === 0 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-heading text-2xl font-bold text-white mb-1">Tell us about your team</h2>
              <p className="text-white/40 text-sm mb-6">This is used to calculate the dollar value of productivity gains.</p>
              <form onSubmit={onStep1} className="space-y-4">
                <div>
                  <label className="label">Team name</label>
                  <input className="mock-input w-full" placeholder="e.g. Platform Engineering" {...form1.register('name')} />
                  <FieldError message={form1.formState.errors.name?.message} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Number of developers</label>
                    <input type="number" className="mock-input w-full" placeholder="8" {...form1.register('team_size')} />
                    <FieldError message={form1.formState.errors.team_size?.message} />
                  </div>
                  <div>
                    <label className="label">Avg annual salary (USD)</label>
                    <input type="number" className="mock-input w-full" placeholder="130000" {...form1.register('avg_annual_salary')} />
                    <FieldError message={form1.formState.errors.avg_annual_salary?.message} />
                  </div>
                </div>
                <div>
                  <label className="label">Tracking window</label>
                  <p className="text-xs text-white/30 mb-2">How many days does your "current" period cover?</p>
                  <div className="flex gap-2">
                    {[30, 60, 90].map((w) => (
                      <label key={w} className="flex-1">
                        <input type="radio" value={w} className="sr-only" {...form1.register('rolling_window')} />
                        <div className={`text-center py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                          String(form1.watch('rolling_window')) === String(w)
                            ? 'border-accent text-accent bg-accent/10'
                            : 'border-white/10 text-white/40 hover:border-white/20'
                        }`}>
                          {w} days
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <details className="group">
                  <summary className="text-xs text-white/30 cursor-pointer select-none">Advanced</summary>
                  <div className="mt-3">
                    <label className="label">Monthly working hours per dev</label>
                    <input type="number" className="mock-input w-full" placeholder="160" {...form1.register('monthly_hours')} />
                    <FieldError message={form1.formState.errors.monthly_hours?.message} />
                  </div>
                </details>
                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Step 2: Baseline ── */}
          {step === 1 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-heading text-2xl font-bold text-white mb-1">Before AI tools</h2>
              <p className="text-white/40 text-sm mb-6">What did your team's productivity look like before AI was introduced?</p>
              <form onSubmit={onStep2} className="space-y-4">
                <div>
                  <label className="label">How do you measure productivity?</label>
                  <div className="flex gap-2">
                    {(['tickets', 'prs'] as const).map((m) => (
                      <label key={m} className="flex-1">
                        <input type="radio" value={m} className="sr-only" {...form2.register('metric_type')} />
                        <div className={`text-center py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                          form2.watch('metric_type') === m
                            ? 'border-accent text-accent bg-accent/10'
                            : 'border-white/10 text-white/40 hover:border-white/20'
                        }`}>
                          {m === 'tickets' ? 'Tickets completed' : 'Merged PRs'}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Avg {metricLabel} per developer per month (before AI)</label>
                  <input type="number" step="0.1" className="mock-input w-full" placeholder="10" {...form2.register('baseline_per_dev')} />
                  <FieldError message={form2.formState.errors.baseline_per_dev?.message} />
                </div>
                <div>
                  <label className="label">When did your team start using AI tools?</label>
                  <input type="month" className="mock-input w-full" {...form2.register('ai_adoption_month')} />
                  <FieldError message={form2.formState.errors.ai_adoption_month?.message} />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(0)} className="btn-ghost flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ── Step 3: Subscriptions ── */}
          {step === 2 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-heading text-2xl font-bold text-white mb-1">AI subscriptions</h2>
              <p className="text-white/40 text-sm mb-6">Add every AI tool your team pays for. These will be ranked by ROI.</p>
              <div className="space-y-3 mb-4">
                {platforms.map((p, i) => (
                  <div key={i} className="card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40 font-mono">Subscription {i + 1}</span>
                      {platforms.length > 1 && (
                        <button onClick={() => removePlatform(i)} className="text-white/20 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="label">Tool</label>
                      <select
                        className="mock-input w-full"
                        value={p.name}
                        onChange={(e) => updatePlatform(i, { name: e.target.value as PlatformName })}
                      >
                        {PLATFORM_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Pricing</label>
                      <div className="flex gap-2 mb-2">
                        {(['flat', 'per_seat'] as const).map((ct) => (
                          <label key={ct} className="flex-1">
                            <input type="radio" className="sr-only" checked={p.cost_type === ct} onChange={() => updatePlatform(i, { cost_type: ct })} />
                            <div className={`text-center py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                              p.cost_type === ct ? 'border-accent text-accent bg-accent/10' : 'border-white/10 text-white/40 hover:border-white/20'
                            }`}>
                              {ct === 'flat' ? 'Flat rate' : 'Per seat'}
                            </div>
                          </label>
                        ))}
                      </div>
                      {p.cost_type === 'flat' ? (
                        <div>
                          <label className="label">Total monthly cost (USD)</label>
                          <input
                            type="number"
                            className="mock-input w-full"
                            placeholder="500"
                            value={p.flat_cost || ''}
                            onChange={(e) => updatePlatform(i, { flat_cost: Number(e.target.value) })}
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label">Cost per seat (USD/mo)</label>
                            <input
                              type="number"
                              className="mock-input w-full"
                              placeholder="19"
                              value={p.per_seat_cost || ''}
                              onChange={(e) => updatePlatform(i, { per_seat_cost: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label className="label">Seats</label>
                            <input
                              type="number"
                              className="mock-input w-full"
                              placeholder="8"
                              value={p.seats || ''}
                              onChange={(e) => updatePlatform(i, { seats: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="label">Adoption date</label>
                      <input
                        type="month"
                        className="mock-input w-full"
                        value={p.adopted_date}
                        onChange={(e) => updatePlatform(i, { adopted_date: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setPlatformDrafts((prev) => [...prev, emptyPlatform()])}
                className="btn-ghost w-full flex items-center justify-center gap-2 mb-4"
              >
                <Plus className="w-4 h-4" /> Add another subscription
              </button>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-ghost flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={onStep3} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Current numbers ── */}
          {step === 3 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-heading text-2xl font-bold text-white mb-1">Current performance</h2>
              <p className="text-white/40 text-sm mb-6">
                What's your team averaging now? Use the last {step1Data?.rolling_window ?? 30} days.
              </p>
              <form onSubmit={onStep4} className="space-y-4">
                <div>
                  <label className="label">Avg {metricLabel} per developer per month (now)</label>
                  <input type="number" step="0.1" className="mock-input w-full" placeholder="15" {...form4.register('current_per_dev')} />
                  <FieldError message={form4.formState.errors.current_per_dev?.message} />
                </div>

                <div className="border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-white">Per-developer breakdown</p>
                      <p className="text-xs text-white/40">Optional — enables individual leverage scores</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDevForm(!showDevForm);
                        if (!showDevForm && developers.length === 0) {
                          setDeveloperDrafts([emptyDeveloper()]);
                        }
                      }}
                      className="text-xs text-accent hover:text-white transition-colors"
                    >
                      {showDevForm ? 'Hide' : 'Add'}
                    </button>
                  </div>
                  {showDevForm && (
                    <div className="space-y-3">
                      {developers.map((d, i) => (
                        <div key={i} className="grid grid-cols-[1fr_80px_80px_24px] gap-2 items-end">
                          <div>
                            {i === 0 && <label className="label">Name</label>}
                            <input
                              className="mock-input w-full"
                              placeholder="Developer name"
                              value={d.name}
                              onChange={(e) => updateDeveloper(i, { name: e.target.value })}
                            />
                          </div>
                          <div>
                            {i === 0 && <label className="label">Before</label>}
                            <input
                              type="number"
                              className="mock-input w-full"
                              placeholder="10"
                              value={d.baseline_tickets || ''}
                              onChange={(e) => updateDeveloper(i, { baseline_tickets: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            {i === 0 && <label className="label">Now</label>}
                            <input
                              type="number"
                              className="mock-input w-full"
                              placeholder="15"
                              value={d.current_tickets || ''}
                              onChange={(e) => updateDeveloper(i, { current_tickets: Number(e.target.value) })}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDeveloper(i)}
                            className="text-white/20 hover:text-red-400 transition-colors pb-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setDeveloperDrafts((prev) => [...prev, emptyDeveloper()])}
                        className="text-xs text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add developer
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(2)} className="btn-ghost flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                    See my ROI <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run dev server and walk through wizard**

```bash
cd "C:/Users/HP/Desktop/Testing Ai/dev-roi" && npm run dev
```

Navigate to `/setup`. Verify:
- Step 1: fill in team name, size, salary, pick 30-day window → Continue works
- Step 2: pick 'tickets', enter baseline, adoption month → Continue works
- Step 3: default platform shown, change cost to per-seat, set adoption date → Continue works
- Step 4: enter current number → "See my ROI" navigates to `/dashboard`

- [ ] **Step 3: Commit**

```bash
git add src/pages/Setup.tsx
git commit -m "feat: rebuild 4-step setup wizard"
```

---

## Task 10: Build new Dashboard components

**Files:**
- Create: `src/components/SubscriptionTable.tsx`
- Create: `src/components/WhatIfSimulator.tsx`
- Create: `src/components/DeveloperTable.tsx`
- Create: `src/components/TrendChart.tsx`
- Create: `src/components/SaveWorkspaceBanner.tsx`
- Modify: `src/components/KPICard.tsx`

- [ ] **Step 1: Create `src/components/SubscriptionTable.tsx`**

```typescript
import { clsx } from 'clsx';
import type { PlatformROI } from '../lib/types';

interface Props {
  platformROIs: PlatformROI[];
}

const BADGE: Record<string, string> = {
  Keep: 'bg-positive/10 text-positive border border-positive/20',
  Monitor: 'bg-amber/10 text-amber border border-amber/20',
  Cut: 'bg-negative/10 text-negative border border-negative/20',
};

export function SubscriptionTable({ platformROIs }: Props) {
  if (platformROIs.length === 0) {
    return (
      <div className="card p-6 text-center text-white/30 text-sm">
        No subscriptions configured
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Tool</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Monthly cost</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Value generated</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">ROI</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Action</th>
          </tr>
        </thead>
        <tbody>
          {platformROIs.map(({ platform, roiIndex, recommendation, platformValue }) => (
            <tr key={platform.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3 font-medium text-white">{platform.name}</td>
              <td className="px-4 py-3 text-right font-mono text-white/70">
                ${platform.monthly_cost.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-mono text-white/70">
                ${Math.round(platformValue).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-mono font-medium" style={{
                color: roiIndex > 2 ? '#00FF94' : roiIndex >= 0.8 ? '#F59E0B' : '#FF4D6D'
              }}>
                {roiIndex.toFixed(1)}×
              </td>
              <td className="px-4 py-3 text-center">
                <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', BADGE[recommendation])}>
                  {recommendation}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/WhatIfSimulator.tsx`**

```typescript
import { useState, useMemo } from 'react';
import type { WorkspaceData, ROIMetrics } from '../lib/types';
import { calculateWhatIf } from '../lib/roiEngine';

interface Props {
  data: WorkspaceData;
  baseMetrics: ROIMetrics;
}

export function WhatIfSimulator({ data, baseMetrics }: Props) {
  const [disabled, setDisabled] = useState<Set<string>>(new Set());

  const whatIfMetrics = useMemo(
    () => calculateWhatIf(data, disabled),
    [data, disabled]
  );

  const toggle = (id: string) => {
    setDisabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const roiDelta = whatIfMetrics.roiMultiple - baseMetrics.roiMultiple;
  const netDelta = whatIfMetrics.netROI - baseMetrics.netROI;

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-white mb-1">What-if simulator</h3>
      <p className="text-xs text-white/40 mb-4">Toggle subscriptions off to see how your ROI changes.</p>

      <div className="space-y-2 mb-6">
        {data.platforms.map((p) => {
          const isOff = disabled.has(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                isOff
                  ? 'border-white/10 bg-white/[0.02] text-white/30 line-through'
                  : 'border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.07]'
              }`}
            >
              <span>{p.name}</span>
              <span className="font-mono text-xs text-white/40">${p.monthly_cost.toLocaleString()}/mo</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/[0.06]">
        <div className="text-center">
          <div className="text-xs text-white/40 mb-1">ROI Multiple</div>
          <div className="font-mono text-xl font-medium text-white">
            {whatIfMetrics.roiMultiple.toFixed(1)}×
          </div>
          {roiDelta !== 0 && (
            <div className={`text-xs font-mono mt-0.5 ${roiDelta > 0 ? 'text-positive' : 'text-negative'}`}>
              {roiDelta > 0 ? '+' : ''}{roiDelta.toFixed(1)}×
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="text-xs text-white/40 mb-1">Net Monthly</div>
          <div className="font-mono text-xl font-medium text-white">
            ${Math.round(whatIfMetrics.netROI).toLocaleString()}
          </div>
          {netDelta !== 0 && (
            <div className={`text-xs font-mono mt-0.5 ${netDelta > 0 ? 'text-positive' : 'text-negative'}`}>
              {netDelta > 0 ? '+' : ''}${Math.round(netDelta).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/DeveloperTable.tsx`**

```typescript
import type { DeveloperWithScore } from '../lib/types';

interface Props {
  developers: DeveloperWithScore[];
  metricLabel: string;
}

export function DeveloperTable({ developers, metricLabel }: Props) {
  if (developers.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <h3 className="font-semibold text-white">Developer breakdown</h3>
        <p className="text-xs text-white/40 mt-0.5">Per-developer velocity and AI leverage</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Developer</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Before</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Now</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Δ {metricLabel}</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">AI cost/mo</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Leverage</th>
          </tr>
        </thead>
        <tbody>
          {developers.map((dev) => (
            <tr key={dev.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3 font-medium text-white">{dev.name}</td>
              <td className="px-4 py-3 text-right font-mono text-white/60">{dev.baseline_tickets ?? '—'}</td>
              <td className="px-4 py-3 text-right font-mono text-white/60">{dev.current_tickets ?? '—'}</td>
              <td className="px-4 py-3 text-right font-mono font-medium" style={{
                color: dev.velocityChangePct >= 0 ? '#00FF94' : '#FF4D6D'
              }}>
                {dev.velocityChangePct >= 0 ? '+' : ''}{dev.velocityChangePct.toFixed(0)}%
              </td>
              <td className="px-4 py-3 text-right font-mono text-white/60">
                ${Math.round(dev.attributedAICost).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    color: dev.leverageStatus.color,
                    background: `${dev.leverageStatus.color}15`,
                    border: `1px solid ${dev.leverageStatus.color}30`,
                  }}
                >
                  {dev.leverageStatus.label}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/TrendChart.tsx`**

```typescript
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { WorkspaceSnapshot } from '../lib/types';

interface Props {
  snapshots: WorkspaceSnapshot[];
}

export function TrendChart({ snapshots }: Props) {
  if (snapshots.length < 2) return null;

  const data = snapshots.map((s) => ({
    date: new Date(s.recorded_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    roi: parseFloat(s.roi_multiple.toFixed(2)),
    lift: parseFloat(s.velocity_lift_pct.toFixed(1)),
  }));

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-white mb-1">ROI over time</h3>
      <p className="text-xs text-white/40 mb-4">Updated each time you save new numbers</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
            labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}
          />
          <Line type="monotone" dataKey="roi" name="ROI ×" stroke="#00D4FF" strokeWidth={2} dot={{ r: 3, fill: '#00D4FF', strokeWidth: 0 }} />
          <Line type="monotone" dataKey="lift" name="Velocity lift %" stroke="#00FF94" strokeWidth={2} dot={{ r: 3, fill: '#00FF94', strokeWidth: 0 }} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/SaveWorkspaceBanner.tsx`**

```typescript
import { useAppStore } from '../lib/store';

export function SaveWorkspaceBanner() {
  const { user, isDemoMode, hasPendingData, setAuthModalOpen } = useAppStore();

  if (user || isDemoMode || !hasPendingData) return null;

  return (
    <div className="mb-6 flex items-center justify-between bg-accent/10 border border-accent/20 rounded-xl px-4 py-3">
      <div>
        <p className="text-sm font-medium text-white">Save your workspace</p>
        <p className="text-xs text-white/50 mt-0.5">
          Create a free account to save these results and track ROI month over month.
        </p>
      </div>
      <button
        onClick={() => setAuthModalOpen(true, 'signup')}
        className="btn-primary text-sm px-4 py-2 flex-shrink-0 ml-4"
      >
        Save results
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Update `src/components/KPICard.tsx` — add `trend` prop**

Add the `trend` prop to the existing `KPICardProps` interface and render a delta line:

```typescript
import { motion } from 'framer-motion';
import { useCountUp } from '../lib/hooks/useCountUp';
import { clsx } from 'clsx';
import { Tooltip } from './Tooltip';
import type { ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  subtitle?: string;
  delta?: number;
  trend?: { previous: number; label: string };  // NEW — previous period value
  decimals?: number;
  color?: 'cyan' | 'green' | 'red' | 'white';
  tooltip?: string;
  icon?: ReactNode;
  delay?: number;
}

export function KPICard({
  label,
  value,
  prefix = '',
  suffix = '',
  subtitle,
  delta,
  trend,
  decimals = 0,
  color = 'cyan',
  tooltip,
  icon,
  delay = 0,
}: KPICardProps) {
  const animatedValue = useCountUp({ end: value, decimals, duration: 1400 });

  const colorMap = {
    cyan: '#00D4FF',
    green: '#00FF94',
    red: '#FF4D6D',
    white: 'rgba(255,255,255,0.87)',
  };

  const displayValue =
    decimals > 0 ? animatedValue.toFixed(decimals) : Math.round(animatedValue).toLocaleString();

  const trendDelta = trend ? value - trend.previous : null;
  const trendPct = trend && trend.previous !== 0
    ? ((value - trend.previous) / Math.abs(trend.previous)) * 100
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="card p-5 cursor-default"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium uppercase tracking-widest text-white/40">{label}</span>
          {tooltip && <Tooltip content={tooltip} />}
        </div>
        {icon && <div className="text-white/20">{icon}</div>}
      </div>

      <div className="font-mono text-3xl font-medium tabular-nums leading-none mb-2" style={{ color: colorMap[color] }}>
        {prefix}{displayValue}{suffix}
      </div>

      {(subtitle || delta !== undefined) && (
        <div className="flex items-center gap-2 mt-2">
          {delta !== undefined && (
            <span className={clsx('text-xs font-mono font-medium px-1.5 py-0.5 rounded', delta >= 0 ? 'text-positive bg-positive/10' : 'text-negative bg-negative/10')}>
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
            </span>
          )}
          {subtitle && <span className="text-xs text-white/40">{subtitle}</span>}
        </div>
      )}

      {trend && trendDelta !== null && trendPct !== null && (
        <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center gap-1.5">
          <span className={clsx('text-xs font-mono', trendDelta >= 0 ? 'text-positive' : 'text-negative')}>
            {trendDelta >= 0 ? '▲' : '▼'} {trendPct >= 0 ? '+' : ''}{trendPct.toFixed(1)}%
          </span>
          <span className="text-xs text-white/30">vs {trend.label}</span>
        </div>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 7: Verify types compile**

```bash
cd "C:/Users/HP/Desktop/Testing Ai/dev-roi" && npx tsc --noEmit 2>&1 | grep -E "SubscriptionTable|WhatIfSimulator|DeveloperTable|TrendChart|SaveWorkspaceBanner|KPICard"
```

Expected: no errors on any of these files.

- [ ] **Step 8: Commit**

```bash
git add src/components/SubscriptionTable.tsx src/components/WhatIfSimulator.tsx src/components/DeveloperTable.tsx src/components/TrendChart.tsx src/components/SaveWorkspaceBanner.tsx src/components/KPICard.tsx
git commit -m "feat: add SubscriptionTable, WhatIfSimulator, DeveloperTable, TrendChart, SaveWorkspaceBanner components"
```

---

## Task 11: Rebuild Dashboard page

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Replace `src/pages/Dashboard.tsx`**

```typescript
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Zap, Clock, ArrowRight, AlertCircle } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { KPICard } from '../components/KPICard';
import { SubscriptionTable } from '../components/SubscriptionTable';
import { WhatIfSimulator } from '../components/WhatIfSimulator';
import { DeveloperTable } from '../components/DeveloperTable';
import { TrendChart } from '../components/TrendChart';
import { SaveWorkspaceBanner } from '../components/SaveWorkspaceBanner';
import { useAppStore } from '../lib/store';
import { calculateROIMetrics, calculatePlatformROIs, enrichDevelopers } from '../lib/roiEngine';

export function Dashboard() {
  const { workspace, platforms, developers, snapshots, isDemoMode } = useAppStore();

  const workspaceData = useMemo(
    () => ({ workspace: workspace!, platforms, developers }),
    [workspace, platforms, developers]
  );

  const metrics = useMemo(
    () => (workspace ? calculateROIMetrics(workspaceData) : null),
    [workspaceData, workspace]
  );

  const platformROIs = useMemo(
    () => (workspace ? calculatePlatformROIs(workspaceData) : []),
    [workspaceData, workspace]
  );

  const enrichedDevs = useMemo(
    () => (workspace && developers.length > 0 ? enrichDevelopers(developers, workspace, platforms) : []),
    [workspace, developers, platforms]
  );

  const metricLabel = workspace?.metric_type === 'prs' ? 'PRs' : 'tickets';

  // Trend: compare current metrics to last snapshot
  const prevSnapshot = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null;
  const lastSnapshotLabel = prevSnapshot
    ? new Date(prevSnapshot.recorded_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    : undefined;

  if (!workspace) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="w-12 h-12 text-white/20 mb-4" />
          <h2 className="text-xl font-heading font-bold text-white mb-2">No data yet</h2>
          <p className="text-white/40 mb-6">Complete the setup wizard to see your ROI dashboard.</p>
          <Link to="/setup" className="btn-primary flex items-center gap-2">
            Set up workspace <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </PageTransition>
    );
  }

  if (workspace.baseline_per_dev == null || workspace.current_per_dev == null) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="w-8 h-8 text-amber mb-4" />
          <h2 className="text-xl font-heading font-bold text-white mb-2">Setup incomplete</h2>
          <p className="text-white/40 mb-6">Please complete all 4 steps of the setup wizard.</p>
          <Link to="/setup" className="btn-primary flex items-center gap-2">
            Complete setup <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      {/* Demo banner */}
      {isDemoMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between bg-amber/10 border border-amber/20 rounded-xl px-4 py-3"
        >
          <span className="text-sm text-amber/90">
            Viewing demo — Acme Engineering (8 devs, 3 AI tools)
          </span>
          <Link to="/setup" className="text-xs font-medium text-amber hover:text-white transition-colors">
            Use your own data →
          </Link>
        </motion.div>
      )}

      {/* Save banner (unauthenticated users with pending data) */}
      <SaveWorkspaceBanner />

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">{workspace.name}</h1>
        <p className="text-sm text-white/40 mt-1">
          AI ROI — {metricLabel} · {workspace.rolling_window}-day window
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          label="ROI Multiple"
          value={metrics?.roiMultiple ?? 0}
          suffix="×"
          decimals={1}
          subtitle="return on AI spend"
          color="cyan"
          icon={<Zap className="w-4 h-4" />}
          tooltip="Monthly value created ÷ monthly AI spend."
          trend={prevSnapshot ? { previous: prevSnapshot.roi_multiple, label: lastSnapshotLabel! } : undefined}
          delay={0}
        />
        <KPICard
          label="Net Monthly Value"
          value={metrics?.netROI ?? 0}
          prefix="$"
          subtitle="value minus spend"
          color={metrics?.netROI && metrics.netROI > 0 ? 'green' : 'red'}
          icon={<DollarSign className="w-4 h-4" />}
          tooltip="Monthly productivity value minus total AI spend."
          trend={prevSnapshot ? { previous: prevSnapshot.net_monthly_value, label: lastSnapshotLabel! } : undefined}
          delay={0.08}
        />
        <KPICard
          label="Velocity Lift"
          value={metrics?.velocityLift ?? 0}
          suffix="%"
          decimals={1}
          subtitle={`${metricLabel} vs baseline`}
          color="green"
          icon={<TrendingUp className="w-4 h-4" />}
          tooltip="Percentage increase in tickets/PRs per dev vs your pre-AI baseline."
          trend={prevSnapshot ? { previous: prevSnapshot.velocity_lift_pct, label: lastSnapshotLabel! } : undefined}
          delay={0.16}
        />
        <KPICard
          label="Payback Period"
          value={Math.min(metrics?.paybackWeeks ?? 999, 99)}
          suffix=" wk"
          decimals={1}
          subtitle="to break even"
          color="cyan"
          icon={<Clock className="w-4 h-4" />}
          tooltip="Weeks until your AI spend pays for itself at current velocity."
          delay={0.24}
        />
      </div>

      {/* Trend chart — only when 2+ snapshots */}
      {snapshots.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="mb-6"
        >
          <TrendChart snapshots={snapshots} />
        </motion.div>
      )}

      {/* Subscription table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        className="mb-6"
      >
        <h2 className="font-semibold text-white mb-3">Subscriptions</h2>
        <SubscriptionTable platformROIs={platformROIs} />
      </motion.div>

      {/* What-if simulator */}
      {platforms.length > 0 && metrics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          className="mb-6"
        >
          <WhatIfSimulator data={workspaceData} baseMetrics={metrics} />
        </motion.div>
      )}

      {/* Developer breakdown */}
      {enrichedDevs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.44 }}
        >
          <DeveloperTable developers={enrichedDevs} metricLabel={metricLabel} />
        </motion.div>
      )}
    </PageTransition>
  );
}
```

- [ ] **Step 2: Run full build**

```bash
cd "C:/Users/HP/Desktop/Testing Ai/dev-roi" && npm run build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors. Vite may warn about bundle size — ignore.

- [ ] **Step 3: Run dev server and verify full flow**

```bash
npm run dev
```

Test the golden path:
1. `/` — landing page renders, "See a demo" loads Acme Engineering demo on dashboard
2. Demo dashboard: KPI cards show ROI, subscription table shows 3 tools with Keep/Monitor/Cut, what-if simulator toggles work, developer table shows 4 devs, trend chart shows 3 data points
3. `/setup` — complete all 4 steps, click "See my ROI" — dashboard shows your data with `SaveWorkspaceBanner`
4. Click "Save results" — auth modal opens

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: rebuild dashboard with subscription table, what-if, trend chart, developer breakdown"
```

---

## Task 12: Wire snapshot saves for authenticated users

**Files:**
- Modify: `src/pages/Settings.tsx`

When an authenticated user updates their current numbers and saves, a snapshot should be written. The Settings page is where returning users update their workspace. Add a "Save & snapshot" button.

- [ ] **Step 1: Add snapshot save call to `src/pages/Settings.tsx`**

Open `src/pages/Settings.tsx`. Find where `saveWorkspace` is called on form submit. After a successful save, add:

```typescript
import { saveSnapshot } from '../lib/hooks/useWorkspace';
import { calculateROIMetrics } from '../lib/roiEngine';
import { useAppStore } from '../lib/store';

// Inside the submit handler, after saveWorkspace succeeds:
const store = useAppStore.getState();
if (store.workspace && store.platforms.length > 0) {
  const metrics = calculateROIMetrics({
    workspace: updatedWorkspace,
    platforms: store.platforms,
    developers: store.developers,
  });
  const snapshot = await saveSnapshot(updatedWorkspace.id, metrics);
  store.setSnapshots([...store.snapshots, snapshot]);
}
```

- [ ] **Step 2: Run dev server and verify snapshot saves**

Log in, update current numbers in Settings, save. Reload the dashboard — TrendChart should appear after 2 saves.

- [ ] **Step 3: Final build check**

```bash
cd "C:/Users/HP/Desktop/Testing Ai/dev-roi" && npm run build
```

Expected: clean build, zero TypeScript errors.

- [ ] **Step 4: Final commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: save ROI snapshot on workspace update"
```

---

## Done

The application now:
- Lets managers complete a 4-step wizard without signing up
- Shows ROI dashboard immediately with subscription rankings, what-if simulator, and developer leverage scores
- Prompts to save (auth) only after the manager has seen their results
- Writes a snapshot on each save so ROI trends appear over time
