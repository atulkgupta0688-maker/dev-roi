import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '../lib/store';
import type { AIPlatform, Developer, MetricType, RollingWindow, PlatformName } from '../lib/types';
import { MeshBackground } from '../components/MeshBackground';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(1, 'Team name is required'),
  team_size: z.coerce.number().min(1, 'At least 1 developer'),
  avg_annual_salary: z.coerce.number().min(1, 'Salary is required'),
  monthly_hours: z.coerce.number().min(1).max(744).default(160),
  rolling_window: z.coerce.number().refine((v) => [30, 60, 90].includes(v)) as z.ZodType<RollingWindow>,
});

const step2Schema = z.object({
  metric_type: z.enum(['tickets', 'prs']) as z.ZodType<MetricType>,
  baseline_per_dev: z.coerce.number().min(0, 'Enter a baseline number'),
  ai_adoption_month: z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM format'),
});

const step4Schema = z.object({
  current_per_dev: z.coerce.number().min(0, 'Enter current number'),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step4Data = z.infer<typeof step4Schema>;

// ─── Platform form ────────────────────────────────────────────────────────────

interface PlatformDraft {
  name: PlatformName;
  cost_type: 'flat' | 'per_seat';
  flat_cost: number;
  per_seat_cost: number;
  seats: number;
  adopted_date: string;
}

const PLATFORM_OPTIONS: PlatformName[] = [
  'GitHub Copilot',
  'ChatGPT Plus',
  'Gemini Advanced',
  'Cursor',
  'Claude',
  'Other',
];

function emptyPlatform(): PlatformDraft {
  return {
    name: 'GitHub Copilot',
    cost_type: 'per_seat',
    flat_cost: 0,
    per_seat_cost: 19,
    seats: 1,
    adopted_date: '',
  };
}

function platformToAIPlatform(draft: PlatformDraft, workspaceId: string): Omit<AIPlatform, 'id' | 'created_at'> {
  const monthly_cost =
    draft.cost_type === 'flat' ? draft.flat_cost : draft.per_seat_cost * draft.seats;
  return {
    workspace_id: workspaceId,
    name: draft.name,
    monthly_cost,
    seats: draft.seats,
    adopted_date: draft.adopted_date,
  };
}

// ─── Developer form ───────────────────────────────────────────────────────────

interface DeveloperDraft {
  name: string;
  baseline_tickets: number;
  current_tickets: number;
}

function emptyDeveloper(): DeveloperDraft {
  return { name: '', baseline_tickets: 0, current_tickets: 0 };
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
  const { setWorkspace, setPlatforms, setDevelopers, setHasPendingData } = useAppStore();

  const [step, setStep] = useState(0);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const [platforms, setPlatformDrafts] = useState<PlatformDraft[]>([emptyPlatform()]);
  const [developers, setDeveloperDrafts] = useState<DeveloperDraft[]>([]);
  const [showDevForm, setShowDevForm] = useState(false);

  // Step 1 form
  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { monthly_hours: 160, rolling_window: 30 },
  });

  // Step 2 form
  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { metric_type: 'tickets' },
  });

  // Step 4 form
  const form4 = useForm<Step4Data>({ resolver: zodResolver(step4Schema) });

  const metricLabel = form2.watch('metric_type') === 'prs' ? 'merged PRs' : 'tickets';

  // ── Step handlers ──

  const onStep1 = form1.handleSubmit((data) => {
    setStep1Data(data);
    setStep(1);
  });

  const onStep2 = form2.handleSubmit((data) => {
    setStep2Data(data);
    setStep(2);
  });

  const onStep3 = () => {
    const valid = platforms.every((p) => p.adopted_date);
    if (!valid) {
      toast.error('Every subscription needs an adoption date (YYYY-MM)');
      return;
    }
    if (platforms.length === 0) {
      toast.error('Add at least one AI subscription');
      return;
    }
    setStep(3);
  };

  const onStep4 = form4.handleSubmit((data) => {
    if (!step1Data || !step2Data) return;

    const workspaceId = `pending-${Date.now()}`;

    const workspace = {
      id: workspaceId,
      user_id: '',
      name: step1Data.name,
      team_size: step1Data.team_size,
      avg_annual_salary: step1Data.avg_annual_salary,
      monthly_hours: step1Data.monthly_hours,
      metric_type: step2Data.metric_type,
      rolling_window: step1Data.rolling_window,
      baseline_per_dev: step2Data.baseline_per_dev,
      ai_adoption_month: step2Data.ai_adoption_month,
      current_per_dev: data.current_per_dev,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const aiPlatforms: AIPlatform[] = platforms.map((p, i) => ({
      ...platformToAIPlatform(p, workspaceId),
      id: `pending-platform-${i}`,
      created_at: new Date().toISOString(),
    }));

    const devs: Developer[] = showDevForm
      ? developers
          .filter((d) => d.name.trim())
          .map((d, i) => ({
            id: `pending-dev-${i}`,
            workspace_id: workspaceId,
            name: d.name,
            baseline_tickets: d.baseline_tickets,
            current_tickets: d.current_tickets,
            platform_ids: aiPlatforms.map((p) => p.id),
            created_at: new Date().toISOString(),
          }))
      : [];

    setWorkspace(workspace);
    setPlatforms(aiPlatforms);
    setDevelopers(devs);
    setHasPendingData(true);
    navigate('/dashboard');
  });

  // ── Platform helpers ──

  const updatePlatform = (i: number, patch: Partial<PlatformDraft>) => {
    setPlatformDrafts((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  const removePlatform = (i: number) => {
    setPlatformDrafts((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ── Developer helpers ──

  const updateDeveloper = (i: number, patch: Partial<DeveloperDraft>) => {
    setDeveloperDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  };

  const removeDeveloper = (i: number) => {
    setDeveloperDrafts((prev) => prev.filter((_, idx) => idx !== i));
  };

  const STEPS = ['Team basics', 'Baseline', 'Subscriptions', 'Current numbers'];

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
              <p className="text-white/40 text-sm mb-6">This is used to calculate the dollar value of productivity gains.</p>
              <form onSubmit={onStep1} className="space-y-4">
                <div>
                  <label className="label">Team name</label>
                  <input className="mock-input w-full" placeholder="e.g. Platform Engineering" {...form1.register('name')} />
                  <FieldError message={form1.formState.errors.name?.message} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Number of developers</label>
                    <input type="number" className="mock-input w-full" placeholder="8" {...form1.register('team_size')} />
                    <FieldError message={form1.formState.errors.team_size?.message} />
                  </div>
                  <div>
                    <label className="label">Avg annual salary (USD)</label>
                    <input type="number" className="mock-input w-full" placeholder="130000" {...form1.register('avg_annual_salary')} />
                    <FieldError message={form1.formState.errors.avg_annual_salary?.message} />
                  </div>
                </div>
                <div>
                  <label className="label">Tracking window</label>
                  <p className="text-xs text-white/30 mb-2">How many days does your "current" period cover?</p>
                  <div className="flex gap-2">
                    {[30, 60, 90].map((w) => (
                      <label key={w} className="flex-1">
                        <input type="radio" value={w} className="sr-only" {...form1.register('rolling_window')} />
                        <div className={`text-center py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                          String(form1.watch('rolling_window')) === String(w)
                            ? 'border-accent text-accent bg-accent/10'
                            : 'border-white/10 text-white/40 hover:border-white/20'
                        }`}>
                          {w} days
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <details className="group">
                  <summary className="text-xs text-white/30 cursor-pointer select-none">Advanced</summary>
                  <div className="mt-3">
                    <label className="label">Monthly working hours per dev</label>
                    <input type="number" className="mock-input w-full" placeholder="160" {...form1.register('monthly_hours')} />
                    <FieldError message={form1.formState.errors.monthly_hours?.message} />
                  </div>
                </details>
                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Step 2: Baseline ── */}
          {step === 1 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-heading text-2xl font-bold text-white mb-1">Before AI tools</h2>
              <p className="text-white/40 text-sm mb-6">What did your team's productivity look like before AI was introduced?</p>
              <form onSubmit={onStep2} className="space-y-4">
                <div>
                  <label className="label">How do you measure productivity?</label>
                  <div className="flex gap-2">
                    {(['tickets', 'prs'] as const).map((m) => (
                      <label key={m} className="flex-1">
                        <input type="radio" value={m} className="sr-only" {...form2.register('metric_type')} />
                        <div className={`text-center py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                          form2.watch('metric_type') === m
                            ? 'border-accent text-accent bg-accent/10'
                            : 'border-white/10 text-white/40 hover:border-white/20'
                        }`}>
                          {m === 'tickets' ? 'Tickets completed' : 'Merged PRs'}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Avg {metricLabel} per developer per month (before AI)</label>
                  <input type="number" step="0.1" className="mock-input w-full" placeholder="10" {...form2.register('baseline_per_dev')} />
                  <FieldError message={form2.formState.errors.baseline_per_dev?.message} />
                </div>
                <div>
                  <label className="label">When did your team start using AI tools?</label>
                  <input type="month" className="mock-input w-full" {...form2.register('ai_adoption_month')} />
                  <FieldError message={form2.formState.errors.ai_adoption_month?.message} />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(0)} className="btn-ghost flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ── Step 3: Subscriptions ── */}
          {step === 2 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-heading text-2xl font-bold text-white mb-1">AI subscriptions</h2>
              <p className="text-white/40 text-sm mb-6">Add every AI tool your team pays for. These will be ranked by ROI.</p>
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
                        className="mock-input w-full"
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
                            className="mock-input w-full"
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
                              className="mock-input w-full"
                              placeholder="19"
                              value={p.per_seat_cost || ''}
                              onChange={(e) => updatePlatform(i, { per_seat_cost: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label className="label">Seats</label>
                            <input
                              type="number"
                              className="mock-input w-full"
                              placeholder="8"
                              value={p.seats || ''}
                              onChange={(e) => updatePlatform(i, { seats: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="label">Adoption date</label>
                      <input
                        type="month"
                        className="mock-input w-full"
                        value={p.adopted_date}
                        onChange={(e) => updatePlatform(i, { adopted_date: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setPlatformDrafts((prev) => [...prev, emptyPlatform()])}
                className="btn-ghost w-full flex items-center justify-center gap-2 mb-4"
              >
                <Plus className="w-4 h-4" /> Add another subscription
              </button>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-ghost flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={onStep3} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Current numbers ── */}
          {step === 3 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-heading text-2xl font-bold text-white mb-1">Current performance</h2>
              <p className="text-white/40 text-sm mb-6">
                What's your team averaging now? Use the last {step1Data?.rolling_window ?? 30} days.
              </p>
              <form onSubmit={onStep4} className="space-y-4">
                <div>
                  <label className="label">Avg {metricLabel} per developer per month (now)</label>
                  <input type="number" step="0.1" className="mock-input w-full" placeholder="15" {...form4.register('current_per_dev')} />
                  <FieldError message={form4.formState.errors.current_per_dev?.message} />
                </div>

                <div className="border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-white">Per-developer breakdown</p>
                      <p className="text-xs text-white/40">Optional — enables individual leverage scores</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDevForm(!showDevForm);
                        if (!showDevForm && developers.length === 0) {
                          setDeveloperDrafts([emptyDeveloper()]);
                        }
                      }}
                      className="text-xs text-accent hover:text-white transition-colors"
                    >
                      {showDevForm ? 'Hide' : 'Add'}
                    </button>
                  </div>
                  {showDevForm && (
                    <div className="space-y-3">
                      {developers.map((d, i) => (
                        <div key={i} className="grid grid-cols-[1fr_80px_80px_24px] gap-2 items-end">
                          <div>
                            {i === 0 && <label className="label">Name</label>}
                            <input
                              className="mock-input w-full"
                              placeholder="Developer name"
                              value={d.name}
                              onChange={(e) => updateDeveloper(i, { name: e.target.value })}
                            />
                          </div>
                          <div>
                            {i === 0 && <label className="label">Before</label>}
                            <input
                              type="number"
                              className="mock-input w-full"
                              placeholder="10"
                              value={d.baseline_tickets || ''}
                              onChange={(e) => updateDeveloper(i, { baseline_tickets: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            {i === 0 && <label className="label">Now</label>}
                            <input
                              type="number"
                              className="mock-input w-full"
                              placeholder="15"
                              value={d.current_tickets || ''}
                              onChange={(e) => updateDeveloper(i, { current_tickets: Number(e.target.value) })}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDeveloper(i)}
                            className="text-white/20 hover:text-red-400 transition-colors pb-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setDeveloperDrafts((prev) => [...prev, emptyDeveloper()])}
                        className="text-xs text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add developer
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(2)} className="btn-ghost flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                    See my ROI <ArrowRight className="w-4 h-4" />
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
