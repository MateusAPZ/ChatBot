import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, RotateCcw, Bot, Send, MessageCircle } from 'lucide-react';
import { apiService } from '../api/client';
import { Fluxo } from '../types';
import { useToast } from '../context/ToastContext';

interface MensagemChat {
  id: string;
  tipo: 'bot' | 'usuario' | 'sistema';
  texto: string;
  hora: string;
}

export const SimulatorPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const fluxoParam = searchParams.get('fluxoId');
  const { toast } = useToast();

  const [fluxos, setFluxos] = useState<Fluxo[]>([]);
  const [fluxoSelecionado, setFluxoSelecionado] = useState<number | ''>('');
  const [telefone, setTelefone] = useState('5524999999999');

  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [opcoes, setOpcoes] = useState<string[]>([]);
  const [digitando, setDigitando] = useState(false);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [noAtual, setNoAtual] = useState<number | null>(null);
  const [statusConversa, setStatusConversa] = useState<'aguardando' | 'online' | 'finalizada'>('aguardando');

  const [textoEntrada, setTextoEntrada] = useState('');
  const [desabilitado, setDesabilitado] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function carregar() {
      try {
        const data = await apiService.getSimuladorFluxos();
        setFluxos(data.fluxos);
        if (fluxoParam) {
          setFluxoSelecionado(parseInt(fluxoParam, 10));
        } else if (data.fluxoSelecionado) {
          setFluxoSelecionado(data.fluxoSelecionado);
        }
      } catch {
        toast('Erro ao carregar fluxos para o simulador.', 'erro');
      }
    }
    carregar();
  }, [fluxoParam, toast]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, digitando, opcoes]);

  const obterHoraAtual = () => {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const exibirRespostasBot = async (novasMensagens: string[]) => {
    for (const msg of novasMensagens) {
      setDigitando(true);
      const delay = Math.min(800, 250 + msg.length * 8);
      await new Promise(r => setTimeout(r, delay));
      setDigitando(false);

      setMensagens(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          tipo: 'bot',
          texto: msg,
          hora: obterHoraAtual()
        }
      ]);
    }
  };

  const handleIniciar = async () => {
    if (!fluxoSelecionado) {
      toast('Selecione um fluxo ativo para testar.', 'erro');
      return;
    }
    if (!telefone.trim()) {
      toast('Informe um número para o cliente fictício.', 'erro');
      return;
    }

    setMensagens([]);
    setOpcoes([]);
    setDesabilitado(false);

    try {
      const res = await apiService.iniciarSimulacao(telefone.trim(), Number(fluxoSelecionado));
      if (!res.sucesso) {
        setMensagens([
          {
            id: Math.random().toString(),
            tipo: 'sistema',
            texto: res.mensagens[0] || 'Não foi possível iniciar a conversa.',
            hora: obterHoraAtual()
          }
        ]);
        return;
      }

      setProtocolo(res.protocolo || null);
      setNoAtual(res.noId || null);
      setStatusConversa(res.finalizado ? 'finalizada' : 'online');

      await exibirRespostasBot(res.mensagens);
      setOpcoes(res.finalizado ? [] : res.opcoes);
    } catch {
      toast('Erro de comunicação com o servidor.', 'erro');
    }
  };

  const handleEnviar = async (textoForcado?: string) => {
    const texto = (textoForcado !== undefined ? textoForcado : textoEntrada).trim();
    if (!texto) return;

    setMensagens(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        tipo: 'usuario',
        texto,
        hora: obterHoraAtual()
      }
    ]);
    setTextoEntrada('');
    setOpcoes([]);

    try {
      const res = await apiService.enviarMensagemSimulada(telefone.trim(), texto);

      setProtocolo(res.protocolo || protocolo);
      setNoAtual(res.noId || noAtual);
      setStatusConversa(res.finalizado ? 'finalizada' : 'online');

      await exibirRespostasBot(res.mensagens);
      setOpcoes(res.finalizado ? [] : res.opcoes);
    } catch {
      toast('Erro ao enviar mensagem simulada.', 'erro');
    }
  };

  // Formatação estilo WhatsApp: *negrito* e _itálico_
  const formatarTextoWhatsApp = (texto: string) => {
    const partes = texto.split('\n');
    return partes.map((linha, i) => {
      // Substitui *texto* por negrito e _texto_ por itálico
      const formatado = linha
        .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
        .replace(/_([^_]+)_/g, '<em>$1</em>');

      return (
        <span key={i} className="block leading-relaxed">
          <span dangerouslySetInnerHTML={{ __html: formatado }} />
        </span>
      );
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Simulador de conversa</h1>
        <p className="text-sm text-gray-500 mt-1">
          Teste o fluxo aqui antes de publicar no WhatsApp — o motor é exatamente o mesmo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* CONFIGURAÇÃO DO TESTE */}
        <div className="bg-[#11141a] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-gray-300">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold">Configuração</h2>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 block mb-1.5">
              Fluxo a testar
            </label>
            <select
              value={fluxoSelecionado}
              onChange={(e) => setFluxoSelecionado(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-[#161a22] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50"
            >
              {fluxos.length === 0 ? (
                <option value="">Nenhum fluxo ativo</option>
              ) : (
                fluxos.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nome} {f.ehPadrao ? '(padrão)' : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 block mb-1.5">
              Número do cliente fictício
            </label>
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full bg-[#161a22] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50"
            />
            <p className="text-[10px] text-gray-600 mt-1.5">
              A conversa do simulador é separada da conversa real do WhatsApp.
            </p>
          </div>

          <button
            type="button"
            onClick={handleIniciar}
            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-[#0d0f13] font-semibold text-sm px-4 py-2.5 rounded-lg transition"
          >
            <RotateCcw className="w-4 h-4" /> Iniciar / reiniciar conversa
          </button>

          <div className="border-t border-white/5 pt-4 space-y-2 text-[11px] text-gray-500 leading-relaxed">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Comandos que sempre funcionam</p>
            <p><span className="text-gray-300 font-mono">menu</span> volta ao início do fluxo</p>
            <p><span className="text-gray-300 font-mono">sair</span> encerra o atendimento</p>
          </div>

          {protocolo && (
            <div className="border-t border-white/5 pt-4 text-[11px] text-gray-500">
              <p>Protocolo: <span className="text-gray-300 font-mono">{protocolo}</span></p>
              <p>Passo atual: <span className="text-gray-300 font-mono">#{noAtual || '—'}</span></p>
            </div>
          )}
        </div>

        {/* CONTAINER DO SMARTPHONE / CHAT */}
        <div className="bg-[#11141a] border border-white/5 rounded-2xl overflow-hidden flex flex-col" style={{ height: '74vh', minHeight: '520px' }}>
          {/* Header do chat */}
          <div className="h-16 shrink-0 px-4 flex items-center gap-3 bg-[#1f2c33] border-b border-black/20">
            <span className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-100 truncate">Bot de atendimento</p>
              <p className="text-[11px] text-gray-400">
                {statusConversa === 'online' && 'online'}
                {statusConversa === 'finalizada' && 'conversa finalizada'}
                {statusConversa === 'aguardando' && 'aguardando início'}
              </p>
            </div>
          </div>

          {/* Área de mensagens */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 chat-wallpaper">
            {mensagens.length === 0 && !digitando ? (
              <div className="text-center py-10">
                <span className="inline-flex w-12 h-12 rounded-2xl bg-white/5 text-gray-600 items-center justify-center mb-3">
                  <MessageCircle className="w-5 h-5" />
                </span>
                <p className="text-xs text-gray-500">Clique em "Iniciar conversa" para ver o bot em ação.</p>
              </div>
            ) : (
              mensagens.map(m => {
                if (m.tipo === 'sistema') {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] px-3 py-1.5 rounded-lg max-w-[80%] text-center">
                        {m.texto}
                      </div>
                    </div>
                  );
                }

                const isUsuario = m.tipo === 'usuario';
                return (
                  <div key={m.id} className={`flex ${isUsuario ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`${
                        isUsuario
                          ? 'balao-usuario bg-[#005c4b] text-gray-50'
                          : 'balao-bot bg-[#202c33] text-gray-100'
                      } text-sm px-3.5 py-2 max-w-[75%] shadow`}
                    >
                      <div className="break-words">{formatarTextoWhatsApp(m.texto)}</div>
                      <div className={`text-[10px] ${isUsuario ? 'text-emerald-200/60' : 'text-gray-500'} text-right mt-1`}>
                        {m.hora}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Animação de digitação */}
            {digitando && (
              <div className="flex justify-start">
                <div className="balao-bot bg-[#202c33] px-4 py-3 digitando">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick replies */}
          {opcoes.length > 0 && (
            <div className="shrink-0 px-4 pt-3 flex flex-wrap gap-2 bg-[#11141a]">
              {opcoes.map((opcao, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleEnviar(opcao)}
                  className="text-xs px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition"
                >
                  {opcao}
                </button>
              ))}
            </div>
          )}

          {/* Barra de entrada */}
          <div className="shrink-0 p-3 bg-[#11141a] border-t border-white/5 flex items-center gap-2">
            <input
              type="text"
              value={textoEntrada}
              onChange={(e) => setTextoEntrada(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleEnviar(); }}
              disabled={desabilitado}
              placeholder="Digite como se fosse o cliente..."
              className="flex-1 bg-[#161a22] border border-white/10 rounded-full px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => handleEnviar()}
              disabled={desabilitado || !textoEntrada.trim()}
              className="w-11 h-11 shrink-0 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-[#0d0f13] flex items-center justify-center transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
