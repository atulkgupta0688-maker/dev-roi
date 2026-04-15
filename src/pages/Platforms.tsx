import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { PlatformBadge } from '../components/PlatformBadge';
import { useAppStore } from '../lib/store';
import { calculatePlatformROIs, calculateWhatIf, calculateROIMetrics } from '../lib/roiEngine';

function RecommendationBadge({ rec }: { rec: string }) {
  if (rec === 'Strong ROI') return <span className="badge-green">{rec}</span>;
  if (rec === 'Monitor') return <span className="badge-amber">{rec}</span>;
  return <span className="badge-red">{rec}</span>;
}

function ROIBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100);
  const color = value > 2 ? '#00FF94' : value >= 0.8 ? '#F59E0B' : '#FF4D6D';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="font-mono text-sm w-12 text-right" style={{ color }}>
        {value.toFixed(1)}×
      </span>
    </div>
  );
}

export function Platforms() {
  const { workspace, platforms } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());

  const workspaceData = useMemo(
    () => ({ workspace: workspace!, platforms, developers: [] }),
    [workspace, platforms]
  );

  const platformROIs = useMemo(
    () => (workspace ? calculatePlatformROIs(workspaceData) : []),
    [workspaceData, workspace]
  );

  const baselineMetrics = useMemo(
    () => (workspace ? calculateROIMetrics(workspaceData) : null),
    [workspaceData, workspace]
  );

  const whatIfMetrics = useMemo(
    () => (workspace ? calculateWhatIf(workspaceData, disabledIds) : null),
    [workspaceData, workspace, disabledIds]
  );

  const maxROI = Math.max(...platformROIs.map((p) => p.roiIndex), 1);

  const toggleDisabled = (id: string) => {
    setDisabledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!workspace || platforms.length === 0) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="w-12 h-12 text-white/20 mb-4" />
          <h2 className="text-xl font-heading font-bold text-white mb-2">No platforms configured</h2>
          <p className="text-white/40 mb-6">Add AI platforms in the setup wizard to compare them here.</p>
          <Link to="/setup" className="btn-primary flex items-center gap-2">
            Go to setup <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </PageTransition>
    );
  }

  const sortedROIs = [...platformROIs].sort((a, b) => b.roiIndex - a.roiIndex);

  const netROIDiff = whatIfMetrics && baselineMetrics
    ? whatIfMetrics.netROI - baselineMetrics.netROI
    : 0;

  const spendSaved = whatIfMetrics && baselineMetrics
    ? baselineMetrics.totalMonthlySpend - whatIfMetrics.totalMonthlySpend
    : 0;

  return (
    <PageTransition>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">Platform Comparison</h1>
        <p className="text-sm text-white/40 mt-1">ROI breakdown by AI platform</p>
      </div>

      {/* Platform Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden mb-6"
      >
        {/* Table header */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/[0.06] text-xs font-medium uppercase tracking-wider text-white/30">
          <div className="col-span-3">Platform</div>
          <div className="col-span-2 text-right">Monthly Cost</div>
          <div className="col-span-1 text-right hidden md:block">Seats</div>
          <div className="col-span-2 text-right hidden md:block">Cost/Seat</div>
          <div className="col-span-2">ROI Index</div>
          <div className="col-span-2">Recommendation</div>
        </div>

        {/* Table rows */}
        {sortedROIs.map(({ platform, roiIndex, recommendation, velocityAttribution, platformValue }, idx) => (
          <div key={platform.id}>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.07 }}
              className={`grid grid-cols-12 gap-4 px-5 py-4 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.02] transition-colors ${expandedId === platform.id ? 'bg-white/[0.02]' : ''}`}
              onClick={() => setExpandedId(expandedId === platform.id ? null : platform.id)}
            >
              <div className="col-span-3 flex items-center gap-2">
                <PlatformBadge name={platform.name} size="sm" />
                <span className="text-sm font-medium text-white hidden sm:block">{platform.name}</span>
              </div>
              <div className="col-span-2 text-right font-mono text-sm text-white/80">
                ${platform.monthly_cost.toLocaleString()}
              </div>
              <div className="col-span-1 text-right text-sm text-white/50 hidden md:block">{platform.seats}</div>
              <div className="col-span-2 text-right font-mono text-sm text-white/50 hidden md:block">
                ${Math.round(platform.monthly_cost / platform.seats).toLocaleString()}
              </div>
              <div className="col-span-2">
                <ROIBar value={roiIndex} max={maxROI} />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <RecommendationBadge rec={recommendation} />
                {expandedId === platform.id
                  ? <ChevronUp className="w-4 h-4 text-white/30" />
                  : <ChevronDown className="w-4 h-4 text-white/30" />
                }
              </div>
            </motion.div>

            {/* Expanded row */}
            <AnimatePresence>
              {expandedId === platform.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 py-4 bg-obsidian/60 border-b border-white/[0.06]">
                    <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">ROI Calculation Breakdown</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-white/30 mb-1">Velocity attribution</div>
                        <div className="font-mono text-accent text-base">{velocityAttribution.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/30 mb-1">Attributed value</div>
                        <div className="font-mono text-positive text-base">${Math.round(platformValue).toLocaleString()}/mo</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/30 mb-1">Platform cost</div>
                        <div className="font-mono text-white/70 text-base">${platform.monthly_cost.toLocaleString()}/mo</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/30 mb-1">ROI index</div>
                        <div className="font-mono text-accent text-base">{roiIndex.toFixed(2)}×</div>
                        <div className="text-xs text-white/25 mt-0.5">value ÷ cost</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </motion.div>

      {/* ROI Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-6 mb-6"
      >
        <h3 className="font-semibold text-white mb-4">ROI Index Comparison</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sortedROIs.map(r => ({ name: r.platform.name, roi: r.roiIndex }))} layout="vertical" margin={{ left: 80, right: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}×`} />
            <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
            <Tooltip
              formatter={(v: number) => [`${v.toFixed(2)}×`, 'ROI Index']}
              contentStyle={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}
              itemStyle={{ color: '#00D4FF' }}
            />
            <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
              {sortedROIs.map((r, i) => (
                <Cell
                  key={i}
                  fill={r.roiIndex > 2 ? '#00FF94' : r.roiIndex >= 0.8 ? '#F59E0B' : '#FF4D6D'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-white/30 mt-2 text-center">ROI Index = attributed monthly value ÷ platform cost</p>
      </motion.div>

      {/* What-if Simulator */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-6"
      >
        <h3 className="font-semibold text-white mb-1">What if I cut a platform?</h3>
        <p className="text-xs text-white/30 mb-5">Toggle platforms off to see the real-time impact on your net ROI.</p>

        <div className="flex flex-wrap gap-3 mb-6">
          {platforms.map((p) => (
            <button
              key={p.id}
              onClick={() => toggleDisabled(p.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
                disabledIds.has(p.id)
                  ? 'border-negative/30 bg-negative/5 text-negative/60 opacity-50'
                  : 'border-white/10 bg-white/5 text-white/70 hover:border-accent/30'
              }`}
            >
              <PlatformBadge name={p.name} size="sm" />
              {p.name}
              <div className={`w-8 h-4 rounded-full transition-colors relative ${disabledIds.has(p.id) ? 'bg-negative/30' : 'bg-accent/40'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${disabledIds.has(p.id) ? 'left-0.5' : 'left-4'}`} />
              </div>
            </button>
          ))}
        </div>

        {disabledIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-3 gap-4"
          >
            <div className="card p-4 text-center">
              <div className="text-xs text-white/40 mb-1">New Net ROI</div>
              <motion.div
                key={whatIfMetrics?.netROI}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`font-mono text-xl ${whatIfMetrics?.netROI && whatIfMetrics.netROI > 0 ? 'text-positive' : 'text-negative'}`}
              >
                ${Math.round(whatIfMetrics?.netROI ?? 0).toLocaleString()}
              </motion.div>
              <div className={`text-xs mt-1 font-mono ${netROIDiff >= 0 ? 'text-positive' : 'text-negative'}`}>
                {netROIDiff >= 0 ? '+' : ''}{Math.round(netROIDiff).toLocaleString()} vs current
              </div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-xs text-white/40 mb-1">Monthly Savings</div>
              <motion.div
                key={spendSaved}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-mono text-xl text-accent"
              >
                ${Math.round(spendSaved).toLocaleString()}
              </motion.div>
              <div className="text-xs text-white/30 mt-1">from removed tools</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-xs text-white/40 mb-1">Annual Impact</div>
              <motion.div
                key={spendSaved * 12}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-mono text-xl text-white/80"
              >
                ${Math.round(spendSaved * 12).toLocaleString()}
              </motion.div>
              <div className="text-xs text-white/30 mt-1">projected savings</div>
            </div>
          </motion.div>
        )}

        {disabledIds.size === 0 && (
          <div className="text-center py-6 text-white/20 text-sm">
            Toggle a platform above to see the impact
          </div>
        )}
      </motion.div>
    </PageTransition>
  );
}
