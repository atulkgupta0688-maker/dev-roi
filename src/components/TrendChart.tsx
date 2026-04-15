import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { WorkspaceSnapshot } from '../lib/types';

interface Props {
  snapshots: WorkspaceSnapshot[];
}

export function TrendChart({ snapshots }: Props) {
  if (snapshots.length < 2) return null;

  const data = snapshots.map((s) => ({
    date: new Date(s.recorded_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    roi: parseFloat(s.roi_multiple.toFixed(2)),
    lift: parseFloat(s.velocity_lift_pct.toFixed(1)),
  }));

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-white mb-1">ROI over time</h3>
      <p className="text-xs text-white/40 mb-4">Updated each time you save new numbers</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
            labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}
          />
          <Line type="monotone" dataKey="roi" name="ROI ×" stroke="#00D4FF" strokeWidth={2} dot={{ r: 3, fill: '#00D4FF', strokeWidth: 0 }} />
          <Line type="monotone" dataKey="lift" name="Velocity lift %" stroke="#00FF94" strokeWidth={2} dot={{ r: 3, fill: '#00FF94', strokeWidth: 0 }} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
