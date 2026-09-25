import { Fluxo, FluxoBuilderViewModel, NoBuilder, RespostaBot, ConversaResumo, HistoricoItem } from '../types';

let nextId = 100;

export class MemoryStore {
  fluxos: { id: number; nome: string; status: boolean; dataCriacao: string; ehPadrao: boolean }[] = [
    {
      id: 1,
      nome: 'Fluxo de Atendimento Principal',
      status: true,
      dataCriacao: new Date().toISOString(),
      ehPadrao: true
    }
  ];

  mensagens: Map<number, string> = new Map([
    [1, 'Olá! 👋 Seja bem-vindo ao Chatbot Studio.\n\nDigite *1* para Suporte\nDigite *2* para Financeiro\nDigite *3* para Encerrar'],
    [2, 'Você escolheu *Suporte* 🛠️. Em instantes um de nossos especialistas irá te responder.'],
    [3, 'Você escolheu *Financeiro* 💳. Para consultar boletos ou pagamentos, envie o CPF.'],
    [4, 'Atendimento finalizado com sucesso. Se precisar de algo mais, basta nos mandar uma mensagem! 👋']
  ]);

  nos: {
    id: number;
    fluxoId: number;
    mensagemId: number;
    titulo: string;
    ehInicio: boolean;
    posX: number;
    posY: number;
    proximoId: number | null;
  }[] = [
    { id: 1, fluxoId: 1, mensagemId: 1, titulo: 'Boas-vindas', ehInicio: true, posX: 120, posY: 160, proximoId: null },
    { id: 2, fluxoId: 1, mensagemId: 2, titulo: 'Suporte', ehInicio: false, posX: 480, posY: 100, proximoId: null },
    { id: 3, fluxoId: 1, mensagemId: 3, titulo: 'Financeiro', ehInicio: false, posX: 480, posY: 280, proximoId: null },
    { id: 4, fluxoId: 1, mensagemId: 4, titulo: 'Encerramento', ehInicio: false, posX: 480, posY: 460, proximoId: null }
  ];

  opcoes: {
    id: number;
    noId: number;
    palavraChave: string;
    destinoId: number;
  }[] = [
    { id: 1, noId: 1, palavraChave: '1', destinoId: 2 },
    { id: 2, noId: 1, palavraChave: 'suporte', destinoId: 2 },
    { id: 3, noId: 1, palavraChave: '2', destinoId: 3 },
    { id: 4, noId: 1, palavraChave: 'financeiro', destinoId: 3 },
    { id: 5, noId: 1, palavraChave: '3', destinoId: 4 },
    { id: 6, noId: 1, palavraChave: 'sair', destinoId: 4 }
  ];

  conversas: {
    id: number;
    protocolo: string;
    telefone: string;
    canal: string;
    fluxoId: number | null;
    fluxoMensagemAtualId: number | null;
    nomeContato: string | null;
    finalizada: boolean;
    dataInicio: string;
    dataUltimaInteracao: string;
  }[] = [];

  historico: {
    id: number;
    conversaId: number;
    direcao: 'entrada' | 'saida';
    conteudo: string;
    data: string;
  }[] = [];

  // Metodos de Fluxos
  listarFluxos(): Fluxo[] {
    return this.fluxos.map(f => {
      const totalPassos = this.nos.filter(n => n.fluxoId === f.id).length;
      const totalConversas = this.conversas.filter(c => c.fluxoId === f.id).length;
      return {
        ...f,
        totalPassos,
        totalConversas
      };
    });
  }

  obterFluxo(id: number): FluxoBuilderViewModel | null {
    const f = this.fluxos.find(x => x.id === id);
    if (!f) return null;

    const nosDoFluxo: NoBuilder[] = this.nos
      .filter(n => n.fluxoId === id)
      .map(n => {
        const conteudo = this.mensagens.get(n.mensagemId) || '';
        const opc = this.opcoes
          .filter(o => o.noId === n.id)
          .map(o => ({
            id: o.id,
            palavraChave: o.palavraChave,
            destinoId: o.destinoId
          }));

        return {
          id: n.id,
          titulo: n.titulo,
          conteudo,
          ehInicio: n.ehInicio,
          posX: n.posX,
          posY: n.posY,
          proximoId: n.proximoId,
          opcoes: opc
        };
      });

    return {
      id: f.id,
      nome: f.nome,
      status: f.status,
      ehPadrao: f.ehPadrao,
      nos: nosDoFluxo
    };
  }

