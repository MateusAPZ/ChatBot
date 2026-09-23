import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Workflow, Plus, MessageSquarePlus, GitBranch, Layers, Users,
  PencilRuler, Play, Smartphone, ToggleLeft, ToggleRight, Trash2, Loader2
} from 'lucide-react';
import { apiService } from '../api/client';
import { Fluxo } from '../types';
import { useToast } from '../context/ToastContext';

export const FlowsListPage: React.FC = () => {
  const [fluxos, setFluxos] = useState<Fluxo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novoNome, setNovoNome] = useState('');
  const [criando, setCriando] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const carregarFluxos = async () => {
    try {
      const data = await apiService.getFluxos();
      setFluxos(data);
    } catch (err: any) {
      toast('Erro ao carregar lista de fluxos.', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarFluxos();
  }, []);

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;

    setCriando(true);
    try {
      const novoFluxo = await apiService.criarFluxo(novoNome.trim());
      toast('Fluxo criado com sucesso!', 'sucesso');
      navigate(`/fluxo/${novoFluxo.id}`);
    } catch (err: any) {
      toast('Não foi possível criar o fluxo.', 'erro');
      setCriando(false);
    }
  };

  const handleAlternarStatus = async (id: number) => {
    try {
      await apiService.alternarStatusFluxo(id);
      await carregarFluxos();
      toast('Status do fluxo atualizado.', 'sucesso');
    } catch {
      toast('Erro ao alterar status.', 'erro');
    }
  };

  const handleDefinirPadrao = async (id: number) => {
    try {
      await apiService.definirFluxoPadrao(id);
      await carregarFluxos();
      toast('Fluxo definido como padrão para o WhatsApp.', 'sucesso');
    } catch {
      toast('Erro ao definir como padrão.', 'erro');
    }
  };

  const handleExcluir = async (id: number, nome: string) => {
    if (!window.confirm(`Excluir o fluxo "${nome}" e todos os passos dele?`)) return;

    try {
      await apiService.excluirFluxo(id);
      setFluxos(prev => prev.filter(f => f.id !== id));
      toast('Fluxo excluído com sucesso.', 'sucesso');
    } catch {
      toast('Erro ao excluir fluxo.', 'erro');
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Meus fluxos de atendimento</h1>
          <p className="text-sm text-gray-500 mt-1">Cada fluxo é um roteiro de conversa que o bot segue no WhatsApp.</p>
        </div>

        <form onSubmit={handleCriar} className="flex items-center gap-2">
          <div className="relative">
            <Workflow className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              required
              maxLength={80}
              placeholder="Nome do novo fluxo"
              className="w-64 bg-[#161a22] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 text-gray-200"
            />
          </div>
          <button
            type="submit"
            disabled={criando}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-[#0d0f13] font-semibold text-sm px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {criando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Criar fluxo
          </button>
        </form>
      </div>

      {fluxos.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center bg-[#11141a]">
          <span className="inline-flex w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 items-center justify-center mb-4">
            <MessageSquarePlus className="w-7 h-7" />
          </span>
          <h2 className="text-lg font-medium text-white">Nenhum fluxo por aqui ainda</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
            Crie o primeiro fluxo no campo acima. Ele já nasce com uma mensagem de boas-vindas
            pronta para você editar no construtor visual.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {fluxos.map((fluxo) => {
            const dataFormatada = new Date(fluxo.dataCriacao).toLocaleDateString('pt-BR');

            return (
              <div
                key={fluxo.id}
                className="group bg-[#11141a] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition flex flex-col"
              >
                <Link to={`/fluxo/${fluxo.id}`} className="p-5 block flex-1">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <span className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      <GitBranch className="w-5 h-5" />
                    </span>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {fluxo.ehPadrao && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                          Padrão WhatsApp
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                          fluxo.status
                            ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                            : 'bg-white/5 text-gray-500 border border-white/10'
                        }`}
                      >
                        {fluxo.status ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-white group-hover:text-emerald-300 transition truncate">
                    {fluxo.nome}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Criado em {dataFormatada}</p>

                  <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-gray-600" /> {fluxo.totalPassos || 0} passos
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-600" /> {fluxo.totalConversas || 0} conversas
                    </span>
                  </div>
                </Link>

                <div className="border-t border-white/5 px-3 py-2 flex items-center gap-1">
                  <Link
                    to={`/fluxo/${fluxo.id}`}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md text-gray-300 hover:bg-white/5 transition"
                    title="Abrir construtor"
                  >
                    <PencilRuler className="w-3.5 h-3.5" /> Editar
                  </Link>
                  <Link
                    to={`/simulador?fluxoId=${fluxo.id}`}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md text-gray-300 hover:bg-white/5 transition"
                    title="Testar no simulador"
                  >
                    <Play className="w-3.5 h-3.5" /> Testar
                  </Link>

                  <span className="flex-1" />

                  {!fluxo.ehPadrao && (
                    <button
                      type="button"
                      onClick={() => handleDefinirPadrao(fluxo.id)}
                      title="Usar este fluxo no WhatsApp"
                      className="inline-flex items-center p-1.5 rounded-md text-gray-500 hover:text-emerald-300 hover:bg-white/5 transition"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAlternarStatus(fluxo.id)}
                    title={fluxo.status ? 'Desativar' : 'Ativar'}
                    className="inline-flex items-center p-1.5 rounded-md text-gray-500 hover:text-sky-300 hover:bg-white/5 transition"
                  >
                    {fluxo.status ? (
                      <ToggleRight className="w-3.5 h-3.5 text-sky-400" />
                    ) : (
                      <ToggleLeft className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExcluir(fluxo.id, fluxo.nome)}
                    title="Excluir fluxo"
                    className="inline-flex items-center p-1.5 rounded-md text-gray-500 hover:text-rose-400 hover:bg-white/5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
