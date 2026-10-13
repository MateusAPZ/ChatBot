import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageCircleMore, Workflow, PlayCircle, Smartphone, FlaskConical, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

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

        <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">Testes & Simulação</p>
        <NavLink to="/simulador" className={linkClasse}>
          <PlayCircle className="w-4 h-4" /> Simulador WhatsApp
        </NavLink>
        <NavLink to="/testes" className={linkClasse}>
          <FlaskConical className="w-4 h-4" /> Lab de Testes
        </NavLink>

        <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">Publicar</p>
        <NavLink to="/whatsapp" className={linkClasse}>
          <Smartphone className="w-4 h-4" /> WhatsApp
        </NavLink>
      </nav>

      <div className="p-3 border-t border-white/5 space-y-2">
        {user && (
          <div className="rounded-xl bg-[#161a22] border border-white/5 p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs uppercase">
                {user.nome.charAt(0)}
              </span>
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-white truncate" title={user.nome}>
                  {user.nome}
                </span>
                <span className="block text-[10px] text-emerald-400/90 truncate" title={user.cargo || user.perfil}>
                  {user.cargo || user.perfil}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
              title="Encerrar sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="rounded-xl bg-[#161a22]/50 border border-white/5 p-2 text-center">
          <p className="text-[10px] text-gray-500 leading-tight">
            PET-Saúde · Piraí / RJ
          </p>
        </div>
      </div>
    </aside>
  );
};