  criarFluxo(nome: string): FluxoBuilderViewModel {
    const id = ++nextId;
    const novoFluxo = {
      id,
      nome: nome.trim(),
      status: true,
      dataCriacao: new Date().toISOString(),
      ehPadrao: false
    };
    this.fluxos.unshift(novoFluxo);

    const msgId = ++nextId;
    this.mensagens.set(msgId, 'Olá! 👋 Seja bem-vindo(a). Digite *1* para começar.');

    const noId = ++nextId;
    this.nos.push({
      id: noId,
      fluxoId: id,
      mensagemId: msgId,
      titulo: 'Boas-vindas',
      ehInicio: true,
      posX: 120,
      posY: 160,
      proximoId: null
    });

    return this.obterFluxo(id)!;
  }

  renomearFluxo(id: number, nome: string): boolean {
    const f = this.fluxos.find(x => x.id === id);
    if (!f) return false;
    f.nome = nome.trim();
    return true;
  }

  alternarStatus(id: number): boolean {
    const f = this.fluxos.find(x => x.id === id);
    if (!f) return false;
    f.status = !f.status;
    if (!f.status) f.ehPadrao = false;
    return true;
  }

  definirPadrao(id: number): boolean {
    this.fluxos.forEach(x => {
      if (x.id !== id) x.ehPadrao = false;
    });
    const f = this.fluxos.find(x => x.id === id);
    if (!f) return false;
    f.ehPadrao = true;
    f.status = true;
    return true;
  }

  excluirFluxo(id: number): boolean {
    this.fluxos = this.fluxos.filter(f => f.id !== id);
    const nosIds = this.nos.filter(n => n.fluxoId === id).map(n => n.id);
    this.nos = this.nos.filter(n => n.fluxoId !== id);
    this.opcoes = this.opcoes.filter(o => !nosIds.includes(o.noId));
    return true;
  }

  // Nós
  criarNo(fluxoId: number, conteudo: string, posX: number, posY: number, titulo?: string): number {
    const msgId = ++nextId;
    this.mensagens.set(msgId, conteudo || 'Nova mensagem');

    const ehInicio = this.nos.filter(n => n.fluxoId === fluxoId).length === 0;
    const noId = ++nextId;
    this.nos.push({
      id: noId,
      fluxoId,
      mensagemId: msgId,
      titulo: titulo || '',
      ehInicio,
      posX,
      posY,
      proximoId: null
    });
    return noId;
  }

  atualizarNo(noId: number, conteudo: string, titulo?: string): boolean {
    const no = this.nos.find(n => n.id === noId);
    if (!no) return false;
    this.mensagens.set(no.mensagemId, conteudo);
    if (titulo !== undefined) no.titulo = titulo;
    return true;
  }

  salvarPosicao(noId: number, posX: number, posY: number): boolean {
    const no = this.nos.find(n => n.id === noId);
    if (!no) return false;
    no.posX = posX;
    no.posY = posY;
    return true;
  }

  definirInicio(noId: number): boolean {
    const no = this.nos.find(n => n.id === noId);
    if (!no) return false;
    this.nos.filter(n => n.fluxoId === no.fluxoId).forEach(n => {
      n.ehInicio = n.id === noId;
    });
    return true;
  }

  conectarSequencial(origemId: number, destinoId: number | null): boolean {
    const no = this.nos.find(n => n.id === origemId);
    if (!no) return false;
    if (destinoId !== null) {
      this.opcoes = this.opcoes.filter(o => o.noId !== origemId);
    }
    no.proximoId = destinoId;
    return true;
  }

  criarOpcao(noMenuId: number, palavraChave: string, destinoId?: number | null, conteudoNovoNo?: string): boolean {
    const no = this.nos.find(n => n.id === noMenuId);
    if (!no) return false;

    let destId = destinoId;
    if (!destId) {
      destId = this.criarNo(no.fluxoId, conteudoNovoNo || `Resposta para "${palavraChave}"`, no.posX + 340, no.posY + 160);
    }
    no.proximoId = null;
    this.opcoes.push({
      id: ++nextId,
      noId: noMenuId,
      palavraChave: palavraChave.trim().toLowerCase(),
      destinoId: destId
    });
    return true;
  }

