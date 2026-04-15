import type { DeveloperWithScore } from '../lib/types';

interface Props {
  developers: DeveloperWithScore[];
  metricLabel: string;
}

export function DeveloperTable({ developers, metricLabel }: Props) {
  if (developers.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <h3 className="font-semibold text-white">Developer breakdown</h3>
        <p className="text-xs text-white/40 mt-0.5">Per-developer velocity and AI leverage</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Developer</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Before</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Now</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Δ {metricLabel}</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">AI cost/mo</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Leverage</th>
          </tr>
        </thead>
        <tbody>
          {developers.map((dev) => (
            <tr key={dev.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3 font-medium text-white">{dev.name}</td>
              <td className="px-4 py-3 text-right font-mono text-white/60">{dev.baseline_tickets ?? '—'}</td>
              <td className="px-4 py-3 text-right font-mono text-white/60">{dev.current_tickets ?? '—'}</td>
              <td className="px-4 py-3 text-right font-mono font-medium" style={{
                color: dev.velocityChangePct >= 0 ? '#00FF94' : '#FF4D6D'
              }}>
                {dev.velocityChangePct >= 0 ? '+' : ''}{dev.velocityChangePct.toFixed(0)}%
              </td>
              <td className="px-4 py-3 text-right font-mono text-white/60">
                ${Math.round(dev.attributedAICost).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    color: dev.leverageStatus.color,
                    background: `${dev.leverageStatus.color}15`,
                    border: `1px solid ${dev.leverageStatus.color}30`,
                  }}
                >
                  {dev.leverageStatus.label}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
