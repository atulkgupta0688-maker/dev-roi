# Platform & Developer Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add modal-based add/edit/delete for platforms and developers on the Dashboard, with Supabase persistence and auto-snapshot on platform changes.

**Architecture:** Two new modal components (`PlatformModal`, `DeveloperModal`) open from inline action buttons added to the existing read-only tables. Three new per-platform CRUD helpers replace the delete-all-reinsert `savePlatforms` approach to preserve platform IDs (which developer `platform_ids` arrays reference). Dashboard owns edit state and all async save handlers.

**Tech Stack:** React 18, TypeScript, react-hook-form + zod, Supabase JS client, Tailwind CSS, Sonner (toasts), Lucide icons.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/lib/hooks/useWorkspace.ts` | Add `insertPlatform`, `updatePlatform`, `deletePlatform` helpers |
| Create | `src/components/PlatformModal.tsx` | Add/edit platform form in a modal overlay |
| Create | `src/components/DeveloperModal.tsx` | Add/edit developer form in a modal overlay |
| Modify | `src/components/SubscriptionTable.tsx` | Add `onEdit` / `onDelete` props + row action buttons |
| Modify | `src/components/DeveloperTable.tsx` | Add `onEdit` / `onDelete` props + row action buttons |
| Modify | `src/pages/Dashboard.tsx` | Edit state, Add buttons, modal rendering, save/delete handlers |

---

## Task 1: Add per-platform CRUD helpers to useWorkspace.ts

**Why:** The existing `savePlatforms` does delete-all-then-reinsert, regenerating IDs every call. Developer `platform_ids` arrays hold UUIDs — they break silently if IDs change. These three focused helpers preserve existing IDs.

**Files:**
- Modify: `src/lib/hooks/useWorkspace.ts`

- [ ] **Step 1: Add the three helpers after the existing `savePlatforms` function**

Open `src/lib/hooks/useWorkspace.ts`. After the closing `}` of `savePlatforms` (line ~91), insert:

```ts
export async function insertPlatform(
  workspaceId: string,
  data: Omit<AIPlatform, 'id' | 'workspace_id' | 'created_at'>
): Promise<AIPlatform> {
  const { data: created, error } = await supabase
    .from('ai_platforms')
    .insert({ ...data, workspace_id: workspaceId })
    .select()
    .single();
  if (error) throw error;
  return created as AIPlatform;
}

export async function updatePlatform(
  platformId: string,
  data: Partial<Pick<AIPlatform, 'name' | 'monthly_cost' | 'seats' | 'adopted_date'>>
): Promise<AIPlatform> {
  const { data: updated, error } = await supabase
    .from('ai_platforms')
    .update(data)
    .eq('id', platformId)
    .select()
    .single();
  if (error) throw error;
  return updated as AIPlatform;
}

