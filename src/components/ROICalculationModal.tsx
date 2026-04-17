import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { ROIMetrics, Workspace, AIPlatform } from '../lib/types';

type MetricKey = 'roi' | 'net' | 'lift' | 'spend';

interface Props {
  metric: MetricKey | null;
  onClose: () => void;
  roiMetrics: ROIMetrics;
  workspace: Workspace;
  platforms: AIPlatform[];
}

function fmt(n: number, prefix = '', suffix = '', decimals = 0) {
  const rounded = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString();
  return `${prefix}${decimals > 0 ? Number(rounded).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : rounded}${suffix}`;
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0 ${highlight ? 'bg-accent/5 -mx-4 px-4 rounded-lg' : ''}`}>
      <span className="text-sm text-white/50">{label}</span>
      <span className={`text-sm font-mono font-semibold ${highlight ? 'text-accent' : 'text-white/80'}`}>{value}</span>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0">{number}</span>
        <span className="text-sm font-semibold text-white/80">{title}</span>
      </div>
      <div className="ml-8.5 space-y-0">{children}</div>
    </div>
  );
}

function Formula({ expr, result }: { expr: string; result: string }) {
  return (
    <div className="mb-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] font-mono text-xs">
      <span className="text-white/40">{expr}</span>
      <span className="text-accent ml-2">= {result}</span>
    </div>
  );
}

const TITLES: Record<MetricKey, string> = {
  roi: 'How ROI Multiple is calculated',
  net: 'How Net Monthly Value is calculated',
  lift: 'How Velocity Lift is calculated',
  spend: 'What makes up Monthly Spend',
};

export function ROICalculationModal({ metric, onClose, roiMetrics, workspace, platforms }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const m = roiMetrics;
  const w = workspace;

  return (
    <AnimatePresence>
      {metric && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="w-full max-w-md bg-[#0F1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="font-semibold text-white text-sm">{TITLES[metric]}</h2>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5 max-h-[75vh] overflow-y-auto space-y-1">

              {/* ── ROI Multiple ── */}
              {metric === 'roi' && (
                <>
                  <Formula
                    expr="ROI = Monthly Value ÷ Monthly Spend"
                    result={`${m.roiMultiple.toFixed(2)}×`}
                  />
                  <Step number={1} title="Velocity Lift">
                    <Formula
                      expr={`(${w.current_per_dev} − ${w.baseline_per_dev}) ÷ ${w.baseline_per_dev} × 100`}
                      result={`${m.velocityLift.toFixed(1)}%`}
                    />
                    <Row label="Baseline tickets/dev/mo" value={String(w.baseline_per_dev ?? 0)} />
                    <Row label="Current tickets/dev/mo" value={String(w.current_per_dev ?? 0)} />
                  </Step>
                  <Step number={2} title="Hourly Rate">
                    <Formula
                      expr={`$${(w.avg_annual_salary / 1000).toFixed(0)}k ÷ 12 ÷ ${w.monthly_hours} hrs`}
                      result={fmt(m.hourlyRate, '$', '/hr', 2)}
                    />
                    <Row label="Annual salary" value={fmt(w.avg_annual_salary, '$')} />
                    <Row label="Monthly hours" value={`${w.monthly_hours} hrs`} />
                  </Step>
                  <Step number={3} title="Monthly Value">
                    <Formula
                      expr={`${m.velocityLift.toFixed(1)}% × ${w.team_size} devs × ${fmt(m.hourlyRate, '$', '/hr', 2)} × ${w.monthly_hours} hrs`}
                      result={fmt(m.monthlyValue, '$', '/mo')}
                    />
                    <Row label="Team size" value={`${w.team_size} devs`} />
                  </Step>
                  <Step number={4} title="Monthly Spend">
                    {platforms.map((p) => (
                      <Row key={p.id} label={p.name} value={fmt(p.monthly_cost, '$', '/mo')} />
                    ))}
                    <Row label="Total spend" value={fmt(m.totalMonthlySpend, '$', '/mo')} />
                  </Step>
                  <div className="mt-4 p-4 rounded-xl bg-accent/10 border border-accent/20">
                    <div className="text-xs text-accent/70 mb-1 font-mono">Final calculation</div>
                    <div className="font-mono text-sm text-white">
                      {fmt(m.monthlyValue, '$')} ÷ {fmt(m.totalMonthlySpend, '$')} = <span className="text-accent font-bold">{m.roiMultiple.toFixed(2)}×</span>
                    </div>
                  </div>
                </>
              )}

              {/* ── Net Monthly Value ── */}
              {metric === 'net' && (
                <>
                  <Formula
                    expr="Net Value = Monthly Value − Monthly Spend"
                    result={fmt(m.netROI, '$', '/mo')}
                  />
                  <Step number={1} title="Monthly Value Generated">
                    <Formula
                      expr={`${m.velocityLift.toFixed(1)}% lift × ${w.team_size} devs × ${fmt(m.hourlyRate, '$', '/hr', 2)} × ${w.monthly_hours} hrs`}
                      result={fmt(m.monthlyValue, '$', '/mo')}
                    />
                    <Row label="Velocity lift" value={`${m.velocityLift.toFixed(1)}%`} />
                    <Row label="Hourly rate" value={fmt(m.hourlyRate, '$', '/hr', 2)} />
                    <Row label="Team size" value={`${w.team_size} devs`} />
                    <Row label="Monthly hours / dev" value={`${w.monthly_hours} hrs`} />
                  </Step>
                  <Step number={2} title="Monthly AI Spend">
                    {platforms.map((p) => (
                      <Row key={p.id} label={p.name} value={fmt(p.monthly_cost, '$', '/mo')} />
                    ))}
                    <Row label="Total" value={fmt(m.totalMonthlySpend, '$', '/mo')} />
                  </Step>
                  <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-xs text-emerald-400/70 mb-1 font-mono">Net gain</div>
                    <div className="font-mono text-sm text-white">
                      {fmt(m.monthlyValue, '$')} − {fmt(m.totalMonthlySpend, '$')} = <span className="text-emerald-400 font-bold">{fmt(m.netROI, '$', '/mo')}</span>
                    </div>
                  </div>
                </>
              )}

              {/* ── Velocity Lift ── */}
              {metric === 'lift' && (
                <>
                  <Formula
                    expr="Lift = (Current − Baseline) ÷ Baseline × 100"
                    result={`${m.velocityLift.toFixed(1)}%`}
                  />
                  <Step number={1} title="Your productivity numbers">
                    <Row label="Before AI tools (baseline)" value={`${w.baseline_per_dev} tickets/dev/mo`} />
                    <Row label="With AI tools (current)" value={`${w.current_per_dev} tickets/dev/mo`} />
                    <Row label="Improvement per developer" value={`+${(Number(w.current_per_dev) - Number(w.baseline_per_dev)).toFixed(1)} tickets/mo`} />
                  </Step>
                  <Step number={2} title="Team-wide impact">
                    <Row label="Team size" value={`${w.team_size} devs`} />
                    <Row label="Extra tickets per month" value={`+${Math.round((Number(w.current_per_dev) - Number(w.baseline_per_dev)) * w.team_size)}`} />
                    <Row label="Velocity lift" value={`${m.velocityLift.toFixed(1)}%`} />
                  </Step>
                  <Step number={3} title="Dollar value of the lift">
                    <Formula
                      expr={`${m.velocityLift.toFixed(1)}% × ${w.team_size} devs × ${fmt(m.hourlyRate, '$', '/hr', 2)} × ${w.monthly_hours} hrs`}
                      result={fmt(m.monthlyValue, '$', '/mo')}
                    />
                    <Row label="Developer hourly rate" value={fmt(m.hourlyRate, '$', '/hr', 2)} />
                    <Row label="Monthly value created" value={fmt(m.monthlyValue, '$', '/mo')} highlight />
                  </Step>
                </>
              )}

              {/* ── Monthly Spend ── */}
              {metric === 'spend' && (
                <>
                  <Formula
                    expr="Total Spend = Sum of all AI subscription costs"
                    result={fmt(m.totalMonthlySpend, '$', '/mo')}
                  />
                  <Step number={1} title="Subscription breakdown">
                    {platforms.map((p) => (
                      <div key={p.id} className="py-2.5 border-b border-white/[0.05] last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white/70 font-medium">{p.name}</span>
                          <span className="text-sm font-mono text-white/80">{fmt(p.monthly_cost, '$', '/mo')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-white/35">
                          <span>{p.seats} seats</span>
                          <span>·</span>
                          <span>{p.usage_percent}% usage</span>
                          <span>·</span>
                          <span>{fmt(p.monthly_cost / p.seats, '$', '/seat/mo', 2)}</span>
                        </div>
                      </div>
                    ))}
                  </Step>
                  <Step number={2} title="Cost context">
                    <Row label="Total monthly spend" value={fmt(m.totalMonthlySpend, '$', '/mo')} />
                    <Row label="Cost per developer" value={fmt(m.totalMonthlySpend / w.team_size, '$', '/dev/mo', 2)} />
                    <Row
                      label="As % of avg salary"
                      value={`${((m.totalMonthlySpend / (w.avg_annual_salary / 12)) * 100).toFixed(1)}%`}
                    />
                    {m.paybackWeeks < 999 && (
                      <Row
                        label="Breaks even in"
                        value={m.paybackWeeks < 1 ? '< 1 week' : `${Math.round(m.paybackWeeks)} weeks`}
                        highlight
                      />
                    )}
                  </Step>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
