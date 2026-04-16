# AI Spend Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shift the product from "AI ROI calculator" to "AI spend optimization decision tool" by adding `usage_percent` per platform, a new `spendEngine.ts` for waste calculations, and replacing the dashboard KPI cards with plain-English spend insights.

**Architecture:** A new `spendEngine.ts` lives alongside the untouched `roiEngine.ts`. The setup wizard is reduced from 4 steps to 2 (team name + size, then subscriptions with usage %). The dashboard replaces 4 KPI cards with 3 insight blocks (Total Spend, Usage Insight, Waste + Recommendation) and rewrites the subscriptions table columns.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Zustand, Supabase, React Hook Form + Zod, Framer Motion.

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `src/lib/types.ts` | Modify | Add `usage_percent: number` to `AIPlatform` |
| `src/lib/spendEngine.ts` | **Create** | `SpendInsights` type + `calculateSpendInsights()` |
| `src/lib/demoData.ts` | Modify | Add `usage_percent` to 3 demo platforms |
| `src/lib/hooks/useWorkspace.ts` | Modify | Include `usage_percent` in `savePendingWorkspace` |
| `src/pages/Setup.tsx` | Modify | 2-step wizard, remove Steps 2 & 4, add usage_percent input |
| `src/pages/Dashboard.tsx` | Modify | Replace KPI cards + remove WhatIfSimulator/DeveloperTable |
| `src/components/SubscriptionTable.tsx` | Modify | New columns: Tool, Monthly Cost, Usage %, Waste |
| `supabase/schema.sql` | Modify | Add `usage_percent` column to `ai_platforms` |

`roiEngine.ts`, `WhatIfSimulator.tsx`, `DeveloperTable.tsx`, `KPICard.tsx`, `TrendChart.tsx` — **not touched**.

---

## Task 1: Add `usage_percent` to types and schema

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Add field to `AIPlatform` type**

In `src/lib/types.ts`, update the `AIPlatform` interface (currently at line 31–39):

```ts
export interface AIPlatform {
  id: string;
  workspace_id: string;
  name: PlatformName;
  monthly_cost: number;
  seats: number;
  adopted_date: string;
  usage_percent: number;   // 0–100
  created_at: string;
}
```

- [ ] **Step 2: Add column to schema**

In `supabase/schema.sql`, add one line to the `ai_platforms` table definition after the `adopted_date` line:

```sql
create table public.ai_platforms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  monthly_cost numeric not null,
  seats int not null default 1,
  adopted_date text not null,
  usage_percent int not null default 0,
  created_at timestamptz default now()
);
```

- [ ] **Step 3: Run migration in Supabase SQL editor**

Run this in your Supabase project's SQL editor:

```sql
ALTER TABLE ai_platforms ADD COLUMN IF NOT EXISTS usage_percent integer NOT NULL DEFAULT 0;
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors (the new field has a default so no existing code breaks yet).

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts supabase/schema.sql
git commit -m "feat: add usage_percent field to AIPlatform type and schema"
```

---

## Task 2: Create `spendEngine.ts`

**Files:**
- Create: `src/lib/spendEngine.ts`

- [ ] **Step 1: Create the file**

```ts
// src/lib/spendEngine.ts

import type { AIPlatform } from './types';

export interface WastedTool {
  name: string;
  waste: number;
}

export interface SpendInsights {
  totalSpend: number;
  topToolName: string;
  topToolUsage: number;
  totalWaste: number;
  recommendation: string;
  wastedTools: WastedTool[];
}

export function calculateSpendInsights(platforms: AIPlatform[]): SpendInsights {
  if (platforms.length === 0) {
    return {
      totalSpend: 0,
      topToolName: '',
      topToolUsage: 0,
      totalWaste: 0,
      recommendation: 'Add your AI subscriptions to get spend insights.',
      wastedTools: [],
    };
  }

  const totalSpend = platforms.reduce((sum, p) => sum + p.monthly_cost, 0);

  // Top tool by usage_percent
  const topTool = platforms.reduce((best, p) =>
    p.usage_percent > best.usage_percent ? p : best
  );

  // Waste per tool
  const wastedTools: WastedTool[] = platforms
    .map((p) => {
      const expectedCost = totalSpend * (p.usage_percent / 100);
      const waste = Math.max(0, p.monthly_cost - expectedCost);
      return { name: p.name, waste };
    })
    .filter((t) => t.waste > 0);

  const totalWaste = wastedTools.reduce((sum, t) => sum + t.waste, 0);

  // Rule-based recommendation
  let recommendation = 'Current allocation looks efficient.';

  const highCostLowUsage = platforms.find(
    (p) => p.monthly_cost > totalSpend * 0.4 && p.usage_percent < 20
  );
  if (highCostLowUsage) {
    recommendation = `Reduce licenses for ${highCostLowUsage.name}.`;
  } else if (topTool.usage_percent > 60) {
    recommendation = `Reallocate budget toward ${topTool.name}.`;
  }

  return {
    totalSpend,
    topToolName: topTool.name,
    topToolUsage: topTool.usage_percent,
    totalWaste,
    recommendation,
    wastedTools,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/spendEngine.ts
git commit -m "feat: add spendEngine with calculateSpendInsights"
```

