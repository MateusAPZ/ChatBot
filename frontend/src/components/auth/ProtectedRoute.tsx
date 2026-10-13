import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2, ShieldCheck } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0f13] flex flex-col items-center justify-center text-gray-400 gap-3">
        <span className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center animate-pulse">
          <ShieldCheck className="w-6 h-6" />
        </span>
        <div className="flex items-center gap-2 text-xs font-medium text-gray-300">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Verificando credenciais de acesso...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
