# Dev ROI Calculator — Design Spec
**Date:** 2026-04-15
**Status:** Approved

## Problem

Engineering managers at software organisations struggle to justify AI tool subscriptions (Copilot, ChatGPT, Gemini, Cursor, etc.) because there is no single place to see whether the spend is generating measurable productivity value. The goal is a tool that answers: "Is this subscription worth it for my team?"

---

## User

Engineering managers who own the AI tooling budget for their team. They are not data scientists — inputs must be simple, and the output must be a clear recommendation, not a spreadsheet.

---

## User Flow

1. **Landing page** — explains the tool. Two CTAs: "Calculate ROI" (goes to setup wizard) and "See a demo" (loads sample data into the dashboard).
2. **Setup wizard** (no auth required) — 4 steps, collected in order.
3. **ROI Dashboard** — shown immediately after wizard. A "Save your workspace" prompt appears here, which triggers account creation. Auth is the save mechanism, not a gate.
4. **Saved workspace** (post-auth) — data persists in Supabase. Manager can return, update numbers monthly, and track ROI over time.

---

## Setup Wizard — 4 Steps

**Step 1 — Team basics**
- Team name
- Team size (number of developers)
- Average annual developer salary (used to calculate hourly rate)
- Monthly working hours per developer (default: 160 — shown as advanced/optional)
- Rolling window for "current" period: 30 / 60 / 90 days

**Step 2 — Baseline**
- Productivity metric: Tickets completed or Merged PRs (manager picks one)
- Average per developer per month *before* AI tools were introduced (fixed number, entered once)
- Month AI adoption started (used for subscription attribution)

**Step 3 — AI Subscriptions**
- Add one or more tools. Per tool:
  - Tool name (free text or pick from common list: Copilot, ChatGPT Plus, Gemini Advanced, Cursor, Other)
  - Cost type: flat-rate (enter total monthly cost) or per-seat (cost per seat × number of seats)
  - Adoption date (month/year)
- Can add multiple tools

**Step 4 — Current numbers**
- Average tickets/PRs per developer per month *now* (over the selected rolling window)
- Optional: per-developer breakdown — for each developer, enter name, baseline number, current number, and which AI tools they use (defaults to all tools for MVP)

---

## ROI Dashboard

Layout: KPIs → Subscription table → What-if simulator → Developer breakdown

### KPI Row (4 cards)
- **ROI Multiple** — total monthly productivity value / total AI spend
- **Net Monthly Value** — monthly productivity value minus total AI spend ($)
- **Velocity Lift** — percentage increase in tickets/PRs per dev vs baseline
- **Payback Period** — weeks until AI spend pays for itself at current velocity

### Subscription Table
Ranked by ROI multiple, highest first. Per row:
- Tool name
- Monthly cost
- Attributed monthly value
- ROI multiple
- Recommendation badge: **Keep** (>2×) / **Monitor** (0.8–2×) / **Cut** (<0.8×)

### Trend View
Shown only after a manager has saved at least two months of data. A small sparkline or delta indicator on each KPI card shows movement vs last recorded period — e.g. "ROI Multiple: 3.2× ▲ from 2.8×". A simple line chart below the KPI row plots ROI multiple and velocity lift over time (one data point per saved snapshot). This turns the dashboard from a one-time calculation into a monitoring tool — the manager can see whether their AI investment is improving or degrading month over month.

Data model implication: each time a manager updates their current numbers and saves, a snapshot record is written (date, roi_multiple, velocity_lift_pct, net_monthly_value, total_spend). This is a new `workspace_snapshots` table in Supabase.

### What-if Simulator
Toggle individual subscriptions on/off. All four KPI cards update in real time to reflect the scenario. Helps managers answer "what happens to our ROI if I cancel Gemini?"

### Developer Breakdown
Table with one row per developer (only shown if per-developer data was entered):
- Developer name
- Baseline tickets/PRs
- Current tickets/PRs
- Velocity change (%)
- AI tools assigned
- Leverage score (velocity change relative to attributed AI cost per developer)
- Leverage status: **High leverage** / **On track** / **Low leverage**

---

## ROI Calculation Logic

All calculations are pure functions with no side effects (lives in `src/lib/roiEngine.ts`).

```
hourly_rate         = avg_annual_salary / 12 / monthly_hours
velocity_lift_pct   = (current - baseline) / baseline × 100
monthly_value       = (velocity_lift_pct / 100) × team_size × hourly_rate × monthly_hours
total_monthly_spend = sum of all active subscription costs
net_roi             = monthly_value - total_monthly_spend
roi_multiple        = monthly_value / total_monthly_spend
payback_weeks       = (total_monthly_spend / monthly_value) × 4.33
```

**Per-tool attribution:**
Each tool's share of monthly value is proportional to its cost share of total AI spend, weighted by how many months it has been active within the current rolling window.

```
tool_attribution = (tool_cost × months_active) / sum(all tools: cost × months_active)
tool_value       = monthly_value × tool_attribution
tool_roi         = tool_value / tool_cost
```

**Recommendations:**
- Keep: tool_roi > 2
- Monitor: 0.8 ≤ tool_roi ≤ 2
- Cut: tool_roi < 0.8

**Developer leverage score:**
```
velocity_change_fraction = (current_tickets - baseline_tickets) / baseline_tickets
monthly_salary_cost      = avg_annual_salary / 12
attributed_ai_cost       = sum of (tool_cost / seats) for tools developer uses
leverage_score           = velocity_change_fraction / (attributed_ai_cost / monthly_salary_cost)
```

---

## State Management

Single Zustand store (`useAppStore`) — identical pattern to current app:
- `user`, `isDemoMode`, `workspace`, `platforms`, `developers`
- Demo mode pre-populates store from `demoData.ts` and persists to `sessionStorage`
- Real auth clears demo state

---

## Data Model (Supabase)

Unchanged from current schema:
- `workspaces` — one per user, stores team settings and baseline/current metrics
- `ai_platforms` — one row per subscription per workspace
- `developers` — one row per developer per workspace (optional, for per-dev breakdown)
- `workspace_snapshots` — one row per monthly save (date, roi_multiple, velocity_lift_pct, net_monthly_value, total_spend), used for trend view
- `waitlist` — removed (not needed)
- `integrations` — keep table in schema for future use, remove the UI

All tables have RLS policies keyed on `auth.uid()`.

---

## What to Keep / Change / Remove from Current Codebase

| | Item | Action |
|---|---|---|
| ✅ | Supabase client, auth flow | Keep |
| ✅ | Zustand store structure | Keep |
| ✅ | ROI engine functions (`roiEngine.ts`) | Keep, minor updates |
| ✅ | Tailwind dark theme, `bg-obsidian` token | Keep |
| ✅ | Recharts, Framer Motion, Sonner | Keep |
| ✅ | `useWorkspace` hook, Supabase CRUD helpers | Keep |
| 🔁 | Setup wizard | Redesign to match 4-step flow |
| 🔁 | Dashboard layout | Redesign: KPIs → subscriptions → what-if → developers |
| 🔁 | Landing page | Simplify, two CTAs only |
| 🗑 | Integrations page (Jira/Linear/GitHub UI) | Remove (future version) |
| 🗑 | Waitlist modal | Remove |
| 🗑 | Standalone Platforms route | Merge into dashboard |

---

## Out of Scope (MVP)

- Jira / GitHub / Linear API integrations (auto-populate numbers) — planned for v2
- Per-developer tool assignment (MVP: all devs use all tools)
- Shareable report / PDF export
- Multi-user workspace access
- Story points as a productivity metric (tickets and PRs only for MVP)
