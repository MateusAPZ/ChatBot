import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageCircleMore, Workflow, PlayCircle, Smartphone } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const linkClasse = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-sm font-medium transition'
      : 'flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-white/5 border border-transparent text-sm font-medium transition';

  return (
    <aside className="w-60 shrink-0 border-r border-white/5 bg-[#11141a] flex flex-col min-h-screen">
      <NavLink to="/" className="h-16 px-5 flex items-center gap-3 border-b border-white/5">
        <span className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-[#0d0f13]">
          <MessageCircleMore className="w-5 h-5 text-[#0d0f13]" />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold text-white">Chatbot Studio</span>
          <span className="block text-[11px] text-gray-500">WhatsApp Business</span>
        </span>
      </NavLink>

      <nav className="p-3 space-y-1 flex-1">
        <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">Construir</p>
        <NavLink to="/fluxos" className={linkClasse}>
          <Workflow className="w-4 h-4" /> Meus fluxos
        </NavLink>
        <NavLink to="/simulador" className={linkClasse}>
          <PlayCircle className="w-4 h-4" /> Simulador
        </NavLink>

        <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">Publicar</p>
        <NavLink to="/whatsapp" className={linkClasse}>
          <Smartphone className="w-4 h-4" /> WhatsApp
        </NavLink>
      </nav>

      <div className="p-3 border-t border-white/5">
        <div className="rounded-xl bg-[#161a22] border border-white/5 p-3">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Monte o fluxo, teste no simulador e publique no WhatsApp.
          </p>
        </div>
      </div>
    </aside>
  );
};
