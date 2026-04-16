import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '../lib/store';
import { savePendingWorkspace } from '../lib/hooks/useWorkspace';
import type { AIPlatform, PlatformName } from '../lib/types';
import { MeshBackground } from '../components/MeshBackground';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(1, 'Team name is required'),
  team_size: z.coerce.number().min(1, 'At least 1 developer'),
});

type Step1Data = z.infer<typeof step1Schema>;

// ─── Platform form ────────────────────────────────────────────────────────────

interface PlatformDraft {
  name: PlatformName;
  cost_type: 'flat' | 'per_seat';
  flat_cost: number;
  per_seat_cost: number;
  seats: number;
  adopted_date: string;
  usage_percent: number;
}

const PLATFORM_OPTIONS: PlatformName[] = [
  'GitHub Copilot',
  'ChatGPT Plus',
  'Gemini Advanced',
  'Cursor',
  'Claude',
  'Other',
];

function emptyPlatform(count: number): PlatformDraft {
  return {
    name: 'GitHub Copilot',
    cost_type: 'per_seat',
    flat_cost: 0,
    per_seat_cost: 19,
    seats: 1,
    adopted_date: '',
    usage_percent: Math.round(100 / count),
  };
}

function platformToAIPlatform(
  draft: PlatformDraft,
  workspaceId: string
): Omit<AIPlatform, 'id' | 'created_at'> {
  const monthly_cost =
    draft.cost_type === 'flat' ? draft.flat_cost : draft.per_seat_cost * draft.seats;
  return {
    workspace_id: workspaceId,
    name: draft.name,
    monthly_cost,
    seats: draft.seats,
    adopted_date: draft.adopted_date,
    usage_percent: draft.usage_percent,
  };
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i < current ? 'bg-accent flex-1' : i === current ? 'bg-accent/60 flex-1' : 'bg-white/10 flex-1'
          }`}
        />
      ))}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-400 mt-1">{message}</p>;
}

// ─── Main Setup component ─────────────────────────────────────────────────────

export function Setup() {
  const navigate = useNavigate();
  const { user, setWorkspace, setPlatforms, setDevelopers, setHasPendingData } = useAppStore();

  const [step, setStep] = useState(0);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [platforms, setPlatformDrafts] = useState<PlatformDraft[]>([emptyPlatform(1)]);

  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema) });

  const totalUsage = platforms.reduce((sum, p) => sum + (p.usage_percent || 0), 0);
  const usageWarning = totalUsage < 90 || totalUsage > 110;

  const onStep1 = form1.handleSubmit((data) => {
    setStep1Data(data);
    setStep(1);
  });

  const onStep2 = () => {
    const valid = platforms.every((p) => p.adopted_date);
    if (!valid) {
      toast.error('Every subscription needs an adoption date (YYYY-MM)');
      return;
    }
    if (platforms.length === 0) {
      toast.error('Add at least one AI subscription');
      return;
    }
    if (!step1Data) return;

    const workspaceId = `pending-${Date.now()}`;

    const workspace = {
      id: workspaceId,
      user_id: '',
      name: step1Data.name,
      team_size: step1Data.team_size,
      avg_annual_salary: 0,
      monthly_hours: 160,
      metric_type: 'tickets' as const,
      rolling_window: 30 as const,
      baseline_per_dev: null,
      ai_adoption_month: null,
      current_per_dev: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const aiPlatforms: AIPlatform[] = platforms.map((p, i) => ({
      ...platformToAIPlatform(p, workspaceId),
      id: `pending-platform-${i}`,
      created_at: new Date().toISOString(),
    }));

    setWorkspace(workspace);
    setPlatforms(aiPlatforms);
    setDevelopers([]);

    if (user) {
      setHasPendingData(false);
      savePendingWorkspace(user.id, workspace, aiPlatforms, [])
        .then((saved) => {
          setWorkspace(saved.workspace);
          setPlatforms(saved.platforms);
          setDevelopers(saved.developers);
          toast.success('Workspace saved!');
        })
        .catch(() => toast.error('Failed to save workspace. Please try again.'));
    } else {
      setHasPendingData(true);
    }

    navigate('/dashboard');
  };

  const updatePlatform = (i: number, patch: Partial<PlatformDraft>) => {
    setPlatformDrafts((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  const removePlatform = (i: number) => {
    setPlatformDrafts((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addPlatform = () => {
    setPlatformDrafts((prev) => {
      const next = [...prev, emptyPlatform(prev.length + 1)];
      return next;
    });
  };

  const STEPS = ['Team basics', 'Subscriptions'];

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6">
      <MeshBackground />
      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-2 text-xs text-white/30 font-mono uppercase tracking-widest">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </div>
        <StepIndicator current={step} total={STEPS.length} />

        <AnimatePresence mode="wait">
          {/* ── Step 1: Team basics ── */}
          {step === 0 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-heading text-2xl font-bold text-white mb-1">Tell us about your team</h2>
              <p className="text-white/40 text-sm mb-6">We'll use this to track your AI spend.</p>
              <form onSubmit={onStep1} className="space-y-4">
                <div>
                  <label className="label">Team name</label>
                  <input className="input-dark w-full" placeholder="e.g. Platform Engineering" {...form1.register('name')} />
                  <FieldError message={form1.formState.errors.name?.message} />
                </div>
                <div>
                  <label className="label">Number of developers</label>
                  <input type="number" className="input-dark w-full" placeholder="8" {...form1.register('team_size')} />
                  <FieldError message={form1.formState.errors.team_size?.message} />
                </div>
                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Step 2: Subscriptions ── */}
          {step === 1 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-heading text-2xl font-bold text-white mb-1">AI subscriptions</h2>
              <p className="text-white/40 text-sm mb-6">Add every AI tool your team pays for and estimate how much of your work happens in each.</p>

              {usageWarning && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                  Usage percentages should add up to ~100% (currently {totalUsage}%)
                </div>
              )}

              <div className="space-y-3 mb-4">
                {platforms.map((p, i) => (
                  <div key={i} className="card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40 font-mono">Subscription {i + 1}</span>
                      {platforms.length > 1 && (
                        <button onClick={() => removePlatform(i)} className="text-white/20 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="label">Tool</label>
                      <select
                        className="input-dark w-full"
                        value={p.name}
                        onChange={(e) => updatePlatform(i, { name: e.target.value as PlatformName })}
                      >
                        {PLATFORM_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Pricing</label>
                      <div className="flex gap-2 mb-2">
                        {(['flat', 'per_seat'] as const).map((ct) => (
                          <label key={ct} className="flex-1">
                            <input type="radio" className="sr-only" checked={p.cost_type === ct} onChange={() => updatePlatform(i, { cost_type: ct })} />
                            <div className={`text-center py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                              p.cost_type === ct ? 'border-accent text-accent bg-accent/10' : 'border-white/10 text-white/40 hover:border-white/20'
                            }`}>
                              {ct === 'flat' ? 'Flat rate' : 'Per seat'}
                            </div>
                          </label>
                        ))}
                      </div>
                      {p.cost_type === 'flat' ? (
                        <div>
                          <label className="label">Total monthly cost (USD)</label>
                          <input
                            type="number"
                            className="input-dark w-full"
                            placeholder="500"
                            value={p.flat_cost || ''}
                            onChange={(e) => updatePlatform(i, { flat_cost: Number(e.target.value) })}
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label">Cost per seat (USD/mo)</label>
                            <input
                              type="number"
                              className="input-dark w-full"
                              placeholder="19"
                              value={p.per_seat_cost || ''}
                              onChange={(e) => updatePlatform(i, { per_seat_cost: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label className="label">Seats</label>
                            <input
                              type="number"
                              className="input-dark w-full"
                              placeholder="8"
                              value={p.seats || ''}
                              onChange={(e) => updatePlatform(i, { seats: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label">Adoption date</label>
                        <input
                          type="month"
                          className="input-dark w-full"
                          value={p.adopted_date}
                          onChange={(e) => updatePlatform(i, { adopted_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label">Estimated usage (%)</label>
                        <input
                          type="number"
                          className="input-dark w-full"
                          placeholder="50"
                          min={0}
                          max={100}
                          value={p.usage_percent || ''}
                          onChange={(e) => updatePlatform(i, { usage_percent: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={addPlatform}
                className="btn-ghost w-full flex items-center justify-center gap-2 mb-4"
              >
                <Plus className="w-4 h-4" /> Add another subscription
              </button>
              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="btn-ghost flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={onStep2} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  See my spend <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
