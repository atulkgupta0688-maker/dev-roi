import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Plus, X, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { PlatformBadge } from '../components/PlatformBadge';
import { useAppStore } from '../lib/store';
import { enrichDevelopers } from '../lib/roiEngine';
import { upsertDeveloper, deleteDeveloper } from '../lib/hooks/useWorkspace';
import type { Developer } from '../lib/types';

// ─── Dev Modal Form ───────────────────────────────────────────────────────────

const devSchema = z.object({
  name: z.string().min(1, 'Name required'),
  baseline_tickets: z.number().min(0).optional(),
  current_tickets: z.number().min(0).optional(),
});
type DevFormData = z.infer<typeof devSchema>;

function DevModal({
  open,
  onClose,
  editDev,
}: {
  open: boolean;
  onClose: () => void;
  editDev?: Developer | null;
}) {
  const { workspace, platforms, isDemoMode, addDeveloper, updateDeveloper } = useAppStore();
  const [selectedPlatformIds, setSelectedPlatformIds] = useState<string[]>(
    editDev?.platform_ids ?? []
  );

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<DevFormData>({
    resolver: zodResolver(devSchema),
    defaultValues: editDev
      ? { name: editDev.name, baseline_tickets: editDev.baseline_tickets ?? undefined, current_tickets: editDev.current_tickets ?? undefined }
      : {},
  });

  const togglePlatform = (id: string) => {
    setSelectedPlatformIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const onSubmit = async (data: DevFormData) => {
    if (!workspace) return;
    const devData: Partial<Developer> = {
      ...(editDev?.id ? { id: editDev.id } : {}),
      name: data.name,
      baseline_tickets: data.baseline_tickets ?? null,
      current_tickets: data.current_tickets ?? null,
      platform_ids: selectedPlatformIds,
    };

    try {
      if (!isDemoMode) {
        const saved = await upsertDeveloper(workspace.id, devData);
        if (editDev) updateDeveloper(saved);
        else addDeveloper(saved);
      } else {
        const localDev: Developer = {
          id: editDev?.id ?? `local-dev-${Date.now()}`,
          workspace_id: workspace.id,
          created_at: new Date().toISOString(),
          ...devData,
          name: data.name,
          baseline_tickets: data.baseline_tickets ?? null,
          current_tickets: data.current_tickets ?? null,
          platform_ids: selectedPlatformIds,
        };
        if (editDev) updateDeveloper(localDev);
        else addDeveloper(localDev);
      }
      toast.success(editDev ? 'Developer updated' : 'Developer added');
      reset();
      onClose();
    } catch {
      toast.error('Failed to save developer');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50 glass border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg font-bold text-white">
                {editDev ? 'Edit developer' : 'Add developer'}
              </h3>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Name</label>
                <input {...register('name')} className="input-dark" placeholder="Arjun Mehta" />
                {errors.name && <p className="text-negative text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Baseline tickets/mo</label>
                  <input {...register('baseline_tickets', { valueAsNumber: true })} className="input-dark" type="number" placeholder="11" />
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Current tickets/mo</label>
                  <input {...register('current_tickets', { valueAsNumber: true })} className="input-dark" type="number" placeholder="17" />
                </div>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">AI tools used</label>
                <div className="flex flex-wrap gap-2">
                  {platforms.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlatform(p.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        selectedPlatformIds.includes(p.id)
                          ? 'border-accent/40 bg-accent/10 text-accent'
                          : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
                      }`}
                    >
                      <PlatformBadge name={p.name} size="sm" />
                      {p.name}
                    </button>
                  ))}
                  {platforms.length === 0 && (
                    <span className="text-xs text-white/30">No platforms configured</span>
                  )}
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editDev ? 'Update' : 'Add developer'}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Custom Scatter Tooltip ───────────────────────────────────────────────────

function ScatterTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; x: number; y: number } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <p className="font-medium text-white mb-1">{d.name}</p>
      <p className="text-xs text-white/50">AI cost: <span className="font-mono text-accent">${Math.round(d.x)}/mo</span></p>
      <p className="text-xs text-white/50">Velocity lift: <span className="font-mono text-positive">+{Math.round(d.y)}%</span></p>
    </div>
  );
}

// ─── Team Page ────────────────────────────────────────────────────────────────

export function Team() {
  const { workspace, platforms, developers, isDemoMode, removeDeveloper } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editDev, setEditDev] = useState<Developer | null>(null);

  const enriched = useMemo(
    () => workspace ? enrichDevelopers(developers, workspace, platforms) : [],
    [developers, workspace, platforms]
  );

  const scatterData = enriched
    .filter((d) => d.attributedAICost > 0 || d.velocityChangePct !== 0)
    .map((d) => ({
      name: d.name,
      x: Math.round(d.attributedAICost),
      y: Math.round(d.velocityChangePct),
    }));

  const avgX = scatterData.length > 0
    ? scatterData.reduce((s, d) => s + d.x, 0) / scatterData.length
    : 0;
  const avgY = scatterData.length > 0
    ? scatterData.reduce((s, d) => s + d.y, 0) / scatterData.length
    : 0;

  const handleDelete = async (devId: string) => {
    try {
      if (!isDemoMode) await deleteDeveloper(devId);
      removeDeveloper(devId);
      toast.success('Developer removed');
    } catch {
      toast.error('Failed to remove developer');
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  if (!workspace) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="w-12 h-12 text-white/20 mb-4" />
          <h2 className="text-xl font-heading font-bold text-white mb-2">No workspace</h2>
          <p className="text-white/40 mb-6">Complete the setup wizard first.</p>
          <Link to="/setup" className="btn-primary">Go to setup</Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <DevModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditDev(null); }}
        editDev={editDev}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Team Insights</h1>
          <p className="text-sm text-white/40 mt-1">Per-developer AI leverage analysis</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add developer
        </button>
      </div>

      {/* Developer table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden mb-6"
      >
        <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-white/[0.06] text-xs font-medium uppercase tracking-wider text-white/30">
          <div className="col-span-3">Developer</div>
          <div className="col-span-1 text-right hidden md:block">Baseline</div>
          <div className="col-span-1 text-right hidden md:block">Current</div>
          <div className="col-span-2 text-right">Change</div>
          <div className="col-span-3">Tools</div>
          <div className="col-span-1 text-right hidden md:block">Leverage</div>
          <div className="col-span-1">Status</div>
        </div>

        {enriched.length === 0 ? (
          <div className="py-12 text-center text-white/20 text-sm">
            <Plus className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No developers added yet. Click "Add developer" to get started.
          </div>
        ) : (
          enriched.map((dev, idx) => (
            <motion.div
              key={dev.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="grid grid-cols-12 gap-3 px-5 py-4 border-b border-white/[0.04] hover:bg-white/[0.01] transition-colors group"
            >
              {/* Name + avatar */}
              <div className="col-span-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                  {getInitials(dev.name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{dev.name}</p>
                </div>
              </div>
              <div className="col-span-1 text-right font-mono text-sm text-white/50 hidden md:flex items-center justify-end">{dev.baseline_tickets ?? '—'}</div>
              <div className="col-span-1 text-right font-mono text-sm text-white/80 hidden md:flex items-center justify-end">{dev.current_tickets ?? '—'}</div>
              <div className="col-span-2 flex items-center justify-end">
                <span className={`font-mono text-sm font-medium ${dev.velocityChangePct > 0 ? 'text-positive' : dev.velocityChangePct < 0 ? 'text-negative' : 'text-white/30'}`}>
                  {dev.velocityChangePct > 0 ? '+' : ''}{Math.round(dev.velocityChangePct)}%
                </span>
              </div>
              <div className="col-span-3 flex flex-wrap gap-1 items-center">
                {platforms
                  .filter((p) => dev.platform_ids.includes(p.id))
                  .map((p) => <PlatformBadge key={p.id} name={p.name} size="sm" />)}
              </div>
              <div className="col-span-1 text-right font-mono text-sm hidden md:flex items-center justify-end" style={{ color: dev.leverageStatus.color }}>
                {dev.leverageScore > 0 ? dev.leverageScore.toFixed(0) : '—'}
              </div>
              <div className="col-span-1 flex items-center gap-1">
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{ color: dev.leverageStatus.color, background: dev.leverageStatus.color + '15', border: `1px solid ${dev.leverageStatus.color}30` }}
                >
                  {dev.leverageStatus.label.split(' ')[0]}
                </span>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity ml-auto">
                  <button onClick={() => { setEditDev(dev); setModalOpen(true); }} className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white transition-colors">
                    <span className="text-xs">✏</span>
                  </button>
                  <button onClick={() => handleDelete(dev.id)} className="p-1 rounded hover:bg-negative/10 text-white/30 hover:text-negative transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Scatter plot */}
      {scatterData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <h3 className="font-semibold text-white mb-1">AI Cost vs Velocity Improvement</h3>
          <p className="text-xs text-white/30 mb-4">Each dot = a developer. Bottom-right = high cost, low gain — review these devs.</p>

          <div className="relative">
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="x"
                  type="number"
                  name="AI cost"
                  label={{ value: 'AI cost attributed ($/mo)', position: 'insideBottom', offset: -10, fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <YAxis
                  dataKey="y"
                  type="number"
                  name="Velocity lift"
                  label={{ value: 'Velocity improvement (%)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<ScatterTooltipContent />} />
                {/* Quadrant lines */}
                <ReferenceLine x={avgX} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                <ReferenceLine y={avgY} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                {/* Labels for quadrants */}
                <Scatter
                  data={scatterData}
                  fill="#00D4FF"
                  shape={(props: {cx?: number; cy?: number; payload?: {x: number; y: number}}) => {
                    const { cx = 0, cy = 0, payload } = props;
                    const isLowGainHighCost = payload && payload.x > avgX && payload.y < avgY;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill={isLowGainHighCost ? '#F59E0B' : '#00D4FF'}
                        stroke={isLowGainHighCost ? '#F59E0B40' : '#00D4FF30'}
                        strokeWidth={3}
                      />
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>

            {/* Quadrant labels */}
            <div className="absolute top-4 left-16 text-[10px] text-white/20">
              Low cost,<br />high gain
            </div>
            <div className="absolute top-4 right-4 text-[10px] text-white/20 text-right">
              High cost,<br />high gain ✓
            </div>
            <div className="absolute bottom-12 right-4 text-[10px] text-amber/40 text-right">
              Review needed ⚠
            </div>
            <div className="absolute bottom-12 left-16 text-[10px] text-white/20">
              Low usage
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs text-white/30">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <span>Developer</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber" />
              <span>Review needed (high cost, low gain)</span>
            </div>
          </div>
        </motion.div>
      )}
    </PageTransition>
  );
}
