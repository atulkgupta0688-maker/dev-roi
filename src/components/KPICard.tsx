import { motion } from 'framer-motion';
import { useCountUp } from '../lib/hooks/useCountUp';
import { clsx } from 'clsx';
import { Tooltip } from './Tooltip';
import type { ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  subtitle?: string;
  delta?: number;
  trend?: { previous: number; label: string };
  decimals?: number;
  color?: 'cyan' | 'green' | 'red' | 'white';
  tooltip?: string;
  icon?: ReactNode;
  delay?: number;
  onExplain?: () => void;
}

export function KPICard({
  label,
  value,
  prefix = '',
  suffix = '',
  subtitle,
  delta,
  trend,
  decimals = 0,
  color = 'cyan',
  tooltip,
  icon,
  delay = 0,
  onExplain,
}: KPICardProps) {
  const animatedValue = useCountUp({ end: value, decimals, duration: 1400 });

  const colorMap = {
    cyan: '#00D4FF',
    green: '#00FF94',
    red: '#FF4D6D',
    white: 'rgba(255,255,255,0.87)',
  };

  const displayValue =
    decimals > 0 ? animatedValue.toFixed(decimals) : Math.round(animatedValue).toLocaleString();

  const trendDelta = trend ? value - trend.previous : null;
  const trendPct = trend && trend.previous !== 0
    ? ((value - trend.previous) / Math.abs(trend.previous)) * 100
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`card p-5 ${onExplain ? 'cursor-pointer hover:border-white/15 transition-colors group' : 'cursor-default'}`}
      onClick={onExplain}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium uppercase tracking-widest text-white/40">{label}</span>
          {tooltip && <Tooltip content={tooltip} />}
        </div>
        {onExplain ? (
          <span className="text-[10px] text-white/20 group-hover:text-accent/60 transition-colors font-mono">
            how? →
          </span>
        ) : icon ? (
          <div className="text-white/20">{icon}</div>
        ) : null}
      </div>

      <div className="font-mono text-3xl font-medium tabular-nums leading-none mb-2" style={{ color: colorMap[color] }}>
        {prefix}{displayValue}{suffix}
      </div>

      {(subtitle || delta !== undefined) && (
        <div className="flex items-center gap-2 mt-2">
          {delta !== undefined && (
            <span className={clsx('text-xs font-mono font-medium px-1.5 py-0.5 rounded', delta >= 0 ? 'text-positive bg-positive/10' : 'text-negative bg-negative/10')}>
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
            </span>
          )}
          {subtitle && <span className="text-xs text-white/40">{subtitle}</span>}
        </div>
      )}

      {trend && trendDelta !== null && trendPct !== null && (
        <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center gap-1.5">
          <span className={clsx('text-xs font-mono', trendDelta >= 0 ? 'text-positive' : 'text-negative')}>
            {trendDelta >= 0 ? '▲' : '▼'} {trendPct >= 0 ? '+' : ''}{trendPct.toFixed(1)}%
          </span>
          <span className="text-xs text-white/30">vs {trend.label}</span>
        </div>
      )}
    </motion.div>
  );
}
