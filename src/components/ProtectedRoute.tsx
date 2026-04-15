import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAppStore } from '../lib/store';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const { user, isDemoMode } = useAppStore();

  if (requireAuth && !user && !isDemoMode) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
