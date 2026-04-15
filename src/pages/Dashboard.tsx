import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Zap, Clock, ArrowRight, AlertCircle } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { KPICard } from '../components/KPICard';
import { SubscriptionTable } from '../components/SubscriptionTable';
import { WhatIfSimulator } from '../components/WhatIfSimulator';
import { DeveloperTable } from '../components/DeveloperTable';
import { TrendChart } from '../components/TrendChart';
import { SaveWorkspaceBanner } from '../components/SaveWorkspaceBanner';
import { useAppStore } from '../lib/store';
import { calculateROIMetrics, calculatePlatformROIs, enrichDevelopers } from '../lib/roiEngine';

export function Dashboard() {
  const { workspace, platforms, developers, snapshots, isDemoMode } = useAppStore();

  const workspaceData = useMemo(
    () => ({ workspace: workspace!, platforms, developers }),
    [workspace, platforms, developers]
  );

  const metrics = useMemo(
    () => (workspace ? calculateROIMetrics(workspaceData) : null),
    [workspaceData, workspace]
  );

  const platformROIs = useMemo(
    () => (workspace ? calculatePlatformROIs(workspaceData) : []),
    [workspaceData, workspace]
  );

  const enrichedDevs = useMemo(
    () => (workspace && developers.length > 0 ? enrichDevelopers(developers, workspace, platforms) : []),
    [workspace, developers, platforms]
  );

  const metricLabel = workspace?.metric_type === 'prs' ? 'PRs' : 'tickets';

  // Trend: compare current metrics to last snapshot
  const prevSnapshot = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null;
  const lastSnapshotLabel = prevSnapshot
    ? new Date(prevSnapshot.recorded_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    : undefined;

  if (!workspace) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="w-12 h-12 text-white/20 mb-4" />
          <h2 className="text-xl font-heading font-bold text-white mb-2">No data yet</h2>
          <p className="text-white/40 mb-6">Complete the setup wizard to see your ROI dashboard.</p>
          <Link to="/setup" className="btn-primary flex items-center gap-2">
            Set up workspace <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </PageTransition>
    );
  }

  if (workspace.baseline_per_dev == null || workspace.current_per_dev == null) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="w-8 h-8 text-amber mb-4" />
          <h2 className="text-xl font-heading font-bold text-white mb-2">Setup incomplete</h2>
          <p className="text-white/40 mb-6">Please complete all 4 steps of the setup wizard.</p>
          <Link to="/setup" className="btn-primary flex items-center gap-2">
            Complete setup <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      {/* Demo banner */}
      {isDemoMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between bg-amber/10 border border-amber/20 rounded-xl px-4 py-3"
        >
          <span className="text-sm text-amber/90">
            Viewing demo — Acme Engineering (8 devs, 3 AI tools)
          </span>
          <Link to="/setup" className="text-xs font-medium text-amber hover:text-white transition-colors">
            Use your own data →
          </Link>
        </motion.div>
      )}

      {/* Save banner (unauthenticated users with pending data) */}
      <SaveWorkspaceBanner />

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">{workspace.name}</h1>
        <p className="text-sm text-white/40 mt-1">
          AI ROI — {metricLabel} · {workspace.rolling_window}-day window
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          label="ROI Multiple"
          value={metrics?.roiMultiple ?? 0}
          suffix="×"
          decimals={1}
          subtitle="return on AI spend"
          color="cyan"
          icon={<Zap className="w-4 h-4" />}
          tooltip="Monthly value created ÷ monthly AI spend."
          trend={prevSnapshot ? { previous: prevSnapshot.roi_multiple, label: lastSnapshotLabel! } : undefined}
          delay={0}
        />
        <KPICard
          label="Net Monthly Value"
          value={metrics?.netROI ?? 0}
          prefix="$"
          subtitle="value minus spend"
          color={metrics?.netROI && metrics.netROI > 0 ? 'green' : 'red'}
          icon={<DollarSign className="w-4 h-4" />}
          tooltip="Monthly productivity value minus total AI spend."
          trend={prevSnapshot ? { previous: prevSnapshot.net_monthly_value, label: lastSnapshotLabel! } : undefined}
          delay={0.08}
        />
        <KPICard
          label="Velocity Lift"
          value={metrics?.velocityLift ?? 0}
          suffix="%"
          decimals={1}
          subtitle={`${metricLabel} vs baseline`}
          color="green"
          icon={<TrendingUp className="w-4 h-4" />}
          tooltip="Percentage increase in tickets/PRs per dev vs your pre-AI baseline."
          trend={prevSnapshot ? { previous: prevSnapshot.velocity_lift_pct, label: lastSnapshotLabel! } : undefined}
          delay={0.16}
        />
        <KPICard
          label="Payback Period"
          value={Math.min(metrics?.paybackWeeks ?? 999, 99)}
          suffix=" wk"
          decimals={1}
          subtitle="to break even"
          color="cyan"
          icon={<Clock className="w-4 h-4" />}
          tooltip="Weeks until your AI spend pays for itself at current velocity."
          delay={0.24}
        />
      </div>

      {/* Trend chart — only when 2+ snapshots */}
      {snapshots.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="mb-6"
        >
          <TrendChart snapshots={snapshots} />
        </motion.div>
      )}

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

      {/* What-if simulator */}
      {platforms.length > 0 && metrics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          className="mb-6"
        >
          <WhatIfSimulator data={workspaceData} baseMetrics={metrics} />
        </motion.div>
      )}

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
    </PageTransition>
  );
}
