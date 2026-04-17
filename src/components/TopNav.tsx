import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAppStore } from '../lib/store';

export function TopNav() {
  const workspace = useAppStore((s) => s.workspace);
  const dashboardEnabled = workspace !== null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[61px] bg-obsidian/90 backdrop-blur-md border-b border-white/[0.06] flex items-center px-4 lg:px-6">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        <span className="font-heading font-bold text-white text-base lg:text-lg tracking-tight">
          VelocityIQ
        </span>

        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'text-white bg-white/[0.08]'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              )
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/setup"
            className={({ isActive }) =>
              clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'text-white bg-white/[0.08]'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              )
            }
          >
            Setup
          </NavLink>

          {dashboardEnabled ? (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'text-white bg-white/[0.08]'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                )
              }
            >
              Dashboard
            </NavLink>
          ) : (
            <span
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-white/20 cursor-not-allowed select-none"
              title="Complete setup to unlock"
            >
              Dashboard
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
