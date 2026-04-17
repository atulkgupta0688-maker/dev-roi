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
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[220px] bg-obsidian border-r border-white/[0.06] flex-col z-40">
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <span className="font-heading font-bold text-white text-lg tracking-tight">VelocityIQ</span>
        </div>
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
      </aside>

      {/* Mobile top nav */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-obsidian border-b border-white/[0.06] flex items-center justify-between px-4 py-3">
        <span className="font-heading font-bold text-white text-base tracking-tight">VelocityIQ</span>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="text-white/60 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed top-[49px] left-0 right-0 z-40 bg-obsidian border-b border-white/[0.06] px-4 py-3 space-y-1">
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
