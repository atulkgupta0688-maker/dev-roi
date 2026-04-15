# Platform & Developer Editing — Design Spec

**Date:** 2026-04-15  
**Status:** Approved

## Problem

`SubscriptionTable` and `DeveloperTable` on the Dashboard are read-only. After initial setup, there is no UI to add, edit, or delete platforms or developers. The Supabase helper functions (`savePlatforms`, `upsertDeveloper`, `deleteDeveloper`) exist but are never called from any page after the wizard completes.

## Goal

Wire up modal-based add/edit/delete for both platforms and developers directly on the Dashboard, with auto-snapshot on platform changes.

---

## Components

### New: `PlatformModal`

- Handles both **Add** and **Edit** modes (controlled by whether an existing `AIPlatform` is passed in)
- Fields: name (dropdown — same `PLATFORM_OPTIONS` list as Setup wizard), monthly cost, seats, adopted date (YYYY-MM)
- Uses react-hook-form + zod, matching existing form patterns
- Save button shows a loading spinner while the Supabase call is in flight
- Modal stays open on error so the user doesn't lose their input

### New: `DeveloperModal`

- Handles both **Add** and **Edit** modes
- Fields: name (text), baseline tickets/PRs (number), current tickets/PRs (number), platform checkboxes (which AI tools this dev uses — renders current platform list)
- Same form pattern as `PlatformModal`

### Modified: `SubscriptionTable`

- Adds `onEdit: (platform: AIPlatform) => void` and `onDelete: (platform: AIPlatform) => void` props
- Each row gets pencil + trash icon buttons (right-aligned, appear on row hover)
- An "Add subscription" button renders above the table in Dashboard (not inside the component)

### Modified: `DeveloperTable`

- Adds `onEdit: (dev: Developer) => void` and `onDelete: (dev: Developer) => void` props
- Same row-level edit/delete pattern as SubscriptionTable
- An "Add developer" button renders above the table in Dashboard

---

## State (in Dashboard)

```ts
editingPlatform: AIPlatform | 'new' | null   // null=closed, 'new'=add, AIPlatform=edit
editingDeveloper: Developer | 'new' | null
```

---

## Data Flow

### Platform save (add / edit / delete)

1. Modal submits → build updated full platform list (swap edited item, append new one, or filter deleted)
2. `savePlatforms(workspaceId, updatedList)` — delete-then-reinsert in Supabase (existing helper)
3. `setPlatforms(result)` in store
4. Recalculate metrics with new platform list → `saveSnapshot(workspaceId, metrics)` → append to store snapshots
5. If snapshot fails: log warning, do not surface error to user (data is already saved)
6. **Platform delete side-effect:** strip the deleted platform's ID from all developer `platform_ids` arrays via a batch `upsertDeveloper` call, then update store developers

### Developer save (add / edit / delete)

1. Modal submits → call `upsertDeveloper` or `deleteDeveloper`
2. Update store (`addDeveloper` / `updateDeveloper` / `removeDeveloper`)
3. **No snapshot** — developers do not feed into `calculateROIMetrics` (which uses `workspace.baseline_per_dev` / `current_per_dev`). Snapshotting on every dev edit would add duplicate rows with identical ROI values.

---

## Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| Delete last platform | Allowed — dashboard handles empty platform list gracefully |
| Supabase save fails | Toast error, modal stays open, store unchanged |
| Snapshot fails after platform save | Console warning only — data already saved |
| Demo mode | Edit buttons visible; saves go to store only, no Supabase calls |
| Platform deleted while developers reference it | Batch-upsert all developers to strip the stale platform ID from their `platform_ids` arrays |
| Multiple snapshots same month | Existing behavior — chart folds but doesn't break |

---

## Out of Scope

- Bulk import / CSV upload
- Reordering platforms or developers
- Per-developer platform cost overrides
- Inline row editing (rejected in favour of modals for simplicity)
