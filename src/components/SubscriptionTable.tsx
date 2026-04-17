import type { AIPlatform } from '../lib/types';
import type { PlatformROI } from '../lib/types';

interface Props {
  platforms: AIPlatform[];
  platformROIs?: PlatformROI[];
}

const RECOMMENDATION_STYLE: Record<string, { text: string; bg: string }> = {
  Keep:    { text: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  Monitor: { text: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/20' },
  Cut:     { text: 'text-rose-400',    bg: 'bg-rose-400/10 border-rose-400/20' },
};

export function SubscriptionTable({ platforms, platformROIs }: Props) {
  if (platforms.length === 0) {
    return (
      <div className="card p-6 text-center text-white/30 text-sm">
        No subscriptions configured
      </div>
    );
  }

  const roiMap = new Map(platformROIs?.map((r) => [r.platform.id, r]) ?? []);
  const totalSpend = platforms.reduce((sum, p) => sum + p.monthly_cost, 0);
  const hasROI = platformROIs && platformROIs.length > 0;

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Tool</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Cost / mo</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Seats</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Usage</th>
            {hasROI && (
              <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">ROI</th>
            )}
            {hasROI && (
              <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Status</th>
            )}
            {!hasROI && (
              <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Waste</th>
            )}
          </tr>
        </thead>
        <tbody>
          {platforms.map((p) => {
            const roi = roiMap.get(p.id);
            const expectedCost = totalSpend * (p.usage_percent / 100);
            const waste = Math.max(0, p.monthly_cost - expectedCost);
            const rec = roi?.recommendation;
            const style = rec ? RECOMMENDATION_STYLE[rec] : null;

            return (
              <tr
                key={p.id}
                className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                <td className="px-4 py-3 text-right font-mono text-white/70">
                  ${p.monthly_cost.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-mono text-white/50">{p.seats}</td>
                <td className="px-4 py-3 text-right font-mono text-white/70">{p.usage_percent}%</td>
                {hasROI && (
                  <td className="px-4 py-3 text-right font-mono font-semibold" style={{
                    color: roi
                      ? roi.roiIndex >= 2 ? '#34d399' : roi.roiIndex >= 0.8 ? '#fbbf24' : '#f87171'
                      : 'rgba(255,255,255,0.3)',
                  }}>
                    {roi ? `${roi.roiIndex.toFixed(1)}×` : '—'}
                  </td>
                )}
                {hasROI && (
                  <td className="px-4 py-3 text-right">
                    {style ? (
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${style.bg} ${style.text}`}>
                        {rec}
                      </span>
                    ) : '—'}
                  </td>
                )}
                {!hasROI && (
                  <td className="px-4 py-3 text-right font-mono" style={{
                    color: waste > 0 ? '#F59E0B' : 'rgba(255,255,255,0.3)',
                  }}>
                    {waste > 0 ? `$${Math.round(waste).toLocaleString()}` : '—'}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-white/[0.06]">
            <td className="px-4 py-3 text-xs text-white/30">Total</td>
            <td className="px-4 py-3 text-right font-mono font-semibold text-white">
              ${totalSpend.toLocaleString()}
            </td>
            <td colSpan={hasROI ? 4 : 2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
