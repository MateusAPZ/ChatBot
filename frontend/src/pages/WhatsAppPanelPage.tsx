import React, { useEffect, useState } from 'react';
import {
  BadgeCheck, Cloud, PlugZap, Send, Copy, Eye, X, Loader2, Smartphone, MonitorPlay
} from 'lucide-react';
import { apiService } from '../api/client';
import { PainelWhatsAppDados, MensagemHistorico } from '../types';
import { useToast } from '../context/ToastContext';

export const WhatsAppPanelPage: React.FC = () => {
  const [painel, setPainel] = useState<PainelWhatsAppDados | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [fluxoSelecionado, setFluxoSelecionado] = useState<number | ''>('');
  const [publicandoFluxo, setPublicandoFluxo] = useState(false);

  // Formulário de teste
  const [telefoneTeste, setTelefoneTeste] = useState('');
  const [mensagemTeste, setMensagemTeste] = useState('Teste de conexão do chatbot ✅');
  const [enviandoTeste, setEnviandoTeste] = useState(false);

  // Modal de histórico
  const [modalAberto, setModalAberto] = useState(false);
  const [historicoCarregando, setHistoricoCarregando] = useState(false);
  const [dadosHistorico, setDadosHistorico] = useState<{
    protocolo: string;
    telefone: string;
    contato: string | null;
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

  useEffect(() => {
    carregarPainel();
  }, []);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* COLUNA ESQUERDA: PASSO A PASSO DE CONFIGURAÇÃO */}
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

                      <span
                        className={`shrink-0 text-[10px] px-2 py-1 rounded-md ${
                          conversa.finalizada
                            ? 'bg-white/5 text-gray-500'
                            : 'bg-emerald-500/10 text-emerald-300'
                        }`}
                      >
                        {conversa.finalizada ? 'encerrada' : 'ativa'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleAbrirHistorico(conversa.id)}
                        className="shrink-0 p-1.5 rounded-md text-gray-600 hover:text-gray-200 hover:bg-white/5 transition"
                        title="Ver histórico"
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

      {/* MODAL DE HISTÓRICO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#11141a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            <div className="h-14 shrink-0 px-5 flex items-center justify-between border-b border-white/5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {dadosHistorico?.contato || dadosHistorico?.telefone || 'Histórico'}
                </p>
                <p className="text-[11px] text-gray-500 truncate">
                  Protocolo {dadosHistorico?.protocolo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="text-gray-600 hover:text-gray-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2 chat-wallpaper">
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
                        } text-sm px-3.5 py-2 max-w-[75%]`}
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
          </div>
        </div>
      )}
    </div>
  );
};
