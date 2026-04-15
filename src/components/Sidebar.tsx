import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Layers,
  Users,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  Zap,
  Plug,
} from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { useAppStore } from '../lib/store';
import { supabase } from '../lib/supabase';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { path: '/platforms', icon: Layers, label: 'Platforms' },
  { path: '/team', icon: Users, label: 'Team' },
  { path: '/integrations', icon: Plug, label: 'Integrations' },
  { path: '/report', icon: FileText, label: 'CBA Report' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const { user, isDemoMode, clearData, setAuthModalOpen } = useAppStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    if (isDemoMode) {
      clearData();
      navigate('/');
      return;
    }
    try {
      await supabase.auth.signOut();
      clearData();
      navigate('/');
      toast.success('Signed out successfully');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-full bg-card-dark border-r border-white/[0.06] z-40 flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-[220px]'
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-white/[0.06]">
        <NavLink to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent/10 border border-accent/20 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-accent" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-heading text-lg font-bold text-white overflow-hidden whitespace-nowrap"
              >
                DevROI
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>
      </div>

      {/* Demo mode badge */}
      {isDemoMode && (
        <div className={clsx('mx-3 mt-3', collapsed ? 'px-0' : '')}>
          {collapsed ? (
            <div className="w-full flex justify-center">
              <div className="w-2 h-2 rounded-full bg-amber animate-pulse" />
            </div>
          ) : (
            <div className="bg-amber/10 border border-amber/20 rounded-lg px-3 py-2">
              <p className="text-xs font-medium text-amber">DEMO MODE</p>
              <p className="text-xs text-white/40 mt-0.5">Data not saved</p>
              <button
                onClick={() => setAuthModalOpen(true, 'signup')}
                className="text-xs text-accent hover:text-accent/80 mt-1 font-medium"
              >
                Sign up to save →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative',
                isActive
                  ? 'text-accent bg-accent/5 border-l-2 border-accent pl-2.5'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
            {collapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-card-darker border border-white/10 rounded-md text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {label}
                <ChevronRight className="w-3 h-3 inline ml-1" />
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-white/[0.06]">
        {user && !isDemoMode ? (
          <div className={clsx('flex items-center gap-3', collapsed && 'justify-center')}>
            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent text-sm font-bold shrink-0">
              {initials}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs font-medium text-white truncate">
                    {user.user_metadata?.full_name ?? 'User'}
                  </p>
                  <p className="text-xs text-white/30 truncate">{user.email}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-md hover:bg-white/5 text-white/30 hover:text-negative transition-colors shrink-0"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignOut}
            className={clsx(
              'flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors w-full px-2 py-2 rounded-lg hover:bg-white/5',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Exit demo</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
