import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft, Plus, Trash2, Zap, Terminal, HelpCircle } from 'lucide-react';
import { MeshBackground } from '../components/MeshBackground';
import { PlatformBadge } from '../components/PlatformBadge';
import { Tooltip } from '../components/Tooltip';
import { useAppStore } from '../lib/store';
import { saveWorkspace, savePlatforms } from '../lib/hooks/useWorkspace';
import { calculateHourlyRate, calculateVelocityLift, calculateMonthlyValue, calculatePaybackWeeks } from '../lib/roiEngine';
import type { PlatformName } from '../lib/types';

const PLATFORM_OPTIONS: PlatformName[] = ['Claude', 'ChatGPT', 'GitHub Copilot', 'Gemini', 'Cursor', 'Other'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = ['2023', '2024', '2025', '2026'];

const SALARY_PRESETS = [
  { label: '$80k', value: 80000, desc: 'Junior-heavy' },
  { label: '$110k', value: 110000, desc: 'Mixed seniority' },
  { label: '$140k', value: 140000, desc: 'Senior team' },
  { label: '$170k', value: 170000, desc: 'Lead / Staff' },
];

const HOURS_PRESETS = [
  { label: '160h', value: 160, desc: 'Standard' },
  { label: '140h', value: 140, desc: 'High meetings' },
  { label: '120h', value: 120, desc: 'Part-time blend' },
];

// ─── Form Schemas ──────────────────────────────────────────────────────────────

const step1Schema = z.object({
  workspaceName: z.string().min(1, 'Required'),
  teamSize: z.number().min(1).max(500),
  avgSalary: z.number().min(1000, 'Enter a valid salary'),
  monthlyHours: z.number().min(1).max(300),
});

const step2Schema = z.object({
  baselineStartMonth: z.string().min(1, 'Required'),
  baselineStartYear: z.string().min(1, 'Required'),
  baselineEndMonth: z.string().min(1, 'Required'),
  baselineEndYear: z.string().min(1, 'Required'),
  baselineTickets: z.number().min(0.1, 'Required'),
});

const step4Schema = z.object({
  currentTickets: z.number().min(0.1, 'Required'),
  currentStartMonth: z.string().min(1, 'Required'),
  currentStartYear: z.string().min(1, 'Required'),
  currentEndMonth: z.string().min(1, 'Required'),
  currentEndYear: z.string().min(1, 'Required'),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step4Data = z.infer<typeof step4Schema>;

interface PlatformForm {
  id: string;
  name: PlatformName;
  monthly_cost: number;
  seats: number;
  month: string;
  year: string;
}

// ─── Month/Year picker ─────────────────────────────────────────────────────────

function PeriodPicker({
  label,
  monthReg,
  yearReg,
  monthError,
}: {
  label: string;
  monthReg: object;
  yearReg: object;
  monthError?: string;
}) {
  return (
    <div>
      <label className="text-xs text-white/40 mb-1.5 block">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        <select {...(monthReg as object)} className="input-dark">
          <option value="">Month</option>
          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select {...(yearReg as object)} className="input-dark">
          <option value="">Year</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {monthError && <p className="text-negative text-xs mt-1">{monthError}</p>}
    </div>
  );
}

// ─── Setup ─────────────────────────────────────────────────────────────────────

export function Setup() {
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const [platforms, setPlatforms] = useState<PlatformForm[]>([
    { id: '1', name: 'GitHub Copilot', monthly_cost: 0, seats: 1, month: 'Jan', year: '2024' },
  ]);
  const { user, isDemoMode, setWorkspace, setPlatforms: storePlatforms } = useAppStore();
  const navigate = useNavigate();

  const s1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { teamSize: 8, monthlyHours: 160, avgSalary: 130000 },
  });
  const s2 = useForm<Step2Data>({ resolver: zodResolver(step2Schema) });
  const s4 = useForm<Step4Data>({ resolver: zodResolver(step4Schema) });

  // Live preview
  const s1Values = s1.watch();
  const s4Values = s4.watch();
  const baselineTickets = step2Data?.baselineTickets ?? 0;
  const currentTickets = Number(s4Values.currentTickets) || 0;
  const teamSize = Number(s1Values.teamSize) || 8;
  const salary = Number(s1Values.avgSalary) || 130000;
  const hours = Number(s1Values.monthlyHours) || 160;

  const hourlyRate = calculateHourlyRate(salary, hours);
  const monthlyTeamCost = Math.round(hourlyRate * hours * teamSize);
  const velLift = calculateVelocityLift(baselineTickets, currentTickets);
  const monthlyValue = calculateMonthlyValue(velLift, teamSize, hourlyRate, hours);
  const totalAISpend = platforms.reduce((s, p) => s + (p.monthly_cost || 0), 0);
  const roiMultiple = totalAISpend > 0 ? monthlyValue / totalAISpend : 0;
  const paybackWeeks = calculatePaybackWeeks(monthlyValue, totalAISpend);

  const stepVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStep1 = async (data: Step1Data) => {
    setStep1Data(data);
    if (!isDemoMode && user) {
      try {
        const ws = await saveWorkspace(user.id, {
          name: data.workspaceName,
          team_size: data.teamSize,
          avg_annual_salary: data.avgSalary,
          monthly_hours: data.monthlyHours,
        });
        if (ws) setWorkspace(ws);
      } catch { toast.error('Failed to save. Continuing locally.'); }
    }
    setStep(2);
  };

  const handleStep2 = (data: Step2Data) => {
    setStep2Data(data);
    setStep(3);
  };

  const handleStep4 = async (data: Step4Data) => {
    if (!step1Data || !step2Data) return;

    const toYM = (month: string, year: string) =>
      `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, '0')}`;

    const wsData = {
      name: step1Data.workspaceName,
      team_size: step1Data.teamSize,
      avg_annual_salary: step1Data.avgSalary,
      monthly_hours: step1Data.monthlyHours,
      baseline_start: toYM(step2Data.baselineStartMonth, step2Data.baselineStartYear),
      baseline_end: toYM(step2Data.baselineEndMonth, step2Data.baselineEndYear),
      baseline_tickets_per_dev: step2Data.baselineTickets,
      baseline_story_points: null,
      current_tickets_per_dev: data.currentTickets,
      current_story_points: null,
      current_period_start: toYM(data.currentStartMonth, data.currentStartYear),
      current_period_end: toYM(data.currentEndMonth, data.currentEndYear),
    };

    try {
      if (!isDemoMode && user) {
        const ws = await saveWorkspace(user.id, wsData);
        if (ws) {
          setWorkspace(ws);
          const saved = await savePlatforms(
            ws.id,
            platforms.map((p) => ({
              name: p.name,
              monthly_cost: p.monthly_cost,
              seats: p.seats,
              adopted_date: toYM(p.month, p.year),
            }))
          );
          storePlatforms(saved);
        }
      } else {
        setWorkspace({ ...wsData, id: 'local-ws', user_id: 'local', created_at: '', updated_at: '' });
        storePlatforms(
          platforms.map((p, i) => ({
            id: `local-p-${i}`,
            workspace_id: 'local-ws',
            name: p.name,
            monthly_cost: p.monthly_cost,
            seats: p.seats,
            adopted_date: toYM(p.month, p.year),
            created_at: '',
          }))
        );
      }
      navigate('/dashboard');
    } catch {
      toast.error('Something went wrong saving your data.');
    }
  };

  const addPlatform = () => {
    if (platforms.length >= 5) return;
    setPlatforms([...platforms, { id: Date.now().toString(), name: 'Claude', monthly_cost: 0, seats: 1, month: 'Jan', year: '2024' }]);
  };

  const updatePlatform = (id: string, field: string, value: string | number) =>
    setPlatforms(platforms.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const progressPct = ((step - 1) / 3) * 100;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <MeshBackground />

      {/* Header */}
      <div className="relative z-10 border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Zap className="w-5 h-5 text-accent" />
          <span className="font-heading font-bold text-white">DevROI</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30">Step {step} of 4</span>
          <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">

          {/* ── Step 1: Team ── */}
          {step === 1 && (
            <motion.div key="step1" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-accent/70 mb-2">Step 1 of 4</p>
                <h1 className="font-heading text-3xl font-bold text-white mb-2">Your team</h1>
                <p className="text-white/40 mb-8 text-sm leading-relaxed">
                  Start with the basics. We use your salary data to calculate the dollar value of every productivity gain.
                </p>
                <form onSubmit={s1.handleSubmit(handleStep1)} className="space-y-5">
                  <div>
                    <label className="text-sm text-white/60 mb-2 block">Team name</label>
                    <input {...s1.register('workspaceName')} className="input-dark" placeholder="e.g. Platform Engineering" />
                    {s1.formState.errors.workspaceName && <p className="text-negative text-xs mt-1">{s1.formState.errors.workspaceName.message}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-white/60">Team size (developers)</label>
                      <span className="font-mono text-accent text-sm">{s1.watch('teamSize') ?? 8}</span>
                    </div>
                    <input {...s1.register('teamSize', { valueAsNumber: true })} type="range" min="1" max="200" className="w-full" />
                  </div>

                  {/* Salary presets */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <label className="text-sm text-white/60">Average annual salary</label>
                      <Tooltip content="Use the blended average across your team — includes base salary, excludes equity and bonuses." />
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {SALARY_PRESETS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => s1.setValue('avgSalary', p.value)}
                          className={`py-2 px-1 rounded-lg border text-center transition-all ${
                            s1.watch('avgSalary') === p.value
                              ? 'border-accent bg-accent/10 text-accent'
                              : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white/70'
                          }`}
                        >
                          <div className="text-xs font-mono font-bold">{p.label}</div>
                          <div className="text-[10px] text-white/30 mt-0.5">{p.desc}</div>
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
                      <input
                        {...s1.register('avgSalary', { valueAsNumber: true })}
                        className="input-dark pl-8"
                        placeholder="Custom amount"
                        type="number"
                      />
                    </div>
                    {s1.formState.errors.avgSalary && <p className="text-negative text-xs mt-1">{s1.formState.errors.avgSalary.message}</p>}
                  </div>

                  {/* Hours presets */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <label className="text-sm text-white/60">Monthly coding hours per dev</label>
                      <Tooltip content="160h = standard full-time. Reduce if your team has a heavy meeting culture — this affects the hourly rate calculation." />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {HOURS_PRESETS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => s1.setValue('monthlyHours', p.value)}
                          className={`py-2 rounded-lg border text-center transition-all ${
                            s1.watch('monthlyHours') === p.value
                              ? 'border-accent bg-accent/10 text-accent'
                              : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white/70'
                          }`}
                        >
                          <div className="text-xs font-mono font-bold">{p.label}</div>
                          <div className="text-[10px] text-white/30 mt-0.5">{p.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Live preview */}
              <div className="card p-6 self-start">
                <h3 className="text-xs uppercase tracking-widest text-white/30 mb-5">Cost baseline preview</h3>
                <div className="space-y-5">
                  <div>
                    <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
                      Blended hourly rate per dev
                      <Tooltip content="Annual salary ÷ 12 months ÷ monthly coding hours. This is how we price every productivity hour your team gains." />
                    </div>
                    <div className="font-mono text-2xl text-accent">${Math.round(hourlyRate).toLocaleString()}<span className="text-sm text-white/30">/hr</span></div>
                  </div>
                  <div>
                    <div className="text-xs text-white/40 mb-1">Monthly team payroll cost</div>
                    <div className="font-mono text-2xl text-white/80">${monthlyTeamCost.toLocaleString()}<span className="text-sm text-white/30">/mo</span></div>
                  </div>
                  <div className="border-t border-white/[0.06] pt-4 text-xs text-white/25 leading-relaxed">
                    Every percent of velocity lift your team gains is worth{' '}
                    <span className="text-white/50 font-mono">${Math.round(monthlyTeamCost * 0.01).toLocaleString()}/mo</span> to your business.
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Before AI ── */}
          {step === 2 && (
            <motion.div key="step2" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}
              className="max-w-xl"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-accent/70 mb-2">Step 2 of 4</p>
              <h1 className="font-heading text-3xl font-bold text-white mb-2">Before AI</h1>
              <p className="text-white/40 mb-8 text-sm leading-relaxed">
                Pick a period before your team started using AI tools. This is your productivity baseline — the "control group."
              </p>
              <form onSubmit={s2.handleSubmit(handleStep2)} className="space-y-5">
                <div className="card p-5 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Baseline period</h3>
                  <PeriodPicker
                    label="Start"
                    monthReg={s2.register('baselineStartMonth')}
                    yearReg={s2.register('baselineStartYear')}
                    monthError={s2.formState.errors.baselineStartMonth?.message}
                  />
                  <PeriodPicker
                    label="End"
                    monthReg={s2.register('baselineEndMonth')}
                    yearReg={s2.register('baselineEndYear')}
                  />
                </div>

                <div className="card p-5">
                  <div className="flex items-center gap-1.5 mb-3">
                    <label className="text-sm font-medium text-white/70">Avg tickets closed per dev / month</label>
                    <Tooltip
                      content="Find this in Jira → Reports → Velocity Chart. Divide total tickets closed by your team size and the number of months in the period."
                      width="w-72"
                    />
                  </div>
                  <input
                    {...s2.register('baselineTickets', { valueAsNumber: true })}
                    className="input-dark"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 11"
                  />
                  {s2.formState.errors.baselineTickets && (
                    <p className="text-negative text-xs mt-1">{s2.formState.errors.baselineTickets.message}</p>
                  )}
                  <p className="text-xs text-white/25 mt-2 leading-relaxed">
                    Not sure? Check your Jira velocity report or sprint review history. Story points work too — just be consistent with step 4.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="btn-ghost flex items-center gap-2">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ── Step 3: AI Platforms ── */}
          {step === 3 && (
            <motion.div key="step3" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <p className="text-xs font-semibold uppercase tracking-widest text-accent/70 mb-2">Step 3 of 4</p>
              <h1 className="font-heading text-3xl font-bold text-white mb-2">Your AI tools</h1>
              <p className="text-white/40 mb-8 text-sm leading-relaxed">
                Add every AI platform your team pays for. We attribute ROI based on when each tool was adopted, so earlier tools get more credit.
              </p>

              <div className="space-y-4 mb-6 max-w-2xl">
                {platforms.map((p, idx) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="card p-5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <PlatformBadge name={p.name} size="sm" />
                        <span className="text-sm font-medium text-white">{p.name}</span>
                      </div>
                      {platforms.length > 1 && (
                        <button
                          onClick={() => setPlatforms(platforms.filter((x) => x.id !== p.id))}
                          className="p-1.5 rounded-lg hover:bg-negative/10 text-white/30 hover:text-negative transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="col-span-2 md:col-span-1">
                        <label className="text-xs text-white/40 mb-1.5 block">Platform</label>
                        <select value={p.name} onChange={(e) => updatePlatform(p.id, 'name', e.target.value as PlatformName)} className="input-dark">
                          {PLATFORM_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1.5">
                          <label className="text-xs text-white/40">Monthly cost ($)</label>
                          <Tooltip content="Total monthly subscription cost for this platform, across all seats." />
                        </div>
                        <input value={p.monthly_cost} onChange={(e) => updatePlatform(p.id, 'monthly_cost', Number(e.target.value))} className="input-dark" type="number" placeholder="800" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1.5">
                          <label className="text-xs text-white/40">Seats</label>
                          <Tooltip content="How many developers have active licences on this platform." />
                        </div>
                        <input value={p.seats} onChange={(e) => updatePlatform(p.id, 'seats', Number(e.target.value))} className="input-dark" type="number" min="1" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1.5">
                          <label className="text-xs text-white/40">Adopted</label>
                          <Tooltip content="The month your team first started actively using this tool." />
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          <select value={p.month} onChange={(e) => updatePlatform(p.id, 'month', e.target.value)} className="input-dark text-xs px-2">
                            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <select value={p.year} onChange={(e) => updatePlatform(p.id, 'year', e.target.value)} className="input-dark text-xs px-2">
                            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {platforms.length < 5 && (
                <button onClick={addPlatform} className="btn-ghost flex items-center gap-2 mb-8">
                  <Plus className="w-4 h-4" /> Add another platform
                </button>
              )}

              <div className="flex items-center justify-between max-w-2xl p-4 bg-card-dark border border-white/[0.06] rounded-lg mb-6">
                <span className="text-sm text-white/50">Total monthly AI spend</span>
                <span className="font-mono text-accent text-lg">${totalAISpend.toLocaleString()}<span className="text-white/30 text-sm">/mo</span></span>
              </div>

              <div className="flex gap-3 max-w-2xl">
                <button onClick={() => setStep(2)} className="btn-ghost flex items-center gap-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep(4)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Current Performance ── */}
          {step === 4 && (
            <motion.div key="step4" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-accent/70 mb-2">Step 4 of 4</p>
                <h1 className="font-heading text-3xl font-bold text-white mb-2">After AI</h1>
                <p className="text-white/40 mb-8 text-sm leading-relaxed">
                  Your current numbers — same metric as step 2. The delta between these two periods is how we calculate your velocity lift.
                </p>
                <form onSubmit={s4.handleSubmit(handleStep4)} className="space-y-5">
                  <div className="card p-5">
                    <div className="flex items-center gap-1.5 mb-3">
                      <label className="text-sm font-medium text-white/70">Avg tickets closed per dev / month</label>
                      <Tooltip
                        content="Same metric as step 2 — tickets per developer per month. Pull from the same report for a fair comparison."
                        width="w-72"
                      />
                    </div>
                    <input
                      {...s4.register('currentTickets', { valueAsNumber: true })}
                      className="input-dark"
                      type="number"
                      step="0.1"
                      placeholder="e.g. 16"
                    />
                    {s4.formState.errors.currentTickets && (
                      <p className="text-negative text-xs mt-1">{s4.formState.errors.currentTickets.message}</p>
                    )}
                  </div>

                  <div className="card p-5 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Current period</h3>
                    <PeriodPicker
                      label="Start"
                      monthReg={s4.register('currentStartMonth')}
                      yearReg={s4.register('currentStartYear')}
                      monthError={s4.formState.errors.currentStartMonth?.message}
                    />
                    <PeriodPicker
                      label="End"
                      monthReg={s4.register('currentEndMonth')}
                      yearReg={s4.register('currentEndYear')}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(3)} className="btn-ghost flex items-center gap-2">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                      Generate my dashboard <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>

              {/* Live ROI terminal */}
              <div className="card p-6 bg-obsidian self-start">
                <div className="flex items-center gap-2 mb-4">
                  <Terminal className="w-4 h-4 text-accent/60" />
                  <span className="text-xs text-white/30 font-mono">roi_preview.ts</span>
                </div>
                <div className="space-y-3 font-mono text-sm">
                  <div>
                    <span className="text-white/25">// velocity lift vs baseline</span>
                    <div className="flex justify-between mt-1">
                      <span className="text-white/50">velocity_lift</span>
                      <motion.span key={velLift} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className={velLift > 0 ? 'text-positive' : 'text-white/30'}
                      >
                        {velLift > 0 ? '+' : ''}{Math.round(velLift)}%
                      </motion.span>
                    </div>
                  </div>
                  <div className="border-t border-white/[0.06] pt-3">
                    <span className="text-white/25">// monthly productivity value</span>
                    <div className="flex justify-between mt-1">
                      <span className="text-white/50">monthly_value</span>
                      <motion.span key={monthlyValue} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-accent">
                        ${Math.round(monthlyValue).toLocaleString()}
                      </motion.span>
                    </div>
                  </div>
                  <div className="border-t border-white/[0.06] pt-3">
                    <span className="text-white/25">// value ÷ AI spend</span>
                    <div className="flex justify-between mt-1">
                      <span className="text-white/50">roi_multiple</span>
                      <motion.span key={roiMultiple} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className={roiMultiple > 1 ? 'text-positive' : 'text-negative'}
                      >
                        {roiMultiple > 0 ? `${roiMultiple.toFixed(1)}×` : '—'}
                      </motion.span>
                    </div>
                  </div>
                  <div className="border-t border-white/[0.06] pt-3">
                    <span className="text-white/25">// months to break even</span>
                    <div className="flex justify-between mt-1">
                      <span className="text-white/50">payback</span>
                      <motion.span key={paybackWeeks} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-accent">
                        {isFinite(paybackWeeks) && paybackWeeks < 999
                          ? paybackWeeks < 1 ? '< 1 week' : `${Math.round(paybackWeeks)}w`
                          : '—'}
                      </motion.span>
                    </div>
                  </div>
                  <div className="text-accent/40 animate-blink mt-1">▋</div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
