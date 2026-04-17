# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Landing page with an immersive hero featuring animated gradient blobs, floating metric cards, and a gradient headline.

**Architecture:** Single file replacement — `src/pages/Landing.tsx` is fully rewritten. All animation logic lives inline via Framer Motion. No new components are introduced; `MeshBackground` is already available.

**Tech Stack:** React 18, TypeScript, Framer Motion, Tailwind CSS, Lucide React, React Router v6, Zustand

---

### Task 1: Replace Landing.tsx

**Files:**
- Modify: `src/pages/Landing.tsx` (full rewrite)

- [ ] **Step 1: Write the new Landing.tsx**

Replace the entire file content with the immersive redesign (floating cards, gradient blobs, `float()` helper, updated headline and CTA).

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: exit 0, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Landing.tsx
git commit -m "feat: redesign Landing page with immersive hero, floating cards, gradient blobs"
```
