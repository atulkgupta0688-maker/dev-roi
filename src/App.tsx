import { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './components/AuthModal';
import { WaitlistModal } from './components/WaitlistModal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MeshBackground } from './components/MeshBackground';
import { Landing } from './pages/Landing';
import { Setup } from './pages/Setup';
import { Dashboard } from './pages/Dashboard';
import { Platforms } from './pages/Platforms';
import { Team } from './pages/Team';
import { Report } from './pages/Report';
import { Settings } from './pages/Settings';
import { Integrations } from './pages/Integrations';
import { useAppStore } from './lib/store';
import { supabase } from './lib/supabase';
import { useWorkspace } from './lib/hooks/useWorkspace';

// Pages that use the sidebar layout
const SIDEBAR_ROUTES = ['/dashboard', '/platforms', '/team', '/report', '/settings', '/integrations'];

function AppLayout() {
  const location = useLocation();
  const showSidebar = SIDEBAR_ROUTES.some((r) => location.pathname.startsWith(r));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load workspace data when auth is confirmed
  useWorkspace();

  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-obsidian flex">
      {/* Sidebar */}
      {showSidebar && (
        <Sidebar collapsed={sidebarCollapsed} />
      )}

      {/* Main content */}
      <main
        className={`flex-1 min-h-screen relative ${showSidebar ? (sidebarCollapsed ? 'ml-16' : 'ml-[220px]') : ''}`}
      >
        {showSidebar && <MeshBackground />}
        <div className="relative z-10 p-6 max-w-7xl mx-auto">
          <AnimatePresence mode="wait" initial={false}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Landing />} />
              <Route path="/setup" element={
                <ProtectedRoute requireAuth={false}>
                  <Setup />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/platforms" element={
                <ProtectedRoute>
                  <Platforms />
                </ProtectedRoute>
              } />
              <Route path="/team" element={
                <ProtectedRoute>
                  <Team />
                </ProtectedRoute>
              } />
              <Route path="/report" element={
                <ProtectedRoute>
                  <Report />
                </ProtectedRoute>
              } />
              <Route path="/integrations" element={
                <ProtectedRoute requireAuth={true}>
                  <Integrations />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute requireAuth={true}>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>

      {/* Global modals */}
      <AuthModal />
      <WaitlistModal />

      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0F1117',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.87)',
            fontFamily: '"DM Sans", sans-serif',
          },
        }}
      />
    </div>
  );
}

export function App() {
  const { setUser, initFromSession } = useAppStore();

  useEffect(() => {
    // Initialize demo data from session storage
    initFromSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            user_metadata: session.user.user_metadata,
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser, initFromSession]);

  return <AppLayout />;
}
