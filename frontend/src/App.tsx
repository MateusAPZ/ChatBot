import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './components/layout/AppLayout';
import { FlowsListPage } from './pages/FlowsListPage';
import { FlowBuilderPage } from './pages/FlowBuilderPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { WhatsAppPanelPage } from './pages/WhatsAppPanelPage';
import { TestLabPage } from './pages/TestLabPage';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Rota Pública de Autenticação */}
            <Route path="/login" element={<LoginPage />} />

            {/* Rotas Protegidas do Sistema */}
            <Route element={<ProtectedRoute />}>
              {/* Rotas com Sidebar padrão */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/fluxos" replace />} />
                <Route path="/fluxos" element={<FlowsListPage />} />
                <Route path="/simulador" element={<SimulatorPage />} />
                <Route path="/testes" element={<TestLabPage />} />
                <Route path="/whatsapp" element={<WhatsAppPanelPage />} />
              </Route>

              {/* Rota do Construtor Visual em tela cheia (suporta /fluxo/:id e /fluxos/:id) */}
              <Route path="/fluxo/:id" element={<FlowBuilderPage />} />
              <Route path="/fluxos/:id" element={<FlowBuilderPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/fluxos" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  );
};
