import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ComposedChart,
  Line,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DollarSign, TrendingUp, Zap, ArrowRight, AlertCircle } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { KPICard } from '../components/KPICard';
import { InsightCard } from '../components/InsightCard';
import { PlatformBadge } from '../components/PlatformBadge';
import { Tooltip as InfoTooltip } from '../components/Tooltip';
import { useAppStore } from '../lib/store';
import {
  calculateROIMetrics,
  generateVelocityChartData,
  generateCostPerTicketData,
  generateInsights,
} from '../lib/roiEngine';
import { DEMO_VELOCITY_DATA, CHART_COLORS } from '../lib/demoData';

// ─── Custom chart tooltips ────────────────────────────────────────────────────

function VelocityTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string;
}) {
  if (!active || !payload?.length) return null;
  const current = payload.find((p) => p.name === 'Period avg');
  const baseline = payload.find((p) => p.name === 'Baseline');
  const delta = current && baseline ? current.value - baseline.value : 0;
  return (
    <div className="chart-tooltip">
      <p className="text-xs text-white/50 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/60">{p.name}:</span>
          <span className="font-mono text-white">{p.value}</span>
        </div>
      ))}
      {delta > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10 text-xs font-mono text-positive">
          +{delta} vs baseline
        </div>
      )}
    </div>
  );
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip text-sm">
      <p className="text-white font-medium">{payload[0].name}</p>
      <p className="font-mono text-accent">${payload[0].value.toLocaleString()}/mo</p>
    </div>
  );
}

// ─── Section header with optional info tooltip ────────────────────────────────

