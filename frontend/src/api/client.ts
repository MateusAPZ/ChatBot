import axios from 'axios';
import { Fluxo, FluxoBuilderViewModel, PainelWhatsAppDados, RespostaBot } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

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
    protocolo: string;
    telefone: string;
    contato: string | null;
    mensagens: { direcao: 'entrada' | 'saida'; conteudo: string; data: string }[];
  }> {
    const res = await api.get(`/whatsapp/conversas/${conversaId}/historico`);
    return res.data;
  },

  async encerrarConversa(conversaId: number): Promise<boolean> {
    const res = await api.post(`/whatsapp/conversas/${conversaId}/encerrar`);
    return res.data.sucesso;
  }
};
