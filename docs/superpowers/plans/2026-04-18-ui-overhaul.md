# UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent top navigation, redesign the Landing page, polish Setup navigation, make the Dashboard interactive, and fix mobile overflow issues.

**Architecture:** Seven self-contained tasks, each modifying one or two files. TopNav is a new component added to AppLayout; Sidebar loses its mobile header (TopNav replaces it). Each task can be verified with `npm run build` (TypeScript) and manual browser check.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion, Recharts, Zustand, React Router v6, lucide-react.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/TopNav.tsx` | Create | Persistent nav bar with Home/Setup/Dashboard links |
| `src/App.tsx` | Modify | Render TopNav on all routes |
| `src/components/Sidebar.tsx` | Modify | Remove mobile header (TopNav replaces it), shift desktop sidebar below TopNav |
| `src/pages/Landing.tsx` | Modify | Full immersive redesign with blobs, floating cards, new CTA copy |
| `src/pages/Setup.tsx` | Modify | Fix demo-data skip, style Next/Prev buttons, rename final submit |
| `src/components/PlatformChart.tsx` | Modify | Clickable bars, expose `onBarClick` callback |
| `src/pages/Dashboard.tsx` | Modify | Detail panel for selected bar, fix mobile overflow |
| `src/components/SubscriptionTable.tsx` | Modify | Wrap table in `overflow-x-auto` for mobile |

---

## Task 1: TopNav component

**Files:**
- Create: `src/components/TopNav.tsx`

- [ ] **Step 1: Create the TopNav component**

```tsx
// src/components/TopNav.tsx
import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAppStore } from '../lib/store';

export function TopNav() {
  const workspace = useAppStore((s) => s.workspace);
  const navigate = useNavigate();
  const dashboardEnabled = workspace !== null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[61px] bg-obsidian/90 backdrop-blur-md border-b border-white/[0.06] flex items-center px-4 lg:px-6">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        <span className="font-heading font-bold text-white text-base lg:text-lg tracking-tight">
          VelocityIQ
        </span>

        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'text-white bg-white/[0.08]'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              )
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/setup"
            className={({ isActive }) =>
              clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'text-white bg-white/[0.08]'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              )
            }
          >
            Setup
          </NavLink>

          {dashboardEnabled ? (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'text-white bg-white/[0.08]'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                )
              }
            >
              Dashboard
            </NavLink>
          ) : (
            <span
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-white/20 cursor-not-allowed select-none"
              title="Complete setup to unlock"
            >
              Dashboard
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```
Expected: no errors related to `TopNav.tsx`.

---

## Task 2: Integrate TopNav into App, update Sidebar

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Update `App.tsx` to render TopNav on all routes**

Replace the full content of `src/App.tsx` with:

```tsx
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
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
      <TopNav />
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

- [ ] **Step 2: Update `Sidebar.tsx` — remove mobile header, shift desktop sidebar below TopNav**

Replace the full content of `src/components/Sidebar.tsx` with:

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
      {/* Desktop sidebar — sits below TopNav */}
      <aside className="hidden lg:flex fixed left-0 top-[61px] h-[calc(100vh-61px)] w-[220px] bg-obsidian border-r border-white/[0.06] flex-col z-40">
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
        <div className="px-3 pb-4">
          <button
            onClick={handleRecalculate}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.04] w-full transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Recalculate
          </button>
        </div>
      </aside>

      {/* Mobile hamburger — shown on /dashboard on small screens, sits inside TopNav area */}
      <button
        className="lg:hidden fixed top-[14px] right-4 z-[60] text-white/60 hover:text-white transition-colors"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="lg:hidden fixed top-[61px] left-0 right-0 z-40 bg-obsidian border-b border-white/[0.06] px-4 py-3 space-y-1">
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

- [ ] **Step 3: Update Dashboard.tsx top-padding — change `pt-[61px] lg:pt-0` to `pt-[61px]`**

In `src/pages/Dashboard.tsx` line 117, change:
```tsx
<div className="pt-[61px] lg:pt-0">
```
to:
```tsx
<div className="pt-[61px]">
```

- [ ] **Step 4: Update Setup.tsx top-padding — remove `lg:pt-6` override**

In `src/pages/Setup.tsx` line 219, change:
```tsx
<div className="min-h-screen relative flex items-center justify-center p-4 lg:p-6 pt-[61px] lg:pt-6">
```
to:
```tsx
<div className="min-h-screen relative flex items-center justify-center p-4 lg:p-6 pt-[61px]">
```

