import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import pino from 'pino';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket
} from '@whiskeysockets/baileys';
import { chatbotService } from './ChatbotService';

export type StatusConexaoWhatsApp =
  | 'desconectado'
  | 'gerando_qrcode'
  | 'aguardando_qrcode'
  | 'conectando'
  | 'conectado';

export interface InfoStatusBaileys {
  status: StatusConexaoWhatsApp;
  qrCodeDataUrl: string | null;
  numeroConectado: string | null;
  nomePerfil: string | null;
  ultimaAtualizacao: string;
  mensagemStatus: string;
}

function extrairTextoMensagem(msg: any): string {
  if (!msg || !msg.message) return '';

  let m = msg.message;
  // Desembrulha camadas de mensagens especiais comuns no WhatsApp (desaparecimento, visualização única, etc)
  if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
  if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message;
  if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
  if (m.documentWithCaptionMessage?.message) m = m.documentWithCaptionMessage.message;

  const texto =
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.templateButtonReplyMessage?.selectedId ||
    m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
    '';

  return (texto || '').trim();
}

export class BaileysWhatsAppService {
  private socket: WASocket | null = null;
  private status: StatusConexaoWhatsApp = 'desconectado';
  private qrCodeDataUrl: string | null = null;
  private numeroConectado: string | null = null;
  private nomePerfil: string | null = null;
  private mensagemStatus: string = 'Aguardando inicialização da conexão.';
  private authDir: string;
  private inicializando = false;

  constructor() {
    this.authDir = path.join(__dirname, '../../auth_baileys');
  }

  get estaConectado(): boolean {
    return this.status === 'conectado' && !!this.socket;
  }

  obterStatus(): InfoStatusBaileys {
    return {
      status: this.status,
      qrCodeDataUrl: this.qrCodeDataUrl,
      numeroConectado: this.numeroConectado,
      nomePerfil: this.nomePerfil,
      ultimaAtualizacao: new Date().toISOString(),
      mensagemStatus: this.mensagemStatus
    };
  }

  async autoConectarSeCredenciaisExistirem(): Promise<void> {
    const credsPath = path.join(this.authDir, 'creds.json');
    if (fs.existsSync(credsPath) && !this.estaConectado && !this.inicializando) {
      console.log('🔄 [WhatsApp Baileys] Credenciais salvas encontradas em auth_baileys. Conectando automaticamente...');
      try {
        await this.iniciarConexao();
      } catch (e: any) {
        console.warn('Aviso ao auto-conectar Baileys:', e.message);
      }
    }
  }

  async iniciarConexao(): Promise<InfoStatusBaileys> {
    if (this.estaConectado) {
      return this.obterStatus();
    }

    if (this.inicializando) {
      return this.obterStatus();
    }

    // Se houver um socket prévio, limpa os ouvintes e encerra com segurança
    if (this.socket) {
      try {
        this.socket.ev.removeAllListeners('connection.update');
        this.socket.ev.removeAllListeners('creds.update');
        this.socket.ev.removeAllListeners('messages.upsert');
        this.socket.end(undefined);
      } catch (e) {
        // Ignora erros ao encerrar socket anterior
      }
      this.socket = null;
    }

    this.inicializando = true;
    this.status = 'gerando_qrcode';
    this.mensagemStatus = 'Preparando sessão segura e verificando credenciais...';

    try {
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      const { version } = await fetchLatestBaileysVersion();

      const logger = pino({ level: 'silent' });

      this.socket = makeWASocket({
        version,
        auth: state,
        logger,
        printQRInTerminal: false,
        browser: ['PET-Saude Pirai', 'Chrome', '1.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000
      });

      this.socket.ev.on('creds.update', saveCreds);

      this.socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr, {
              width: 320,
              margin: 2,
              color: {
                dark: '#0d0f13',
                light: '#ffffff'
              }
            });
            this.status = 'aguardando_qrcode';
            this.mensagemStatus = 'QR Code gerado! Aponte a câmera do WhatsApp para conectar.';
            console.log('📱 [WhatsApp QR Code] Novo QR Code gerado para leitura no painel.');
          } catch (err: any) {
            console.error('Erro ao converter QR code em DataURL:', err);
          }
        }

        if (connection === 'connecting') {
          this.status = 'conectando';
          this.mensagemStatus = 'Conectando ao WhatsApp...';
        }

