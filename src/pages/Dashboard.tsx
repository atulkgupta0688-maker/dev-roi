import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DollarSign, AlertCircle, ArrowRight } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { SubscriptionTable } from '../components/SubscriptionTable';
import { TrendChart } from '../components/TrendChart';
import { SaveWorkspaceBanner } from '../components/SaveWorkspaceBanner';
import { useAppStore } from '../lib/store';
import { calculateSpendInsights } from '../lib/spendEngine';

export function Dashboard() {
  const { workspace, platforms, snapshots, isDemoMode } = useAppStore();

  const insights = useMemo(
    () => calculateSpendInsights(platforms),
    [platforms]
  );

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

      <SaveWorkspaceBanner />

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">{workspace.name}</h1>
        <p className="text-sm text-white/40 mt-1">AI spend optimization</p>
      </div>

      {/* Insight blocks */}
      <div className="grid grid-cols-1 gap-4 mb-8">
        {/* A: Total Spend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="card p-5 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Total Spend</div>
            <div className="text-2xl font-mono font-bold text-white">
              ${insights.totalSpend.toLocaleString()}<span className="text-sm font-normal text-white/40">/month</span>
            </div>
            <div className="text-xs text-white/40 mt-0.5">across {platforms.length} tool{platforms.length !== 1 ? 's' : ''}</div>
          </div>
        </motion.div>

        {/* B: Usage Insight */}
        {insights.topToolName && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="card p-5"
          >
            <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Usage Insight</div>
            <p className="text-white text-sm leading-relaxed">
              Most work is being done using{' '}
              <span className="text-accent font-medium">{insights.topToolName}</span>{' '}
              (~{insights.topToolUsage}%)
            </p>
          </motion.div>
        )}

        {/* C: Waste + Recommendation */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="card p-5 space-y-3"
        >
          <div className="text-xs text-white/40 uppercase tracking-widest">Waste &amp; Recommendation</div>
          <p className="text-white text-sm">
            {insights.totalWaste > 0
              ? <><span className="text-amber font-medium">${Math.round(insights.totalWaste).toLocaleString()}/month</span> is spent on underutilized tools</>
              : 'No waste detected — spend matches usage.'}
          </p>
          <div className="rounded-lg bg-accent/10 border border-accent/20 px-4 py-3 text-sm text-accent">
            {insights.recommendation}
          </div>
        </motion.div>
      </div>

      {/* Trend chart — only when 2+ snapshots */}
      {snapshots.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mb-6"
        >
          <TrendChart snapshots={snapshots} />
        </motion.div>
      )}

      {/* Subscription table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
      >
        <h2 className="font-semibold text-white mb-3">Subscriptions</h2>
        <SubscriptionTable platforms={platforms} />
      </motion.div>
    </PageTransition>
  );
}
