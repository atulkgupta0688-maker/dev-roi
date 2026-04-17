# VelocityIQ Cleanup & Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename app to VelocityIQ, remove all auth/DB/persistence code, and make every screen fully responsive on mobile and iPad.

**Architecture:** Surgical removal of auth wiring in App.tsx + store.ts, deletion of dead files (AuthModal, ProtectedRoute, SaveWorkspaceBanner, Settings, useWorkspace), sidebar becomes a responsive shell with top-nav on mobile and fixed sidebar on desktop (lg+), Dashboard gains a "Recalculate" banner.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Router v6, Framer Motion

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `src/lib/store.ts` | Remove sessionStorage persistence; remove `initFromSession`; rename session key constant |
| Modify | `src/App.tsx` | Remove Supabase auth listener, AuthModal, savePendingWorkspace; remove `initFromSession` call |
| Delete | `src/components/AuthModal.tsx` | No longer needed |
| Delete | `src/components/ProtectedRoute.tsx` | No longer needed |
| Delete | `src/components/SaveWorkspaceBanner.tsx` | No longer needed |
| Delete | `src/pages/Settings.tsx` | Removed per design |
| Delete | `src/lib/hooks/useWorkspace.ts` | DB sync no longer needed |
| Modify | `src/components/Sidebar.tsx` | Add mobile top-nav with hamburger; rename DevROI → VelocityIQ |
| Modify | `src/App.tsx` | Remove Settings route; remove ml-[220px] offset for mobile |
| Modify | `src/pages/Dashboard.tsx` | Remove SaveWorkspaceBanner import; add Recalculate banner |
| Modify | `src/pages/Landing.tsx` | Mobile padding/font fixes |
| Modify | `src/pages/Setup.tsx` | Mobile padding/layout fixes; remove useWorkspace/saveSnapshot import |
| Modify | `src/pages/Dashboard.tsx` | Mobile grid/spacing fixes |
| Modify | `index.html` | Update `<title>` to VelocityIQ |
| Modify | `package.json` | Update `name` field to velocityiq |

---

## Task 1: Clean up store — remove persistence and dead state

**Files:**
- Modify: `src/lib/store.ts`

- [ ] **Step 1: Replace store.ts content**

Replace the entire file with this (removes sessionStorage, removes `initFromSession`, renames session key):

```typescript
import { create } from 'zustand';
import type { Workspace, AIPlatform, Developer, WorkspaceSnapshot } from './types';
import { DEMO_DATA } from './demoData';

interface AppState {
  isDemoMode: boolean;
  workspace: Workspace | null;
  platforms: AIPlatform[];
  developers: Developer[];
  snapshots: WorkspaceSnapshot[];

  setWorkspace: (workspace: Workspace | null) => void;
  setPlatforms: (platforms: AIPlatform[]) => void;
  setDevelopers: (developers: Developer[]) => void;
  setSnapshots: (snapshots: WorkspaceSnapshot[]) => void;
  addDeveloper: (dev: Developer) => void;
  updateDeveloper: (dev: Developer) => void;
  removeDeveloper: (devId: string) => void;

  saveWorkspaceData: (workspace: Workspace, platforms: AIPlatform[], developers?: Developer[]) => void;

  loadDemoData: () => void;
  clearData: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isDemoMode: false,
  workspace: null,
  platforms: [],
  developers: [],
  snapshots: [],

  setWorkspace: (workspace) => set({ workspace }),
  setPlatforms: (platforms) => set({ platforms }),
  setDevelopers: (developers) => set({ developers }),
  setSnapshots: (snapshots) => set({ snapshots }),

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

  saveWorkspaceData: (workspace, platforms, developers = []) => {
    set({ workspace, platforms, developers, isDemoMode: false });
  },

  loadDemoData: () => {
    set({
      isDemoMode: true,
      workspace: DEMO_DATA.workspace,
      platforms: DEMO_DATA.platforms,
      developers: DEMO_DATA.developers,
      snapshots: DEMO_DATA.snapshots,
    });
  },

  clearData: () => {
    set({
      isDemoMode: false,
      workspace: null,
      platforms: [],
      developers: [],
      snapshots: [],
    });
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

- [ ] **Step 2: Commit**

```bash
git add src/lib/store.ts
git commit -m "refactor: remove sessionStorage persistence from store"
```

---

## Task 2: Delete dead files

**Files:**
- Delete: `src/components/AuthModal.tsx`
- Delete: `src/components/ProtectedRoute.tsx`
- Delete: `src/components/SaveWorkspaceBanner.tsx`
- Delete: `src/pages/Settings.tsx`
- Delete: `src/lib/hooks/useWorkspace.ts`

- [ ] **Step 1: Delete the files**

```bash
rm "src/components/AuthModal.tsx"
rm "src/components/ProtectedRoute.tsx"
rm "src/components/SaveWorkspaceBanner.tsx"
rm "src/pages/Settings.tsx"
rm "src/lib/hooks/useWorkspace.ts"
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "refactor: remove auth, DB, and settings dead code"
```

---

## Task 3: Clean up App.tsx — remove auth wiring and Settings route

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace App.tsx**

```tsx
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { Sidebar } from './components/Sidebar';
import { MeshBackground } from './components/MeshBackground';
import { Landing } from './pages/Landing';
import { Setup } from './pages/Setup';
import { Dashboard } from './pages/Dashboard';

