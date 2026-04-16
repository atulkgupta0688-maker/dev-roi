import type { AIPlatform } from '../lib/types';

interface Props {
  platforms: AIPlatform[];
}

export function SubscriptionTable({ platforms }: Props) {
  if (platforms.length === 0) {
    return (
      <div className="card p-6 text-center text-white/30 text-sm">
        No subscriptions configured
      </div>
    );
  }

  const totalSpend = platforms.reduce((sum, p) => sum + p.monthly_cost, 0);

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Tool</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Monthly cost</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Usage</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Waste</th>
          </tr>
        </thead>
        <tbody>
          {platforms.map((p) => {
            const expectedCost = totalSpend * (p.usage_percent / 100);
            const waste = Math.max(0, p.monthly_cost - expectedCost);
            return (
              <tr key={p.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                <td className="px-4 py-3 text-right font-mono text-white/70">
                  ${p.monthly_cost.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-mono text-white/70">
                  {p.usage_percent}%
                </td>
                <td className="px-4 py-3 text-right font-mono" style={{
                  color: waste > 0 ? '#F59E0B' : 'rgba(255,255,255,0.4)'
                }}>
                  {waste > 0 ? `$${Math.round(waste).toLocaleString()}` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
