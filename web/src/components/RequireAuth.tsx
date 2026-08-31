import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../data/AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="mx-auto max-w-4xl px-4 py-16 text-text-dim">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
