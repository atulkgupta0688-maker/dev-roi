import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { useAppStore } from '../lib/store';
import {
  calculateROIMetrics,
  calculatePlatformROIs,
  generateExecutiveSummary,
  calculateHourlyRate,
  calculateVelocityLift,
} from '../lib/roiEngine';

function LoadingStep({ text, done }: { text: string; done: boolean }) {
  return (
    <div className={`flex items-center gap-3 transition-all duration-300 ${done ? 'opacity-40' : 'opacity-100'}`}>
      {done ? (
        <CheckCircle className="w-4 h-4 text-positive shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
      )}
      <span className={`font-mono text-sm ${done ? 'text-white/40 line-through' : 'text-accent'}`}>{text}</span>
    </div>
  );
}

export function Report() {
  const { workspace, platforms } = useAppStore();
  const [generating, setGenerating] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);

  const workspaceData = { workspace: workspace!, platforms, developers: [] };
  const metrics = workspace ? calculateROIMetrics(workspaceData) : null;
  const platformROIs = workspace ? calculatePlatformROIs(workspaceData) : [];
  const summary = workspace ? generateExecutiveSummary(workspaceData) : '';

  const velocityLift = workspace?.baseline_tickets_per_dev && workspace?.current_tickets_per_dev
    ? calculateVelocityLift(workspace.baseline_tickets_per_dev, workspace.current_tickets_per_dev)
    : 0;

  const hourlyRate = workspace
    ? calculateHourlyRate(workspace.avg_annual_salary, workspace.monthly_hours)
    : 0;

  const hoursSaved = Math.round((velocityLift / 100) * (workspace?.team_size ?? 0) * (workspace?.monthly_hours ?? 0));
  const dollarValue = Math.round(hoursSaved * hourlyRate);

  const generateReport = async () => {
    setGenerating(true);
    setStep(0);

    const steps = [
      'Analyzing velocity data...',
      'Calculating platform ROI...',
      'Generating executive summary...',
      'Report ready.',
    ];

    for (let i = 0; i < steps.length; i++) {
      setStep(i + 1);
      await new Promise((r) => setTimeout(r, 700));
    }

    setGenerating(false);
    setShowReport(true);
  };

  const generateMarkdown = useCallback(() => {
    if (!workspace || !metrics) return '';
    return `# DevROI — Cost-Benefit Analysis Report
**${workspace.name}**
Generated: ${new Date().toLocaleDateString()}

## Executive Summary
${summary}

## Investment Overview
| Period | Spend | Platforms |
|--------|-------|-----------|
| Baseline | $0 | None |
| AI Period | $${Math.round(metrics.totalMonthlySpend).toLocaleString()}/mo | ${platforms.map((p) => p.name).join(', ')} |

## Productivity Value Calculation
- Baseline velocity: ${workspace.baseline_tickets_per_dev} tickets/dev/month
- Current velocity: ${workspace.current_tickets_per_dev} tickets/dev/month
- Velocity lift: ((${workspace.current_tickets_per_dev} - ${workspace.baseline_tickets_per_dev}) / ${workspace.baseline_tickets_per_dev}) × 100 = ${Math.round(velocityLift)}%
- Monthly hours saved: ${Math.round(velocityLift)}% × ${workspace.team_size} devs × ${workspace.monthly_hours} hrs = ${hoursSaved} hrs
- Dollar value: ${hoursSaved} hrs × $${Math.round(hourlyRate)}/hr = $${dollarValue.toLocaleString()}

## Net Benefit
- Total monthly value: $${Math.round(metrics.monthlyValue).toLocaleString()}
- Total monthly spend: $${Math.round(metrics.totalMonthlySpend).toLocaleString()}
- **Net monthly benefit: $${Math.round(metrics.netROI).toLocaleString()}**
- ROI multiple: **${metrics.roiMultiple.toFixed(1)}×**

## Platform Breakdown
${platformROIs.map((r) => `- ${r.platform.name}: $${r.platform.monthly_cost}/mo — ROI Index ${r.roiIndex.toFixed(1)}× (${r.recommendation})`).join('\n')}

## Payback Period
Your AI spend paid for itself in approximately **${Math.round(metrics.paybackWeeks)} weeks**.

---
*This estimate assumes productivity gain is fully attributable to AI adoption. Other factors (team growth, process changes) may contribute.*
`;
  }, [workspace, metrics, platforms, summary, velocityLift, hoursSaved, hourlyRate, dollarValue, platformROIs]);

  const copyMarkdown = async () => {
    await navigator.clipboard.writeText(generateMarkdown());
    setCopied(true);
    toast.success('Report copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!workspace) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="w-12 h-12 text-white/20 mb-4" />
          <h2 className="text-xl font-heading font-bold text-white mb-2">No workspace data</h2>
          <p className="text-white/40 mb-6">Complete the setup wizard to generate a CBA report.</p>
          <Link to="/setup" className="btn-primary">Go to setup</Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">CBA Report</h1>
          <p className="text-sm text-white/40 mt-1">Cost-benefit analysis — printable format</p>
        </div>
        {showReport && (
          <div className="flex gap-3 no-print">
            <button
              onClick={copyMarkdown}
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-positive" /> : <Copy className="w-4 h-4" />}
              Copy as Markdown
            </button>
            <button
              onClick={() => window.print()}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
          </div>
        )}
      </div>

      {/* Generate button / loading state */}
      {!showReport && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 max-w-lg mx-auto text-center"
        >
          {!generating ? (
            <>
              <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Printer className="w-8 h-8 text-accent" />
              </div>
              <h2 className="font-heading text-xl font-bold text-white mb-2">Generate your report</h2>
              <p className="text-sm text-white/40 mb-6 leading-relaxed">
                We'll analyze your velocity data and create a clean, printable cost-benefit analysis.
              </p>
              <button onClick={generateReport} className="btn-primary flex items-center gap-2 mx-auto">
                Generate Report
              </button>
            </>
          ) : (
            <div className="py-4">
              <div className="mb-6">
                <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h3 className="font-heading text-lg font-bold text-white">Analyzing your data</h3>
              </div>
              <div className="space-y-3 text-left">
                {[
                  'Analyzing velocity data...',
                  'Calculating platform ROI...',
                  'Generating executive summary...',
                  'Report ready.',
                ].map((s, i) => (
                  <LoadingStep key={s} text={s} done={step > i + 1} />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Report content */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="print-report"
          >
            {/* Report — switches to light mode style for print */}
            <div className="max-w-3xl mx-auto">
              <div className="card p-8">
                {/* Report header */}
                <div className="border-b border-white/[0.06] pb-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-accent font-medium uppercase tracking-widest mb-1">DevROI</p>
                      <h2 className="font-heading text-2xl font-bold text-white">{workspace.name}</h2>
                      <p className="text-sm text-white/40 mt-1">ROI Analysis Report</p>
                    </div>
                    <div className="text-right text-sm text-white/30">
                      <div>Generated</div>
                      <div className="font-mono text-white/60">{new Date().toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>

                {/* 1. Executive Summary */}
                <section className="mb-8">
                  <h3 className="text-xs font-medium uppercase tracking-widest text-accent/60 mb-3">1. Executive Summary</h3>
                  <p className="text-white/80 leading-relaxed text-sm">{summary}</p>
                </section>

                {/* 2. Investment Overview */}
                <section className="mb-8">
                  <h3 className="text-xs font-medium uppercase tracking-widest text-accent/60 mb-3">2. Investment Overview</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-white/30 uppercase tracking-wider border-b border-white/[0.06]">
                          <th className="text-left py-2 pr-4">Period</th>
                          <th className="text-right py-2 pr-4">Total AI Spend</th>
                          <th className="text-right py-2 pr-4">Platforms</th>
                          <th className="text-right py-2">Seats</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        <tr>
                          <td className="py-3 pr-4 text-white/60">Baseline ({workspace.baseline_start} — {workspace.baseline_end})</td>
                          <td className="py-3 pr-4 text-right font-mono text-white/40">$0</td>
                          <td className="py-3 pr-4 text-right text-white/40">None</td>
                          <td className="py-3 text-right text-white/40">—</td>
                        </tr>
                        <tr>
                          <td className="py-3 pr-4 text-white/60">AI Period ({workspace.current_period_start} — {workspace.current_period_end})</td>
                          <td className="py-3 pr-4 text-right font-mono text-accent">${Math.round(metrics!.totalMonthlySpend).toLocaleString()}/mo</td>
                          <td className="py-3 pr-4 text-right text-white/70">{platforms.length}</td>
                          <td className="py-3 text-right text-white/70">{platforms.reduce((s, p) => s + p.seats, 0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* 3. Productivity Value Calculation */}
                <section className="mb-8">
                  <h3 className="text-xs font-medium uppercase tracking-widest text-accent/60 mb-3">3. Productivity Value Calculation</h3>
                  <div className="bg-obsidian rounded-xl p-5 font-mono text-sm space-y-2">
                    <div className="text-white/30">// Velocity lift calculation</div>
                    <div className="text-white/70">
                      velocity_lift = (({workspace.current_tickets_per_dev} − {workspace.baseline_tickets_per_dev}) / {workspace.baseline_tickets_per_dev}) × 100
                      <span className="text-positive ml-3">= {Math.round(velocityLift)}%</span>
                    </div>
                    <div className="mt-3 text-white/30">// Monthly hours unlocked</div>
                    <div className="text-white/70">
                      hours_saved = {Math.round(velocityLift)}% × {workspace.team_size} devs × {workspace.monthly_hours} hrs
                      <span className="text-accent ml-3">= {hoursSaved} hrs/mo</span>
                    </div>
                    <div className="mt-3 text-white/30">// Dollar value of hours saved</div>
                    <div className="text-white/70">
                      dollar_value = {hoursSaved} hrs × ${Math.round(hourlyRate)}/hr (blended rate)
                      <span className="text-positive ml-3">= ${dollarValue.toLocaleString()}/mo</span>
                    </div>
                  </div>
                </section>

                {/* 4. Net Benefit */}
                <section className="mb-8">
                  <h3 className="text-xs font-medium uppercase tracking-widest text-accent/60 mb-3">4. Net Benefit Summary</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="card p-4 text-center">
                      <div className="text-xs text-white/30 mb-1">Monthly value</div>
                      <div className="font-mono text-positive text-xl">${Math.round(metrics!.monthlyValue).toLocaleString()}</div>
                    </div>
                    <div className="card p-4 text-center">
                      <div className="text-xs text-white/30 mb-1">Monthly spend</div>
                      <div className="font-mono text-negative text-xl">−${Math.round(metrics!.totalMonthlySpend).toLocaleString()}</div>
                    </div>
                    <div className="card p-4 text-center bg-positive/5 border-positive/20">
                      <div className="text-xs text-white/30 mb-1">Net benefit</div>
                      <div className="font-mono text-positive text-xl">${Math.round(metrics!.netROI).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <span className="font-mono text-3xl text-accent">{metrics!.roiMultiple.toFixed(1)}×</span>
                    <span className="text-white/40 text-sm ml-2">return on AI spend</span>
                  </div>
                </section>

                {/* 5. Platform Breakdown */}
                <section className="mb-8">
                  <h3 className="text-xs font-medium uppercase tracking-widest text-accent/60 mb-3">5. Platform Breakdown</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-white/30 uppercase tracking-wider border-b border-white/[0.06]">
                        <th className="text-left py-2 pr-4">Platform</th>
                        <th className="text-right py-2 pr-4">Monthly Cost</th>
                        <th className="text-right py-2 pr-4">ROI Index</th>
                        <th className="text-right py-2">Recommendation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {platformROIs.sort((a, b) => b.roiIndex - a.roiIndex).map((r) => (
                        <tr key={r.platform.id}>
                          <td className="py-3 pr-4 text-white/70">{r.platform.name}</td>
                          <td className="py-3 pr-4 text-right font-mono text-white/60">${r.platform.monthly_cost.toLocaleString()}</td>
                          <td className="py-3 pr-4 text-right font-mono text-accent">{r.roiIndex.toFixed(1)}×</td>
                          <td className="py-3 text-right">
                            {r.recommendation === 'Strong ROI' && <span className="badge-green">{r.recommendation}</span>}
                            {r.recommendation === 'Monitor' && <span className="badge-amber">{r.recommendation}</span>}
                            {r.recommendation === 'Consider removing' && <span className="badge-red">{r.recommendation}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                {/* 6. Payback */}
                <section className="mb-8">
                  <h3 className="text-xs font-medium uppercase tracking-widest text-accent/60 mb-3">6. Payback Period</h3>
                  <div className="flex items-center gap-3 p-4 bg-accent/5 border border-accent/15 rounded-xl">
                    <div className="font-mono text-3xl text-accent">
                      {metrics!.paybackWeeks < 1 ? '< 1w' : `${Math.round(metrics!.paybackWeeks)}w`}
                    </div>
                    <p className="text-sm text-white/60">
                      {metrics!.paybackWeeks < 1
                        ? 'Your AI spend pays for itself in less than one week based on your velocity lift data. Exceptional ROI.'
                        : <>Your AI spend paid for itself in approximately <strong className="text-white">{Math.round(metrics!.paybackWeeks)} weeks</strong> based on your velocity lift data.</>
                      }
                    </p>
                  </div>
                </section>

                {/* Disclaimer */}
                <div className="border-t border-white/[0.06] pt-4">
                  <p className="text-xs text-white/25 italic leading-relaxed">
                    This estimate assumes productivity gain is fully attributable to AI adoption. Other factors (team growth, process changes, seasonality) may contribute to observed velocity changes. Use this analysis as a directional guide rather than a precise accounting.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-4 no-print">
                <button
                  onClick={() => { setShowReport(false); setGenerating(false); setStep(0); }}
                  className="btn-ghost text-sm"
                >
                  ← Regenerate
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