---

## Task 3: Update demo data with `usage_percent`

**Files:**
- Modify: `src/lib/demoData.ts`

- [ ] **Step 1: Add `usage_percent` to each demo platform**

In `src/lib/demoData.ts`, update the three platforms inside `DEMO_DATA.platforms`. The values must sum to 100:

```ts
platforms: [
  {
    id: DEMO_COPILOT_ID,
    workspace_id: DEMO_WORKSPACE_ID,
    name: 'GitHub Copilot',
    monthly_cost: 400,
    seats: 8,
    usage_percent: 55,
    adopted_date: '2024-07',
    created_at: new Date().toISOString(),
  },
  {
    id: DEMO_CHATGPT_ID,
    workspace_id: DEMO_WORKSPACE_ID,
    name: 'ChatGPT Plus',
    monthly_cost: 200,
    seats: 8,
    usage_percent: 30,
    adopted_date: '2024-07',
    created_at: new Date().toISOString(),
  },
  {
    id: DEMO_GEMINI_ID,
    workspace_id: DEMO_WORKSPACE_ID,
    name: 'Gemini Advanced',
    monthly_cost: 600,
    seats: 8,
    usage_percent: 15,
    adopted_date: '2024-09',
    created_at: new Date().toISOString(),
  },
],
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/demoData.ts
git commit -m "feat: add usage_percent to demo platform data"
```

---

## Task 4: Update Setup wizard (2 steps, usage_percent input)

**Files:**
- Modify: `src/pages/Setup.tsx`

- [ ] **Step 1: Replace the entire Setup.tsx with the new 2-step wizard**