export async function deletePlatform(platformId: string): Promise<void> {
  const { error } = await supabase
    .from('ai_platforms')
    .delete()
    .eq('id', platformId);
  if (error) throw error;
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: no TypeScript errors. (Build output itself doesn't matter — only tsc errors do.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/useWorkspace.ts
git commit -m "feat: add insertPlatform, updatePlatform, deletePlatform helpers"
```

---

## Task 2: Add action buttons to SubscriptionTable

**Files:**
- Modify: `src/components/SubscriptionTable.tsx`

- [ ] **Step 1: Replace the entire file content**

```tsx
import { clsx } from 'clsx';
import { Pencil, Trash2 } from 'lucide-react';
import type { AIPlatform, PlatformROI } from '../lib/types';

interface Props {
  platformROIs: PlatformROI[];
  onEdit: (platform: AIPlatform) => void;
  onDelete: (platform: AIPlatform) => void;
}

const BADGE: Record<string, string> = {
  Keep: 'bg-positive/10 text-positive border border-positive/20',
  Monitor: 'bg-amber/10 text-amber border border-amber/20',
  Cut: 'bg-negative/10 text-negative border border-negative/20',
};

export function SubscriptionTable({ platformROIs, onEdit, onDelete }: Props) {
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
            <th className="w-16" />
          </tr>
        </thead>
        <tbody>
          {platformROIs.map(({ platform, roiIndex, recommendation, platformValue }) => (
            <tr key={platform.id} className="group border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
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
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(platform)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(platform)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-negative hover:bg-negative/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: TypeScript error on `Dashboard.tsx` — `onEdit` and `onDelete` are now required props not yet passed. That error is expected and will be resolved in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/components/SubscriptionTable.tsx
git commit -m "feat: add edit/delete action buttons to SubscriptionTable"
```

---

## Task 3: Add action buttons to DeveloperTable

**Files:**
- Modify: `src/components/DeveloperTable.tsx`

- [ ] **Step 1: Replace the entire file content**

```tsx
import { Pencil, Trash2 } from 'lucide-react';
import type { Developer, DeveloperWithScore } from '../lib/types';

interface Props {
  developers: DeveloperWithScore[];
  metricLabel: string;
  onEdit: (dev: Developer) => void;
  onDelete: (dev: Developer) => void;
}

export function DeveloperTable({ developers, metricLabel, onEdit, onDelete }: Props) {
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
            <th className="w-16" />
          </tr>
        </thead>
        <tbody>
          {developers.map((dev) => (
            <tr key={dev.id} className="group border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
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
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(dev)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(dev)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-negative hover:bg-negative/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: TypeScript error on `Dashboard.tsx` for missing `onEdit`/`onDelete` props (same as Task 2 — resolved in Task 6).

- [ ] **Step 3: Commit**

```bash
git add src/components/DeveloperTable.tsx
git commit -m "feat: add edit/delete action buttons to DeveloperTable"
```

---

## Task 4: Create PlatformModal component

**Files:**
- Create: `src/components/PlatformModal.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import type { AIPlatform, PlatformName } from '../lib/types';

const PLATFORM_OPTIONS: PlatformName[] = [
  'GitHub Copilot',
  'ChatGPT Plus',
  'Gemini Advanced',
  'Cursor',
  'Claude',
  'Other',
];

const schema = z.object({
  name: z.enum(['GitHub Copilot', 'ChatGPT Plus', 'Gemini Advanced', 'Cursor', 'Claude', 'Other'] as const),
  monthly_cost: z.coerce.number().min(0, 'Required'),
  seats: z.coerce.number().min(1, 'At least 1 seat'),
  adopted_date: z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM format'),
});

export type PlatformFormData = z.infer<typeof schema>;

interface Props {
  platform: AIPlatform | null; // null = add mode
  onSave: (data: PlatformFormData) => Promise<void>;
  onClose: () => void;
}

export function PlatformModal({ platform, onSave, onClose }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlatformFormData>({
    resolver: zodResolver(schema),
    defaultValues: platform
      ? { name: platform.name, monthly_cost: platform.monthly_cost, seats: platform.seats, adopted_date: platform.adopted_date }
      : { name: 'GitHub Copilot', seats: 1 },
  });

  useEffect(() => {
    reset(
      platform
        ? { name: platform.name, monthly_cost: platform.monthly_cost, seats: platform.seats, adopted_date: platform.adopted_date }
        : { name: 'GitHub Copilot', seats: 1 }
    );
  }, [platform, reset]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#0F1117] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading font-bold text-white text-lg">
            {platform ? 'Edit subscription' : 'Add subscription'}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Tool</label>
            <select {...register('name')} className="input-dark w-full">
              {PLATFORM_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {errors.name && <p className="text-negative text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Monthly cost ($)</label>
              <input
                {...register('monthly_cost')}
                type="number"
                min="0"
                step="0.01"
                className="input-dark w-full"
                placeholder="19"
              />
              {errors.monthly_cost && <p className="text-negative text-xs mt-1">{errors.monthly_cost.message}</p>}
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Seats</label>
              <input
                {...register('seats')}
                type="number"
                min="1"
                className="input-dark w-full"
                placeholder="1"
              />
              {errors.seats && <p className="text-negative text-xs mt-1">{errors.seats.message}</p>}
            </div>
          </div>

          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Adoption date</label>
            <input
              {...register('adopted_date')}
              className="input-dark w-full"
              placeholder="2024-10"
            />
            {errors.adopted_date && <p className="text-negative text-xs mt-1">{errors.adopted_date.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {platform ? 'Save changes' : 'Add subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlatformModal.tsx
git commit -m "feat: add PlatformModal component"
```

---

## Task 5: Create DeveloperModal component

**Files:**
- Create: `src/components/DeveloperModal.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import type { AIPlatform, Developer } from '../lib/types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  baseline_tickets: z.coerce.number().min(0).nullable(),
  current_tickets: z.coerce.number().min(0).nullable(),
  platform_ids: z.array(z.string()),
});

export type DeveloperFormData = z.infer<typeof schema>;

interface Props {
  developer: Developer | null; // null = add mode
  platforms: AIPlatform[];
  metricLabel: string;         // 'tickets' | 'PRs'
  onSave: (data: DeveloperFormData) => Promise<void>;
  onClose: () => void;
}

export function DeveloperModal({ developer, platforms, metricLabel, onSave, onClose }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DeveloperFormData>({
    resolver: zodResolver(schema),
    defaultValues: developer
      ? { name: developer.name, baseline_tickets: developer.baseline_tickets, current_tickets: developer.current_tickets, platform_ids: developer.platform_ids }
      : { name: '', baseline_tickets: null, current_tickets: null, platform_ids: [] },
  });

  useEffect(() => {
    reset(
      developer
        ? { name: developer.name, baseline_tickets: developer.baseline_tickets, current_tickets: developer.current_tickets, platform_ids: developer.platform_ids }
        : { name: '', baseline_tickets: null, current_tickets: null, platform_ids: [] }
    );
  }, [developer, reset]);

  const selectedPlatformIds = watch('platform_ids');

  function togglePlatform(id: string) {
    if (selectedPlatformIds.includes(id)) {
      setValue('platform_ids', selectedPlatformIds.filter((p) => p !== id));
    } else {
      setValue('platform_ids', [...selectedPlatformIds, id]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#0F1117] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading font-bold text-white text-lg">
            {developer ? 'Edit developer' : 'Add developer'}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Name</label>
            <input {...register('name')} className="input-dark w-full" placeholder="e.g. Alice" />
            {errors.name && <p className="text-negative text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Baseline {metricLabel}/mo</label>
              <input
                {...register('baseline_tickets')}
                type="number"
                min="0"
                step="0.1"
                className="input-dark w-full"
                placeholder="10"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Current {metricLabel}/mo</label>
              <input
                {...register('current_tickets')}
                type="number"
                min="0"
                step="0.1"
                className="input-dark w-full"
                placeholder="15"
              />
            </div>
          </div>

          {platforms.length > 0 && (
            <div>
              <label className="text-sm text-white/60 mb-2 block">AI tools used</label>
              <div className="space-y-2">
                {platforms.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedPlatformIds.includes(p.id)}
                      onChange={() => togglePlatform(p.id)}
                      className="rounded border-white/20 bg-white/5 text-accent"
                    />
                    <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                      {p.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {developer ? 'Save changes' : 'Add developer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/DeveloperModal.tsx
git commit -m "feat: add DeveloperModal component"
```

---

## Task 6: Wire Dashboard — platform editing

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Add imports at top of Dashboard.tsx**

After the existing imports block, add:

```tsx
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { PlatformModal, type PlatformFormData } from '../components/PlatformModal';
import { insertPlatform, updatePlatform, deletePlatform, saveSnapshot, upsertDeveloper } from '../lib/hooks/useWorkspace';
import { calculateROIMetrics } from '../lib/roiEngine';
```

Note: `calculateROIMetrics` is already imported — do not duplicate it.

- [ ] **Step 2: Add platform edit state inside the Dashboard function, after the existing `useMemo` calls**

```tsx
const [editingPlatform, setEditingPlatform] = useState<AIPlatform | 'new' | null>(null);
```

Also add `useState` to the React import at the top: `import { useMemo, useState } from 'react';`

- [ ] **Step 3: Add the `handlePlatformSave` handler after the state declaration**

```tsx
const handlePlatformSave = async (data: PlatformFormData) => {
  if (!workspace) return;
  try {
    let updatedPlatforms: AIPlatform[];
    if (editingPlatform === 'new') {
      const created = await insertPlatform(workspace.id, data);
      updatedPlatforms = [...platforms, created];
    } else {
      const updated = await updatePlatform((editingPlatform as AIPlatform).id, data);
      updatedPlatforms = platforms.map((p) =>
        p.id === updated.id ? updated : p
      );
    }
    setPlatforms(updatedPlatforms);
    setEditingPlatform(null);
    const metrics = calculateROIMetrics({ workspace, platforms: updatedPlatforms, developers });
    try {
      const snap = await saveSnapshot(workspace.id, metrics);
      setSnapshots([...snapshots, snap]);
    } catch (e) {
      console.warn('Snapshot failed after platform save', e);
    }
    toast.success(editingPlatform === 'new' ? 'Subscription added' : 'Subscription updated');
  } catch {
    toast.error('Failed to save subscription');
  }
};
```

- [ ] **Step 4: Add the `handlePlatformDelete` handler after `handlePlatformSave`**

```tsx
const handlePlatformDelete = async (platform: AIPlatform) => {
  if (!workspace) return;
  try {
    await deletePlatform(platform.id);
    const updatedPlatforms = platforms.filter((p) => p.id !== platform.id);
    setPlatforms(updatedPlatforms);

    // Strip deleted platform ID from any developer that references it
    const affectedDevs = developers.filter((d) => d.platform_ids.includes(platform.id));
    await Promise.all(
      affectedDevs.map((d) =>
        upsertDeveloper(workspace.id, {
          ...d,
          platform_ids: d.platform_ids.filter((id) => id !== platform.id),
        })
      )
    );
    affectedDevs.forEach((d) =>
      updateDeveloper({ ...d, platform_ids: d.platform_ids.filter((id) => id !== platform.id) })
    );

    const metrics = calculateROIMetrics({ workspace, platforms: updatedPlatforms, developers });
    try {
      const snap = await saveSnapshot(workspace.id, metrics);
      setSnapshots([...snapshots, snap]);
    } catch (e) {
      console.warn('Snapshot failed after platform delete', e);
    }
    toast.success('Subscription removed');
  } catch {
    toast.error('Failed to delete subscription');
  }
};
```

- [ ] **Step 5: Pull `setSnapshots` and `updateDeveloper` from the store**

The existing store destructure in Dashboard is:
```tsx
const { workspace, platforms, developers, snapshots, isDemoMode } = useAppStore();
```

Replace it with:
```tsx
const { workspace, platforms, developers, snapshots, isDemoMode, setPlatforms, setDevelopers, setSnapshots, updateDeveloper } = useAppStore();
```

- [ ] **Step 6: Add the "Add subscription" button and pass action props to SubscriptionTable**

Find this block in the JSX:
```tsx
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
```

Replace with:
```tsx
      {/* Subscription table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Subscriptions</h2>
          <button
            onClick={() => setEditingPlatform('new')}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add subscription
          </button>
        </div>
        <SubscriptionTable
          platformROIs={platformROIs}
          onEdit={(p) => setEditingPlatform(p)}
          onDelete={handlePlatformDelete}
        />
      </motion.div>
```

- [ ] **Step 7: Render PlatformModal at the bottom of the return, just before `</PageTransition>`**

```tsx
      {/* Platform modal */}
      {editingPlatform !== null && (
        <PlatformModal
          platform={editingPlatform === 'new' ? null : editingPlatform}
          onSave={handlePlatformSave}
          onClose={() => setEditingPlatform(null)}
        />
      )}
```

- [ ] **Step 8: Type-check**

```bash
npm run build
```

Expected: no errors. (The `setDevelopers` import is unused until Task 7 — TypeScript won't error on unused destructured store values.)

- [ ] **Step 9: Smoke test in browser**

```bash
npm run dev
```

- Open dashboard, hover a subscription row → pencil + trash icons appear
- Click pencil → modal opens with pre-filled values
- Edit a field, save → row updates, toast "Subscription updated"
- Click "Add subscription" → empty modal opens, fill in, save → new row appears
- Click trash on a row → row disappears, toast "Subscription removed"

- [ ] **Step 10: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: wire platform add/edit/delete on Dashboard with auto-snapshot"
```

---

## Task 7: Wire Dashboard — developer editing

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Add developer edit state after the platform edit state**

```tsx
const [editingDeveloper, setEditingDeveloper] = useState<Developer | 'new' | null>(null);
```

- [ ] **Step 2: Add imports for DeveloperModal**

Add to the existing import block:
```tsx
import { DeveloperModal, type DeveloperFormData } from '../components/DeveloperModal';
```

- [ ] **Step 3: Add `handleDeveloperSave` handler after `handlePlatformDelete`**

```tsx
const handleDeveloperSave = async (data: DeveloperFormData) => {
  if (!workspace) return;
  try {
    if (editingDeveloper === 'new') {
      const created = await upsertDeveloper(workspace.id, {
        workspace_id: workspace.id,
        name: data.name,
        baseline_tickets: data.baseline_tickets,
        current_tickets: data.current_tickets,
        platform_ids: data.platform_ids,
      });
      addDeveloper(created);
    } else {
      const updated = await upsertDeveloper(workspace.id, {
        ...(editingDeveloper as Developer),
        name: data.name,
        baseline_tickets: data.baseline_tickets,
        current_tickets: data.current_tickets,
        platform_ids: data.platform_ids,
      });
      updateDeveloper(updated);
    }
    setEditingDeveloper(null);
    toast.success(editingDeveloper === 'new' ? 'Developer added' : 'Developer updated');
  } catch {
    toast.error('Failed to save developer');
  }
};
```

- [ ] **Step 4: Add `handleDeveloperDelete` handler after `handleDeveloperSave`**

```tsx
const handleDeveloperDelete = async (dev: Developer) => {
  if (!workspace) return;
  try {
    await deleteDeveloper(dev.id);
    removeDeveloper(dev.id);
    toast.success('Developer removed');
  } catch {
    toast.error('Failed to delete developer');
  }
};
```

- [ ] **Step 5: Pull `addDeveloper` and `removeDeveloper` from the store**

The store destructure currently ends with `updateDeveloper`. Extend it:
```tsx
const { workspace, platforms, developers, snapshots, isDemoMode, setPlatforms, setDevelopers, setSnapshots, updateDeveloper, addDeveloper, removeDeveloper } = useAppStore();
```

- [ ] **Step 6: Add the `deleteDeveloper` import**

In the existing import line:
```tsx
import { insertPlatform, updatePlatform, deletePlatform, saveSnapshot, upsertDeveloper } from '../lib/hooks/useWorkspace';
```

Replace with:
```tsx
import { insertPlatform, updatePlatform, deletePlatform, saveSnapshot, upsertDeveloper, deleteDeveloper } from '../lib/hooks/useWorkspace';
```

- [ ] **Step 7: Add "Add developer" button and pass action props to DeveloperTable**

Find:
```tsx
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
```

Replace with:
```tsx
      {/* Developer breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.44 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Team</h2>
          <button
            onClick={() => setEditingDeveloper('new')}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add developer
          </button>
        </div>
        {enrichedDevs.length > 0 && (
          <DeveloperTable
            developers={enrichedDevs}
            metricLabel={metricLabel}
            onEdit={(dev) => setEditingDeveloper(dev)}
            onDelete={handleDeveloperDelete}
          />
        )}
      </motion.div>
```

- [ ] **Step 8: Render DeveloperModal after PlatformModal, before `</PageTransition>`**

```tsx
      {/* Developer modal */}
      {editingDeveloper !== null && (
        <DeveloperModal
          developer={editingDeveloper === 'new' ? null : editingDeveloper}
          platforms={platforms}
          metricLabel={metricLabel}
          onSave={handleDeveloperSave}
          onClose={() => setEditingDeveloper(null)}
        />
      )}
```

- [ ] **Step 9: Type-check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 10: Smoke test in browser**

```bash
npm run dev
```

- Hover a developer row → edit/delete icons appear
- Click pencil → modal opens with name, before/after numbers, platform checkboxes pre-filled
- Edit name, save → row updates, toast "Developer updated"
- Click "Add developer" → empty modal, fill in, save → new row appears in table
- Click trash → row disappears, toast "Developer removed"
- Confirm: deleting a platform, then checking a developer's edit modal — the deleted platform no longer appears in checkboxes

- [ ] **Step 11: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: wire developer add/edit/delete on Dashboard"
```

---

## Task 8: Demo mode guard

**Context:** In demo mode, saves must not reach Supabase (same pattern as Settings.tsx which checks `isDemoMode` before calling Supabase).

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Guard `handlePlatformSave` for demo mode**

At the start of `handlePlatformSave`, after `if (!workspace) return;`, add:

```tsx
    if (isDemoMode) {
      // Demo mode: update store only, no Supabase calls
      const updated: AIPlatform =
        editingPlatform === 'new'
          ? { id: `demo-${Date.now()}`, workspace_id: workspace.id, created_at: new Date().toISOString(), ...data }
          : { ...(editingPlatform as AIPlatform), ...data };
      const updatedPlatforms =
        editingPlatform === 'new'
          ? [...platforms, updated]
          : platforms.map((p) => (p.id === updated.id ? updated : p));
      setPlatforms(updatedPlatforms);
      setEditingPlatform(null);
      toast.success(editingPlatform === 'new' ? 'Subscription added' : 'Subscription updated');
      return;
    }
```

- [ ] **Step 2: Guard `handlePlatformDelete` for demo mode**

At the start of `handlePlatformDelete`, after `if (!workspace) return;`, add:

```tsx
    if (isDemoMode) {
      setPlatforms(platforms.filter((p) => p.id !== platform.id));
      toast.success('Subscription removed');
      return;
    }
```

- [ ] **Step 3: Guard `handleDeveloperSave` for demo mode**

At the start of `handleDeveloperSave`, after `if (!workspace) return;`, add:

```tsx
    if (isDemoMode) {
      if (editingDeveloper === 'new') {
        addDeveloper({ id: `demo-dev-${Date.now()}`, workspace_id: workspace.id, created_at: new Date().toISOString(), name: data.name, baseline_tickets: data.baseline_tickets, current_tickets: data.current_tickets, platform_ids: data.platform_ids });
      } else {
        updateDeveloper({ ...(editingDeveloper as Developer), ...data });
      }
      setEditingDeveloper(null);
      toast.success(editingDeveloper === 'new' ? 'Developer added' : 'Developer updated');
      return;
    }
```

- [ ] **Step 4: Guard `handleDeveloperDelete` for demo mode**

At the start of `handleDeveloperDelete`, after `if (!workspace) return;`, add:

```tsx
    if (isDemoMode) {
      removeDeveloper(dev.id);
      toast.success('Developer removed');
      return;
    }
```

- [ ] **Step 5: Type-check and final smoke test**

```bash
npm run build
```

Expected: no errors.

```bash
npm run dev
```

- Click "View demo" on landing, navigate to dashboard
- Confirm add/edit/delete works in demo mode without any console errors
- Sign in with a real account, confirm changes persist after page refresh (reload the dashboard — data should match what you saved)

- [ ] **Step 6: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: guard platform/developer edits in demo mode"
```
