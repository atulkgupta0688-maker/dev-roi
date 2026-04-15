import { useState, useMemo } from 'react';
import type { WorkspaceData, ROIMetrics } from '../lib/types';
import { calculateWhatIf } from '../lib/roiEngine';

interface Props {
  data: WorkspaceData;
  baseMetrics: ROIMetrics;
}

export function WhatIfSimulator({ data, baseMetrics }: Props) {
  const [disabled, setDisabled] = useState<Set<string>>(new Set());

  const whatIfMetrics = useMemo(
    () => calculateWhatIf(data, disabled),
    [data, disabled]
  );

  const toggle = (id: string) => {
    setDisabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const roiDelta = whatIfMetrics.roiMultiple - baseMetrics.roiMultiple;
  const netDelta = whatIfMetrics.netROI - baseMetrics.netROI;

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-white mb-1">What-if simulator</h3>
      <p className="text-xs text-white/40 mb-4">Toggle subscriptions off to see how your ROI changes.</p>

      <div className="space-y-2 mb-6">
        {data.platforms.map((p) => {
          const isOff = disabled.has(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                isOff
                  ? 'border-white/10 bg-white/[0.02] text-white/30 line-through'
                  : 'border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.07]'
              }`}
            >
              <span>{p.name}</span>
              <span className="font-mono text-xs text-white/40">${p.monthly_cost.toLocaleString()}/mo</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/[0.06]">
        <div className="text-center">
          <div className="text-xs text-white/40 mb-1">ROI Multiple</div>
          <div className="font-mono text-xl font-medium text-white">
            {whatIfMetrics.roiMultiple.toFixed(1)}×
          </div>
          {roiDelta !== 0 && (
            <div className={`text-xs font-mono mt-0.5 ${roiDelta > 0 ? 'text-positive' : 'text-negative'}`}>
              {roiDelta > 0 ? '+' : ''}{roiDelta.toFixed(1)}×
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="text-xs text-white/40 mb-1">Net Monthly</div>
          <div className="font-mono text-xl font-medium text-white">
            ${Math.round(whatIfMetrics.netROI).toLocaleString()}
          </div>
          {netDelta !== 0 && (
            <div className={`text-xs font-mono mt-0.5 ${netDelta > 0 ? 'text-positive' : 'text-negative'}`}>
              {netDelta > 0 ? '+' : ''}${Math.round(netDelta).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