  atualizarOpcao(opcaoId: number, palavraChave: string, destinoId: number): boolean {
    const op = this.opcoes.find(o => o.id === opcaoId);
    if (!op) return false;
    op.palavraChave = palavraChave.trim().toLowerCase();
    op.destinoId = destinoId;
    return true;
  }

  excluirOpcao(opcaoId: number): boolean {
    this.opcoes = this.opcoes.filter(o => o.id !== opcaoId);
    return true;
  }

  excluirNo(noId: number): boolean {
    const no = this.nos.find(n => n.id === noId);
    if (!no) return false;
    this.nos = this.nos.filter(n => n.id !== noId);
    this.opcoes = this.opcoes.filter(o => o.noId !== noId && o.destinoId !== noId);
    this.nos.forEach(n => {
      if (n.proximoId === noId) n.proximoId = null;
    });
    return true;
  }

  // Conversas & Execução
  iniciarConversa(telefone: string, fluxoId: number, canal: string): RespostaBot {
    const noInicial = this.nos.find(n => n.fluxoId === fluxoId && n.ehInicio) || this.nos.find(n => n.fluxoId === fluxoId);
    if (!noInicial) {
      return { sucesso: false, mensagens: ['Este fluxo não possui passos cadastrados.'], opcoes: [] };
    }

    const protocolo = `${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(1000 + Math.random() * 9000)}`;

    let conv = this.conversas.find(c => c.telefone === telefone && c.canal === canal);
    if (!conv) {
      conv = {
        id: ++nextId,
        protocolo,
        telefone,
        canal,
        fluxoId,
        fluxoMensagemAtualId: noInicial.id,
        nomeContato: null,
        finalizada: false,
        dataInicio: new Date().toISOString(),
        dataUltimaInteracao: new Date().toISOString()
      };
      this.conversas.unshift(conv);
    } else {
      conv.protocolo = protocolo;
      conv.fluxoId = fluxoId;
      conv.fluxoMensagemAtualId = noInicial.id;
      conv.finalizada = false;
      conv.dataUltimaInteracao = new Date().toISOString();
    }

    return this.percorrerPassos(conv, noInicial.id);
  }

  processarMensagem(telefone: string, texto: string, canal: string): RespostaBot {
    const entrada = (texto || '').trim().toLowerCase();
    const conv = this.conversas.find(c => c.telefone === telefone && c.canal === canal);

    if (!conv || conv.finalizada || !conv.fluxoMensagemAtualId) {
      const padrao = this.fluxos.find(f => f.ehPadrao && f.status) || this.fluxos[0];
      if (!padrao) {
        return { sucesso: false, mensagens: ['Nenhum fluxo padrão ativo.'], opcoes: [] };
      }
      return this.iniciarConversa(telefone, padrao.id, canal);
    }

    // Comandos globais
    if (['sair', 'encerrar', 'finalizar'].includes(entrada)) {
      conv.finalizada = true;
      conv.dataUltimaInteracao = new Date().toISOString();
      return {
        sucesso: true,
        finalizado: true,
        protocolo: conv.protocolo,
        mensagens: ['Atendimento encerrado. Se precisar, mande uma nova mensagem que começamos de novo! 👋'],
        opcoes: []
      };
    }

    if (['menu', 'reiniciar', 'inicio', 'voltar'].includes(entrada) && conv.fluxoId) {
      return this.iniciarConversa(telefone, conv.fluxoId, canal);
    }

    // Resolver próximo
    const noAtual = this.nos.find(n => n.id === conv.fluxoMensagemAtualId);
    if (!noAtual) {
      return { sucesso: false, mensagens: ['Não foi possível encontrar o passo atual.'], opcoes: [] };
    }

    const opcoesDoNo = this.opcoes.filter(o => o.noId === noAtual.id);
    let destId: number | null = null;

    if (noAtual.proximoId && opcoesDoNo.length === 0) {
      destId = noAtual.proximoId;
    } else {
      const match = opcoesDoNo.find(o => o.palavraChave === entrada) ||
                    opcoesDoNo.find(o => o.palavraChave.length > 2 && entrada.includes(o.palavraChave));
      if (match) destId = match.destinoId;
    }

    if (!destId) {
      const chaves = opcoesDoNo.map(o => o.palavraChave);
      return {
        sucesso: false,
        entradaInvalida: true,
        protocolo: conv.protocolo,
        noAtualId: noAtual.id,
        opcoes: chaves,
        mensagens: [
          chaves.length > 0
            ? `Não entendi 🤔 Responda com uma das opções: ${chaves.join(', ')}.`
            : 'Não entendi. Digite *menu* para voltar ao início.'
        ]
      };
    }

    conv.fluxoMensagemAtualId = destId;
    conv.dataUltimaInteracao = new Date().toISOString();
    return this.percorrerPassos(conv, destId);
  }