const SIDEBAR_ROUTES = ['/dashboard'];

function AppLayout() {
  const location = useLocation();
  const showSidebar = SIDEBAR_ROUTES.some((r) => location.pathname.startsWith(r));

  return (
    <div className="min-h-screen bg-obsidian flex">
      {showSidebar && <Sidebar />}
      <main className={`flex-1 min-h-screen relative ${showSidebar ? 'lg:ml-[220px]' : ''}`}>
        {showSidebar && <MeshBackground />}
        <div className="relative z-10 p-4 lg:p-6 max-w-7xl mx-auto">
          <AnimatePresence mode="wait" initial={false}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Landing />} />
              <Route path="/setup" element={<Setup />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>
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
  return <AppLayout />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: remove auth wiring and Settings route from App"
```

---

## Task 4: Rename to VelocityIQ in Sidebar and make it responsive

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Replace Sidebar.tsx with responsive version**

```tsx
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Menu, X, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../lib/store';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { clearData } = useAppStore();
  const navigate = useNavigate();

  const handleRecalculate = () => {
    clearData();
    navigate('/setup');
    setMobileOpen(false);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[220px] bg-obsidian border-r border-white/[0.06] flex-col z-40">
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <span className="font-heading font-bold text-white text-lg tracking-tight">VelocityIQ</span>
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

      {/* Mobile top nav */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-obsidian border-b border-white/[0.06] flex items-center justify-between px-4 py-3">
        <span className="font-heading font-bold text-white text-base tracking-tight">VelocityIQ</span>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="text-white/60 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed top-[49px] left-0 right-0 z-40 bg-obsidian border-b border-white/[0.06] px-4 py-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
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
          <button
            onClick={handleRecalculate}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.04] w-full transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Recalculate
          </button>
        </div>
      )}

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: rename to VelocityIQ, add responsive mobile top nav"
```

---

## Task 5: Add Recalculate banner + fix Dashboard mobile layout

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Remove SaveWorkspaceBanner import and add Recalculate banner**

Find and remove this import at the top of `src/pages/Dashboard.tsx`:
```tsx
import { SaveWorkspaceBanner } from '../components/SaveWorkspaceBanner';
```

Add this import instead:
```tsx
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
```

- [ ] **Step 2: Add navigate and clearData to the component**

Inside `export function Dashboard()`, add after the existing `useAppStore` destructure line:

```tsx
const { workspace, platforms, developers, isDemoMode, clearData } = useAppStore();
const navigate = useNavigate();
```

- [ ] **Step 3: Replace `<SaveWorkspaceBanner />` with Recalculate banner**

Find `<SaveWorkspaceBanner />` in the JSX and replace with:

```tsx
{/* Recalculate banner */}
<div className="mb-6 flex items-center justify-between bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3">
  <p className="text-sm text-white/50">Want to try different inputs?</p>
  <button
    onClick={() => { clearData(); navigate('/setup'); }}
    className="flex items-center gap-2 text-xs font-medium text-white/60 hover:text-white transition-colors"
  >
    <RotateCcw className="w-3.5 h-3.5" />
    Recalculate
  </button>
</div>
```

- [ ] **Step 4: Fix mobile padding — add top padding for mobile nav bar**

In the `<PageTransition>` wrapper's first child div, add `pt-[61px] lg:pt-0` to account for the fixed mobile header height:

Find the `return (` JSX block and wrap the content with a top-padding div. The `<PageTransition>` tag itself should be followed by:

```tsx
<PageTransition>
  <div className="pt-[61px] lg:pt-0">
    {/* ... all existing content unchanged ... */}
  </div>
</PageTransition>
```

- [ ] **Step 5: Fix KPI grid for small phones**

Find the KPI row grid:
```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
```
Change to:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: add Recalculate banner, fix mobile layout on Dashboard"
```

---

## Task 6: Fix Setup page mobile layout

**Files:**
- Modify: `src/pages/Setup.tsx`

- [ ] **Step 1: Remove dead imports from Setup.tsx**

Find and remove these imports (they reference deleted files):
```tsx
import { savePendingWorkspace, saveSnapshot } from '../lib/hooks/useWorkspace';
```

- [ ] **Step 2: Replace DB save calls with local store save**

In Setup.tsx, find any calls to `savePendingWorkspace(...)` or `saveSnapshot(...)` and replace with just calling `saveWorkspaceData(workspace, platforms, developers)` from the store (it's already used in the file — just remove the DB call wrappers).

Search for `savePendingWorkspace` usage — it will look similar to:
```tsx
const saved = await savePendingWorkspace(userId, workspace, platforms, developers);
setWorkspace(saved.workspace);
setPlatforms(saved.platforms);
setDevelopers(saved.developers);
```

Replace with:
```tsx
saveWorkspaceData(workspace, platforms, developers);
```

Also remove `saveSnapshot` calls entirely (snapshots are demo-only now).

Remove any `Loader2` import if it was only used for the async save spinner.

- [ ] **Step 3: Add top padding for mobile nav**

In Setup.tsx, find the outermost wrapper div and add `pt-[61px] lg:pt-0`:

```tsx
<div className="min-h-screen relative overflow-x-hidden pt-[61px] lg:pt-0">
```

- [ ] **Step 4: Ensure form containers use responsive padding**

Find any hardcoded `px-6` or `p-6` on the main content container and change to `px-4 lg:px-6` or `p-4 lg:p-6`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Setup.tsx
git commit -m "fix: remove DB imports from Setup, add mobile padding"
```

---

## Task 7: Fix Landing page mobile layout

**Files:**
- Modify: `src/pages/Landing.tsx`

- [ ] **Step 1: Update heading size for small screens**

Find:
```tsx
<h1 className="font-heading text-5xl font-bold text-white mb-4 leading-tight">
```
Replace with:
```tsx
<h1 className="font-heading text-3xl sm:text-5xl font-bold text-white mb-4 leading-tight">
```

- [ ] **Step 2: Update app name in Landing hero (if present)**

Search Landing.tsx for any hardcoded brand name text ("DevROI", "dev-roi") and replace with "VelocityIQ".

- [ ] **Step 3: Commit**

```bash
git add src/pages/Landing.tsx
git commit -m "fix: mobile font size on Landing, rename to VelocityIQ"
```

---

## Task 8: Update page title and package name

**Files:**
- Modify: `index.html`
- Modify: `package.json`

- [ ] **Step 1: Update index.html title**

In `index.html`, find:
```html
<title>...</title>
```
Replace with:
```html
<title>VelocityIQ</title>
```

- [ ] **Step 2: Update package.json name**

In `package.json`, find the `"name"` field and set it to `"velocityiq"`.

- [ ] **Step 3: Commit**

```bash
git add index.html package.json
git commit -m "chore: rename app to VelocityIQ in title and package"
```

---

## Task 9: Verify build passes

- [ ] **Step 1: Run type check + build**

```bash
npm run build
```

Expected: zero TypeScript errors, build succeeds in `dist/`.

- [ ] **Step 2: Fix any remaining TS errors**

Common issues after deleting files:
- Any component still importing from deleted files — find with `grep -r "useWorkspace\|AuthModal\|ProtectedRoute\|SaveWorkspaceBanner\|Settings" src/`
- Remove those imports and usages

- [ ] **Step 3: Smoke-test dev server**

```bash
npm run dev
```

Open `http://localhost:5173` and verify:
1. Landing page loads, title shows "VelocityIQ"
2. "Calculate ROI" → Setup flow works end to end
3. Dashboard shows Recalculate banner
4. "Recalculate" button clears state and goes back to Setup
5. Resize to 375px width — mobile top nav appears, sidebar hidden
6. Hamburger opens menu, closes on backdrop click

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup after VelocityIQ rename"
```
