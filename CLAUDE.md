# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Type-check (tsc) then build
npm run preview    # Preview production build
```

No test runner is configured. There is no lint script — TypeScript (`tsc`) is the only static check, run implicitly by `npm run build`.

## Environment

Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Without these, the app runs in demo-only mode (auth and DB calls are no-ops).

## Architecture

**Stack:** React 18 + TypeScript, Vite, Tailwind CSS, Zustand (state), Supabase (auth + DB), React Router v6, Recharts, Framer Motion, React Hook Form + Zod, Sonner (toasts).

### State management — `src/lib/store.ts`

Single Zustand store (`useAppStore`) holds all app state: `user`, `isDemoMode`, `workspace`, `platforms`, `developers`, and modal flags. This is the source of truth for everything. Components read from the store; mutations go through store actions or the persistence helpers in `src/lib/hooks/useWorkspace.ts`.

**Demo mode** is a first-class state: `loadDemoData()` populates the store from `src/lib/demoData.ts` and persists to `sessionStorage` so it survives a page reload. Real auth clears demo state automatically.

### Data layer — `src/lib/hooks/useWorkspace.ts`

`useWorkspace()` is called once in `AppLayout` and fetches `workspaces`, `ai_platforms`, and `developers` from Supabase for the authenticated user, populating the store. The same file exports async helpers (`saveWorkspace`, `savePlatforms`, `upsertDeveloper`, `deleteDeveloper`) used by pages to write back to Supabase.

### ROI calculations — `src/lib/roiEngine.ts`

All business logic lives here — pure functions, no side effects. Key entry points:

- `calculateROIMetrics(data)` → aggregate ROI numbers
- `calculatePlatformROIs(data)` → per-platform ROI index with buy/cut recommendation
- `enrichDevelopers(devs, workspace, platforms)` → adds leverage scores to developer records
- `generateInsights(data)` → produces the insight cards shown on Dashboard
- `generateVelocityChartData / generateCostPerTicketData` → chart-ready arrays
- `calculateWhatIf(data, disabledIds)` → what-if simulator (excludes selected platforms)

### Routing & layout — `src/App.tsx`

Routes that need the sidebar (`/dashboard`, `/platforms`, `/team`, `/report`, `/settings`, `/integrations`) are listed in `SIDEBAR_ROUTES`. The sidebar auto-collapses below 1024 px. `<ProtectedRoute>` redirects unauthenticated users; it accepts `requireAuth={false}` for `/setup` (accessible without login).

### Integrations — `src/lib/integrations/`

- `db.ts` — Supabase CRUD for the `integrations` table (provider credentials stored as `jsonb config`)
- `jira.ts`, `linear.ts`, `github.ts` — provider-specific sync logic
- `types.ts` — `Integration` and `IntegrationProvider` types

### Database — `supabase/schema.sql`

Four tables: `workspaces` (1-per-user), `ai_platforms`, `developers`, `waitlist`. All have RLS policies keyed on `auth.uid()`. Run the SQL file in the Supabase SQL editor to set up a new project.

## Skills

Always invoke these before starting work:

- **Any new feature or component** → `superpowers:brainstorming` before writing code
- **Any bug or unexpected behavior** → `superpowers:systematic-debugging` before proposing fixes
- **Multi-step tasks** → `superpowers:writing-plans` to plan, then `superpowers:executing-plans` to implement
- **Before claiming work is done** → `superpowers:verification-before-completion`
- **After completing a feature** → `superpowers:requesting-code-review`

### Styling conventions

- Tailwind utility classes throughout; custom theme in `tailwind.config.js`
- Dark background color is `bg-obsidian` (custom token)
- `clsx` + `tailwind-merge` used for conditional class composition
- Framer Motion `<PageTransition>` wraps each page for route animations