function SectionHeader({ title, sub, tip }: { title: string; sub?: string; tip?: string }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <div className="flex items-center gap-1.5">
          <h2 className="font-semibold text-white">{title}</h2>
          {tip && <InfoTooltip content={tip} />}
        </div>
        {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { workspace, platforms, isDemoMode, setWaitlistModalOpen } = useAppStore();

  const workspaceData = useMemo(
    () => ({ workspace: workspace!, platforms, developers: [] }),
    [workspace, platforms]
  );

  const metrics = useMemo(
    () => (workspace ? calculateROIMetrics(workspaceData) : null),
    [workspaceData, workspace]
  );

  const velocityData = useMemo(() => {
    if (!workspace) return [];
    return isDemoMode ? DEMO_VELOCITY_DATA : generateVelocityChartData(workspace);
  }, [workspace, isDemoMode]);

  const costPerTicketData = useMemo(() => {
    if (!workspace || platforms.length === 0) return [];
    return generateCostPerTicketData(workspace, platforms, velocityData);
  }, [workspace, platforms, velocityData]);

  const insights = useMemo(
    () => (workspace ? generateInsights(workspaceData) : []),
    [workspaceData, workspace]
  );

  const donutData = platforms.map((p) => ({ name: p.name, value: p.monthly_cost }));

  const firstAdoptionMonth = platforms.length > 0
    ? platforms.reduce((e, p) => (p.adopted_date < e ? p.adopted_date : e), platforms[0].adopted_date)
    : null;

  const adoptionLabel = firstAdoptionMonth
    ? new Date(firstAdoptionMonth + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    : null;

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

  // Workspace exists but setup wasn't fully completed (missing ticket data)
  const isSetupIncomplete =
    workspace.baseline_tickets_per_dev == null ||
    workspace.current_tickets_per_dev == null ||
    workspace.avg_annual_salary == null;

  if (isSetupIncomplete) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="w-8 h-8 text-amber mb-4" />
          <h2 className="text-xl font-heading font-bold text-white mb-2">Setup incomplete</h2>
          <p className="text-white/40 mb-2 max-w-sm">
            Your workspace was created but the velocity and period data is missing.
            Please finish all 4 steps of the setup wizard.
          </p>
          <p className="text-xs text-white/25 mb-6 font-mono">
            baseline_tickets={String(workspace.baseline_tickets_per_dev)} &nbsp;
            current_tickets={String(workspace.current_tickets_per_dev)}
          </p>
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
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber" />
            <span className="text-sm text-amber/90">Viewing demo data — Acme Engineering (8 devs, 3 AI tools)</span>
          </div>
          <button
            onClick={() => setWaitlistModalOpen(true)}
            className="text-xs font-medium text-amber hover:text-white transition-colors"
          >
            Connect your team →
          </button>
        </motion.div>
      )}

      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">{workspace.name}</h1>
        <p className="text-sm text-white/40 mt-1">AI ROI Overview</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          label="Monthly AI Spend"
          value={metrics?.totalMonthlySpend ?? 0}
          prefix="$"
          subtitle={`${platforms.length} platform${platforms.length !== 1 ? 's' : ''}`}
          color="cyan"
          icon={<DollarSign className="w-4 h-4" />}
          tooltip="Total monthly subscription cost across all configured AI platforms."
          delay={0}
        />
        <KPICard
          label="Value Created"
          value={metrics?.monthlyValue ?? 0}
          prefix="$"
          delta={metrics?.velocityLift}
          subtitle="velocity lift"
          color="green"
          icon={<TrendingUp className="w-4 h-4" />}
          tooltip="Velocity lift × team size × hourly rate × monthly hours. This is the dollar equivalent of productivity your team gained."
          delay={0.08}
        />
        <KPICard
          label="Net Monthly ROI"
          value={metrics?.netROI ?? 0}
          prefix="$"
          subtitle="value minus spend"
          color={metrics?.netROI && metrics.netROI > 0 ? 'green' : 'red'}
          icon={<Zap className="w-4 h-4" />}
          tooltip="Monthly value created minus total AI platform spend. Positive means your AI stack is paying for itself — and then some."
          delay={0.16}
        />
        <KPICard
          label="ROI Multiple"
          value={metrics?.roiMultiple ?? 0}
          suffix="×"
          decimals={1}
          subtitle="return on AI spend"
          color="cyan"
          tooltip="Monthly value created ÷ monthly AI spend. A 10× means every $1 in AI tools generates $10 in productivity value."
          delay={0.24}
        />
      </div>

      {/* Velocity chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="card p-6 mb-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-semibold text-white">Team Velocity</h2>
              <InfoTooltip
                content="Shows the period averages you entered during setup — not real monthly data. Each month in a period is plotted at the period's average. Connect Jira, Linear, or GitHub in Integrations to plot real per-month numbers."
                width="w-80"
              />
            </div>
            <p className="text-xs text-white/40 mt-0.5">Period averages · {workspace.team_size} developers</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/40">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 border-t-2 border-dashed border-white/30" />
              <span>Baseline avg</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 bg-accent rounded" />
              <span>Period avg</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={velocityData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
            <Tooltip content={<VelocityTooltip />} />
            {adoptionLabel && (
              <ReferenceLine
                x={adoptionLabel}
                stroke="rgba(0,212,255,0.4)"
                strokeDasharray="6 3"
                label={{ value: 'AI Adopted ↑', position: 'top', fill: '#00D4FF', fontSize: 10 }}
              />
            )}
            <ReferenceArea
              y1={workspace.baseline_tickets_per_dev! * workspace.team_size}
              y2={workspace.current_tickets_per_dev! * workspace.team_size}
              fill="rgba(0,255,148,0.04)"
            />
            <Line type="stepAfter" dataKey="baseline" name="Baseline" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
            <Line type="stepAfter" dataKey="tickets" name="Period avg" stroke="#00D4FF" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#00D4FF', strokeWidth: 0 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Two charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Spend donut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
          className="card p-6"
        >
          <SectionHeader
            title="AI Spend Breakdown"
            sub="Monthly cost by platform"
            tip="Where your AI budget is going. Hover segments for per-platform cost. Compare this against the ROI index on the Platforms page."
          />
          {donutData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-white/20 text-sm">No platforms configured</div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={donutData} cx={75} cy={75} innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value">
                    {donutData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {donutData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-white/60">{d.name}</span>
                    </div>
                    <span className="font-mono text-white/80">${d.value.toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t border-white/[0.06] pt-2 flex justify-between text-sm">
                  <span className="text-white/40">Total</span>
                  <span className="font-mono text-accent">${donutData.reduce((s, d) => s + d.value, 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Cost per ticket */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-6"
        >
          <SectionHeader
            title="AI Cost per Ticket"
            sub="Monthly AI spend ÷ tickets closed"
            tip="How much your AI platforms cost per ticket shipped. Lower is better. A downward trend means your AI tools are becoming more cost-efficient as adoption grows."
          />
          {costPerTicketData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-white/20 text-sm">Complete setup to see this chart</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={costPerTicketData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={30} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(v: number) => [`$${v}`, 'AI cost/ticket']}
                  contentStyle={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                  itemStyle={{ color: '#00D4FF' }}
                />
                <Bar dataKey="costPerTicket" fill="#00D4FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Insights */}
      <div className="mb-8">
        <div className="flex items-center gap-1.5 mb-4">
          <h2 className="font-semibold text-white">Intelligence Report</h2>
          <InfoTooltip content="Five insights derived from your data — covering headcount impact, cost efficiency, annual returns, platform health, and sprint capacity." width="w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} index={i} />
          ))}
        </div>
      </div>

      {/* Platform quick links */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="card p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          {platforms.slice(0, 3).map((p) => <PlatformBadge key={p.id} name={p.name} size="sm" />)}
          {platforms.length > 3 && <span className="text-xs text-white/30">+{platforms.length - 3} more</span>}
          <span className="text-sm text-white/50">
            {platforms.length} platform{platforms.length !== 1 ? 's' : ''} configured
          </span>
        </div>
        <Link to="/platforms" className="btn-ghost text-sm flex items-center gap-1">
          Compare platforms <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </PageTransition>
  );
}
