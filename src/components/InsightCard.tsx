import { TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Insight } from '../lib/types';

interface InsightCardProps {
  insight: Insight;
  index: number;
}

const typeConfig = {
  positive: {
    Icon: TrendingUp,
    color: '#00FF94',
    border: 'border-positive/20',
    bg: 'bg-positive/[0.04]',
    metricColor: 'text-positive',
  },
  warning: {
    Icon: AlertTriangle,
    color: '#F59E0B',
    border: 'border-amber/20',
    bg: 'bg-amber/[0.04]',
    metricColor: 'text-amber',
  },
  info: {
    Icon: Info,
    color: '#00D4FF',
    border: 'border-accent/20',
    bg: 'bg-accent/[0.04]',
    metricColor: 'text-accent',
  },
};

export function InsightCard({ insight, index }: InsightCardProps) {
  const cfg = typeConfig[insight.type];
  const { Icon } = cfg;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 + 0.2, duration: 0.4 }}
      className={`card p-5 border ${cfg.border} ${cfg.bg} flex flex-col gap-3`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.color }} />
          <span className="text-xs font-semibold uppercase tracking-wider text-white/45 truncate">
            {insight.title}
          </span>
        </div>
        <span className={`font-mono text-sm font-bold shrink-0 ${cfg.metricColor}`}>
          {insight.metric}
        </span>
      </div>

      {/* Body */}
      <p className="text-sm text-white/60 leading-relaxed">{insight.body}</p>
    </motion.div>
  );
}