  private percorrerPassos(conv: any, noId: number): RespostaBot {
    const mensagens: string[] = [];
    let opcoes: string[] = [];
    let finalizado = false;
    let atualId: number | null = noId;

    const visitados = new Set<number>();

    while (atualId && mensagens.length < 10) {
      if (visitados.has(atualId)) break;
      visitados.add(atualId);

      const no = this.nos.find(n => n.id === atualId);
      if (!no) break;

      const texto = this.mensagens.get(no.mensagemId);
      if (texto) mensagens.push(texto);

      const opcs = this.opcoes.filter(o => o.noId === no.id);
      if (opcs.length > 0) {
        opcoes = opcs.map(o => o.palavraChave);
        break; // Espera resposta
      }

      if (!no.proximoId) {
        finalizado = true;
        break;
      }

      atualId = no.proximoId;
    }

    conv.fluxoMensagemAtualId = atualId;
    conv.finalizada = finalizado;

    return {
      sucesso: true,
      protocolo: conv.protocolo,
      noAtualId: atualId,
      mensagens,
      opcoes,
      finalizado
    };
  }

  obterPainelWhatsApp(porta: number) {
    const conversasResumo: ConversaResumo[] = this.conversas.map(c => {
      const fluxo = this.fluxos.find(f => f.id === c.fluxoId);
      const no = this.nos.find(n => n.id === c.fluxoMensagemAtualId);
      const msg = no ? this.mensagens.get(no.mensagemId) || '—' : '—';
      return {
        id: c.id,
        protocolo: c.protocolo,
        telefone: c.telefone,
        nomeContato: c.nomeContato,
        canal: c.canal,
        fluxoNome: fluxo ? fluxo.nome : '—',
        passoAtual: msg,
        finalizada: c.finalizada,
        totalMensagens: 2,
        dataUltimaInteracao: c.dataUltimaInteracao
      };
    });

    return {
      configurado: false,
      provedor: 'Meta',
      usaMeta: true,
      numeroRemetente: '—',
      contaMascarada: '—',
      verifyToken: 'pesquisa-whats-2026',
      validacaoAssinatura: false,
      urlWebhook: `http://localhost:${porta}/api/whatsapp/meta`,
      urlStatus: `http://localhost:${porta}/api/whatsapp/status`,
      ehLocalhost: true,
      portaLocal: String(porta),
      fluxos: this.listarFluxos(),
      fluxoPadrao: this.fluxos.find(f => f.ehPadrao) || null,
      totalConversas: this.conversas.filter(c => c.canal === 'whatsapp').length,
      conversasAtivas: this.conversas.filter(c => c.canal === 'whatsapp' && !c.finalizada).length,
      mensagensTrocadas: this.historico.length,
      conversas: conversasResumo
    };
  }

  obterHistoricoConversa(conversaId: number) {
    const c = this.conversas.find(x => x.id === conversaId);
    if (!c) return null;
    const msgs = this.historico
      .filter(h => h.conversaId === conversaId)
      .map(m => {
        const d = new Date(m.data);
        const dataStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        return {
          direcao: m.direcao,
          conteudo: m.conteudo,
          data: dataStr
        };
      });
    return {
      protocolo: c.protocolo,
      telefone: c.telefone,
      contato: c.nomeContato,
      mensagens: msgs
    };
  }

  encerrarConversa(conversaId: number): boolean {
    const c = this.conversas.find(x => x.id === conversaId);
    if (!c) return false;
    c.finalizada = true;
    c.fluxoMensagemAtualId = null;
    return true;
  }
}

export const memoryStore = new MemoryStore();
