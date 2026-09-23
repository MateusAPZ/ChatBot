import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface Toast {
  id: number;
  texto: string;
  tipo: 'sucesso' | 'erro' | 'info';
}

interface ToastContextType {
  toast: (texto: string, tipo?: 'sucesso' | 'erro' | 'info') => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((texto: string, tipo: 'sucesso' | 'erro' | 'info' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, texto, tipo }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removerToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => {
          const config = {
            sucesso: { border: 'border-emerald-500/30', text: 'text-emerald-400', icon: CheckCircle2 },
            erro: { border: 'border-rose-500/30', text: 'text-rose-400', icon: AlertCircle },
            info: { border: 'border-sky-500/30', text: 'text-sky-400', icon: Info },
          }[t.tipo];

          const Icon = config.icon;

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 max-w-sm bg-[#161a22] border ${config.border} rounded-xl shadow-2xl px-4 py-3 text-sm text-gray-200 animate-in fade-in slide-in-from-bottom-2 duration-200`}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.text}`} />
              <span className="leading-snug flex-1">{t.texto}</span>
              <button
                onClick={() => removerToast(t.id)}
                className="text-gray-500 hover:text-gray-300 ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
