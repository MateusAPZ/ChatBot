import React, { useEffect, useState } from 'react';
import {
  BadgeCheck, Cloud, PlugZap, Send, Copy, Eye, X, Loader2, Smartphone, MonitorPlay,
  QrCode, RefreshCw, CheckCircle2, Headphones, Bot, Pause, AlertTriangle
} from 'lucide-react';
import { apiService } from '../api/client';
import { PainelWhatsAppDados, MensagemHistorico } from '../types';
import { useToast } from '../context/ToastContext';
import { CorretorOrtografico } from '../components/CorretorOrtografico';

export const WhatsAppPanelPage: React.FC = () => {
  const [painel, setPainel] = useState<PainelWhatsAppDados | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [fluxoSelecionado, setFluxoSelecionado] = useState<number | ''>('');
  const [publicandoFluxo, setPublicandoFluxo] = useState(false);

  // Conexão Baileys QR Code (Zero Custo)
  const [tabConexao, setTabConexao] = useState<'qrcode' | 'oficial'>('qrcode');
  const [baileysStatus, setBaileysStatus] = useState<{
    status: 'desconectado' | 'gerando_qrcode' | 'aguardando_qrcode' | 'conectando' | 'conectado';
    qrCodeDataUrl: string | null;
    numeroConectado: string | null;
    nomePerfil: string | null;
    mensagemStatus: string;
  } | null>(null);
  const [acaoBaileysCarregando, setAcaoBaileysCarregando] = useState(false);

  // Formulário de teste
  const [telefoneTeste, setTelefoneTeste] = useState('');
  const [mensagemTeste, setMensagemTeste] = useState('Teste de conexão do chatbot ✅');
  const [enviandoTeste, setEnviandoTeste] = useState(false);

  // Modal de histórico & Atendimento Humano
  const [modalAberto, setModalAberto] = useState(false);
  const [conversaAtivaId, setConversaAtivaId] = useState<number | null>(null);
  const [historicoCarregando, setHistoricoCarregando] = useState(false);
  const [mensagemAtendente, setMensagemAtendente] = useState('');
  const [enviandoMensagemAtendente, setEnviandoMensagemAtendente] = useState(false);
  const [alternandoModoBot, setAlternandoModoBot] = useState(false);
  const [dadosHistorico, setDadosHistorico] = useState<{
    id?: number;
    protocolo: string;
    telefone: string;
    contato: string | null;
    emAtendimentoHumano?: boolean;
    mensagens: MensagemHistorico[];
  } | null>(null);

  const { toast } = useToast();

  const carregarPainel = async () => {
    try {
      const data = await apiService.getWhatsAppPainel();
      setPainel(data);
      if (data.fluxoPadrao) {
        setFluxoSelecionado(data.fluxoPadrao.id);
      } else if (data.fluxos.length > 0) {
        setFluxoSelecionado(data.fluxos[0].id);
      }
    } catch {
      toast('Erro ao carregar dados do WhatsApp.', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  const carregarBaileysStatus = async () => {
    try {
      const data = await apiService.getWhatsAppBaileysStatus();
      setBaileysStatus(data);
    } catch {
      // Ignora erro inicial
    }
  };

  const handleConectarBaileys = async () => {
    setAcaoBaileysCarregando(true);
    try {
      const res = await apiService.conectarWhatsAppBaileys();
      setBaileysStatus(res);
      if (res.mensagemStatus && (res.mensagemStatus.includes('Vercel') || res.mensagemStatus.includes('servidor contínuo'))) {
        toast(res.mensagemStatus, 'info');
      } else {
        toast('Iniciando conexão e gerando QR Code...', 'sucesso');
      }
    } catch {
      toast('Erro ao iniciar conexão com WhatsApp.', 'erro');
    } finally {
      setAcaoBaileysCarregando(false);
    }
  };

  const handleDesconectarBaileys = async (limpar = false) => {
    setAcaoBaileysCarregando(true);
    try {
      const res = await apiService.desconectarWhatsAppBaileys(limpar);
      setBaileysStatus(res);
      toast('WhatsApp desconectado.', 'sucesso');
    } catch {
      toast('Erro ao desconectar WhatsApp.', 'erro');
    } finally {
      setAcaoBaileysCarregando(false);
    }
  };

  useEffect(() => {
    carregarPainel();
    carregarBaileysStatus();
  }, []);

  // Polling automático enquanto estiver gerando ou aguardando QR Code
  useEffect(() => {
    if (!baileysStatus) return;
    const precisaPolling = ['gerando_qrcode', 'aguardando_qrcode', 'conectando'].includes(baileysStatus.status);
    if (!precisaPolling) return;

    const interval = setInterval(() => {
      carregarBaileysStatus();
    }, 2500);

    return () => clearInterval(interval);
  }, [baileysStatus?.status]);

  const copiarParaTransferencia = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast('Copiado para a área de transferência!', 'sucesso');
    } catch {
      toast('Não foi possível copiar.', 'erro');
    }
  };

  const handlePublicarFluxo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fluxoSelecionado) return;

    setPublicandoFluxo(true);
    try {
      await apiService.definirFluxoPadrao(Number(fluxoSelecionado));
      await carregarPainel();
      toast('Fluxo publicado para o WhatsApp com sucesso!', 'sucesso');
    } catch {
      toast('Erro ao publicar fluxo.', 'erro');
    } finally {
      setPublicandoFluxo(false);
    }
  };

  const handleEnviarTeste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telefoneTeste.trim()) {
      toast('Informe o número de destino.', 'erro');
      return;
    }

    setEnviandoTeste(true);
    try {
      const res = await apiService.enviarTesteWhatsApp(telefoneTeste.trim(), mensagemTeste.trim());
      if (res.sucesso) {
        toast(`Mensagem enviada com sucesso para ${telefoneTeste}!`, 'sucesso');
      } else {
        toast(`Falha no envio: ${res.erro || 'Erro desconhecido'}`, 'erro');
      }
    } catch {
      toast('Erro de comunicação com o servidor.', 'erro');
    } finally {
      setEnviandoTeste(false);
    }
  };

  const handleAbrirHistorico = async (conversaId: number) => {
    setConversaAtivaId(conversaId);
    setMensagemAtendente('');
    setModalAberto(true);
    setHistoricoCarregando(true);
    try {
      const res = await apiService.getWhatsAppHistorico(conversaId);
      setDadosHistorico(res);
    } catch {
      toast('Não consegui carregar o histórico.', 'erro');
      setModalAberto(false);
    } finally {
      setHistoricoCarregando(false);
    }
  };

  const handleAlternarModoAtendente = async (ligarBot: boolean) => {
    if (!conversaAtivaId) return;
    setAlternandoModoBot(true);
    try {
      // ligarBot = true -> emAtendimentoHumano = false (robô ativado)
      // ligarBot = false -> emAtendimentoHumano = true (robô pausado)
      const res = await apiService.alternarAtendimentoHumano(conversaAtivaId, !ligarBot);
      toast(ligarBot ? 'Robô reativado! Ele voltou a responder automaticamente.' : 'Robô pausado. Modo atendente humano ativado!', 'sucesso');
      setDadosHistorico(prev => prev ? { ...prev, emAtendimentoHumano: res.emAtendimentoHumano } : null);
      await carregarPainel();
    } catch {
      toast('Erro ao alterar modo de atendimento.', 'erro');
    } finally {
      setAlternandoModoBot(false);
    }
  };

  const handleEnviarMensagemAtendente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversaAtivaId || !mensagemAtendente.trim()) return;
    setEnviandoMensagemAtendente(true);
    const texto = mensagemAtendente.trim();
    try {
      const res = await apiService.responderComoAtendente(conversaAtivaId, texto);
      if (res.sucesso) {
        toast('Mensagem enviada com sucesso!', 'sucesso');
        setMensagemAtendente('');
        // Recarrega histórico atualizado
        const atualizado = await apiService.getWhatsAppHistorico(conversaAtivaId);
        setDadosHistorico(atualizado);
        await carregarPainel();
      } else {
        toast(`Erro no envio: ${res.erro || 'Falha ao entregar mensagem.'}`, 'erro');
      }
    } catch {
      toast('Erro de comunicação ao enviar mensagem.', 'erro');
    } finally {
      setEnviandoMensagemAtendente(false);
    }
  };

  if (carregando || !painel) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Conexão com o WhatsApp</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ligue o chatbot que você montou ao seu número de WhatsApp{' '}
            {painel.usaMeta ? 'pela API oficial da Meta.' : 'pela API da Twilio.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-400">
            {painel.usaMeta ? <BadgeCheck className="w-3.5 h-3.5" /> : <Cloud className="w-3.5 h-3.5" />}
            Provedor: {painel.provedor}
          </span>
          <span
            className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border ${
              painel.configurado
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                painel.configurado ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            {painel.configurado ? 'Credenciais configuradas' : 'Falta configurar as credenciais'}
          </span>
        </div>
      </div>

      {/* INDICADORES / CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#11141a] border border-white/5 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
            {painel.usaMeta ? 'Phone Number ID' : 'Número do bot'}
          </p>
          <p className="text-sm font-mono text-gray-200 mt-2 truncate">
            {painel.numeroRemetente || '—'}
          </p>
        </div>
        <div className="bg-[#11141a] border border-white/5 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Conversas no WhatsApp</p>
          <p className="text-2xl font-semibold text-white mt-1">{painel.totalConversas}</p>
        </div>
        <div className="bg-[#11141a] border border-white/5 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Em andamento</p>
          <p className="text-2xl font-semibold text-emerald-400 mt-1">{painel.conversasAtivas}</p>
        </div>
        <div className="bg-[#11141a] border border-white/5 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Mensagens trocadas</p>
          <p className="text-2xl font-semibold text-white mt-1">{painel.mensagensTrocadas}</p>
        </div>
      </div>

      {/* SELETOR DE MODO DE CONEXÃO */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          type="button"
          onClick={() => setTabConexao('qrcode')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            tabConexao === 'qrcode'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <QrCode className="w-4 h-4" /> WhatsApp Web QR Code (Zero Custo · Sem Taxas da Meta)
        </button>
        <button
          type="button"
          onClick={() => setTabConexao('oficial')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            tabConexao === 'oficial'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <PlugZap className="w-4 h-4" /> Meta Cloud API / Twilio (APIs Pagas)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {tabConexao === 'qrcode' ? (
          /* COLUNA ESQUERDA: CONEXÃO NATIVA WHATSAPP WEB QR CODE */
          <div className="bg-[#11141a] border border-white/5 rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-gray-200">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="text-sm font-semibold text-white">Conexão Direta via QR Code</h2>
                  <p className="text-[11px] text-gray-500">Zero taxas por mensagem: conecta o chip da Secretaria de Saúde de Piraí</p>
                </div>
              </div>

              <button
                type="button"
                onClick={carregarBaileysStatus}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white transition"
                title="Atualizar status"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* AVISO QUANDO HOSPEDADO NO VERCEL (SERVERLESS) */}
            {baileysStatus?.mensagemStatus?.includes('Vercel') && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  Por que o QR Code não conecta no Vercel?
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  A hospedagem no <strong>Vercel é Serverless</strong> (as funções pausam após alguns segundos sem requisições). A conexão direta por QR Code (WhatsApp Web) exige um processo Node.js rodando 24 horas por dia para manter o WebSocket ativo com o WhatsApp.
                </p>
                <div className="pt-1.5 text-[11px] text-gray-400 space-y-1.5 border-t border-white/5">
                  <p>💡 <strong>Para usar QR Code com chip normal (Custo Zero):</strong> Execute o projeto no seu computador localmente com <code>npm run dev</code> ou hospede em um servidor contínuo (Render, Railway, VPS ou servidor da Prefeitura).</p>
                  <p>⚡ <strong>Para usar na nuvem Vercel:</strong> Clique na aba ao lado <strong>Meta Cloud API / Twilio</strong>. A API oficial funciona 100% no Vercel via Webhook e oferece até 1.000 conversas gratuitas por mês pela Meta!</p>
                </div>
              </div>
            )}

            {/* STATUS DA CONEXÃO */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#161a22] border border-white/5">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${
                  baileysStatus?.status === 'conectado'
                    ? 'bg-emerald-400 animate-pulse'
                    : baileysStatus?.status === 'aguardando_qrcode'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-gray-600'
                }`} />
                <div>
                  <p className="text-xs font-semibold text-gray-200">
                    {baileysStatus?.status === 'conectado' && `Conectado: ${baileysStatus.numeroConectado}`}
                    {baileysStatus?.status === 'aguardando_qrcode' && 'Aguardando Leitura do QR Code'}
                    {baileysStatus?.status === 'gerando_qrcode' && 'Gerando QR Code Seguro...'}
                    {baileysStatus?.status === 'conectando' && 'Estabelecendo Conexão...'}
                    {(!baileysStatus || baileysStatus?.status === 'desconectado') && 'WhatsApp Desconectado'}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {baileysStatus?.mensagemStatus || 'Clique no botão abaixo para gerar o QR Code de conexão.'}
                  </p>
                </div>
              </div>

              {baileysStatus?.status === 'conectado' && (
                <button
                  type="button"
                  onClick={() => handleDesconectarBaileys(false)}
                  disabled={acaoBaileysCarregando}
                  className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition disabled:opacity-50"
                >
                  Desconectar
                </button>
              )}
            </div>

            {/* EXIBIÇÃO DO QR CODE */}
            {baileysStatus?.status === 'aguardando_qrcode' && baileysStatus.qrCodeDataUrl && (
              <div className="text-center p-4 bg-[#161a22] border border-emerald-500/20 rounded-2xl space-y-3">
                <div className="inline-block bg-white p-3 rounded-2xl shadow-xl">
                  <img
                    src={baileysStatus.qrCodeDataUrl}
                    alt="QR Code WhatsApp"
                    className="w-56 h-56 mx-auto block"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-200">Aponte o WhatsApp do celular para este QR Code</p>
                  <p className="text-[11px] text-gray-400 mt-1 max-w-sm mx-auto">
                    No WhatsApp do aparelho: Menu (3 pontinhos) &gt; Aparelhos conectados &gt; Conectar um aparelho.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConectarBaileys}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline pt-1"
                >
                  <RefreshCw className="w-3 h-3" /> Gerar novo QR Code
                </button>
              </div>
            )}

            {(!baileysStatus || baileysStatus.status === 'desconectado') && (
              <div className="text-center py-6 px-4 bg-[#161a22] border border-white/5 rounded-2xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Conectar Celular da Saúde com Custo Zero</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                    Sem taxas por mensagem e sem necessidade de cartão de crédito. As mensagens são processadas direto pelo servidor municipal de Piraí.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConectarBaileys}
                  disabled={acaoBaileysCarregando}
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0d0f13] font-semibold text-xs px-5 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/10"
                >
                  {acaoBaileysCarregando ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando QR Code...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-3.5 h-3.5" /> Gerar QR Code de Conexão
                    </>
                  )}
                </button>
              </div>
            )}

            {baileysStatus?.status === 'conectado' && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4" /> WhatsApp Ativo e Respondendo Automaticamente
                </div>
                <p className="text-[11px] text-gray-300">
                  Qualquer morador de Piraí que enviar mensagem para <strong>{baileysStatus.numeroConectado}</strong> será atendido pelo fluxo do PET-Saúde!
                </p>
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDesconectarBaileys(true)}
                    className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline"
                  >
                    Limpar sessão do aparelho
                  </button>
                </div>
              </div>
            )}

            {/* FLUXO ATIVO NA CONEXÃO QR CODE */}
            <div className="border-t border-white/5 pt-4">
              <p className="text-gray-200 font-medium text-xs mb-1">Fluxo publicado para o WhatsApp</p>
              <form onSubmit={handlePublicarFluxo} className="flex items-center gap-2 mt-2">
                <select
                  value={fluxoSelecionado}
                  onChange={(e) => setFluxoSelecionado(Number(e.target.value))}
                  className="flex-1 bg-[#161a22] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/50"
                >
                  {painel.fluxos.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.nome} {f.status ? '' : '(inativo)'}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={publicandoFluxo}
                  className="text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0d0f13] transition disabled:opacity-50"
                >
                  Publicar
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* COLUNA ESQUERDA: PASSO A PASSO META / TWILIO */
          <div className="bg-[#11141a] border border-white/5 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2 text-gray-300">
              <PlugZap className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold">Como ligar o bot no seu WhatsApp</h2>
            </div>

            <ol className="space-y-4">
              {/* Passo 1 */}
              <li className="flex gap-3">
                <span className="w-6 h-6 shrink-0 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold flex items-center justify-center text-gray-400">
                  1
                </span>
                <div className="min-w-0 text-xs text-gray-400 leading-relaxed flex-1">
                  <p className="text-gray-200 font-medium mb-1">Escolha o fluxo que atende no WhatsApp</p>
                <form onSubmit={handlePublicarFluxo} className="flex items-center gap-2 mt-2">
                  <select
                    value={fluxoSelecionado}
                    onChange={(e) => setFluxoSelecionado(Number(e.target.value))}
                    className="flex-1 bg-[#161a22] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/50"
                  >
                    {painel.fluxos.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.nome} {f.status ? '' : '(inativo)'}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={publicandoFluxo}
                    className="text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0d0f13] transition disabled:opacity-50"
                  >
                    Publicar
                  </button>
                </form>
                {!painel.fluxoPadrao ? (
                  <p className="text-amber-400/80 mt-2">Nenhum fluxo publicado — quem mandar mensagem não vai receber resposta.</p>
                ) : (
                  <p className="text-emerald-400/80 mt-2">Atendendo com: <strong>{painel.fluxoPadrao.nome}</strong></p>
                )}
              </div>
            </li>

            {/* Passo 2 */}
            <li className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold flex items-center justify-center text-gray-400">
                2
              </span>
              <div className="min-w-0 text-xs text-gray-400 leading-relaxed">
                {painel.usaMeta ? (
                  <>
                    <p className="text-gray-200 font-medium mb-1">Crie o app no Meta for Developers</p>
                    <p>
                      Em <span className="font-mono text-gray-300">developers.facebook.com</span> › <em>Meus apps</em> ›{' '}
                      <em>Criar app</em> › tipo <em>Empresa</em>, depois adicione o produto <strong>WhatsApp</strong>.
                      Na tela <em>WhatsApp › Configuração da API</em> ficam o <em>Phone Number ID</em> e o <em>Token de acesso</em>.
                    </p>
                    <p className="mt-2">Configure no arquivo <span className="font-mono text-gray-300">backend/.env</span>:</p>
                    <pre className="mt-2 bg-[#0f1218] border border-white/5 rounded-lg p-3 text-[11px] text-gray-400 overflow-x-auto">
                      <code>{`META_PHONE_NUMBER_ID="123456789012345"\nMETA_ACCESS_TOKEN="EAAG..."\nMETA_APP_SECRET="chave-secreta-do-app"`}</code>
                    </pre>
                    <p className="mt-2">Conta configurada: <span className="font-mono text-gray-300">{painel.contaMascarada}</span></p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-200 font-medium mb-1">Preencha as credenciais da Twilio</p>
                    <p>Copie o <em>Account SID</em> e o <em>Auth Token</em> do painel da Twilio e adicione no <span className="font-mono text-gray-300">backend/.env</span>:</p>
                    <pre className="mt-2 bg-[#0f1218] border border-white/5 rounded-lg p-3 text-[11px] text-gray-400 overflow-x-auto">
                      <code>{`TWILIO_ACCOUNT_SID="ACxxxxxxxx"\nTWILIO_AUTH_TOKEN="seu-auth-token"`}</code>
                    </pre>
                    <p className="mt-2">Conta atual: <span className="font-mono text-gray-300">{painel.contaMascarada}</span></p>
                  </>
                )}
              </div>
            </li>

            {/* Passo 3 */}
            <li className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold flex items-center justify-center text-gray-400">
                3
              </span>
              <div className="min-w-0 text-xs text-gray-400 leading-relaxed">
                <p className="text-gray-200 font-medium mb-1">Exponha a aplicação para a internet</p>
                <p>
                  A Meta ou Twilio precisam alcançar sua máquina local. Use o <strong>ngrok</strong> na porta{' '}
                  <span className="font-mono text-gray-300">{painel.portaLocal}</span>:
                </p>
                <pre className="mt-2 bg-[#0f1218] border border-white/5 rounded-lg p-3 text-[11px] text-gray-400 overflow-x-auto">
                  <code>ngrok http {painel.portaLocal}</code>
                </pre>
              </div>
            </li>

            {/* Passo 4 */}
            <li className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold flex items-center justify-center text-gray-400">
                4
              </span>
              <div className="min-w-0 text-xs text-gray-400 leading-relaxed">
                <p className="text-gray-200 font-medium mb-1">Cadastre o webhook</p>
                <p className="mb-2">Cole a URL de callback no painel do provedor:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={painel.urlWebhook}
                    className="flex-1 bg-[#0f1218] border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-emerald-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copiarParaTransferencia(painel.urlWebhook)}
                    className="shrink-0 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-gray-300 text-xs transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {painel.usaMeta && (
                  <>
                    <p className="mt-2 text-gray-400">Token de verificação (Verify Token):</p>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={painel.verifyToken}
                        className="flex-1 bg-[#0f1218] border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-sky-300 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => copiarParaTransferencia(painel.verifyToken)}
                        className="shrink-0 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-gray-300 text-xs transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}

                {painel.ehLocalhost && (
                  <p className="mt-2 text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    Este endereço é local. Inicie o túnel ngrok e preencha <span className="font-mono">WHATSAPP_URL_PUBLICA</span> no .env.
                  </p>
                )}
              </div>
            </li>
          </ol>
        </div>
      )}

      {/* COLUNA DIREITA: TESTE E CONVERSAS RECENTES */}
        <div className="space-y-6">
          {/* Formulário de Teste */}
          <div className="bg-[#11141a] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-gray-300 mb-4">
              <Send className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold">Enviar mensagem de teste</h2>
            </div>

            <form onSubmit={handleEnviarTeste} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 block mb-1.5">
                  Número de destino (com DDI e DDD)
                </label>
                <input
                  type="text"
                  required
                  placeholder="5524999999999"
                  value={telefoneTeste}
                  onChange={(e) => setTelefoneTeste(e.target.value)}
                  className="w-full bg-[#161a22] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 block mb-1.5">
                  Mensagem
                </label>
                <input
                  type="text"
                  value={mensagemTeste}
                  onChange={(e) => setMensagemTeste(e.target.value)}
                  className="w-full bg-[#161a22] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <button
                type="submit"
                disabled={enviandoTeste || !painel.configurado}
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-[#0d0f13] font-semibold text-sm px-4 py-2.5 rounded-lg transition"
              >
                {enviandoTeste ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar teste
              </button>

              {!painel.configurado && (
                <p className="text-[11px] text-gray-600 text-center">
                  Preencha as credenciais no .env para habilitar o envio.
                </p>
              )}
            </form>
          </div>

          {/* Conversas Recentes */}
          <div className="bg-[#11141a] border border-white/5 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 text-gray-300 p-5 pb-3">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold">Conversas recentes</h2>
            </div>

            {painel.conversas.length === 0 ? (
              <p className="text-xs text-gray-600 px-5 pb-5">
                Nenhuma conversa ainda. Assim que alguém escrever para o bot, ela aparecerá aqui.
              </p>
            ) : (
              <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
                {painel.conversas.map(conversa => {
                  const dataFormatada = new Date(conversa.dataUltimaInteracao).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                  });

                  return (
                    <div key={conversa.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition">
                      <span
                        className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${
                          conversa.canal === 'whatsapp'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-sky-500/10 text-sky-400'
                        }`}
                      >
                        {conversa.canal === 'whatsapp' ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <MonitorPlay className="w-4 h-4" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-200 truncate">
                          {conversa.nomeContato || conversa.telefone}
                          <span className="text-gray-600 font-normal"> · {conversa.fluxoNome}</span>
                        </p>
                        <p className="text-[11px] text-gray-600 truncate">
                          {conversa.protocolo} · {conversa.totalMensagens} msg · {dataFormatada}
                        </p>
                      </div>

                      {conversa.emAtendimentoHumano ? (
                        <span className="shrink-0 text-[10px] px-2 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/25 flex items-center gap-1 font-semibold">
                          <Headphones className="w-3 h-3 text-amber-400" />
                          Com atendente
                        </span>
                      ) : (
                        <span
                          className={`shrink-0 text-[10px] px-2 py-1 rounded-md ${
                            conversa.finalizada
                              ? 'bg-white/5 text-gray-500'
                              : 'bg-emerald-500/10 text-emerald-300'
                          }`}
                        >
                          {conversa.finalizada ? 'encerrada' : 'robô ativo'}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleAbrirHistorico(conversa.id)}
                        className="shrink-0 p-1.5 rounded-md text-gray-600 hover:text-gray-200 hover:bg-white/5 transition"
                        title="Ver histórico e atender"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE HISTÓRICO & ATENDIMENTO HUMANO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#11141a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* CABEÇALHO DO MODAL */}
            <div className="h-16 shrink-0 px-5 flex items-center justify-between border-b border-white/5 gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  dadosHistorico?.emAtendimentoHumano ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {dadosHistorico?.emAtendimentoHumano ? <Headphones className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate flex items-center gap-2">
                    {dadosHistorico?.contato || dadosHistorico?.telefone || 'Histórico'}
                    <span className="text-[11px] text-gray-500 font-normal">({dadosHistorico?.telefone})</span>
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    Protocolo #{dadosHistorico?.protocolo}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* BOTÃO LIGAR / PAUSAR ROBÔ */}
                {dadosHistorico?.emAtendimentoHumano ? (
                  <button
                    type="button"
                    onClick={() => handleAlternarModoAtendente(true)}
                    disabled={alternandoModoBot}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition"
                    title="Reativar respostas automáticas do bot"
                  >
                    {alternandoModoBot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                    Ligar Robô Novamente 🤖
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAlternarModoAtendente(false)}
                    disabled={alternandoModoBot}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition"
                    title="Pausar o bot para falar diretamente com o cidadão"
                  >
                    {alternandoModoBot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
                    Pausar Robô (Assumir) 👨‍💻
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="text-gray-500 hover:text-gray-200 p-1.5 rounded-lg hover:bg-white/5 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* BANNER INFORMATIVO SE ROBÔ ESTIVER PAUSADO */}
            {dadosHistorico?.emAtendimentoHumano && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-2.5 flex items-center justify-between text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Robô Pausado para este munícipe:</strong> o bot não responderá nada automaticamente.
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                  Modo Humano Ativo
                </span>
              </div>
            )}

            {/* ÁREA DE MENSAGENS */}
            <div className="flex-1 overflow-y-auto p-5 space-y-2 chat-wallpaper min-h-[300px]">
              {historicoCarregando ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                </div>
              ) : dadosHistorico && dadosHistorico.mensagens.length > 0 ? (
                dadosHistorico.mensagens.map((m, idx) => {
                  const isEntrada = m.direcao === 'entrada';
                  return (
                    <div key={idx} className={`flex ${isEntrada ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`${
                          isEntrada
                            ? 'balao-usuario bg-[#005c4b] text-gray-50'
                            : 'balao-bot bg-[#202c33] text-gray-100'
                        } text-sm px-3.5 py-2 max-w-[80%] rounded-xl shadow`}
                      >
                        <div className="leading-relaxed break-words whitespace-pre-wrap">{m.conteudo}</div>
                        <div className="text-[10px] opacity-50 text-right mt-1">{m.data}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-600 text-center py-8">Sem mensagens registradas.</p>
              )}
            </div>

            {/* BARRA DE RESPOSTA DO ATENDENTE */}
            <div className="p-3 border-t border-white/10 bg-[#161a22] space-y-2">
              {mensagemAtendente.trim().length > 0 && (
                <CorretorOrtografico
                  texto={mensagemAtendente}
                  onAplicarCorrecao={(textoCorrigido) => {
                    setMensagemAtendente(textoCorrigido);
                    toast('Texto corrigido conforme as normas da língua portuguesa! ✨', 'sucesso');
                  }}
                  compacto={false}
                />
              )}
              <form onSubmit={handleEnviarMensagemAtendente} className="flex items-center gap-2">
                <input
                  type="text"
                  spellCheck={true}
                  lang="pt-BR"
                  placeholder={dadosHistorico?.emAtendimentoHumano ? "Digite sua mensagem como atendente humano..." : "Digite aqui (ao enviar, o robô é pausado automaticamente)..."}
                  value={mensagemAtendente}
                  onChange={(e) => setMensagemAtendente(e.target.value)}
                  disabled={enviandoMensagemAtendente}
                  className="flex-1 bg-[#11141a] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="submit"
                  disabled={enviandoMensagemAtendente || !mensagemAtendente.trim()}
                  className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-[#0d0f13] text-xs font-semibold px-4 py-2.5 rounded-xl transition shrink-0"
                >
                  {enviandoMensagemAtendente ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Responder
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
