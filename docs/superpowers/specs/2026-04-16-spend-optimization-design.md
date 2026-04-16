# AI Spend Optimization — Design Spec
**Date:** 2026-04-16  
**Status:** Approved

## Overview

Shift the product from "AI ROI calculator" to "AI spend optimization decision tool". The change is logic and input only — no new pages, no new graphs, no redesign of UI layout or Tailwind styles.

`roiEngine.ts` is **not touched**. All new calculation logic lives in a new `spendEngine.ts`. This is Option C (parallel engine approach).

---

## 1. Data Model

### `AIPlatform` — new field
```ts
usage_percent: number  // 0–100, how much of team's AI work happens on this tool
```

### Supabase migration
```sql
ALTER TABLE ai_platforms ADD COLUMN usage_percent integer DEFAULT 0;
```
Backward compatible — existing rows default to 0.

### `Workspace` — no changes
Fields like `avg_annual_salary`, `monthly_hours`, `baseline_per_dev`, `current_per_dev` remain on the type and in the DB for backward compatibility. They are simply not collected in the new wizard and not used in new calculations.

---

## 2. New File: `src/lib/spendEngine.ts`

Pure functions, no side effects.

### Output type `SpendInsights`
```ts
interface SpendInsights {
  totalSpend: number;
  topToolName: string;
  topToolUsage: number;
  totalWaste: number;
  recommendation: string;
  wastedTools: { name: string; waste: number }[];
}
```

### Waste formula (per tool)
```
total_cost    = platform.monthly_cost
expected_cost = totalSpend × (usage_percent / 100)
waste         = max(0, total_cost - expected_cost)
```

### Recommendation rules (checked in order)
1. If any tool has `monthly_cost > totalSpend × 0.4` AND `usage_percent < 20` → `"Reduce licenses for [tool]"`
2. If any tool has `usage_percent > 60` → `"Reallocate budget toward [tool]"`
3. Otherwise → `"Current allocation looks efficient"`

---

## 3. Setup Wizard

Wizard reduced from 4 steps to 2.

### Step 1 — Team basics
Collects: `name` (team name), `team_size` only.  
Removed: `avg_annual_salary`, `monthly_hours`, `rolling_window`, metric type.  
Removed fields are stored as sensible defaults on the Workspace object (`avg_annual_salary: 0`, `monthly_hours: 160`, `rolling_window: 30`, `metric_type: 'tickets'`).

### Step 2 — AI Subscriptions
Same as current Step 3, plus `usage_percent` number input per tool.  
Label: "Estimated usage (%)"  
Default: `Math.round(100 / platformCount)` — spreads evenly when tools are added.  
Soft validation: if total usage < 90 or > 110, show warning: *"Usage percentages should add up to ~100%"*  

Steps 2 (Baseline) and 4 (Current numbers) and the developer breakdown form are fully removed.

---

## 4. Dashboard

### Removed
- 4 KPI cards (ROI Multiple, Net Monthly Value, Velocity Lift, Payback Period)
- `WhatIfSimulator` component usage
- `DeveloperTable` component usage
- Imports of `calculateROIMetrics`, `calculatePlatformROIs`, `enrichDevelopers`

### Added — 3 Insight Blocks (replace KPI row)

**A. Total Spend**  
`$X,XXX/month across N tools`

**B. Usage Insight**  
`"Most work is being done using [tool] (~X%)"`

**C. Waste + Recommendation**  
- `"$X/month is spent on underutilized tools"` (or "No waste detected" if totalWaste = 0)
- Highlighted callout below with the recommendation string

All text is plain English, no jargon.

### Subscriptions table — rewritten columns
| Tool | Monthly Cost | Usage % | Waste |
|------|-------------|---------|-------|
Replaces: Tool | Monthly Cost | Value generated | ROI | Action

### Kept
- TrendChart (uses `snapshots.total_spend` — still valid)
- Demo banner
- SaveWorkspaceBanner
- Header with workspace name

---

## 5. Demo Data

`demoData.ts` platforms get `usage_percent` values that add to 100:
- GitHub Copilot: 55%
- ChatGPT Plus: 30%
- Gemini Advanced: 15%

---

## 6. Files Changed

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `usage_percent` to `AIPlatform` |
| `src/lib/spendEngine.ts` | **New file** — `SpendInsights`, `calculateSpendInsights` |
| `src/lib/demoData.ts` | Add `usage_percent` to demo platforms |
| `src/lib/hooks/useWorkspace.ts` | Pass `usage_percent` through in save/fetch |
| `src/pages/Setup.tsx` | Reduce to 2 steps, add usage_percent input |
| `src/pages/Dashboard.tsx` | Replace KPI cards + table with spend insights |
| `src/components/SubscriptionTable.tsx` | Rewrite columns (usage/waste instead of ROI) |
| `supabase/schema.sql` | Add `usage_percent` column |
| `roiEngine.ts` | **Not touched** |
| `WhatIfSimulator.tsx` | **Not touched** (just not used on dashboard) |
| `DeveloperTable.tsx` | **Not touched** (just not used on dashboard) |
