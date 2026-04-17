import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { WorkspaceSnapshot } from '../lib/types';
import type { ROIMetrics } from '../lib/types';

interface Props {
  snapshots: WorkspaceSnapshot[];
  currentMetrics?: ROIMetrics;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function TrendChart({ snapshots, currentMetrics }: Props) {
  const historicalPoints = snapshots.map((s) => ({
    date: formatDate(s.recorded_at),
    roi: parseFloat((s.roi_multiple ?? 0).toFixed(2)),
    lift: parseFloat((s.velocity_lift_pct ?? 0).toFixed(1)),
    net: Math.round(s.net_monthly_value ?? 0),
    isSynthetic: false,
  }));

  // Append synthetic "Now" point if current metrics are meaningful
  const syntheticPoint =
    currentMetrics && currentMetrics.roiMultiple > 0 && currentMetrics.totalMonthlySpend > 0
      ? {
          date: 'Now',
          roi: parseFloat(currentMetrics.roiMultiple.toFixed(2)),
          lift: parseFloat(currentMetrics.velocityLift.toFixed(1)),
          net: Math.round(currentMetrics.netROI),
          isSynthetic: true,
        }
      : null;

  // De-dup: don't add synthetic if it duplicates the last snapshot date
  const data =
    syntheticPoint && (historicalPoints.length === 0 || historicalPoints[historicalPoints.length - 1].date !== 'Now')
      ? [...historicalPoints, syntheticPoint]
      : historicalPoints;

  if (data.length < 2) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-[#0F1117] border border-white/10 rounded-xl px-4 py-3 text-xs shadow-xl">
        <p className="text-white/50 mb-2 font-mono">{label}</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 justify-between">
            <span className="text-white/50">ROI multiple</span>
            <span className="font-mono font-semibold text-cyan-400">{d?.roi?.toFixed(2)}×</span>
          </div>
          <div className="flex items-center gap-3 justify-between">
            <span className="text-white/50">Velocity lift</span>
            <span className="font-mono font-semibold text-emerald-400">+{d?.lift?.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-3 justify-between">
            <span className="text-white/50">Net value</span>
            <span className="font-mono font-semibold text-white/80">${d?.net?.toLocaleString()}/mo</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-semibold text-white">ROI trend</h3>
          <p className="text-xs text-white/30 mt-0.5">Measured each time you update your velocity numbers</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-white/40">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded bg-cyan-400 inline-block" />
            ROI ×
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded bg-emerald-400 inline-block" style={{ background: 'repeating-linear-gradient(90deg, #34d399 0, #34d399 3px, transparent 3px, transparent 6px)' }} />
            Velocity lift
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="gradRoi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#00D4FF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradLift" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}×`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="roi"
            name="ROI ×"
            stroke="#00D4FF"
            strokeWidth={2}
            fill="url(#gradRoi)"
            dot={{ r: 3.5, fill: '#00D4FF', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#00D4FF', strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="lift"
            name="Velocity lift %"
            stroke="#34d399"
            strokeWidth={2}
            strokeDasharray="5 3"
            fill="url(#gradLift)"
            dot={{ r: 3.5, fill: '#34d399', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#34d399', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