The new file keeps all existing imports that are still needed and removes all step 2/4 logic. Replace the full contents of `src/pages/Setup.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '../lib/store';
import { savePendingWorkspace } from '../lib/hooks/useWorkspace';
import type { AIPlatform, PlatformName } from '../lib/types';
import { MeshBackground } from '../components/MeshBackground';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(1, 'Team name is required'),
  team_size: z.coerce.number().min(1, 'At least 1 developer'),
});

type Step1Data = z.infer<typeof step1Schema>;

// ─── Platform form ────────────────────────────────────────────────────────────

interface PlatformDraft {
  name: PlatformName;
  cost_type: 'flat' | 'per_seat';
  flat_cost: number;
  per_seat_cost: number;
  seats: number;
  adopted_date: string;
  usage_percent: number;
}

const PLATFORM_OPTIONS: PlatformName[] = [
  'GitHub Copilot',
  'ChatGPT Plus',
  'Gemini Advanced',
  'Cursor',
  'Claude',
  'Other',
];

function emptyPlatform(count: number): PlatformDraft {
  return {
    name: 'GitHub Copilot',
    cost_type: 'per_seat',
    flat_cost: 0,
    per_seat_cost: 19,
    seats: 1,
    adopted_date: '',
    usage_percent: Math.round(100 / count),
  };
}

function platformToAIPlatform(
  draft: PlatformDraft,
  workspaceId: string
): Omit<AIPlatform, 'id' | 'created_at'> {
  const monthly_cost =
    draft.cost_type === 'flat' ? draft.flat_cost : draft.per_seat_cost * draft.seats;
  return {
    workspace_id: workspaceId,
    name: draft.name,
    monthly_cost,
    seats: draft.seats,
    adopted_date: draft.adopted_date,
    usage_percent: draft.usage_percent,
  };
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
  const { user, setWorkspace, setPlatforms, setDevelopers, setHasPendingData } = useAppStore();

  const [step, setStep] = useState(0);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [platforms, setPlatformDrafts] = useState<PlatformDraft[]>([emptyPlatform(1)]);

  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema) });

  const totalUsage = platforms.reduce((sum, p) => sum + (p.usage_percent || 0), 0);
  const usageWarning = totalUsage < 90 || totalUsage > 110;

  const onStep1 = form1.handleSubmit((data) => {
    setStep1Data(data);
    setStep(1);
  });

  const onStep2 = () => {
    const valid = platforms.every((p) => p.adopted_date);
    if (!valid) {
      toast.error('Every subscription needs an adoption date (YYYY-MM)');
      return;
    }
    if (platforms.length === 0) {
      toast.error('Add at least one AI subscription');
      return;
    }
    if (!step1Data) return;

    const workspaceId = `pending-${Date.now()}`;

    const workspace = {
      id: workspaceId,
      user_id: '',
      name: step1Data.name,
      team_size: step1Data.team_size,
      avg_annual_salary: 0,
      monthly_hours: 160,
      metric_type: 'tickets' as const,
      rolling_window: 30 as const,
      baseline_per_dev: null,
      ai_adoption_month: null,
      current_per_dev: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const aiPlatforms: AIPlatform[] = platforms.map((p, i) => ({
      ...platformToAIPlatform(p, workspaceId),
      id: `pending-platform-${i}`,
      created_at: new Date().toISOString(),
    }));

    setWorkspace(workspace);
    setPlatforms(aiPlatforms);
    setDevelopers([]);

    if (user) {
      setHasPendingData(false);
      savePendingWorkspace(user.id, workspace, aiPlatforms, [])
        .then((saved) => {
          setWorkspace(saved.workspace);
          setPlatforms(saved.platforms);
          setDevelopers(saved.developers);
          toast.success('Workspace saved!');
        })
        .catch(() => toast.error('Failed to save workspace. Please try again.'));
    } else {
      setHasPendingData(true);
    }

    navigate('/dashboard');
  };

  const updatePlatform = (i: number, patch: Partial<PlatformDraft>) => {
    setPlatformDrafts((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  const removePlatform = (i: number) => {
    setPlatformDrafts((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addPlatform = () => {
    setPlatformDrafts((prev) => {
      const next = [...prev, emptyPlatform(prev.length + 1)];
      return next;
    });
  };

  const STEPS = ['Team basics', 'Subscriptions'];

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
              <p className="text-white/40 text-sm mb-6">We'll use this to track your AI spend.</p>
              <form onSubmit={onStep1} className="space-y-4">
                <div>
                  <label className="label">Team name</label>
                  <input className="input-dark w-full" placeholder="e.g. Platform Engineering" {...form1.register('name')} />
                  <FieldError message={form1.formState.errors.name?.message} />
                </div>
                <div>
                  <label className="label">Number of developers</label>
                  <input type="number" className="input-dark w-full" placeholder="8" {...form1.register('team_size')} />
                  <FieldError message={form1.formState.errors.team_size?.message} />
                </div>
                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Step 2: Subscriptions ── */}
          {step === 1 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-heading text-2xl font-bold text-white mb-1">AI subscriptions</h2>
              <p className="text-white/40 text-sm mb-6">Add every AI tool your team pays for and estimate how much of your work happens in each.</p>

              {usageWarning && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-amber/10 border border-amber/20 text-xs text-amber/90">
                  Usage percentages should add up to ~100% (currently {totalUsage}%)
                </div>
              )}

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
                        className="input-dark w-full"
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
                            className="input-dark w-full"
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
                              className="input-dark w-full"
                              placeholder="19"
                              value={p.per_seat_cost || ''}
                              onChange={(e) => updatePlatform(i, { per_seat_cost: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label className="label">Seats</label>
                            <input
                              type="number"
                              className="input-dark w-full"
                              placeholder="8"
                              value={p.seats || ''}
                              onChange={(e) => updatePlatform(i, { seats: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label">Adoption date</label>
                        <input
                          type="month"
                          className="input-dark w-full"
                          value={p.adopted_date}
                          onChange={(e) => updatePlatform(i, { adopted_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label">Estimated usage (%)</label>
                        <input
                          type="number"
                          className="input-dark w-full"
                          placeholder="50"
                          min={0}
                          max={100}
                          value={p.usage_percent || ''}
                          onChange={(e) => updatePlatform(i, { usage_percent: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={addPlatform}
                className="btn-ghost w-full flex items-center justify-center gap-2 mb-4"
              >
                <Plus className="w-4 h-4" /> Add another subscription
              </button>
              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="btn-ghost flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={onStep2} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  See my spend <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Setup.tsx
git commit -m "feat: reduce setup wizard to 2 steps, add usage_percent input"
```

