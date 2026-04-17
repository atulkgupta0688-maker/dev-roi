import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, TrendingUp, TrendingDown, Zap, RotateCcw } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { SubscriptionTable } from '../components/SubscriptionTable';
import { PlatformChart } from '../components/PlatformChart';
import { KPICard } from '../components/KPICard';
import { ROICalculationModal } from '../components/ROICalculationModal';
import { useAppStore } from '../lib/store';
import { calculateROIMetrics, calculatePlatformROIs } from '../lib/roiEngine';

type ExplainMetric = 'roi' | 'net' | 'lift' | 'spend' | null;

export function Dashboard() {
  const { workspace, platforms, developers, isDemoMode, clearData } = useAppStore();
  const navigate = useNavigate();
  const [explainMetric, setExplainMetric] = useState<ExplainMetric>(null);

  const roiMetrics = useMemo(
    () =>
      workspace && platforms.length > 0
        ? calculateROIMetrics({ workspace, platforms, developers })
        : null,
    [workspace, platforms, developers]
  );

  const platformROIs = useMemo(
    () =>
      workspace && platforms.length > 0
        ? calculatePlatformROIs({ workspace, platforms, developers })
        : [],
    [workspace, platforms, developers]
  );

  const smartInsights = useMemo(() => {
    if (!roiMetrics || platformROIs.length === 0) return [];

    const cards: { type: 'positive' | 'warning' | 'neutral'; title: string; detail: string }[] = [];

    const best = platformROIs[0];
    if (best) {
      cards.push({
        type: 'positive',
        title: `${best.platform.name} leads your stack`,
        detail: `${best.roiIndex.toFixed(1)}× ROI · $${best.platform.monthly_cost.toLocaleString()}/mo · ${best.platform.usage_percent}% of team usage`,
      });
    }

    const worst = platformROIs[platformROIs.length - 1];
    if (worst && worst.roiIndex < 1.0 && platformROIs.length > 1) {
      cards.push({
        type: 'warning',
        title: `${worst.platform.name} needs attention`,
        detail: `Only ${worst.roiIndex.toFixed(1)}× ROI on $${worst.platform.monthly_cost.toLocaleString()}/mo — consider cutting seats`,
      });
    } else {
      const costPerPctLift =
        roiMetrics.velocityLift > 0
          ? (roiMetrics.totalMonthlySpend / roiMetrics.velocityLift).toFixed(0)
          : null;
      if (costPerPctLift) {
        cards.push({
          type: 'neutral',
          title: 'Spend efficiency looks healthy',
          detail: `$${Number(costPerPctLift).toLocaleString()} per 1% velocity gain — all tools above break-even`,
        });
      }
    }

    if (roiMetrics.monthlyValue > 0) {
      const pw = roiMetrics.paybackWeeks;
      const paybackLabel =
        pw < 1 ? 'under 1 week' : pw < 999 ? `${Math.round(pw)} week${pw >= 2 ? 's' : ''}` : null;
      if (paybackLabel) {
        cards.push({
          type: 'neutral',
          title: `Pays back in ${paybackLabel}`,
          detail: `$${Math.round(roiMetrics.monthlyValue).toLocaleString()} monthly value vs $${Math.round(roiMetrics.totalMonthlySpend).toLocaleString()} spend`,
        });
      }
    }

    return cards;
  }, [roiMetrics, platformROIs]);

  if (!workspace) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="w-12 h-12 text-white/20 mb-4" />
          <h2 className="text-xl font-heading font-bold text-white mb-2">No data yet</h2>
          <p className="text-white/40 mb-6">Complete the setup to see your spend dashboard.</p>
          <Link to="/setup" className="btn-primary flex items-center gap-2">
            Set up workspace <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </PageTransition>
    );
  }

  const hasROIData =
    roiMetrics !== null &&
    workspace.baseline_per_dev !== null &&
    workspace.current_per_dev !== null;

  const INSIGHT_ICON = { positive: TrendingUp, warning: TrendingDown, neutral: Zap };
  const INSIGHT_COLOR = { positive: 'text-emerald-400', warning: 'text-amber-400', neutral: 'text-cyan-400' };
  const INSIGHT_BG = {
    positive: 'bg-emerald-400/8 border-emerald-400/15',
    warning: 'bg-amber-400/8 border-amber-400/15',
    neutral: 'bg-cyan-400/8 border-cyan-400/15',
  };

  return (
    <PageTransition>
      <div className="pt-[61px]">
      {/* Demo banner */}
      {isDemoMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between bg-amber/10 border border-amber/20 rounded-xl px-4 py-3"
        >
          <span className="text-sm text-amber/90">
            Viewing demo — Acme Engineering (8 devs, 5 AI tools)
          </span>
          <Link to="/setup" className="text-xs font-medium text-amber hover:text-white transition-colors">
            Use your own data →
          </Link>
        </motion.div>
      )}

      {/* Recalculate banner */}
      <div className="mb-6 flex items-center justify-between bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3">
        <p className="text-sm text-white/50">Want to try different inputs?</p>
        <button
          onClick={() => { clearData(); navigate('/setup'); }}
          className="flex items-center gap-2 text-xs font-medium text-white/60 hover:text-white transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Recalculate
        </button>
      </div>

      {/* Header */}
      <div className="mb-7">
        <h1 className="font-heading text-2xl font-bold text-white">{workspace.name}</h1>
        <p className="text-sm text-white/40 mt-1">
          AI spend optimization · {platforms.length} tool{platforms.length !== 1 ? 's' : ''} · {workspace.team_size} dev{workspace.team_size !== 1 ? 's' : ''}
        </p>
      </div>

      {/* KPI row */}
      {hasROIData && roiMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            label="ROI multiple"
            value={roiMetrics.roiMultiple}
            suffix="×"
            decimals={1}
            color="cyan"
            tooltip="Monthly value generated ÷ total AI spend"
            delay={0}
            onExplain={() => setExplainMetric('roi')}
          />
          <KPICard
            label="Net monthly value"
            value={roiMetrics.netROI}
            prefix="$"
            decimals={0}
            color="green"
            subtitle="after AI costs"
            delay={0.06}
            onExplain={() => setExplainMetric('net')}
          />
          <KPICard
            label="Velocity lift"
            value={roiMetrics.velocityLift}
            suffix="%"
            decimals={1}
            color="green"
            subtitle={`${workspace.baseline_per_dev} → ${workspace.current_per_dev} tickets/dev/mo`}
            delay={0.12}
            onExplain={() => setExplainMetric('lift')}
          />
          <KPICard
            label="Monthly spend"
            value={roiMetrics.totalMonthlySpend}
            prefix="$"
            decimals={0}
            color="white"
            subtitle={`${platforms.length} subscription${platforms.length !== 1 ? 's' : ''}`}
            delay={0.18}
            onExplain={() => setExplainMetric('spend')}
          />
        </div>
      )}

      {/* Spend-only row when ROI not yet set */}
      {!hasROIData && platforms.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <KPICard
            label="Monthly spend"
            value={platforms.reduce((s, p) => s + p.monthly_cost, 0)}
            prefix="$"
            decimals={0}
            color="cyan"
            subtitle={`${platforms.length} subscription${platforms.length !== 1 ? 's' : ''}`}
            delay={0}
            onExplain={() => setExplainMetric('spend')}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="card p-5 flex items-center"
          >
            <p className="text-sm text-white/50">
              Add baseline &amp; current velocity in{' '}
              <Link to="/settings" className="text-cyan-400 hover:text-cyan-300 transition-colors">Settings</Link>{' '}
              to unlock your full ROI breakdown.
            </p>
          </motion.div>
        </div>
      )}

      {/* Smart insight cards */}
      {smartInsights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {smartInsights.map((ins, i) => {
            const Icon = INSIGHT_ICON[ins.type];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24 + i * 0.07 }}
                className={`rounded-xl border p-4 ${INSIGHT_BG[ins.type]}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex-shrink-0 ${INSIGHT_COLOR[ins.type]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white leading-snug mb-1">{ins.title}</p>
                    <p className="text-xs text-white/45 leading-relaxed">{ins.detail}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Platform comparison chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-6"
      >
        <PlatformChart
          platforms={platforms}
          platformROIs={platformROIs.length > 0 ? platformROIs : undefined}
        />
      </motion.div>

      {/* Subscription table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.46 }}
      >
        <h2 className="font-semibold text-white mb-3">Subscriptions</h2>
        <SubscriptionTable
          platforms={platforms}
          platformROIs={platformROIs.length > 0 ? platformROIs : undefined}
        />
      </motion.div>

      {/* ROI calculation modal */}
      {roiMetrics && workspace && (
        <ROICalculationModal
          metric={explainMetric}
          onClose={() => setExplainMetric(null)}
          roiMetrics={roiMetrics}
          workspace={workspace}
          platforms={platforms}
        />
      )}
      </div>
    </PageTransition>
  );
}
