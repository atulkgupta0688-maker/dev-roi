# UI Overhaul Design — 2026-04-18

## Summary

Six coordinated improvements to the dev-roi app: persistent top navigation, setup navigation polish, demo-data fix, landing page redesign, dashboard interactivity, and mobile responsiveness fixes.

---

## 1. Persistent Top Navigation (`TopNav`)

A new `TopNav` component rendered on all routes above all content.

### Behaviour
- Three links: **Home** (`/`), **Setup** (`/setup`), **Dashboard** (`/dashboard`)
- **Home** and **Setup** are always active
- **Dashboard** is grayed out (`opacity-40`, `cursor-not-allowed`, pointer-events none) until `workspace !== null` in the Zustand store — meaning all 3 setup steps have been completed and "Create summary" was clicked (or demo data was loaded)
- Once workspace data exists, Dashboard link becomes fully active

### Styling
- Fixed at top, full width, `z-50`
- Dark glass: `bg-obsidian/80 backdrop-blur-md` with a subtle `border-b border-white/[0.06]`
- Height: `h-[61px]` (matches existing `pt-[61px]` offsets in Setup and Dashboard)
- Active link: accent-colored with underline indicator; inactive: `text-white/40`
- Mobile: links stay horizontal, compact — logo/brand left, links right

### Integration
- Rendered in `AppLayout` in `App.tsx`, outside the sidebar and main content
- Sidebar on `/dashboard` sits below TopNav — sidebar gets `top-[61px]`
- `MeshBackground` and content areas unaffected

---

## 2. Setup Page — Navigation Buttons

### Fix: "Fill with demo data"
- Remove `setStep(1)` from `fillDemoData()` — user stays on Step 1 after filling
- All form values pre-filled; user navigates forward manually
- Toast message updated: "Demo data loaded — click Continue to proceed"

### Next / Previous Buttons (Option B)
- **Style:** Outlined (transparent bg, accent border) → fills with accent on hover
- **Hover animation:** `ChevronRight`/`ChevronLeft` icon slides 3–4px in the direction of travel on hover using Framer Motion or CSS transition
- **Size:** Larger than current — `py-3 px-6` minimum, full-width "Continue" on mobile
- **Back button:** Smaller, ghost style — left arrow + "Back" text
- Step labels rendered beneath the progress bar dots (e.g. "Team basics · Subscriptions · Velocity metrics")

### Button rename
- "See my ROI" → **"Create summary"** on the final step submit button

---

## 3. Landing Page Redesign

Full-screen immersive layout replacing the current minimal centered card.

### Layout
- `MeshBackground` kept; add 2–3 large slow-drifting gradient blobs (`position: absolute`, `blur-3xl`, low opacity) for depth
- Centered hero column, vertically centered

### Hero copy
- Headline: bold, large (`text-4xl sm:text-6xl`), dramatic — e.g. **"Is your AI spend\nactually working?"**
- Subheadline: one punchy line, `text-white/50`

### Floating metric cards
- 3 cards positioned around the hero (absolute positioned on desktop, hidden on mobile to avoid clutter)
- Content examples: `3.2× ROI`, `$42k saved/yr`, `5 tools tracked`
- Style: glass morphism — `bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm rounded-2xl`
- Animation: subtle continuous `y` float (up/down 8px, 3–4s ease-in-out loop) via Framer Motion, each with different phase offset

### CTAs
- Primary: **"Show me the numbers"** — large pill, gradient fill (`from-accent to-cyan-400`), glow shadow on hover, navigates to `/setup`
- Secondary: **"See a demo"** — ghost button beneath, loads demo data and navigates to `/dashboard`

### Feature strip
- Keep 3 existing feature bullets at bottom, bump up to `text-white/60` (slightly more visible)

### Mobile
- Floating cards hidden on mobile (`hidden lg:block`)
- Hero text scales down gracefully
- CTAs stack vertically, full width

---

## 4. Dashboard Interactivity

### Animated KPI counters
- On mount, KPI numbers count up from 0 to their final value over ~800ms
- Easing: ease-out cubic
- Implemented in `KPICard` component — add a `useEffect` + `requestAnimationFrame` counter, or use a small custom hook
- Respects `prefers-reduced-motion` — if set, shows final value immediately

### Clickable platform chart bars
- Each bar in `PlatformChart` becomes clickable
- Clicking a bar sets `selectedPlatformId` state (local to Dashboard)
- A detail panel slides open below the chart (Framer Motion `AnimatePresence` + `height` animation)
- Panel shows: platform name, monthly cost, ROI index, recommendation badge (Keep / Monitor / Cut), usage %
- Clicking the same bar again (or an X button) collapses the panel
- Mobile: panel stacks naturally below chart, full width

### Mobile dashboard audit
- Audit all sections for `overflow-x` issues — fix any elements exceeding screen width
- Ensure KPI grid collapses to 1 column on `sm` and 2 on `md`
- Subscription table: make horizontally scrollable (`overflow-x-auto`) if needed
- Platform chart: ensure `ResponsiveContainer` fills correctly on narrow screens

---

## 5. Affected Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `TopNav`, adjust layout |
| `src/components/TopNav.tsx` | New component |
| `src/pages/Landing.tsx` | Full redesign |
| `src/pages/Setup.tsx` | Button styles, demo-data fix, button rename |
| `src/pages/Dashboard.tsx` | Selected platform state, detail panel |
| `src/components/KPICard.tsx` | Animated counter |
| `src/components/PlatformChart.tsx` | Clickable bars, `onBarClick` callback |

---

## 6. Non-goals

- No backend changes
- No new routes
- No auth changes
- No refactoring of unrelated components
