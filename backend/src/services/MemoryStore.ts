import { Fluxo, FluxoBuilderViewModel, NoBuilder, RespostaBot, ConversaResumo, HistoricoItem } from '../types';
import { esusService, DadosCidadao } from './EsusService';
import { verificarCorrespondenciaFuzzy, normalizarEntradaMunicipe } from '../utils/ptBrSpellCorrector';

let nextId = 100;

export class MemoryStore {
  fluxos: { id: number; nome: string; status: boolean; dataCriacao: string; ehPadrao: boolean }[] = [
    {
      id: 1,
      nome: 'PET-Saúde Piraí · Atendimento & Pesquisa SUS',
      status: true,
      dataCriacao: new Date().toISOString(),
      ehPadrao: true
    }
  ];

  cidadaosPorTelefone = new Map<string, DadosCidadao>();

  mensagens: Map<number, string> = new Map([
    [
      1,
      'Olá! 👋 Seja bem-vindo ao canal oficial do *PET-Saúde da Prefeitura de Piraí*.\n\nPara consultar sua Unidade de Saúde (USF) ou responder à pesquisa, escolha uma opção ou envie diretamente seu *CPF*:\n\n*1* - 📋 Pesquisa de Atendimento das USFs\n*2* - 📍 Localizar minha Unidade de Saúde\n*3* - 📞 Ouvidoria da Saúde de Piraí\n*4* - 🔍 Consultar cadastro no e-SUS PEC\n*5* - 👨‍💻 Falar com um Atendente Humano'
    ],
    [
      2,
      '📋 *Pesquisa de Satisfação da Atenção Primária (PET-Saúde Piraí)*\n\nComo você avalia o atendimento e acolhimento recebido na sua Unidade de Saúde da Família?\n\n*1* - Excelente 🌟\n*2* - Bom 👍\n*3* - Regular ⚖️\n*4* - Precisa melhorar ⚠️'
    ],
    [
      3,
      'Muito obrigado pela sua avaliação! 🙏 Sua resposta foi registrada no sistema municipal e ajuda a qualificar o atendimento do SUS em Piraí.'
    ],
    [
      4,
      '📍 *Unidades de Saúde da Família (USF) de Piraí*:\n\n• USF Centro: (24) 2411-9300\n• USF Santanésia: (24) 2411-9350\n• USF Arrozal: (24) 2411-9410\n• USF Casa Amarela: (24) 2411-9320\n• USF Varjão: (24) 2411-9380\n\nEnvie seu *CPF* a qualquer momento para localizarmos sua USF e seu Agente Comunitário de Saúde (ACS)!'
    ],
    [
      5,
      '📞 *Ouvidoria Municipal da Saúde de Piraí*\n\nTelefone direto: *(24) 2411-9328*\nHorário: Segunda a Sexta, das 08h às 17h.\n\nSeu protocolo deste atendimento é: *#{{protocolo}}*.'
    ],
    [
      6,
      '🔍 Para consultar seu cadastro no *e-SUS PEC Piraí*, por favor, digite o seu *CPF* (apenas números ou com pontos):'
    ],
    [
      7,
      '✅ *Cadastro e-SUS PEC Localizado com Sucesso!*\n\nOlá, *{{nome}}*!\n📍 **Sua Unidade:** *{{usf}}*\n👩‍⚕️ **Equipe:** *{{equipe}}*\n🩺 **Seu Agente de Saúde (ACS):** *{{acs}}*\n\nComo podemos te ajudar hoje?\n*1* - Responder Pesquisa de Atendimento\n*2* - Ver informações da sua USF\n*3* - Ouvidoria da Saúde\n*4* - Falar com Atendente Humano'
    ],
    [
      8,
      '👨‍💻 *Atendimento Humano PET-Saúde Piraí*\n\nVocê foi transferido para a nossa equipe de atendimento. O robô foi pausado nesta conversa.\n\nUm atendente responderá em breve por aqui. Aguarde um instante! ⏳\n\n_(Para reativar o robô a qualquer momento, digite *#bot* ou *menu*!)_\n\n[ATENDENTE]'
    ]
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
    { id: 1, fluxoId: 1, mensagemId: 1, titulo: 'Boas-vindas Piraí', ehInicio: true, posX: 80, posY: 180, proximoId: null },
    { id: 2, fluxoId: 1, mensagemId: 2, titulo: 'Pesquisa USF', ehInicio: false, posX: 480, posY: 80, proximoId: null },
    { id: 3, fluxoId: 1, mensagemId: 3, titulo: 'Agradecimento', ehInicio: false, posX: 880, posY: 80, proximoId: null },
    { id: 4, fluxoId: 1, mensagemId: 4, titulo: 'Localizar USFs', ehInicio: false, posX: 480, posY: 240, proximoId: null },
    { id: 5, fluxoId: 1, mensagemId: 5, titulo: 'Ouvidoria Saúde', ehInicio: false, posX: 480, posY: 390, proximoId: null },
    { id: 6, fluxoId: 1, mensagemId: 6, titulo: 'Pedir CPF e-SUS', ehInicio: false, posX: 480, posY: 540, proximoId: null },
    { id: 7, fluxoId: 1, mensagemId: 7, titulo: 'Ficha e-SUS PEC', ehInicio: false, posX: 880, posY: 540, proximoId: null },
    { id: 8, fluxoId: 1, mensagemId: 8, titulo: 'Atendente Humano', ehInicio: false, posX: 480, posY: 690, proximoId: null }
  ];

  opcoes: {
    id: number;
    noId: number;
    palavraChave: string;
    destinoId: number;
  }[] = [
    { id: 1, noId: 1, palavraChave: '1', destinoId: 2 },
    { id: 2, noId: 1, palavraChave: 'pesquisa', destinoId: 2 },
    { id: 3, noId: 1, palavraChave: '2', destinoId: 4 },
    { id: 4, noId: 1, palavraChave: 'localizar', destinoId: 4 },
    { id: 5, noId: 1, palavraChave: '3', destinoId: 5 },
    { id: 6, noId: 1, palavraChave: 'ouvidoria', destinoId: 5 },
    { id: 7, noId: 1, palavraChave: '4', destinoId: 6 },
    { id: 8, noId: 1, palavraChave: 'esus', destinoId: 6 },
    { id: 9, noId: 1, palavraChave: 'cpf', destinoId: 6 },
    { id: 21, noId: 1, palavraChave: '5', destinoId: 8 },
    { id: 22, noId: 1, palavraChave: 'atendente', destinoId: 8 },
    { id: 23, noId: 1, palavraChave: 'humano', destinoId: 8 },
    { id: 24, noId: 1, palavraChave: 'falar', destinoId: 8 },

    // Da pesquisa para o agradecimento
    { id: 10, noId: 2, palavraChave: '1', destinoId: 3 },
    { id: 11, noId: 2, palavraChave: '2', destinoId: 3 },
    { id: 12, noId: 2, palavraChave: '3', destinoId: 3 },
    { id: 13, noId: 2, palavraChave: '4', destinoId: 3 },
    { id: 14, noId: 2, palavraChave: 'excelente', destinoId: 3 },
    { id: 15, noId: 2, palavraChave: 'bom', destinoId: 3 },
    { id: 16, noId: 2, palavraChave: 'regular', destinoId: 3 },
    { id: 17, noId: 2, palavraChave: 'melhorar', destinoId: 3 },

    // Da ouvidoria para atendente
    { id: 25, noId: 5, palavraChave: 'atendente', destinoId: 8 },
    { id: 26, noId: 5, palavraChave: 'humano', destinoId: 8 },

    // Da ficha e-SUS
    { id: 18, noId: 7, palavraChave: '1', destinoId: 2 },
    { id: 19, noId: 7, palavraChave: '2', destinoId: 4 },
    { id: 20, noId: 7, palavraChave: '3', destinoId: 5 },
    { id: 27, noId: 7, palavraChave: '4', destinoId: 8 },
    { id: 28, noId: 7, palavraChave: 'atendente', destinoId: 8 }
  ];

  conversas: {
    id: number;
    protocolo: string;
    telefone: string;
    jidOriginal?: string;
    canal: string;
    fluxoId: number | null;
    fluxoMensagemAtualId: number | null;
    nomeContato: string | null;
    finalizada: boolean;
    emAtendimentoHumano: boolean;
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
  iniciarConversa(telefone: string, fluxoId: number, canal: string, nomeContato?: string, jidOriginal?: string): RespostaBot {
    const noInicial = this.nos.find(n => n.fluxoId === fluxoId && n.ehInicio) || this.nos.find(n => n.fluxoId === fluxoId);
    if (!noInicial) {
      return { sucesso: false, mensagens: ['Este fluxo não possui passos cadastrados.'], opcoes: [] };
    }

    const protocolo = `${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(1000 + Math.random() * 9000)}`;

    let conv = this.conversas.find(c => (c.telefone === telefone || (jidOriginal && c.jidOriginal === jidOriginal)) && c.canal === canal);
    if (!conv) {
      conv = {
        id: ++nextId,
        protocolo,
        telefone,
        jidOriginal: jidOriginal || telefone,
        canal,
        fluxoId,
        fluxoMensagemAtualId: noInicial.id,
        nomeContato: nomeContato || null,
        finalizada: false,
        emAtendimentoHumano: false,
        dataInicio: new Date().toISOString(),
        dataUltimaInteracao: new Date().toISOString()
      };
      this.conversas.unshift(conv);
    } else {
      conv.protocolo = protocolo;
      conv.fluxoId = fluxoId;
      conv.fluxoMensagemAtualId = noInicial.id;
      conv.finalizada = false;
      conv.emAtendimentoHumano = false;
      if (jidOriginal) conv.jidOriginal = jidOriginal;
      if (nomeContato) conv.nomeContato = nomeContato;
      conv.dataUltimaInteracao = new Date().toISOString();
    }

    return this.percorrerPassos(conv, noInicial.id);
  }

  async processarMensagem(telefone: string, texto: string, canal: string, nomeContato?: string, jidOriginal?: string): Promise<RespostaBot> {
    const entrada = (texto || '').trim().toLowerCase();
    let conv = this.conversas.find(c => (c.telefone === telefone || (jidOriginal && c.jidOriginal === jidOriginal)) && c.canal === canal);

    // Se já estiver em atendimento humano com atendente:
    if (conv && conv.emAtendimentoHumano) {
      // Se for comando explícito de reativação pelo próprio munícipe
      if (['#bot', '#reativar', '/bot', 'bot', 'ligar bot', 'reiniciar', 'menu', 'inicio'].includes(entrada)) {
        conv.emAtendimentoHumano = false;
        this.registrarHistorico(conv.id, 'entrada', texto);
        const volta = this.iniciarConversa(telefone, conv.fluxoId || 1, canal, nomeContato, jidOriginal);
        volta.mensagens = [
          '🤖 *Assistente Virtual Reativado!*\n\nO bot voltou a responder automaticamente. Digite uma das opções abaixo:',
          ...volta.mensagens
        ];
        this.registrarHistorico(conv.id, 'saida', '', volta.mensagens);
        return volta;
      }

      // Modo Atendente Humano ativo: ROBÔ FICA EM SILÊNCIO ABSOLUTO!
      // Apenas armazena no histórico para o atendente ler e responder no painel ou WhatsApp.
      this.registrarHistorico(conv.id, 'entrada', texto);
      conv.dataUltimaInteracao = new Date().toISOString();
      return {
        sucesso: true,
        mensagens: [], // Nenhuma mensagem automática enviada
        opcoes: [],
        emAtendimentoHumano: true,
        protocolo: conv.protocolo
      };
    }

    if (!conv || conv.finalizada || !conv.fluxoMensagemAtualId) {
      const padrao = this.fluxos.find(f => f.ehPadrao && f.status) || this.fluxos[0];
      if (!padrao) {
        return { sucesso: false, mensagens: ['Nenhum fluxo padrão ativo.'], opcoes: [] };
      }
      return this.iniciarConversa(telefone, padrao.id, canal, nomeContato, jidOriginal);
    }

    if (nomeContato && !conv.nomeContato) {
      conv.nomeContato = nomeContato;
    }
    if (jidOriginal && !conv.jidOriginal) {
      conv.jidOriginal = jidOriginal;
    }

    this.registrarHistorico(conv.id, 'entrada', texto);

    // Comandos globais
    if (['sair', 'encerrar', 'finalizar'].includes(entrada)) {
      conv.finalizada = true;
      conv.dataUltimaInteracao = new Date().toISOString();
      const despedida: RespostaBot = {
        sucesso: true,
        finalizado: true,
        protocolo: conv.protocolo,
        mensagens: ['Atendimento encerrado. Se precisar, mande uma nova mensagem que começamos de novo! 👋'],
        opcoes: []
      };
      this.registrarHistorico(conv.id, 'saida', '', despedida.mensagens);
      return despedida;
    }

    if (['menu', 'reiniciar', 'inicio', 'voltar'].includes(entrada) && conv.fluxoId) {
      return this.iniciarConversa(telefone, conv.fluxoId, canal, nomeContato, jidOriginal);
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
      const entradaCorrigida = normalizarEntradaMunicipe(texto);

      // 1. Busca exata e substring
      let match = opcoesDoNo.find(o => o.palavraChave === entrada || o.palavraChave === entradaCorrigida) ||
                  opcoesDoNo.find(o => o.palavraChave.length > 2 && (entrada.includes(o.palavraChave) || entradaCorrigida.includes(o.palavraChave)));

      // 2. Se não encontrou, busca com tolerância ortográfica PT-BR (Fuzzy / Levenshtein)
      if (!match) {
        match = opcoesDoNo.find(o => verificarCorrespondenciaFuzzy(texto, o.palavraChave));
      }

      if (match) destId = match.destinoId;
    }

    // Gatilho direto para atendente com tolerância ortográfica
    if (
      verificarCorrespondenciaFuzzy(texto, 'atendente') ||
      verificarCorrespondenciaFuzzy(texto, 'humano') ||
      verificarCorrespondenciaFuzzy(texto, 'suporte')
    ) {
      const opAtendente = opcoesDoNo.find(o => /atendente|humano/i.test(o.palavraChave));
      destId = opAtendente ? opAtendente.destinoId : 8;
    }

    // Verificação inteligente de CPF para e-SUS PEC Piraí
    const cpfDetectado = esusService.extrairCPF(texto);
    if (cpfDetectado) {
      const dados = await esusService.consultarCidadao(cpfDetectado);
      if (dados) {
        this.cidadaosPorTelefone.set(telefone, dados);
        conv.nomeContato = dados.nomeCompleto;
        destId = 7;
      }
    }

    if (!destId) {
      const chaves = opcoesDoNo.map(o => o.palavraChave);
      const invalida: RespostaBot = {
        sucesso: false,
        entradaInvalida: true,
        protocolo: conv.protocolo,
        noAtualId: noAtual.id,
        opcoes: chaves,
        mensagens: [
          chaves.length > 0
            ? `Não entendi 🤔 Responda com uma das opções: ${chaves.join(', ')}.`
            : 'Não entendi. Digite *menu* para voltar ao início ou *5* para atendente.'
        ]
      };
      this.registrarHistorico(conv.id, 'saida', '', invalida.mensagens);
      return invalida;
    }

    // Se o destino é o nó de Atendente Humano (nó 8), ativa a pausa automática do robô!
    if (destId === 8) {
      conv.emAtendimentoHumano = true;
    }

    conv.fluxoMensagemAtualId = destId;
    conv.dataUltimaInteracao = new Date().toISOString();
    const resposta = this.percorrerPassos(conv, destId);
    this.registrarHistorico(conv.id, 'saida', '', resposta.mensagens);
    return resposta;
  }

  private formatarVariaveis(texto: string, conv: any): string {
    const cid = this.cidadaosPorTelefone.get(conv.telefone);
    return texto
      .replace(/{{nome}}/g, cid?.nome || 'Munícipe')
      .replace(/{{nomeCompleto}}/g, cid?.nomeCompleto || 'Munícipe')
      .replace(/{{cpf}}/g, cid?.cpf || '—')
      .replace(/{{cns}}/g, cid?.cns || '—')
      .replace(/{{usf}}/g, cid?.usf || 'sua Unidade de Saúde (USF)')
      .replace(/{{acs}}/g, cid?.acs || 'seu Agente Comunitário de Saúde')
      .replace(/{{equipe}}/g, cid?.equipe || 'Equipe de Saúde da Família')
      .replace(/{{telefoneUsf}}/g, cid?.telefoneUsf || '(24) 2411-9300')
      .replace(/{{enderecoUsf}}/g, cid?.enderecoUsf || 'Piraí - RJ')
      .replace(/{{protocolo}}/g, conv.protocolo || '—');
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

      const texto = this.mensagens.get(no.mensagemId) || '';

      // Detecta se este bloco é configurado para pausar o robô para atendimento humano
      const ehPausaAtendente =
        (no.titulo && /atendente|humano|pausar|\[atendente\]|\[pausar\]/i.test(no.titulo)) ||
        (texto && /\[atendente\]|\[pausar\]|\{\{pausar\}\}|\{\{atendente\}\}/i.test(texto));

      if (texto) {
        let formatado = this.formatarVariaveis(texto, conv);
        if (ehPausaAtendente) {
          formatado = formatado
            .replace(/\[ATENDENTE\]/gi, '')
            .replace(/\[PAUSAR\]/gi, '')
            .replace(/\{\{pausar\}\}/gi, '')
            .replace(/\{\{atendente\}\}/gi, '')
            .trim();
        }
        mensagens.push(formatado);
      }

      if (ehPausaAtendente) {
        conv.emAtendimentoHumano = true;
        conv.fluxoMensagemAtualId = atualId;
        break; // Pausa o fluxo neste bloco para o atendente humano responder
      }

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
      finalizado,
      emAtendimentoHumano: conv.emAtendimentoHumano || false
    };
  }

  registrarHistorico(conversaId: number, direcao: 'entrada' | 'saida', conteudo: string, lote?: string[]) {
    if (lote && lote.length > 0) {
      for (const item of lote) {
        this.historico.push({
          id: ++nextId,
          conversaId,
          direcao,
          conteudo: item,
          data: new Date().toISOString()
        });
      }
      return;
    }

    if (conteudo) {
      this.historico.push({
        id: ++nextId,
        conversaId,
        direcao,
        conteudo,
        data: new Date().toISOString()
      });
    }
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
        emAtendimentoHumano: c.emAtendimentoHumano || false,
        totalMensagens: this.historico.filter(h => h.conversaId === c.id).length,
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
      id: c.id,
      protocolo: c.protocolo,
      telefone: c.telefone,
      jidOriginal: c.jidOriginal,
      contato: c.nomeContato,
      canal: c.canal,
      emAtendimentoHumano: c.emAtendimentoHumano || false,
      finalizada: c.finalizada,
      mensagens: msgs
    };
  }

  obterConversa(conversaId: number) {
    return this.conversas.find(x => x.id === conversaId) || null;
  }

  obterConversaPorTelefoneOuJid(telefoneOuJid: string) {
    const limpo = telefoneOuJid.split('@')[0];
    return this.conversas.find(c => c.telefone === limpo || c.jidOriginal === telefoneOuJid || c.telefone === telefoneOuJid) || null;
  }

  alternarAtendimentoHumano(conversaId: number, emAtendimentoHumano: boolean): { sucesso: boolean; conversa?: any } {
    const c = this.conversas.find(x => x.id === conversaId);
    if (!c) return { sucesso: false };
    c.emAtendimentoHumano = emAtendimentoHumano;
    c.dataUltimaInteracao = new Date().toISOString();
    return { sucesso: true, conversa: c };
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
