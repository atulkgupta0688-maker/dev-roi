import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { AIPlatform } from '../lib/types';
import type { PlatformROI } from '../lib/types';

interface Props {
  platforms: AIPlatform[];
  platformROIs?: PlatformROI[];
}

const SHORT: Record<string, string> = {
  'GitHub Copilot': 'Copilot',
  'ChatGPT Plus': 'ChatGPT',
  'Gemini Advanced': 'Gemini',
  'Cursor': 'Cursor',
  'Claude': 'Claude',
  'Other': 'Other',
};

const ROI_COLORS = {
  great: '#34d399',   // >2× — green
  ok: '#fbbf24',      // 0.8–2× — amber
  poor: '#f87171',    // <0.8× — red
  nodata: '#00D4FF',  // no ROI data — cyan
};

function roiColor(index?: number) {
  if (index === undefined) return ROI_COLORS.nodata;
  if (index >= 2) return ROI_COLORS.great;
  if (index >= 0.8) return ROI_COLORS.ok;
  return ROI_COLORS.poor;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const cost = payload.find((p: any) => p.dataKey === 'cost')?.value ?? 0;
  const value = payload.find((p: any) => p.dataKey === 'value')?.value ?? 0;
  const hasValue = value > 0;

  return (
    <div className="bg-[#0F1117] border border-white/10 rounded-xl px-4 py-3 text-xs shadow-xl">
      <p className="text-white/60 mb-2 font-medium">{label}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6">
          <span className="text-white/45">Monthly cost</span>
          <span className="font-mono text-white/80">${cost.toLocaleString()}</span>
        </div>
        {hasValue && (
          <>
            <div className="flex justify-between gap-6">
              <span className="text-white/45">Value generated</span>
              <span className="font-mono text-emerald-400">${value.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-6 pt-1 border-t border-white/[0.06]">
              <span className="text-white/45">ROI</span>
              <span className="font-mono font-semibold" style={{ color: roiColor(value / cost) }}>
                {(value / cost).toFixed(1)}×
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export function PlatformChart({ platforms, platformROIs }: Props) {
  if (platforms.length === 0) return null;

  const roiMap = new Map(platformROIs?.map((r) => [r.platform.id, r]) ?? []);
  const hasROI = platformROIs && platformROIs.some((r) => r.platformValue > 0);

  const data = platforms.map((p) => {
    const roi = roiMap.get(p.id);
    return {
      name: SHORT[p.name] ?? p.name,
      cost: p.monthly_cost,
      value: roi ? Math.max(0, Math.round(roi.platformValue)) : 0,
      roiIndex: roi?.roiIndex,
    };
  });

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-semibold text-white">Tool comparison</h3>
          <p className="text-xs text-white/30 mt-0.5">
            {hasROI ? 'Monthly cost vs value generated per tool' : 'Monthly spend per tool'}
          </p>
        </div>
        {hasROI && (
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-white/15 inline-block" />
              Cost
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-400/60 inline-block" />
              Value
            </span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barGap={4} barCategoryGap="35%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />

          {/* Break-even reference line if we have value data */}
          {hasROI && (
            <ReferenceLine
              y={0}
              stroke="rgba(255,255,255,0.1)"
              strokeDasharray="4 2"
            />
          )}

          {/* Cost bar */}
          <Bar dataKey="cost" name="Cost" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={hasROI ? roiColor(entry.roiIndex) + '33' : 'rgba(255,255,255,0.12)'}
                stroke={hasROI ? roiColor(entry.roiIndex) + '66' : 'rgba(255,255,255,0.2)'}
                strokeWidth={1}
              />
            ))}
          </Bar>

          {/* Value bar — only when ROI data is available */}
          {hasROI && (
            <Bar dataKey="value" name="Value" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={roiColor(entry.roiIndex) + 'aa'}
                  stroke={roiColor(entry.roiIndex)}
                  strokeWidth={1}
                />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>

      {!hasROI && (
        <p className="text-center text-xs text-white/25 mt-3">
          Set baseline &amp; current velocity in Settings to see value vs cost comparison
        </p>
      )}
    </div>
  );
}
