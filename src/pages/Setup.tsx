import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '../lib/store';
import type { AIPlatform, PlatformName } from '../lib/types';
import { MeshBackground } from '../components/MeshBackground';
import { MonthPicker } from '../components/MonthPicker';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(1, 'Team name is required'),
  team_size: z.coerce.number().min(1, 'At least 1 developer'),
});

const step3Schema = z.object({
  avg_annual_salary: z.coerce.number().min(1000, 'Enter a realistic salary (min $1,000)'),
  monthly_hours: z.coerce.number().min(1, 'Required').max(300),
  baseline_per_dev: z.coerce.number().min(0, 'Required'),
  current_per_dev: z.coerce.number().min(0, 'Required'),
  ai_adoption_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM')
    .min(1, 'Required'),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step3Data = z.infer<typeof step3Schema>;

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
  const { saveWorkspaceData } = useAppStore();

  const [step, setStep] = useState(0);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [platforms, setPlatformDrafts] = useState<PlatformDraft[]>([emptyPlatform(1)]);

  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema) });
  const form3 = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      avg_annual_salary: 120000,
      monthly_hours: 160,
      baseline_per_dev: undefined,
      current_per_dev: undefined,
      ai_adoption_month: '',
    },
  });

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

  const totalUsage = platforms.reduce((sum, p) => sum + (p.usage_percent || 0), 0);
  const usageWarning = totalUsage < 90 || totalUsage > 110;

  const onStep1 = form1.handleSubmit((data) => {
    setStep1Data(data);
    setStep(1);
  });

  const onStep2 = () => {
    // Check empty first (vacuous truth fix)
    if (platforms.length === 0) {
      toast.error('Add at least one AI subscription');
      return;
    }
    const valid = platforms.every((p) => p.adopted_date);
    if (!valid) {
      toast.error('Every subscription needs an adoption date (YYYY-MM)');
      return;
    }
    setStep(2);
  };

  const onStep3 = form3.handleSubmit((data) => {
    if (!step1Data) return;

    const workspaceId = `pending-${Date.now()}`;

    const workspace = {
      id: workspaceId,
      user_id: '',
      name: step1Data.name,
      team_size: step1Data.team_size,
      avg_annual_salary: data.avg_annual_salary,
      monthly_hours: data.monthly_hours,
      metric_type: 'tickets' as const,
      rolling_window: 30 as const,
      baseline_per_dev: data.baseline_per_dev,
      ai_adoption_month: data.ai_adoption_month,
      current_per_dev: data.current_per_dev,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const aiPlatforms: AIPlatform[] = platforms.map((p, i) => ({
      ...platformToAIPlatform(p, workspaceId),
      id: `pending-platform-${i}`,
      created_at: new Date().toISOString(),
    }));

    saveWorkspaceData(workspace, aiPlatforms, []);
    navigate('/dashboard');
  });

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

  const STEPS = ['Team basics', 'Subscriptions', 'Velocity metrics'];

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 lg:p-6">
      <MeshBackground />
      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
          <span className="text-[10px] sm:text-xs text-white/30 font-mono uppercase tracking-wide sm:tracking-widest">
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </span>
          <button
            type="button"
            onClick={fillDemoData}
            className="text-[10px] sm:text-xs text-accent/60 hover:text-accent transition-colors font-medium"
          >
            Fill with demo data →
          </button>
        </div>
        <StepIndicator current={step} total={STEPS.length} />

        <AnimatePresence mode="wait">
          {/* ── Step 1: Team basics ── */}
          {step === 0 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-white mb-1">Tell us about your team</h2>
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
                <button
                  type="submit"
                  className="group w-full flex items-center justify-center gap-2 mt-2 py-3 px-6 rounded-xl border border-accent/60 text-accent font-semibold text-sm transition-all duration-200 hover:bg-accent hover:text-obsidian hover:border-accent hover:shadow-[0_0_20px_rgba(0,212,255,0.2)]"
                >
                  Continue
                  <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Step 2: Subscriptions ── */}
          {step === 1 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-white mb-1">AI subscriptions</h2>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="label">Adoption date</label>
                        <MonthPicker
                          value={p.adopted_date}
                          onChange={(v) => updatePlatform(i, { adopted_date: v })}
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
                <button
                  type="button"
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
            </motion.div>
          )}

          {/* ── Step 3: Velocity metrics ── */}
          {step === 2 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-white mb-1">Velocity & cost</h2>
              <p className="text-white/40 text-sm mb-6">
                These numbers power your ROI calculation. Use your best estimates — you can recalculate any time from the dashboard.
              </p>
              <form onSubmit={onStep3} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Avg annual salary (USD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
                      <input
                        type="number"
                        className="input-dark w-full pl-8"
                        placeholder="120000"
                        {...form3.register('avg_annual_salary')}
                      />
                    </div>
                    <FieldError message={form3.formState.errors.avg_annual_salary?.message} />
                  </div>
                  <div>
                    <label className="label">Monthly hours / dev</label>
                    <input
                      type="number"
                      className="input-dark w-full"
                      placeholder="160"
                      {...form3.register('monthly_hours')}
                    />
                    <FieldError message={form3.formState.errors.monthly_hours?.message} />
                  </div>
                </div>

                <div>
                  <label className="label">AI adoption month</label>
                  <MonthPicker
                    value={form3.watch('ai_adoption_month') ?? ''}
                    onChange={(v) => form3.setValue('ai_adoption_month', v, { shouldValidate: true })}
                  />
                  <p className="text-xs text-white/30 mt-1">When did your team start using AI tools?</p>
                  <FieldError message={form3.formState.errors.ai_adoption_month?.message} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Baseline tickets / dev / mo</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input-dark w-full"
                      placeholder="8"
                      {...form3.register('baseline_per_dev')}
                    />
                    <p className="text-xs text-white/30 mt-1">Before AI tools</p>
                    <FieldError message={form3.formState.errors.baseline_per_dev?.message} />
                  </div>
                  <div>
                    <label className="label">Current tickets / dev / mo</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input-dark w-full"
                      placeholder="12"
                      {...form3.register('current_per_dev')}
                    />
                    <p className="text-xs text-white/30 mt-1">With AI tools today</p>
                    <FieldError message={form3.formState.errors.current_per_dev?.message} />
                  </div>
                </div>

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
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
