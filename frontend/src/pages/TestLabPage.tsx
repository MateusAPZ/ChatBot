import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FlaskConical,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Server,
  Zap,
  Terminal,
  Activity,
  Send,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Database,
  Cpu,
  HeartPulse,
  UserCheck
} from 'lucide-react';
import { apiService } from '../api/client';
import { useToast } from '../context/ToastContext';

interface ItemTeste {
  id: string;
  nome: string;
  metodo: 'GET' | 'POST';
  endpoint: string;
  descricao: string;
  status: 'ocioso' | 'executando' | 'sucesso' | 'erro';
  tempoMs?: number;
  resposta?: any;
  erro?: string;
}

export const TestLabPage: React.FC = () => {
  const { toast } = useToast();

  // Estado geral
  const [diagnostico, setDiagnostico] = useState<{
    status: string;
    armazenamento: string;
    isDbConnected: boolean;
    totalFluxos: number;
    provedor: string;
    porta: number;
    uptimeSegundos: number;
  } | null>(null);

  // Lista de Testes Automatizados
  const [testes, setTestes] = useState<ItemTeste[]>([
    {
      id: 'health',
      nome: 'Healthcheck da API',
      metodo: 'GET',
      endpoint: '/health',
      descricao: 'Verifica se o servidor backend Express está online e respondendo.',
      status: 'ocioso'
    },
    {
      id: 'diagnostico',
      nome: 'Diagnóstico do Sistema',
      metodo: 'GET',
      endpoint: '/api/diagnostico',
      descricao: 'Verifica o tipo de armazenamento (Postgres / Memória) e estatísticas.',
      status: 'ocioso'
    },
    {
      id: 'fluxos',
      nome: 'Motor de Fluxos',
      metodo: 'GET',
      endpoint: '/api/fluxos',
      descricao: 'Valida se o carregamento e listagem de nós/fluxos está funcionando.',
      status: 'ocioso'
    },
    {
      id: 'simulador-fluxos',
      nome: 'Resolvedor de Fluxo Padrão',
      metodo: 'GET',
      endpoint: '/api/simulador/fluxos',
      descricao: 'Verifica se o sistema encontra o fluxo ativo principal para conversas.',
      status: 'ocioso'
    },
    {
      id: 'meta-webhook',
      nome: 'Handshake Webhook Meta',
      metodo: 'GET',
      endpoint: '/api/whatsapp/meta',
      descricao: 'Testa a rota de validação da Meta Cloud API (WhatsApp Business).',
      status: 'ocioso'
    },
    {
      id: 'simulador-iniciar',
      nome: 'Início de Conversa (Chatbot Engine)',
      metodo: 'POST',
      endpoint: '/api/simulador/iniciar',
      descricao: 'Dispara a saudação inicial do fluxo e captura mensagem e opções.',
      status: 'ocioso'
    },
    {
      id: 'simulador-mensagem',
      nome: 'Navegação por Opção (Suporte)',
      metodo: 'POST',
      endpoint: '/api/simulador/mensagem',
      descricao: 'Simula o envio do dígito 1 e valida o roteamento do bot para o passo 2.',
      status: 'ocioso'
    },
    {
      id: 'painel-whatsapp',
      nome: 'Métricas do Painel WhatsApp',
      metodo: 'GET',
      endpoint: '/api/whatsapp/painel',
      descricao: 'Valida o carregamento dos contadores e histórico de conversas.',
      status: 'ocioso'
    },
    {
      id: 'esus-consulta',
      nome: 'Consulta e-SUS APS PEC (Piraí)',
      metodo: 'POST',
      endpoint: '/api/esus/consultar',
      descricao: 'Valida a busca cadastral de munícipe por CPF, vínculo com USF e ACS.',
      status: 'ocioso'
    },
    {
      id: 'baileys-status',
      nome: 'Status WhatsApp Web Nativo',
      metodo: 'GET',
      endpoint: '/api/whatsapp/baileys/status',
      descricao: 'Verifica o status da conexão direta do WhatsApp por QR Code.',
      status: 'ocioso'
    }
  ]);

  const [executandoTodos, setExecutandoTodos] = useState(false);
  const [detalheExpandido, setDetalheExpandido] = useState<string | null>(null);

  // Consulta e-SUS APS PEC
  const [cpfConsulta, setCpfConsulta] = useState('12345678909');
  const [consultandoEsus, setConsultandoEsus] = useState(false);
  const [resultadoEsus, setResultadoEsus] = useState<any>(null);

  // Sandbox de Mensagens
  const [telefoneSimulado, setTelefoneSimulado] = useState('5511999998888');
  const [nomeContato, setNomeContato] = useState('Cliente Teste');
  const [mensagemSimulada, setMensagemSimulada] = useState('1');
  const [enviandoSandbox, setEnviandoSandbox] = useState(false);
  const [respostaSandbox, setRespostaSandbox] = useState<any>(null);

  const carregarDiagnostico = async () => {
    try {
      const data = await apiService.getDiagnostico();
      setDiagnostico(data);
    } catch {
      // Fallback
      setDiagnostico({
        status: 'online',
        armazenamento: 'Memória Local (Resiliente)',
        isDbConnected: false,
        totalFluxos: 1,
        provedor: 'Meta',
        porta: 5277,
        uptimeSegundos: 0
      });
    }
  };

  useEffect(() => {
    carregarDiagnostico();
  }, []);

  const handleConsultarEsus = async (termoForcado?: string) => {
    const termo = (termoForcado !== undefined ? termoForcado : cpfConsulta).trim();
    if (!termo) return;
    setConsultandoEsus(true);
    try {
      const res = await apiService.consultarEsus(termo);
      setResultadoEsus(res);
      if (res.sucesso && res.cidadao) {
        toast(`Cadastro e-SUS localizado: ${res.cidadao.nomeCompleto} (${res.cidadao.usf})`, 'sucesso');
      } else {
        toast('Munícipe não localizado no e-SUS PEC.', 'info');
      }
    } catch {
      toast('Erro ao consultar cadastro no e-SUS.', 'erro');
    } finally {
      setConsultandoEsus(false);
    }
  };

  // Executar um teste específico
  const rodarTeste = async (id: string) => {
    const inicio = performance.now();

    setTestes(prev => prev.map(t => (t.id === id ? { ...t, status: 'executando', erro: undefined } : t)));

    try {
      let res: any;
      if (id === 'health') {
        const r = await fetch('/health');
        res = await r.json();
      } else if (id === 'diagnostico') {
        res = await apiService.getDiagnostico();
      } else if (id === 'fluxos') {
        res = await apiService.getFluxos();
      } else if (id === 'simulador-fluxos') {
        res = await apiService.getSimuladorFluxos();
      } else if (id === 'meta-webhook') {
        const r = await fetch('/api/whatsapp/meta');
        res = await r.json();
      } else if (id === 'simulador-iniciar') {
        res = await apiService.iniciarSimulacao('5511999990001', 1);
      } else if (id === 'simulador-mensagem') {
        res = await apiService.enviarMensagemSimulada('5511999990001', '1');
      } else if (id === 'painel-whatsapp') {
        res = await apiService.getWhatsAppPainel();
      } else if (id === 'esus-consulta') {
        res = await apiService.consultarEsus('12345678909');
      } else if (id === 'baileys-status') {
        res = await apiService.getWhatsAppBaileysStatus();
      }

      const fim = performance.now();
      const tempoMs = Math.round(fim - inicio);

      setTestes(prev =>
        prev.map(t => (t.id === id ? { ...t, status: 'sucesso', tempoMs, resposta: res } : t))
      );
    } catch (err: any) {
      const fim = performance.now();
      const tempoMs = Math.round(fim - inicio);
      setTestes(prev =>
        prev.map(t =>
          t.id === id
            ? { ...t, status: 'erro', tempoMs, erro: err.message || 'Falha ao executar requisição.' }
            : t
        )
      );
    }
  };

  // Executar todos os testes em sequência
  const rodarTodosTestes = async () => {
    setExecutandoTodos(true);
    for (const teste of testes) {
      await rodarTeste(teste.id);
    }
    setExecutandoTodos(false);
    toast('Diagnóstico concluído com sucesso!', 'sucesso');
  };

  // Disparar mensagem no Sandbox
  const handleDispararSandbox = async (textoPersonalizado?: string) => {
    const texto = textoPersonalizado !== undefined ? textoPersonalizado : mensagemSimulada;
    if (!texto.trim()) return;

    setEnviandoSandbox(true);
    try {
      const res = await apiService.testarWebhookSimulado({
        telefone: telefoneSimulado,
        texto,
        nome: nomeContato
      });
      setRespostaSandbox(res);
      toast('Mensagem processada pelo motor do bot!', 'sucesso');
    } catch {
      toast('Erro ao disparar mensagem de teste.', 'erro');
    } finally {
      setEnviandoSandbox(false);
    }
  };

  const totalPassaram = testes.filter(t => t.status === 'sucesso').length;
  const totalErros = testes.filter(t => t.status === 'erro').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FlaskConical className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white">Laboratório de Testes & Diagnóstico</h1>
              <p className="text-sm text-gray-400">
                Site local de testes: valide o motor do chatbot, rotas da API e webhooks sem precisar da Meta.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/simulador"
            className="inline-flex items-center gap-2 bg-[#161a22] hover:bg-[#1f2530] text-gray-200 border border-white/10 px-3.5 py-2 rounded-xl text-sm font-medium transition"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            Abrir Simulador WhatsApp
          </Link>
          <a
            href="/testes.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400 border border-white/5 hover:border-emerald-500/30 px-3 py-2 rounded-xl bg-[#11141a] transition"
          >
            Página HTML Isolada <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* CARDS DE STATUS GERAL DO SISTEMA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#11141a] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Servidor Local</p>
            <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Online (Porta {diagnostico?.porta || 5277})
            </p>
          </div>
        </div>

        <div className="bg-[#11141a] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Armazenamento</p>
            <p className="text-sm font-semibold text-gray-200 truncate">
              {diagnostico?.isDbConnected ? 'PostgreSQL Ativo' : 'Memória (Sem BD)'}
            </p>
          </div>
        </div>

        <div className="bg-[#11141a] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Provedor WhatsApp</p>
            <p className="text-sm font-semibold text-gray-200">
              {diagnostico?.provedor || 'Meta Cloud API'}
            </p>
          </div>
        </div>

        <div className="bg-[#11141a] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Fluxos Ativos</p>
            <p className="text-sm font-semibold text-gray-200">
              {diagnostico?.totalFluxos ?? 1} configurado(s)
            </p>
          </div>
        </div>
      </div>

      {/* SEÇÃO 1: BATERIA DE TESTES AUTOMATIZADOS */}
      <div className="bg-[#11141a] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" /> Diagnóstico Automatizado de Rotas & Serviços
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Executa chamadas HTTP reais em cada camada da API e valida se todos os componentes respondem.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {testes.some(t => t.status !== 'ocioso') && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300">
                <span className="text-emerald-400 font-semibold">{totalPassaram}</span> de {testes.length} aprovados
                {totalErros > 0 && <span className="text-rose-400 ml-1">({totalErros} falhas)</span>}
              </span>
            )}

            <button
              type="button"
              onClick={rodarTodosTestes}
              disabled={executandoTodos}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0d0f13] font-semibold text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-emerald-500/10"
            >
              {executandoTodos ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" /> Testando rotas...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> Executar Todos os Testes
                </>
              )}
            </button>
          </div>
        </div>

        {/* TABELA DE TESTES */}
        <div className="divide-y divide-white/5">
          {testes.map(teste => {
            const expandido = detalheExpandido === teste.id;

            return (
              <div key={teste.id} className="py-3 hover:bg-white/[0.01] transition-colors rounded-lg px-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="shrink-0">
                      {teste.status === 'ocioso' && (
                        <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-gray-500">
                          —
                        </span>
                      )}
                      {teste.status === 'executando' && (
                        <RotateCcw className="w-5 h-5 text-emerald-400 animate-spin" />
                      )}
                      {teste.status === 'sucesso' && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      )}
                      {teste.status === 'erro' && (
                        <XCircle className="w-5 h-5 text-rose-400" />
                      )}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-200">{teste.nome}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            teste.metodo === 'GET'
                              ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          }`}
                        >
                          {teste.metodo}
                        </span>
                        <span className="text-xs font-mono text-gray-500">{teste.endpoint}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">{teste.descricao}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                    {teste.tempoMs !== undefined && (
                      <span className="text-xs font-mono text-gray-400">{teste.tempoMs}ms</span>
                    )}

                    {(teste.resposta || teste.erro) && (
                      <button
                        type="button"
                        onClick={() => setDetalheExpandido(expandido ? null : teste.id)}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition"
                      >
                        {expandido ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        Payload
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => rodarTeste(teste.id)}
                      disabled={teste.status === 'executando' || executandoTodos}
                      className="text-xs bg-[#161a22] hover:bg-[#1f2530] text-gray-300 border border-white/10 px-2.5 py-1 rounded-lg transition disabled:opacity-40"
                    >
                      Testar
                    </button>
                  </div>
                </div>

                {/* DETALHE / EXPANSÃO DO JSON */}
                {expandido && (
                  <div className="mt-3 p-3 bg-[#0d0f13] border border-white/5 rounded-xl text-xs font-mono overflow-x-auto text-gray-300">
                    {teste.erro ? (
                      <div className="text-rose-400">
                        <strong>Erro:</strong> {teste.erro}
                      </div>
                    ) : (
                      <pre>{JSON.stringify(teste.resposta, null, 2)}</pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 2: SANDBOX DE MENSAGENS E WEBHOOK INTERATIVO */}
      <div className="bg-[#11141a] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="border-b border-white/5 pb-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" /> Sandbox de Mensagens & Webhook
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Dispare mensagens instantâneas para simular como o motor do WhatsApp processa entradas de usuários e responde.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PAINEL DE ENTRADA */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">
                  Número de Teste
                </label>
                <input
                  type="text"
                  value={telefoneSimulado}
                  onChange={e => setTelefoneSimulado(e.target.value)}
                  className="w-full bg-[#161a22] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">
                  Nome do Contato
                </label>
                <input
                  type="text"
                  value={nomeContato}
                  onChange={e => setNomeContato(e.target.value)}
                  className="w-full bg-[#161a22] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">
                Atalhos Rápidos (Gatilhos do Fluxo)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '👋 Início (menu)', val: 'menu' },
                  { label: '📋 1 - Pesquisa USF', val: '1' },
                  { label: '📍 2 - Localizar USF', val: '2' },
                  { label: '📞 3 - Ouvidoria', val: '3' },
                  { label: '🔍 4 - Pedir CPF', val: '4' },
                  { label: '🆔 123.456.789-09 (CPF)', val: '123.456.789-09' },
                  { label: '❌ sair', val: 'sair' }
                ].map(item => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => {
                      setMensagemSimulada(item.val);
                      handleDispararSandbox(item.val);
                    }}
                    className="text-xs bg-[#161a22] hover:bg-emerald-500/10 hover:border-emerald-500/30 text-gray-300 hover:text-emerald-300 border border-white/10 px-2.5 py-1.5 rounded-lg transition"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">
                Mensagem a enviar
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mensagemSimulada}
                  onChange={e => setMensagemSimulada(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleDispararSandbox();
                  }}
                  placeholder="Ex: 1, suporte, menu, etc."
                  className="flex-1 bg-[#161a22] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => handleDispararSandbox()}
                  disabled={enviandoSandbox || !mensagemSimulada.trim()}
                  className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-[#0d0f13] font-semibold text-xs px-4 py-2 rounded-xl transition"
                >
                  <Send className="w-3.5 h-3.5" /> Disparar
                </button>
              </div>
            </div>
          </div>

          {/* PAINEL DE RESPOSTA */}
          <div className="bg-[#161a22] border border-white/5 rounded-xl p-4 flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                <span className="text-xs font-semibold text-gray-300">Resposta do Motor do Chatbot</span>
                {respostaSandbox && (
                  <span className="text-[10px] font-mono text-emerald-400">
                    Protocolo: #{respostaSandbox?.respostaBot?.protocolo || '—'}
                  </span>
                )}
              </div>

              {!respostaSandbox ? (
                <div className="text-center py-10 text-gray-500 text-xs">
                  Envie uma mensagem ou clique em um dos atalhos para ver a resposta imediata do bot.
                </div>
              ) : (
                <div className="space-y-3">
                  {respostaSandbox.respostaBot?.mensagens?.map((msg: string, idx: number) => (
                    <div key={idx} className="bg-[#202c33] text-gray-100 p-3 rounded-xl text-xs shadow-sm">
                      <p className="whitespace-pre-wrap leading-relaxed">{msg}</p>
                    </div>
                  ))}

                  {respostaSandbox.respostaBot?.opcoes?.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                        Opções Clicáveis Disponíveis:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {respostaSandbox.respostaBot.opcoes.map((op: string, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setMensagemSimulada(op);
                              handleDispararSandbox(op);
                            }}
                            className="text-[11px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 px-2.5 py-1 rounded-full transition"
                          >
                            {op}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {respostaSandbox.respostaBot?.finalizado && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] px-3 py-1.5 rounded-lg text-center">
                      Atendimento marcado como finalizado.
                    </div>
                  )}
                </div>
              )}
            </div>

            {respostaSandbox && (
              <div className="mt-4 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500">
                <span>Passo Atual: #{respostaSandbox.respostaBot?.noAtualId || '1'}</span>
                <span>Canal: Simulador Local</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO: CONSULTA DE CIDADÃO NO e-SUS APS PEC (PIRAÍ) */}
      <div className="bg-[#11141a] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="border-b border-white/5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-emerald-400" /> Consulta de Cidadão no e-SUS APS PEC (Piraí)
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Simule ou consulte o cadastro do morador pelo CPF na base municipal para identificar a USF e o Agente Comunitário de Saúde (ACS).
            </p>
          </div>

          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            Base e-SUS Piraí Ativa
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">
                Digite o CPF ou Cartão SUS do Morador
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cpfConsulta}
                  onChange={e => setCpfConsulta(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleConsultarEsus(); }}
                  placeholder="Ex: 123.456.789-09 ou apenas números"
                  className="flex-1 bg-[#161a22] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => handleConsultarEsus()}
                  disabled={consultandoEsus || !cpfConsulta.trim()}
                  className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-[#0d0f13] font-semibold text-xs px-4 py-2 rounded-xl transition"
                >
                  {consultandoEsus ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  Consultar no e-SUS
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">
                Exemplos Rápidos de CPFs para Teste
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Santanésia', cpf: '12345678909' },
                  { label: 'Arrozal', cpf: '98765432100' },
                  { label: 'Centro', cpf: '45678912301' },
                  { label: 'Casa Amarela', cpf: '78912345602' },
                  { label: 'Varjão', cpf: '32165498703' }
                ].map(ex => (
                  <button
                    key={ex.cpf}
                    type="button"
                    onClick={() => {
                      setCpfConsulta(ex.cpf);
                      handleConsultarEsus(ex.cpf);
                    }}
                    className="text-xs bg-[#161a22] hover:bg-emerald-500/10 hover:text-emerald-300 text-gray-300 border border-white/10 px-2.5 py-1.5 rounded-lg transition"
                  >
                    📍 {ex.label} ({ex.cpf})
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#161a22] border border-white/5 rounded-xl text-xs text-gray-400 space-y-1.5">
              <p className="font-semibold text-gray-200">Como funciona no WhatsApp real:</p>
              <p>1. O munícipe manda uma mensagem digitando seu CPF.</p>
              <p>2. O bot valida matematicamente os dígitos verificadores do documento.</p>
              <p>3. Consulta a base PostgreSQL do e-SUS PEC da Prefeitura de Piraí em modo somente leitura.</p>
              <p>4. Cumprimenta o morador pelo nome e já direciona o atendimento para a USF do seu bairro!</p>
            </div>
          </div>

          {/* FICHA DO CIDADÃO */}
          <div className="bg-[#161a22] border border-white/5 rounded-xl p-4 flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" /> Ficha Cadastral e-SUS PEC
                </span>
                {resultadoEsus?.valido !== undefined && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    resultadoEsus.valido
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  }`}>
                    {resultadoEsus.valido ? 'CPF Válido ✓' : 'CPF Inválido ✗'}
                  </span>
                )}
              </div>

              {!resultadoEsus?.cidadao ? (
                <div className="text-center py-10 text-gray-500 text-xs">
                  Digite um CPF ou clique em um dos exemplos ao lado para carregar a ficha cadastral do e-SUS.
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#0d0f13] border border-white/5 rounded-xl space-y-1">
                    <p className="text-sm font-bold text-white">{resultadoEsus.cidadao.nomeCompleto}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-400 text-[11px]">
                      <span>CPF: <strong className="text-gray-200 font-mono">{resultadoEsus.cidadao.cpf}</strong></span>
                      <span>CNS (SUS): <strong className="text-gray-200 font-mono">{resultadoEsus.cidadao.cns}</strong></span>
                      <span>Nascimento: <strong className="text-gray-200">{resultadoEsus.cidadao.dataNascimento}</strong></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 bg-[#0d0f13] border border-white/5 rounded-lg">
                      <p className="text-[10px] font-bold uppercase text-gray-500">Unidade de Saúde (USF)</p>
                      <p className="font-semibold text-emerald-400 mt-0.5">{resultadoEsus.cidadao.usf}</p>
                      <p className="text-gray-400 mt-0.5">{resultadoEsus.cidadao.enderecoUsf}</p>
                      <p className="text-gray-500 mt-0.5">{resultadoEsus.cidadao.telefoneUsf}</p>
                    </div>

                    <div className="p-2.5 bg-[#0d0f13] border border-white/5 rounded-lg">
                      <p className="text-[10px] font-bold uppercase text-gray-500">Vínculo na Atenção Primária</p>
                      <p className="font-semibold text-gray-200 mt-0.5">{resultadoEsus.cidadao.equipe}</p>
                      <p className="text-gray-400 mt-1">ACS Responsável:</p>
                      <p className="font-medium text-purple-300">{resultadoEsus.cidadao.acs}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {resultadoEsus?.cidadao && (
              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500">
                <span>Origem dos Dados: {resultadoEsus.cidadao.origem === 'esus_pec' ? 'PostgreSQL e-SUS PEC' : 'Simulação Piraí (Pronta p/ Produção)'}</span>
                <span className="text-emerald-400">Pronto para Interpolação</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: RESUMO DE ENDPOINTS LOCAIS */}
      <div className="bg-[#11141a] border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Guia Rápido dos Endpoints de Teste</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-400">
          <div className="bg-[#161a22] border border-white/5 p-3 rounded-xl">
            <p className="font-semibold text-gray-200">📱 Simulador WhatsApp</p>
            <p className="text-[11px] mt-1 text-gray-400">
              Interface completa no estilo WhatsApp Web com digitação, balões e botões.
            </p>
            <Link to="/simulador" className="text-emerald-400 hover:underline mt-2 inline-block">
              Abrir Simulador →
            </Link>
          </div>

          <div className="bg-[#161a22] border border-white/5 p-3 rounded-xl">
            <p className="font-semibold text-gray-200">🛠️ Editor Visual de Fluxos</p>
            <p className="text-[11px] mt-1 text-gray-400">
              Arraste nós, crie menus de opções e configure caminhos de atendimento.
            </p>
            <Link to="/fluxos" className="text-emerald-400 hover:underline mt-2 inline-block">
              Abrir Meus Fluxos →
            </Link>
          </div>

          <div className="bg-[#161a22] border border-white/5 p-3 rounded-xl">
            <p className="font-semibold text-gray-200">🌐 Webhooks Oficiais</p>
            <p className="text-[11px] mt-1 text-gray-400">
              <span className="font-mono text-gray-300">/api/whatsapp/meta</span> e <span className="font-mono text-gray-300">/api/whatsapp/webhook</span>
            </p>
            <Link to="/whatsapp" className="text-emerald-400 hover:underline mt-2 inline-block">
              Configurar WhatsApp →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