- [ ] **Step 5: Build and verify**

```bash
npm run build
```
Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/TopNav.tsx src/App.tsx src/components/Sidebar.tsx src/pages/Dashboard.tsx src/pages/Setup.tsx
git commit -m "feat: add persistent TopNav, update Sidebar and layout offsets"
```

---

## Task 3: Landing page redesign

**Files:**
- Modify: `src/pages/Landing.tsx`

- [ ] **Step 1: Replace Landing.tsx with the immersive redesign**

```tsx
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

const FLOATING_CARDS = [
  { value: '3.2×', label: 'Average ROI', color: '#00D4FF', delay: 0, x: '-55%', y: '-30%' },
  { value: '$42k', label: 'Saved per year', color: '#00FF94', delay: 0.4, x: '55%', y: '-20%' },
  { value: '5', label: 'Tools tracked', color: '#A78BFA', delay: 0.8, x: '45%', y: '35%' },
];

const float = (delay: number) => ({
  animate: {
    y: ['0px', '-10px', '0px'],
    transition: {
      duration: 4,
      delay,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
});

export function Landing() {
  const navigate = useNavigate();
  const { loadDemoData } = useAppStore();

  const handleDemo = () => {
    loadDemoData();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden flex flex-col items-center justify-center pt-[61px]">
      <MeshBackground />

      {/* Animated gradient blobs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0,212,255,0.07) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0,255,148,0.05) 0%, transparent 70%)',
          filter: 'blur(40px)',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />

      {/* Floating metric cards — desktop only */}
      {FLOATING_CARDS.map((card) => (
        <motion.div
          key={card.label}
          className="hidden lg:block absolute pointer-events-none"
          style={{ left: '50%', top: '50%', translateX: card.x, translateY: card.y }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: card.delay + 0.5 }}
        >
          <motion.div
            {...float(card.delay)}
            className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm rounded-2xl px-5 py-4 shadow-xl"
          >
            <div className="font-mono text-2xl font-bold mb-0.5" style={{ color: card.color }}>
              {card.value}
            </div>
            <div className="text-xs text-white/40">{card.label}</div>
          </motion.div>
        </motion.div>
      ))}

      {/* Hero */}
      <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-white/40 mb-6 font-mono"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            AI spend analytics
          </motion.div>

          <h1 className="font-heading text-4xl sm:text-6xl font-bold text-white mb-5 leading-tight tracking-tight">
            Is your AI spend<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-accent">
              actually working?
            </span>
          </h1>

          <p className="text-white/50 text-lg mb-10 max-w-md mx-auto leading-relaxed">
            Enter your team's numbers. Get a clear picture of which tools to keep, monitor, or cut.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
            <motion.button
              onClick={() => navigate('/setup')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white shadow-lg transition-shadow hover:shadow-accent/20"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #0099CC 100%)',
                boxShadow: '0 0 0 0 rgba(0,212,255,0)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 32px 4px rgba(0,212,255,0.25)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 0 rgba(0,212,255,0)';
              }}
            >
              Show me the numbers <ArrowRight className="w-4 h-4" />
            </motion.button>

            <motion.button
              onClick={handleDemo}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-ghost flex items-center justify-center gap-2 px-8 py-3.5 text-base"
            >
              See a demo
            </motion.button>
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

- [ ] **Step 2: Build and verify**

```bash
npm run build
```
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Landing.tsx
git commit -m "feat: redesign Landing page with immersive hero, floating cards, gradient blobs"
```

---

## Task 4: Setup page — fix demo data, button styles, rename submit

**Files:**
- Modify: `src/pages/Setup.tsx`

- [ ] **Step 1: Fix `fillDemoData` — remove `setStep(1)` so user stays on Step 1**

In `src/pages/Setup.tsx`, find the `fillDemoData` function (around line 128). Replace it:

```tsx
const fillDemoData = () => {
  form1.setValue('name', 'Momentum Engineering');
  form1.setValue('team_size', 4);
  setStep1Data({ name: 'Momentum Engineering', team_size: 4 });
  setPlatformDrafts([
    { name: 'GitHub Copilot',   cost_type: 'per_seat', flat_cost: 0, per_seat_cost: 19, seats: 4, adopted_date: '2023-07', usage_percent: 45 },
    { name: 'Cursor',           cost_type: 'per_seat', flat_cost: 0, per_seat_cost: 40, seats: 4, adopted_date: '2025-01', usage_percent: 30 },
    { name: 'ChatGPT Plus',     cost_type: 'per_seat', flat_cost: 0, per_seat_cost: 30, seats: 4, adopted_date: '2025-06', usage_percent: 15 },
    { name: 'Gemini Advanced',  cost_type: 'per_seat', flat_cost: 0, per_seat_cost: 30, seats: 4, adopted_date: '2025-11', usage_percent: 6  },
    { name: 'Claude',           cost_type: 'per_seat', flat_cost: 0, per_seat_cost: 30, seats: 4, adopted_date: '2026-02', usage_percent: 4  },
  ]);
  form3.setValue('avg_annual_salary', 55000);
  form3.setValue('monthly_hours', 160);
  form3.setValue('baseline_per_dev', 20);
  form3.setValue('current_per_dev', 21);
  form3.setValue('ai_adoption_month', '2023-07');
  toast.success('Demo data loaded — click Continue to proceed');
};
```

- [ ] **Step 2: Replace the Step 1 Continue button with a styled outlined button**

Find the Step 1 form submit button (around line 253):
```tsx
<button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
  Continue <ChevronRight className="w-4 h-4" />
</button>
```
Replace with:
```tsx
<button
  type="submit"
  className="group w-full flex items-center justify-center gap-2 mt-2 py-3 px-6 rounded-xl border border-accent/60 text-accent font-semibold text-sm transition-all duration-200 hover:bg-accent hover:text-obsidian hover:border-accent hover:shadow-[0_0_20px_rgba(0,212,255,0.2)]"
>
  Continue
  <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
</button>
```

- [ ] **Step 3: Replace Step 2 navigation buttons**

Find the Step 2 Back + Continue buttons (around line 376–383):
```tsx
<div className="flex gap-3">
  <button onClick={() => setStep(0)} className="btn-ghost flex items-center gap-1">
    <ChevronLeft className="w-4 h-4" /> Back
  </button>
  <button onClick={onStep2} className="btn-primary flex-1 flex items-center justify-center gap-2">
    Continue <ChevronRight className="w-4 h-4" />
  </button>
</div>
```
Replace with:
```tsx
<div className="flex gap-3">
  <button
    onClick={() => setStep(0)}
    className="group flex items-center gap-1 py-3 px-4 rounded-xl border border-white/10 text-white/50 font-medium text-sm transition-all duration-200 hover:border-white/30 hover:text-white"
  >
    <ChevronLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
    Back
  </button>
  <button
    onClick={onStep2}
    className="group flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl border border-accent/60 text-accent font-semibold text-sm transition-all duration-200 hover:bg-accent hover:text-obsidian hover:border-accent hover:shadow-[0_0_20px_rgba(0,212,255,0.2)]"
  >
    Continue
    <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
  </button>
</div>
```

- [ ] **Step 4: Replace Step 3 navigation buttons and rename final submit**

Find the Step 3 Back + submit buttons (around line 457–464):
```tsx
<div className="flex gap-3 pt-2">
  <button type="button" onClick={() => setStep(1)} className="btn-ghost flex items-center gap-1">
    <ChevronLeft className="w-4 h-4" /> Back
  </button>
  <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
    See my ROI <ArrowRight className="w-4 h-4" />
  </button>
</div>
```
Replace with:
```tsx
<div className="flex gap-3 pt-2">
  <button
    type="button"
    onClick={() => setStep(1)}
    className="group flex items-center gap-1 py-3 px-4 rounded-xl border border-white/10 text-white/50 font-medium text-sm transition-all duration-200 hover:border-white/30 hover:text-white"
  >
    <ChevronLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
    Back
  </button>
  <button
    type="submit"
    className="group flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl border border-accent/60 text-accent font-semibold text-sm transition-all duration-200 hover:bg-accent hover:text-obsidian hover:border-accent hover:shadow-[0_0_20px_rgba(0,212,255,0.2)]"
  >
    Create summary
    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
  </button>
</div>
```

- [ ] **Step 5: Build and verify**

```bash
npm run build
```
Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Setup.tsx
git commit -m "feat: fix demo-data skip, style step nav buttons, rename submit to Create summary"
```

---

## Task 5: PlatformChart — clickable bars

**Files:**
- Modify: `src/components/PlatformChart.tsx`

- [ ] **Step 1: Add `onBarClick` prop and selection highlight to PlatformChart**

Replace the full content of `src/components/PlatformChart.tsx` with:

```tsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { AIPlatform } from '../lib/types';
import type { PlatformROI } from '../lib/types';

interface Props {
  platforms: AIPlatform[];
  platformROIs?: PlatformROI[];
  selectedIndex?: number;
  onBarClick?: (index: number) => void;
}

const SHORT: Record<string, string> = {
  'GitHub Copilot': 'Copilot',
  'ChatGPT Plus': 'ChatGPT',
  'Gemini Advanced': 'Gemini',
  'Cursor': 'Cursor',
  'Claude': 'Claude',
  'Other': 'Other',
};

const ROI_COLORS = {
  great: '#34d399',
  ok: '#fbbf24',
  poor: '#f87171',
  nodata: '#00D4FF',
};

function roiColor(index?: number) {
  if (index === undefined) return ROI_COLORS.nodata;
  if (index >= 2) return ROI_COLORS.great;
  if (index >= 0.8) return ROI_COLORS.ok;
  return ROI_COLORS.poor;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const cost = payload.find((p: any) => p.dataKey === 'cost')?.value ?? 0;
  const value = payload.find((p: any) => p.dataKey === 'value')?.value ?? 0;
  const hasValue = value > 0;

  return (
    <div className="bg-[#0F1117] border border-white/10 rounded-xl px-4 py-3 text-xs shadow-xl">
      <p className="text-white/60 mb-2 font-medium">{label}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6">
          <span className="text-white/45">Monthly cost</span>
          <span className="font-mono text-white/80">${cost.toLocaleString()}</span>
        </div>
        {hasValue && (
          <>
            <div className="flex justify-between gap-6">
              <span className="text-white/45">Value generated</span>
              <span className="font-mono text-emerald-400">${value.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-6 pt-1 border-t border-white/[0.06]">
              <span className="text-white/45">ROI</span>
              <span className="font-mono font-semibold" style={{ color: roiColor(value / cost) }}>
                {(value / cost).toFixed(1)}×
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export function PlatformChart({ platforms, platformROIs, selectedIndex, onBarClick }: Props) {
  if (platforms.length === 0) return null;

  const roiMap = new Map(platformROIs?.map((r) => [r.platform.id, r]) ?? []);
  const hasROI = platformROIs && platformROIs.some((r) => r.platformValue > 0);

  const data = platforms.map((p) => {
    const roi = roiMap.get(p.id);
    return {
      name: SHORT[p.name] ?? p.name,
      cost: p.monthly_cost,
      value: roi ? Math.max(0, Math.round(roi.platformValue)) : 0,
      roiIndex: roi?.roiIndex,
    };
  });

  const handleClick = (_: any, index: number) => {
    onBarClick?.(index);
  };

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-semibold text-white">Tool comparison</h3>
          <p className="text-xs text-white/30 mt-0.5">
            {hasROI ? 'Monthly cost vs value generated per tool' : 'Monthly spend per tool'}
            {onBarClick && (
              <span className="ml-2 text-white/20">· click a bar for details</span>
            )}
          </p>
        </div>
        {hasROI && (
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-white/15 inline-block" />
              Cost
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-400/60 inline-block" />
              Value
            </span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
          barGap={4}
          barCategoryGap="35%"
          style={{ cursor: onBarClick ? 'pointer' : 'default' }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />

          {hasROI && (
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 2" />
          )}

          <Bar dataKey="cost" name="Cost" radius={[4, 4, 0, 0]} maxBarSize={48} onClick={handleClick}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  hasROI
                    ? roiColor(entry.roiIndex) + (selectedIndex === i ? '55' : '33')
                    : selectedIndex === i
                    ? 'rgba(255,255,255,0.22)'
                    : 'rgba(255,255,255,0.12)'
                }
                stroke={
                  selectedIndex === i
                    ? hasROI
                      ? roiColor(entry.roiIndex)
                      : 'rgba(255,255,255,0.5)'
                    : hasROI
                    ? roiColor(entry.roiIndex) + '66'
                    : 'rgba(255,255,255,0.2)'
                }
                strokeWidth={selectedIndex === i ? 2 : 1}
              />
            ))}
          </Bar>

          {hasROI && (
            <Bar dataKey="value" name="Value" radius={[4, 4, 0, 0]} maxBarSize={48} onClick={handleClick}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={roiColor(entry.roiIndex) + (selectedIndex === i ? 'cc' : 'aa')}
                  stroke={roiColor(entry.roiIndex)}
                  strokeWidth={selectedIndex === i ? 2 : 1}
                />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>

      {!hasROI && (
        <p className="text-center text-xs text-white/25 mt-3">
          Set baseline &amp; current velocity in Settings to see value vs cost comparison
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build and verify**

```bash
npm run build
```
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlatformChart.tsx
git commit -m "feat: add clickable bars to PlatformChart with selection highlight"
```

---

## Task 6: Dashboard — detail panel + mobile fixes

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/components/SubscriptionTable.tsx`

- [ ] **Step 1: Add `selectedBarIndex` state and detail panel to Dashboard**

Replace the full content of `src/pages/Dashboard.tsx` with:

```tsx
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowRight, TrendingUp, TrendingDown, Zap, RotateCcw, X } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { SubscriptionTable } from '../components/SubscriptionTable';
import { PlatformChart } from '../components/PlatformChart';
import { KPICard } from '../components/KPICard';
import { ROICalculationModal } from '../components/ROICalculationModal';
import { useAppStore } from '../lib/store';
import { calculateROIMetrics, calculatePlatformROIs } from '../lib/roiEngine';

type ExplainMetric = 'roi' | 'net' | 'lift' | 'spend' | null;

const RECOMMENDATION_STYLE: Record<string, { text: string; bg: string }> = {
  Keep:    { text: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  Monitor: { text: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/20' },
  Cut:     { text: 'text-rose-400',    bg: 'bg-rose-400/10 border-rose-400/20' },
};

export function Dashboard() {
  const { workspace, platforms, developers, isDemoMode, clearData } = useAppStore();
  const navigate = useNavigate();
  const [explainMetric, setExplainMetric] = useState<ExplainMetric>(null);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

  const roiMetrics = useMemo(
    () =>
      workspace && platforms.length > 0
        ? calculateROIMetrics({ workspace, platforms, developers })
        : null,
    [workspace, platforms, developers]
  );

  const platformROIs = useMemo(
    () =>
      workspace && platforms.length > 0
        ? calculatePlatformROIs({ workspace, platforms, developers })
        : [],
    [workspace, platforms, developers]
  );

  const smartInsights = useMemo(() => {
    if (!roiMetrics || platformROIs.length === 0) return [];

    const cards: { type: 'positive' | 'warning' | 'neutral'; title: string; detail: string }[] = [];

    const best = platformROIs[0];
    if (best) {
      cards.push({
        type: 'positive',
        title: `${best.platform.name} leads your stack`,
        detail: `${best.roiIndex.toFixed(1)}× ROI · $${best.platform.monthly_cost.toLocaleString()}/mo · ${best.platform.usage_percent}% of team usage`,
      });
    }

    const worst = platformROIs[platformROIs.length - 1];
    if (worst && worst.roiIndex < 1.0 && platformROIs.length > 1) {
      cards.push({
        type: 'warning',
        title: `${worst.platform.name} needs attention`,
        detail: `Only ${worst.roiIndex.toFixed(1)}× ROI on $${worst.platform.monthly_cost.toLocaleString()}/mo — consider cutting seats`,
      });
    } else {
      const costPerPctLift =
        roiMetrics.velocityLift > 0
          ? (roiMetrics.totalMonthlySpend / roiMetrics.velocityLift).toFixed(0)
          : null;
      if (costPerPctLift) {
        cards.push({
          type: 'neutral',
          title: 'Spend efficiency looks healthy',
          detail: `$${Number(costPerPctLift).toLocaleString()} per 1% velocity gain — all tools above break-even`,
        });
      }
    }

    if (roiMetrics.monthlyValue > 0) {
      const pw = roiMetrics.paybackWeeks;
      const paybackLabel =
        pw < 1 ? 'under 1 week' : pw < 999 ? `${Math.round(pw)} week${pw >= 2 ? 's' : ''}` : null;
      if (paybackLabel) {
        cards.push({
          type: 'neutral',
          title: `Pays back in ${paybackLabel}`,
          detail: `$${Math.round(roiMetrics.monthlyValue).toLocaleString()} monthly value vs $${Math.round(roiMetrics.totalMonthlySpend).toLocaleString()} spend`,
        });
      }
    }

    return cards;
  }, [roiMetrics, platformROIs]);

  if (!workspace) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center h-64 text-center pt-[61px]">
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

  const hasROIData =
    roiMetrics !== null &&
    workspace.baseline_per_dev !== null &&
    workspace.current_per_dev !== null;

  const INSIGHT_ICON = { positive: TrendingUp, warning: TrendingDown, neutral: Zap };
  const INSIGHT_COLOR = { positive: 'text-emerald-400', warning: 'text-amber-400', neutral: 'text-cyan-400' };
  const INSIGHT_BG = {
    positive: 'bg-emerald-400/8 border-emerald-400/15',
    warning: 'bg-amber-400/8 border-amber-400/15',
    neutral: 'bg-cyan-400/8 border-cyan-400/15',
  };

  const roiMap = new Map(platformROIs.map((r) => [r.platform.id, r]));
  const selectedPlatform = selectedBarIndex !== null ? platforms[selectedBarIndex] : null;
  const selectedROI = selectedPlatform ? roiMap.get(selectedPlatform.id) : null;

  const handleBarClick = (index: number) => {
    setSelectedBarIndex((prev) => (prev === index ? null : index));
  };

  return (
    <PageTransition>
      <div className="pt-[61px]">
        {/* Demo banner */}
        {isDemoMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-between bg-amber/10 border border-amber/20 rounded-xl px-4 py-3"
          >
            <span className="text-sm text-amber/90">
              Viewing demo — Acme Engineering (8 devs, 5 AI tools)
            </span>
            <Link to="/setup" className="text-xs font-medium text-amber hover:text-white transition-colors">
              Use your own data →
            </Link>
          </motion.div>
        )}

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

        {/* Header */}
        <div className="mb-7">
          <h1 className="font-heading text-2xl font-bold text-white">{workspace.name}</h1>
          <p className="text-sm text-white/40 mt-1">
            AI spend optimization · {platforms.length} tool{platforms.length !== 1 ? 's' : ''} · {workspace.team_size} dev{workspace.team_size !== 1 ? 's' : ''}
          </p>
        </div>

        {/* KPI row */}
        {hasROIData && roiMetrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KPICard
              label="ROI multiple"
              value={roiMetrics.roiMultiple}
              suffix="×"
              decimals={1}
              color="cyan"
              tooltip="Monthly value generated ÷ total AI spend"
              delay={0}
              onExplain={() => setExplainMetric('roi')}
            />
            <KPICard
              label="Net monthly value"
              value={roiMetrics.netROI}
              prefix="$"
              decimals={0}
              color="green"
              subtitle="after AI costs"
              delay={0.06}
              onExplain={() => setExplainMetric('net')}
            />
            <KPICard
              label="Velocity lift"
              value={roiMetrics.velocityLift}
              suffix="%"
              decimals={1}
              color="green"
              subtitle={`${workspace.baseline_per_dev} → ${workspace.current_per_dev} tickets/dev/mo`}
              delay={0.12}
              onExplain={() => setExplainMetric('lift')}
            />
            <KPICard
              label="Monthly spend"
              value={roiMetrics.totalMonthlySpend}
              prefix="$"
              decimals={0}
              color="white"
              subtitle={`${platforms.length} subscription${platforms.length !== 1 ? 's' : ''}`}
              delay={0.18}
              onExplain={() => setExplainMetric('spend')}
            />
          </div>
        )}

        {/* Spend-only row when ROI not yet set */}
        {!hasROIData && platforms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <KPICard
              label="Monthly spend"
              value={platforms.reduce((s, p) => s + p.monthly_cost, 0)}
              prefix="$"
              decimals={0}
              color="cyan"
              subtitle={`${platforms.length} subscription${platforms.length !== 1 ? 's' : ''}`}
              delay={0}
              onExplain={() => setExplainMetric('spend')}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="card p-5 flex items-center"
            >
              <p className="text-sm text-white/50">
                Add baseline &amp; current velocity in{' '}
                <Link to="/settings" className="text-cyan-400 hover:text-cyan-300 transition-colors">Settings</Link>{' '}
                to unlock your full ROI breakdown.
              </p>
            </motion.div>
          </div>
        )}

        {/* Smart insight cards */}
        {smartInsights.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {smartInsights.map((ins, i) => {
              const Icon = INSIGHT_ICON[ins.type];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24 + i * 0.07 }}
                  className={`rounded-xl border p-4 ${INSIGHT_BG[ins.type]}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex-shrink-0 ${INSIGHT_COLOR[ins.type]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white leading-snug mb-1">{ins.title}</p>
                      <p className="text-xs text-white/45 leading-relaxed">{ins.detail}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Platform comparison chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-3"
        >
          <PlatformChart
            platforms={platforms}
            platformROIs={platformROIs.length > 0 ? platformROIs : undefined}
            selectedIndex={selectedBarIndex ?? undefined}
            onBarClick={handleBarClick}
          />
        </motion.div>

        {/* Bar detail panel */}
        <AnimatePresence>
          {selectedPlatform && (
            <motion.div
              key="bar-detail"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden mb-6"
            >
              <div className="card p-5 mt-3">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white text-base">{selectedPlatform.name}</h3>
                    <p className="text-xs text-white/40 mt-0.5">Platform details</p>
                  </div>
                  <button
                    onClick={() => setSelectedBarIndex(null)}
                    className="text-white/30 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-white/40 mb-1">Monthly cost</p>
                    <p className="font-mono text-white font-semibold">
                      ${selectedPlatform.monthly_cost.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Usage</p>
                    <p className="font-mono text-white font-semibold">{selectedPlatform.usage_percent}%</p>
                  </div>
                  {selectedROI && (
                    <>
                      <div>
                        <p className="text-xs text-white/40 mb-1">ROI index</p>
                        <p
                          className="font-mono font-semibold"
                          style={{
                            color:
                              selectedROI.roiIndex >= 2
                                ? '#34d399'
                                : selectedROI.roiIndex >= 0.8
                                ? '#fbbf24'
                                : '#f87171',
                          }}
                        >
                          {selectedROI.roiIndex.toFixed(1)}×
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/40 mb-1">Recommendation</p>
                        {(() => {
                          const rec = selectedROI.recommendation;
                          const style = RECOMMENDATION_STYLE[rec];
                          return (
                            <span
                              className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${style.bg} ${style.text}`}
                            >
                              {rec}
                            </span>
                          );
                        })()}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subscription table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46 }}
        >
          <h2 className="font-semibold text-white mb-3">Subscriptions</h2>
          <SubscriptionTable
            platforms={platforms}
            platformROIs={platformROIs.length > 0 ? platformROIs : undefined}
          />
        </motion.div>

        {/* ROI calculation modal */}
        {roiMetrics && workspace && (
          <ROICalculationModal
            metric={explainMetric}
            onClose={() => setExplainMetric(null)}
            roiMetrics={roiMetrics}
            workspace={workspace}
            platforms={platforms}
          />
        )}
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 2: Fix SubscriptionTable mobile overflow**

