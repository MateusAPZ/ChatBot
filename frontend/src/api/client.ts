import axios from 'axios';
import { Fluxo, FluxoBuilderViewModel, PainelWhatsAppDados, RespostaBot, RespostaLogin, Usuario } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Anexa o token de autenticação em todas as requisições
api.interceptors.request.use((reqConfig) => {
  const token = localStorage.getItem('pet_saude_token') || sessionStorage.getItem('pet_saude_token');
  if (token) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});

// Trata expiração de sessão (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/me');
      if (!isAuthRoute && !window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('pet_saude_token');
        localStorage.removeItem('pet_saude_user');
        sessionStorage.removeItem('pet_saude_token');
        sessionStorage.removeItem('pet_saude_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Fluxos
  async getFluxos(): Promise<Fluxo[]> {
    const res = await api.get('/fluxos');
    return res.data.fluxos;
  },

  async getFluxo(id: number): Promise<FluxoBuilderViewModel> {
    const res = await api.get(`/fluxos/${id}`);
    return res.data.fluxo;
  },

  async criarFluxo(nome: string): Promise<FluxoBuilderViewModel> {
    const res = await api.post('/fluxos', { nome });
    return res.data.fluxo;
  },

  async renomearFluxo(id: number, nome: string): Promise<boolean> {
    const res = await api.put(`/fluxos/${id}/renomear`, { nome });
    return res.data.sucesso;
  },

  async alternarStatusFluxo(id: number): Promise<boolean> {
    const res = await api.post(`/fluxos/${id}/status`);
    return res.data.sucesso;
  },

  async definirFluxoPadrao(id: number): Promise<boolean> {
    const res = await api.post(`/fluxos/${id}/padrao`);
    return res.data.sucesso;
  },

  async excluirFluxo(id: number): Promise<boolean> {
    const res = await api.delete(`/fluxos/${id}`);
    return res.data.sucesso;
  },

  // Nós
  async criarNo(fluxoId: number, data: { conteudo: string; posX: number; posY: number; titulo?: string }): Promise<{ fluxo: FluxoBuilderViewModel; noId: number }> {
    const res = await api.post(`/fluxos/${fluxoId}/nos`, data);
    return { fluxo: res.data.fluxo, noId: res.data.extra?.noId };
  },

  async atualizarNo(noId: number, data: { conteudo: string; titulo?: string; fluxoId?: number }): Promise<FluxoBuilderViewModel | null> {
    const res = await api.put(`/fluxos/nos/${noId}`, data);
    return res.data.fluxo || null;
  },

  async salvarPosicao(noId: number, posX: number, posY: number): Promise<boolean> {
    const res = await api.post(`/fluxos/nos/${noId}/posicao`, { posX, posY });
    return res.data.sucesso;
  },

  async salvarPosicoes(posicoes: { noId: number; posX: number; posY: number }[]): Promise<boolean> {
    const res = await api.post('/fluxos/salvar-posicoes', posicoes);
    return res.data.sucesso;
  },

  async definirInicio(noId: number, fluxoId: number): Promise<FluxoBuilderViewModel | null> {
    const res = await api.post(`/fluxos/nos/${noId}/inicio`, { fluxoId });
    return res.data.fluxo || null;
  },

  async conectarSequencial(data: { origemId: number; destinoId: number | null; fluxoId: number }): Promise<FluxoBuilderViewModel | null> {
    const res = await api.post('/fluxos/conectar-sequencial', data);
    return res.data.fluxo || null;
  },

  async criarOpcao(noId: number, data: { palavraChave: string; destinoId?: number | string | null; conteudoNovoNo?: string; fluxoId: number }): Promise<FluxoBuilderViewModel | null> {
    const res = await api.post(`/fluxos/nos/${noId}/opcoes`, data);
    return res.data.fluxo || null;
  },

  async atualizarOpcao(opcaoId: number, data: { palavraChave: string; destinoId: number; fluxoId: number }): Promise<FluxoBuilderViewModel | null> {
    const res = await api.put(`/fluxos/opcoes/${opcaoId}`, data);
    return res.data.fluxo || null;
  },

  async excluirOpcao(opcaoId: number, fluxoId: number): Promise<FluxoBuilderViewModel | null> {
    const res = await api.delete(`/fluxos/opcoes/${opcaoId}`, { data: { fluxoId } });
    return res.data.fluxo || null;
  },

  async excluirNo(noId: number, fluxoId: number): Promise<FluxoBuilderViewModel | null> {
    const res = await api.delete(`/fluxos/nos/${noId}`, { data: { fluxoId } });
    return res.data.fluxo || null;
  },

  // Simulador
  async getSimuladorFluxos(): Promise<{ fluxos: Fluxo[]; fluxoSelecionado: number | null }> {
    const res = await api.get('/simulador/fluxos');
    return { fluxos: res.data.fluxos, fluxoSelecionado: res.data.fluxoSelecionado };
  },

  async iniciarSimulacao(telefone: string, fluxoId: number): Promise<RespostaBot> {
    const res = await api.post('/simulador/iniciar', { telefone, fluxoId });
    return res.data;
  },

  async enviarMensagemSimulada(telefone: string, texto: string): Promise<RespostaBot> {
    const res = await api.post('/simulador/mensagem', { telefone, texto });
    return res.data;
  },

  // WhatsApp
  async getWhatsAppPainel(): Promise<PainelWhatsAppDados> {
    const res = await api.get('/whatsapp/painel');
    return res.data.painel;
  },

  async enviarTesteWhatsApp(telefone: string, mensagem: string): Promise<{ sucesso: boolean; erro?: string }> {
    const res = await api.post('/whatsapp/teste', { telefone, mensagem });
    return res.data;
  },

  async getWhatsAppHistorico(conversaId: number): Promise<{
    id?: number;
    protocolo: string;
    telefone: string;
    contato: string | null;
    emAtendimentoHumano?: boolean;
    mensagens: { direcao: 'entrada' | 'saida'; conteudo: string; data: string }[];
  }> {
    const res = await api.get(`/whatsapp/conversas/${conversaId}/historico`);
    return res.data;
  },

  async alternarAtendimentoHumano(conversaId: number, emAtendimentoHumano: boolean, avisarCidadao = true): Promise<{
    sucesso: boolean;
    emAtendimentoHumano: boolean;
    mensagem?: string;
  }> {
    const res = await api.post(`/whatsapp/conversas/${conversaId}/alternar-atendimento`, {
      emAtendimentoHumano,
      avisarCidadao
    });
    return res.data;
  },

  async responderComoAtendente(conversaId: number, mensagem: string): Promise<{
    sucesso: boolean;
    erro?: string;
    mensagem?: string;
  }> {
    const res = await api.post(`/whatsapp/conversas/${conversaId}/responder-atendente`, { mensagem });
    return res.data;
  },

  async encerrarConversa(conversaId: number): Promise<boolean> {
    const res = await api.post(`/whatsapp/conversas/${conversaId}/encerrar`);
    return res.data.sucesso;
  },

  // Testes e Diagnóstico
  async getDiagnostico(): Promise<{
    sucesso: boolean;
    status: string;
    armazenamento: string;
    isDbConnected: boolean;
    totalFluxos: number;
    provedor: string;
    porta: number;
    uptimeSegundos: number;
    timestamp: string;
  }> {
    const res = await api.get('/diagnostico');
    return res.data;
  },

  async testarWebhookSimulado(payload: { telefone?: string; texto?: string; nome?: string }): Promise<any> {
    const res = await api.post('/testes/webhook-simulado', payload);
    return res.data;
  },

  // WhatsApp Web Nativo (Baileys / Zero Custo)
  async getWhatsAppBaileysStatus(): Promise<{
    sucesso: boolean;
    status: 'desconectado' | 'gerando_qrcode' | 'aguardando_qrcode' | 'conectando' | 'conectado';
    qrCodeDataUrl: string | null;
    numeroConectado: string | null;
    nomePerfil: string | null;
    ultimaAtualizacao: string;
    mensagemStatus: string;
  }> {
    const res = await api.get('/whatsapp/baileys/status');
    return res.data;
  },

  async conectarWhatsAppBaileys(): Promise<any> {
    const res = await api.post('/whatsapp/baileys/conectar');
    return res.data;
  },

  async desconectarWhatsAppBaileys(limparSessao = false): Promise<any> {
    const res = await api.post('/whatsapp/baileys/desconectar', { limparSessao });
    return res.data;
  },

  // e-SUS APS PEC (Piraí)
  async consultarEsus(termo: string): Promise<{
    sucesso: boolean;
    valido: boolean;
    cidadao: {
      nome: string;
      nomeCompleto: string;
      cpf: string;
      cns: string;
      dataNascimento: string;
      sexo: string;
      nomeMae: string;
      usf: string;
      enderecoUsf: string;
      telefoneUsf: string;
      equipe: string;
      acs: string;
      bairro: string;
      encontrado: boolean;
      origem: 'esus_pec' | 'simulacao';
    } | null;
    erro?: string;
  }> {
    const res = await api.post('/esus/consultar', { termo });
    return res.data;
  },

  async getUnidadesSaudePirai(): Promise<{ sucesso: boolean; unidades: any[] }> {
    const res = await api.get('/esus/unidades');
    return res.data;
  },

  // Autenticação & Sessão
  async login(identificador: string, senha: string): Promise<RespostaLogin> {
    const res = await api.post('/auth/login', { usuario: identificador, senha });
    return res.data;
  },

  async getMe(tokenCustomizado?: string): Promise<{ sucesso: boolean; usuario?: Usuario; erro?: string }> {
    const headers = tokenCustomizado ? { Authorization: `Bearer ${tokenCustomizado}` } : undefined;
    const res = await api.get('/auth/me', { headers });
    return res.data;
  },

  async logout(): Promise<{ sucesso: boolean }> {
    const res = await api.post('/auth/logout');
    return res.data;
  }
};
