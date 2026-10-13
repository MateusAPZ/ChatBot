import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Lock, User, Eye, EyeOff, Loader2, ShieldCheck, HeartPulse,
  KeyRound, Sparkles, AlertCircle, ArrowRight
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrar, setLembrar] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Redireciona se já estiver autenticado
  React.useEffect(() => {
    if (isAuthenticated) {
      const destino = (location.state as any)?.from?.pathname || '/fluxos';
      navigate(destino, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identificador.trim() || !senha) {
      setErro('Por favor, preencha o usuário e a senha.');
      return;
    }

    setCarregando(true);
    setErro(null);

    const resultado = await login(identificador.trim(), senha, lembrar);

    if (resultado.sucesso) {
      const destino = (location.state as any)?.from?.pathname || '/fluxos';
      navigate(destino, { replace: true });
    } else {
      setErro(resultado.erro || 'Credenciais inválidas.');
      setCarregando(false);
    }
  };

  const preencherAcessoRapido = (user: string, pass: string) => {
    setIdentificador(user);
    setSenha(pass);
    setErro(null);
  };

  return (
    <div className="min-h-screen bg-[#0d0f13] text-gray-200 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Luzes de fundo decorativas */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* CABEÇALHO INSTITUCIONAL */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>PET-Saúde · Prefeitura Municipal de Piraí</span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-[#0d0f13] flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div className="text-left">
              <h1 className="text-xl font-bold text-white tracking-tight">Central de Atendimento</h1>
              <p className="text-xs text-gray-400">WhatsApp & Gestão SUS Piraí</p>
            </div>
          </div>
        </div>

        {/* CARD DO FORMULÁRIO */}
        <div className="bg-[#11141a] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-white">Acesso Restrito</h2>
            <p className="text-xs text-gray-500 mt-1">
              Informe suas credenciais para gerenciar fluxos e atendimentos.
            </p>
          </div>

          {erro && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Usuário / E-mail */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                Usuário ou E-mail
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: admin ou saude"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  disabled={carregando}
                  className="w-full bg-[#161a22] border border-white/10 focus:border-emerald-500/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Senha de Acesso
                </label>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={carregando}
                  className="w-full bg-[#161a22] border border-white/10 focus:border-emerald-500/60 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1 rounded transition"
                  title={mostrarSenha ? "Ocultar senha" : "Ver senha"}
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Checkbox Lembrar */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400 hover:text-gray-300">
                <input
                  type="checkbox"
                  checked={lembrar}
                  onChange={(e) => setLembrar(e.target.checked)}
                  className="rounded border-white/20 bg-[#161a22] text-emerald-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                />
                <span>Lembrar meu acesso</span>
              </label>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={carregando}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-[#0d0f13] text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 mt-2"
            >
              {carregando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando credenciais...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* ACESSO RÁPIDO PARA TESTES */}
          <div className="mt-6 pt-5 border-t border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <KeyRound className="w-3 h-3 text-amber-400" />
              <span>Contas Configuradas do Município:</span>
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => preencherAcessoRapido('admin', 'admin123')}
                className="p-2 rounded-xl bg-[#161a22] hover:bg-[#1c222d] border border-white/5 hover:border-emerald-500/30 text-left transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-200 group-hover:text-emerald-400">Coordenação</span>
                  <Sparkles className="w-3 h-3 text-gray-600 group-hover:text-emerald-400" />
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">admin / admin123</p>
              </button>

              <button
                type="button"
                onClick={() => preencherAcessoRapido('saude', 'saude123')}
                className="p-2 rounded-xl bg-[#161a22] hover:bg-[#1c222d] border border-white/5 hover:border-emerald-500/30 text-left transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-200 group-hover:text-emerald-400">Equipe Saúde</span>
                  <Sparkles className="w-3 h-3 text-gray-600 group-hover:text-emerald-400" />
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">saude / saude123</p>
              </button>
            </div>
          </div>
        </div>

        {/* RODAPÉ */}
        <p className="text-center text-[11px] text-gray-600 mt-6 flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3 text-gray-700" />
          <span>Ambiente seguro com autenticação criptografada · Piraí - RJ</span>
        </p>
      </div>
    </div>
  );
};