In `src/components/SubscriptionTable.tsx`, find line 29:
```tsx
<div className="card overflow-hidden">
```
Replace with:
```tsx
<div className="card overflow-hidden overflow-x-auto">
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
```
Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx src/components/SubscriptionTable.tsx
git commit -m "feat: add clickable bar detail panel, fix mobile overflow on Dashboard"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] TopNav with Home/Setup/Dashboard — Task 1 + 2
- [x] Dashboard grayed out until workspace !== null — Task 1 (TopNav uses `workspace` from store)
- [x] Fix "Fill with demo data" skip — Task 4 Step 1
- [x] Styled Next/Prev buttons — Task 4 Steps 2–4
- [x] Rename "See my ROI" → "Create summary" — Task 4 Step 4
- [x] Landing redesign with blobs, floating cards, new CTA — Task 3
- [x] "Show me the numbers" CTA — Task 3
- [x] Animated KPI counters — already implemented via `useCountUp` in KPICard; no change needed
- [x] Clickable chart bars — Task 5
- [x] Bar detail panel — Task 6 Step 1
- [x] Mobile overflow fix — Task 6 Step 2
- [x] Sidebar shifted below TopNav on desktop — Task 2 Step 2
- [x] Mobile responsive throughout — TopNav is flex row, Sidebar mobile hamburger repositioned, KPI grid uses `grid-cols-2` on mobile

**No placeholders found.**

**Type consistency:** `onBarClick?: (index: number) => void` defined in Task 5 and consumed in Task 6. `selectedIndex?: number` defined in Task 5 and passed in Task 6. All consistent.