        if (connection === 'open') {
          this.status = 'conectado';
          this.qrCodeDataUrl = null;
          const userJid = this.socket?.user?.id || '';
          this.numeroConectado = userJid.split(':')[0] || userJid.replace('@s.whatsapp.net', '');
          this.nomePerfil = this.socket?.user?.name || 'WhatsApp Piraí';
          this.mensagemStatus = `Conectado com sucesso ao número ${this.numeroConectado}!`;
          this.inicializando = false;
          console.log(`✅ [WhatsApp Conectado] Sessão ativa no número ${this.numeroConectado}`);
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const deveReconectar = statusCode !== DisconnectReason.loggedOut;

          this.inicializando = false;
          console.log(`⚠️ [WhatsApp Desconectado] Código: ${statusCode}, Deve reconectar: ${deveReconectar}`);

          if (statusCode === DisconnectReason.loggedOut) {
            this.status = 'desconectado';
            this.qrCodeDataUrl = null;
            this.numeroConectado = null;
            this.mensagemStatus = 'Aparelho desconectado pelo WhatsApp. Gere um novo QR Code.';
            this.limparPastaSessao();
          } else if (deveReconectar) {
            this.status = 'conectando';
            this.mensagemStatus = 'Tentando restabelecer conexão...';
            setTimeout(() => {
              if (!this.estaConectado) {
                this.iniciarConexao();
              }
            }, 3000);
          } else {
            this.status = 'desconectado';
            this.mensagemStatus = 'Conexão encerrada.';
          }
        }
      });

      // Escuta mensagens recebidas dos cidadãos (tanto 'notify' quanto 'append')
      this.socket.ev.on('messages.upsert', async ({ messages, type }) => {
        console.log(`🔔 [WhatsApp Evento] messages.upsert recebido. Tipo: "${type}", Total msgs: ${messages?.length || 0}`);

        for (const msg of messages) {
          if (!msg.key) continue;
          const remoteJid = msg.key.remoteJid || '';
          const fromMe = !!msg.key.fromMe;
          const msgKeys = Object.keys(msg.message || {});

          // Log detalhado para diagnóstico
          console.log(`📨 [Msg Diagnóstico] fromMe: ${fromMe} | JID: ${remoteJid} | Conteúdo: [${msgKeys.join(', ')}]`);

          // 1. Ignora grupos (@g.us) e atualizações de status/stories (@broadcast)
          if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid.includes('@broadcast') || remoteJid === 'status@broadcast') {
            continue;
          }

          // 2. Mensagens originadas do próprio aparelho (fromMe: true)
          // Registra no histórico como resposta do atendente humano (sem responder a si mesmo)
          if (fromMe) {
            const textoEnviado = extrairTextoMensagem(msg);
            if (textoEnviado) {
              console.log(`👨‍💻 [Atendente WhatsApp] Mensagem enviada pelo celular para ${remoteJid}: "${textoEnviado}"`);
              await chatbotService.registrarMensagemAtendente(remoteJid, textoEnviado);
            }
            continue;
          }

          // 3. Extrai o texto da mensagem (desempacotando ephemeral / viewOnce se necessário)
          const texto = extrairTextoMensagem(msg);
          if (!texto) {
            console.log(`⏩ [WhatsApp Ignorado] Mensagem sem texto direto de ${remoteJid} (chaves: [${msgKeys.join(', ')}])`);
            continue;
          }

          // 4. Identificador amigável para exibição no painel e histórico
          let telefoneMunicipe = remoteJid.split('@')[0];
          if (msg.key.participant) {
            telefoneMunicipe = msg.key.participant.split('@')[0];
          }

          const nomeContato = msg.pushName || 'Munícipe';
          console.log(`📩 [WhatsApp Recebido] De: ${telefoneMunicipe} (${nomeContato}) [JID: ${remoteJid}] - Mensagem: "${texto}"`);

          try {
            // Processa através do motor de fluxos visual
            const resposta = await chatbotService.processarMensagem(
              telefoneMunicipe,
              texto,
              'whatsapp',
              nomeContato,
              remoteJid
            );

            // Se a conversa estiver em atendimento humano e o bot estiver pausado:
            if (resposta.emAtendimentoHumano && resposta.mensagens.length === 0) {
              console.log(`👤 [Atendimento Humano] Robô pausado para ${telefoneMunicipe}. Mensagem registrada no histórico sem resposta automática.`);
              continue;
            }

            // Devolve cada mensagem do bot ao munícipe usando o exato remoteJid de origem (suporta @s.whatsapp.net e @lid)
            for (const msgBot of resposta.mensagens) {
              console.log(`📤 [WhatsApp Enviando] Para ${remoteJid}: "${msgBot.slice(0, 50)}..."`);
              await this.socket?.sendMessage(remoteJid, { text: msgBot });
              // Pequeno delay natural de digitação
              await new Promise((r) => setTimeout(r, 600));
            }
          } catch (err: any) {
            console.error('❌ Erro ao processar mensagem recebida no WhatsApp Baileys:', err);
          }
        }
      });

      this.inicializando = false;
      return this.obterStatus();
    } catch (err: any) {
      this.inicializando = false;
      this.status = 'desconectado';
      this.mensagemStatus = `Erro ao iniciar conexão: ${err.message}`;
      console.error('Falha geral ao iniciar Baileys:', err);
      return this.obterStatus();
    }
  }

  async desconectar(limparSessao = false): Promise<InfoStatusBaileys> {
    try {
      if (this.socket) {
        await this.socket.logout();
        this.socket.end(undefined);
        this.socket = null;
      }
    } catch (err: any) {
      console.warn('Aviso ao encerrar socket:', err.message);
    }

    if (limparSessao) {
      this.limparPastaSessao();
    }

    this.status = 'desconectado';
    this.qrCodeDataUrl = null;
    this.numeroConectado = null;
    this.mensagemStatus = 'WhatsApp desconectado com sucesso.';
    return this.obterStatus();
  }

  async enviarMensagem(telefone: string, texto: string): Promise<{ sucesso: boolean; erro?: string }> {
    if (!this.estaConectado || !this.socket) {
      return { sucesso: false, erro: 'WhatsApp não está conectado via QR Code.' };
    }

    const jid = telefone.includes('@') ? telefone : `${telefone.replace(/[^\d]/g, '')}@s.whatsapp.net`;
    try {
      await this.socket.sendMessage(jid, { text: texto });
      return { sucesso: true };
    } catch (err: any) {
      console.error('Falha ao enviar mensagem via Baileys:', err);
      return { sucesso: false, erro: err.message };
    }
  }

  private limparPastaSessao() {
    try {
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
        console.log('🧹 Pasta de autenticação do WhatsApp limpa com sucesso.');
      }
    } catch (err: any) {
      console.warn('Não foi possível remover pasta de sessão:', err.message);
    }
  }
}

export const baileysWhatsAppService = new BaileysWhatsAppService();
