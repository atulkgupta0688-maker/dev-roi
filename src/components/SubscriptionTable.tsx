import { clsx } from 'clsx';
import type { PlatformROI } from '../lib/types';

interface Props {
  platformROIs: PlatformROI[];
}

const BADGE: Record<string, string> = {
  Keep: 'bg-positive/10 text-positive border border-positive/20',
  Monitor: 'bg-amber/10 text-amber border border-amber/20',
  Cut: 'bg-negative/10 text-negative border border-negative/20',
};

export function SubscriptionTable({ platformROIs }: Props) {
  if (platformROIs.length === 0) {
    return (
      <div className="card p-6 text-center text-white/30 text-sm">
        No subscriptions configured
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Tool</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Monthly cost</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Value generated</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">ROI</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-widest">Action</th>
          </tr>
        </thead>
        <tbody>
          {platformROIs.map(({ platform, roiIndex, recommendation, platformValue }) => (
            <tr key={platform.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3 font-medium text-white">{platform.name}</td>
              <td className="px-4 py-3 text-right font-mono text-white/70">
                ${platform.monthly_cost.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-mono text-white/70">
                ${Math.round(platformValue).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-mono font-medium" style={{
                color: roiIndex > 2 ? '#00FF94' : roiIndex >= 0.8 ? '#F59E0B' : '#FF4D6D'
              }}>
                {roiIndex.toFixed(1)}×
              </td>
              <td className="px-4 py-3 text-center">
                <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', BADGE[recommendation])}>
                  {recommendation}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
