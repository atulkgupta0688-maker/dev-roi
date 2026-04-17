import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { Sidebar } from './components/Sidebar';
import { MeshBackground } from './components/MeshBackground';
import { Landing } from './pages/Landing';
import { Setup } from './pages/Setup';
import { Dashboard } from './pages/Dashboard';

const SIDEBAR_ROUTES = ['/dashboard'];

function AppLayout() {
  const location = useLocation();
  const showSidebar = SIDEBAR_ROUTES.some((r) => location.pathname.startsWith(r));

  return (
    <div className="min-h-screen bg-obsidian flex">
      {showSidebar && <Sidebar />}
      <main className={`flex-1 min-h-screen relative ${showSidebar ? 'lg:ml-[220px]' : ''}`}>
        {showSidebar && <MeshBackground />}
        <div className="relative z-10 p-4 lg:p-6 max-w-7xl mx-auto">
          <AnimatePresence mode="wait" initial={false}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Landing />} />
              <Route path="/setup" element={<Setup />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>
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
  return <AppLayout />;
}
