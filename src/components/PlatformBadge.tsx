import { PLATFORM_COLORS, PLATFORM_ICONS } from '../lib/demoData';
import type { PlatformName } from '../lib/types';

interface PlatformBadgeProps {
  name: PlatformName | string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export function PlatformBadge({ name, size = 'md', showName = false }: PlatformBadgeProps) {
  const color = PLATFORM_COLORS[name] ?? '#6B7280';
  const icon = PLATFORM_ICONS[name] ?? '?';

  const sizes = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizes[size]} rounded-lg flex items-center justify-center font-bold text-white shrink-0`}
        style={{ backgroundColor: color + '33', border: `1px solid ${color}44`, color }}
      >
        {icon}
      </div>
      {showName && (
        <span className="text-sm text-white/80 font-medium">{name}</span>
      )}
    </div>
  );
}
