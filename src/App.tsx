import { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './components/AuthModal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MeshBackground } from './components/MeshBackground';
import { Landing } from './pages/Landing';
import { Setup } from './pages/Setup';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { useAppStore } from './lib/store';
import { supabase } from './lib/supabase';
import { useWorkspace, savePendingWorkspace } from './lib/hooks/useWorkspace';

const SIDEBAR_ROUTES = ['/dashboard', '/settings'];

function AppLayout() {
  const location = useLocation();
  const showSidebar = SIDEBAR_ROUTES.some((r) => location.pathname.startsWith(r));

  useWorkspace();

  return (
    <div className="min-h-screen bg-obsidian flex">
      {showSidebar && <Sidebar />}
      <main className={`flex-1 min-h-screen relative ${showSidebar ? 'ml-[220px]' : ''}`}>
        {showSidebar && <MeshBackground />}
        <div className="relative z-10 p-6 max-w-7xl mx-auto">
          <AnimatePresence mode="wait" initial={false}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Landing />} />
              <Route path="/setup" element={<Setup />} />
              <Route path="/dashboard" element={
                <ProtectedRoute requireAuth={false}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>
      <AuthModal />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0F1117',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.87)',
          },
        }}
      />
    </div>
  );
}

export function App() {
  const { setUser, initFromSession } = useAppStore();

  useEffect(() => {
    initFromSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            user_metadata: session.user.user_metadata,
          });

          // Read store state at callback time (avoids stale closure)
          const { hasPendingData, workspace, platforms, developers, setWorkspace, setPlatforms, setDevelopers, setHasPendingData } = useAppStore.getState();

          if (hasPendingData && workspace) {
            try {
              const saved = await savePendingWorkspace(
                session.user.id,
                workspace,
                platforms,
                developers
              );
              setWorkspace(saved.workspace);
              setPlatforms(saved.platforms);
              setDevelopers(saved.developers);
              setHasPendingData(false);
              toast.success('Workspace saved!');
            } catch {
              toast.error('Failed to save workspace. Please try again.');
            }
          }
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser, initFromSession]);

  return <AppLayout />;
}
