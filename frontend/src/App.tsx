import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { FlowsListPage } from './pages/FlowsListPage';
import { FlowBuilderPage } from './pages/FlowBuilderPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { WhatsAppPanelPage } from './pages/WhatsAppPanelPage';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Rotas com Sidebar padrão */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/fluxos" replace />} />
            <Route path="/fluxos" element={<FlowsListPage />} />
            <Route path="/simulador" element={<SimulatorPage />} />
            <Route path="/whatsapp" element={<WhatsAppPanelPage />} />
          </Route>

          {/* Rota do Construtor Visual em tela cheia (sem a sidebar externa) */}
          <Route path="/fluxo/:id" element={<FlowBuilderPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/fluxos" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
};