---

## Task 5: Update `savePendingWorkspace` to pass `usage_percent`

**Files:**
- Modify: `src/lib/hooks/useWorkspace.ts`

The `savePlatforms` helper already passes the full platform object through, so `usage_percent` will be included automatically when inserted. No code change needed in `savePlatforms` itself.

However, `savePendingWorkspace` currently maps `developers` explicitly — we need to verify `platforms` pass through cleanly.

- [ ] **Step 1: Verify `savePlatforms` passes `usage_percent`**

In `src/lib/hooks/useWorkspace.ts`, `savePlatforms` (lines 79–91) does:
```ts
.insert(platforms.map((p) => ({ ...p, workspace_id: workspaceId })))
```
This spreads the full platform object, so `usage_percent` will be included automatically. **No code change needed here.**

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit (no-op — just verification)**

If no changes were needed, skip this commit. If any adjustments were made, commit with:

```bash
git add src/lib/hooks/useWorkspace.ts
git commit -m "fix: ensure usage_percent flows through savePlatforms"
```

---

## Task 6: Rewrite `SubscriptionTable` with usage/waste columns

**Files:**
- Modify: `src/components/SubscriptionTable.tsx`

- [ ] **Step 1: Replace the full file contents**

```tsx
import type { AIPlatform } from '../lib/types';

interface Props {
  platforms: AIPlatform[];
}

export function SubscriptionTable({ platforms }: Props) {
  if (platforms.length === 0) {
    return (
      <div className="card p-6 text-center text-white/30 text-sm">
        No subscriptions configured
      </div>
    );
  }

  const totalSpend = platforms.reduce((sum, p) => sum + p.monthly_cost, 0);

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Tool</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Monthly cost</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Usage</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Waste</th>
          </tr>
        </thead>
        <tbody>
          {platforms.map((p) => {
            const expectedCost = totalSpend * (p.usage_percent / 100);
            const waste = Math.max(0, p.monthly_cost - expectedCost);
            return (
              <tr key={p.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                <td className="px-4 py-3 text-right font-mono text-white/70">
                  ${p.monthly_cost.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-mono text-white/70">
                  {p.usage_percent}%
                </td>
                <td className="px-4 py-3 text-right font-mono" style={{
                  color: waste > 0 ? '#F59E0B' : 'rgba(255,255,255,0.4)'
                }}>
                  {waste > 0 ? `$${Math.round(waste).toLocaleString()}` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors. Note: Dashboard.tsx still passes `platformROIs` to this component — that will be fixed in Task 7.

- [ ] **Step 3: Commit**

```bash
git add src/components/SubscriptionTable.tsx
git commit -m "feat: rewrite SubscriptionTable with usage/waste columns"
```

---

## Task 7: Rewrite Dashboard with spend insight blocks

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Replace the full Dashboard.tsx**

```tsx
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DollarSign, AlertCircle, ArrowRight } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { SubscriptionTable } from '../components/SubscriptionTable';
import { TrendChart } from '../components/TrendChart';
import { SaveWorkspaceBanner } from '../components/SaveWorkspaceBanner';
import { useAppStore } from '../lib/store';
import { calculateSpendInsights } from '../lib/spendEngine';

