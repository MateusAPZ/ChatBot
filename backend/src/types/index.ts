export interface Fluxo {
  id: number;
  nome: string;
  status: boolean;
  dataCriacao: string;
  ehPadrao: boolean;
  totalPassos?: number;
  totalConversas?: number;
}

export interface NoBuilder {
  id: number;
  titulo: string;
  conteudo: string;
  ehInicio: boolean;
  posX: number;
  posY: number;
  proximoId: number | null;
  opcoes: OpcaoBuilder[];
}

export interface OpcaoBuilder {
  id: number;
  palavraChave: string;
  destinoId: number | null;
}

export interface FluxoBuilderViewModel {
  id: number;
  nome: string;
  status: boolean;
  ehPadrao: boolean;
  nos: NoBuilder[];
}

export interface RespostaBot {
  sucesso: boolean;
  mensagens: string[];
  opcoes: string[];
  noAtualId?: number | null;
  protocolo?: string;
  finalizado?: boolean;
  entradaInvalida?: boolean;
}

export interface ConversaResumo {
  id: number;
  protocolo: string;
  telefone: string;
  nomeContato: string | null;
  canal: string;
  fluxoNome: string;
  passoAtual: string;
  finalizada: boolean;
  totalMensagens: number;
  dataUltimaInteracao: string;
}

export interface HistoricoItem {
  id?: number;
  direcao: 'entrada' | 'saida';
  conteudo: string;
  data: string;
}

export interface PainelWhatsAppViewModel {
  configurado: boolean;
  provedor: string;
  usaMeta: boolean;
  numeroRemetente: string;
  contaMascarada: string;
  verifyToken: string;
  validacaoAssinatura: boolean;
  urlWebhook: string;
  urlStatus: string;
  ehLocalhost: boolean;
  portaLocal: string;
  fluxos: Fluxo[];
  fluxoPadrao: Fluxo | null;
  totalConversas: number;
  conversasAtivas: number;
  mensagensTrocadas: number;
  conversas: ConversaResumo[];
}
