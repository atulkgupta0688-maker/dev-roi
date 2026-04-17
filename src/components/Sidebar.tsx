import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Menu, X, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../lib/store';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { clearData } = useAppStore();
  const navigate = useNavigate();

  const handleRecalculate = () => {
    clearData();
    navigate('/setup');
    setMobileOpen(false);
  };

  return (
    <>
      {/* Desktop sidebar — sits below TopNav */}
      <aside className="hidden lg:flex fixed left-0 top-[61px] h-[calc(100vh-61px)] w-[220px] bg-obsidian border-r border-white/[0.06] flex-col z-40">
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-4">
          <button
            onClick={handleRecalculate}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.04] w-full transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Recalculate
          </button>
        </div>
      </aside>

      {/* Mobile hamburger — shown on /dashboard on small screens, sits inside TopNav area */}
      <button
        className="lg:hidden fixed top-[14px] right-4 z-[60] text-white/60 hover:text-white transition-colors"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="lg:hidden fixed top-[61px] left-0 right-0 z-40 bg-obsidian border-b border-white/[0.06] px-4 py-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
          <button
            onClick={handleRecalculate}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.04] w-full transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Recalculate
          </button>
        </div>
      )}

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