export function Dashboard() {
  const { workspace, platforms, snapshots, isDemoMode } = useAppStore();

  const insights = useMemo(
    () => calculateSpendInsights(platforms),
    [platforms]
  );

  if (!workspace) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="w-12 h-12 text-white/20 mb-4" />
          <h2 className="text-xl font-heading font-bold text-white mb-2">No data yet</h2>
          <p className="text-white/40 mb-6">Complete the setup to see your spend dashboard.</p>
          <Link to="/setup" className="btn-primary flex items-center gap-2">
            Set up workspace <ArrowRight className="w-4 h-4" />
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

      <SaveWorkspaceBanner />

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">{workspace.name}</h1>
        <p className="text-sm text-white/40 mt-1">AI spend optimization</p>
      </div>

      {/* Insight blocks */}
      <div className="grid grid-cols-1 gap-4 mb-8">
        {/* A: Total Spend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="card p-5 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan/10 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Total Spend</div>
            <div className="text-2xl font-mono font-bold text-white">
              ${insights.totalSpend.toLocaleString()}<span className="text-sm font-normal text-white/40">/month</span>
            </div>
            <div className="text-xs text-white/40 mt-0.5">across {platforms.length} tool{platforms.length !== 1 ? 's' : ''}</div>
          </div>
        </motion.div>

        {/* B: Usage Insight */}
        {insights.topToolName && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="card p-5"
          >
            <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Usage Insight</div>
            <p className="text-white text-sm leading-relaxed">
              Most work is being done using{' '}
              <span className="text-accent font-medium">{insights.topToolName}</span>{' '}
              (~{insights.topToolUsage}%)
            </p>
          </motion.div>
        )}

        {/* C: Waste + Recommendation */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="card p-5 space-y-3"
        >
          <div className="text-xs text-white/40 uppercase tracking-widest">Waste &amp; Recommendation</div>
          <p className="text-white text-sm">
            {insights.totalWaste > 0
              ? <><span className="text-amber font-medium">${Math.round(insights.totalWaste).toLocaleString()}/month</span> is spent on underutilized tools</>
              : 'No waste detected — spend matches usage.'}
          </p>
          <div className="rounded-lg bg-accent/10 border border-accent/20 px-4 py-3 text-sm text-accent">
            {insights.recommendation}
          </div>
        </motion.div>
      </div>

      {/* Trend chart — only when 2+ snapshots */}
      {snapshots.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mb-6"
        >
          <TrendChart snapshots={snapshots} />
        </motion.div>
      )}

      {/* Subscription table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
      >
        <h2 className="font-semibold text-white mb-3">Subscriptions</h2>
        <SubscriptionTable platforms={platforms} />
      </motion.div>
    </PageTransition>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Start dev server and test manually**

```bash
npm run dev
```

Check:
1. Load demo mode — should see 3 insight blocks with Copilot at 55% usage
2. Subscriptions table shows Tool / Monthly Cost / Usage % / Waste columns
3. Waste column: Copilot ($400) and ChatGPT ($200) should show waste (they cost more than their usage share); Gemini ($600, 15%) is the big one
4. Recommendation block shows actionable text
5. TrendChart still renders (demo has 3 snapshots)
6. Navigate to /setup — 2-step wizard, usage_percent input on step 2

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: replace KPI cards with spend insight blocks on dashboard"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Remove ROI multiple, velocity lift, payback period from dashboard → Task 7 removes all 4 KPI cards
- [x] Add `usage_percent` field per platform → Task 1 (type + schema), Task 4 (setup input)
- [x] Total usage soft validation ~100% → Task 4 (warning banner)
- [x] Waste formula per tool → Task 2 (`spendEngine.ts`) and Task 6 (table)
- [x] Total Spend insight block → Task 7
- [x] Usage Insight (top tool) → Task 7
- [x] Waste Insight → Task 7
- [x] Rule-based recommendation → Task 2 + Task 7
- [x] Subscriptions table rewritten → Task 6
- [x] WhatIfSimulator removed from dashboard → Task 7 (not imported)
- [x] DeveloperTable removed from dashboard → Task 7 (not imported)
- [x] Setup wizard reduced to 2 steps → Task 4
- [x] `roiEngine.ts` untouched → not in any task
- [x] Demo data updated → Task 3
- [x] Supabase migration → Task 1

**Type consistency across tasks:**
- `AIPlatform.usage_percent` defined in Task 1, used in Tasks 2, 3, 4, 6, 7 ✓
- `SpendInsights` defined in Task 2, consumed in Task 7 ✓
- `SubscriptionTable` props change from `{ platformROIs: PlatformROI[] }` → `{ platforms: AIPlatform[] }` — Task 6 defines new props, Task 7 uses `platforms={platforms}` ✓
- `calculateSpendInsights` defined in Task 2, imported in Task 7 ✓
