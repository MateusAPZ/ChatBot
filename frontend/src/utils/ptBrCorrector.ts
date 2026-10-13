/**
 * Corretor Ortográfico e Assistente de Texto PT-BR
 * Desenvolvido para o PET-Saúde / WhatsApp Chatbot Studio
 * 
 * Recursos:
 * - Acentuação gráfica em conformidade com o Acordo Ortográfico da Língua Portuguesa
 * - Dicionário de termos comuns de atendimento municipal e saúde pública (SUS, USF, UBS, e-SUS)
 * - Correção de erros ortográficos frequentes e digitação
 * - Ajuste de pontuação, espaçamento duplo e maiúsculas após pontuação
 * - Preservação de tags especiais: [ATENDENTE], {{protocolo}}, {{nome}}, emojis e markdown (*negrito*, _itálico_)
 */

export interface SugestaoCorrecao {
  original: string;
  corrigido: string;
  motivo: string;
  tipo: 'acento' | 'ortografia' | 'pontuacao' | 'sigla';
}

export interface ResultadoAnalise {
  textoOriginal: string;
  textoCorrigido: string;
  temCorrecoes: boolean;
  totalSugestoes: number;
  sugestoes: SugestaoCorrecao[];
}

/**
 * Mapeamento de termos sem acento -> com acento (em minúsculas)
 */
const DICIONARIO_ACENTOS: Record<string, string> = {
  // Proparoxítonas e acentuação fundamental
  saude: 'saúde',
  saudes: 'saúdes',
  medico: 'médico',
  medicos: 'médicos',
  medica: 'médica',
  medicas: 'médicas',
  duvida: 'dúvida',
  duvidas: 'dúvidas',
  numero: 'número',
  numeros: 'números',
  horario: 'horário',
  horarios: 'horários',
  remedio: 'remédio',
  remedios: 'remédios',
  farmacia: 'farmácia',
  farmacias: 'farmácias',
  clinica: 'clínica',
  clinicas: 'clínicas',
  urgencia: 'urgência',
  urgencias: 'urgências',
  emergencia: 'emergência',
  emergencias: 'emergências',
  consultorio: 'consultório',
  consultorios: 'consultórios',
  endereco: 'endereço',
  enderecos: 'endereços',
  cidadao: 'cidadão',
  cidadaos: 'cidadãos',
  municipio: 'município',
  municipios: 'municípios',
  familia: 'família',
  familias: 'famílias',
  basico: 'básico',
  basica: 'básica',
  basicos: 'básicos',
  basicas: 'básicas',
  publico: 'público',
  publica: 'pública',
  publicos: 'públicos',
  publicas: 'públicas',
  previo: 'prévio',
  previa: 'prévia',
  previos: 'prévios',
  previas: 'prévias',
  rapido: 'rápido',
  rapida: 'rápida',
  rapidos: 'rápidos',
  rapidas: 'rápidas',
  facil: 'fácil',
  faceis: 'fáceis',
  dificil: 'difícil',
  dificeis: 'difíceis',
  otimo: 'ótimo',
  otima: 'ótima',
  otimos: 'ótimos',
  otimas: 'ótimas',
  pesquisa: 'pesquisa',
  necessario: 'necessário',
  necessaria: 'necessária',
  necessarios: 'necessários',
  necessarias: 'necessárias',
  diabetico: 'diabético',
  diabeticos: 'diabéticos',
  cronico: 'crônico',
  cronica: 'crônica',
  cronicos: 'crônicos',
  cronicas: 'crônicas',

  // Oxítonas e Monossílabos
  voce: 'você',
  voces: 'vocês',
  ate: 'até',
  ja: 'já',
  esta: 'está',
  estao: 'estão',
  estara: 'estará',
  estarao: 'estarão',
  tambem: 'também',
  so: 'só',
  ola: 'olá',
  apos: 'após',
  sera: 'será',
  serao: 'serão',
  tres: 'três',
  alem: 'além',
  porem: 'porém',
  ninguem: 'ninguém',
  alguem: 'alguém',
  parabens: 'parabéns',

  // Palavras com til (~), ç e acentos nas terminações -ção e -ções
  nao: 'não',
  atencao: 'atenção',
  atencoes: 'atenções',
  opcao: 'opção',
  opcoes: 'opções',
  informacao: 'informação',
  informacoes: 'informações',
  orientacao: 'orientação',
  orientacoes: 'orientações',
  avaliacao: 'avaliação',
  avaliacoes: 'avaliações',
  confirmacao: 'confirmação',
  confirmacoes: 'confirmações',
  solicitacao: 'solicitação',
  solicitacoes: 'solicitações',
  notificacao: 'notificação',
  notificacoes: 'notificações',
  situacao: 'situação',
  situacoes: 'situações',
  vacinacao: 'vacinação',
  vacinacoes: 'vacinações',
  comunicacao: 'comunicação',
  comunicacoes: 'comunicações',
  satisfacao: 'satisfação',
  satisfacoes: 'satisfações',
  solucao: 'solução',
  solucoes: 'soluções',
  funcao: 'função',
  funcoes: 'funções',
  direcao: 'direção',
  direcoes: 'direções',
  secao: 'seção',
  secoes: 'seções',
  prescricao: 'prescrição',
  prescricoes: 'prescrições',
  inscricao: 'inscrição',
  inscricoes: 'inscrições',
  pontuacao: 'pontuação',
  pontuacoes: 'pontuações',
  conclusao: 'conclusão',
  conclusoes: 'conclusões',
  pressao: 'pressão',
  hipertensao: 'hipertensão',

  // Verbos e particípios com hiatos ou acentos
  concluido: 'concluído',
  concluida: 'concluída',
  concluidos: 'concluídos',
  concluidas: 'concluídas',
  saida: 'saída',
  saidas: 'saídas',
  envio: 'envio',
  distribuicao: 'distribuição',
  atribuicao: 'atribuição',
  recepcao: 'recepção',
  recepcoes: 'recepções',

  // Outras frequentes
  proximo: 'próximo',
  proxima: 'próxima',
  proximos: 'próximos',
  proximas: 'próximas',
  inicio: 'início',
  inicios: 'inícios',
  modulo: 'módulo',
  modulos: 'módulos',
  usuario: 'usuário',
  usuarios: 'usuários',
  unitaria: 'unitária',
  servico: 'serviço',
  servicos: 'serviços',
  acoes: 'ações',
  acao: 'ação'
};

/**
 * Erros ortográficos e de digitação comuns -> correção
 */
const ERROS_ORTOGRAFICOS: Record<string, string> = {
  // Erros comuns de digitação em atendimento e saúde
  atendete: 'atendente',
  atendetes: 'atendentes',
  antendente: 'atendente',
  antendentes: 'atendentes',
  pesquiza: 'pesquisa',
  peskisa: 'pesquisa',
  pesquizas: 'pesquisas',
  cadatro: 'cadastro',
  cadatros: 'cadastros',
  cadasatro: 'cadastro',
  enfermagen: 'enfermagem',
  enfermeiroa: 'enfermeiro(a)',
  concerteza: 'com certeza',
  comcerteza: 'com certeza',
  derrepente: 'de repente',
  excessao: 'exceção',
  excecao: 'exceção',
  recepsao: 'recepção',
  recepcionisa: 'recepcionista',
  exelente: 'excelente',
  beneficiente: 'beneficente',
  reinvindicar: 'reivindicar',
  paralizar: 'paralisar',
  paralizacao: 'paralisação',
  nescessario: 'necessário',
  nescessaria: 'necessária',
  necesario: 'necessário',
  necesaria: 'necessária',
  porfavor: 'por favor',
  obg: 'obrigado(a)',
  vc: 'você',
  vcs: 'vocês',
  tbm: 'também',
  tb: 'também',
  pq: 'porque',
  pqe: 'porque',
  blz: 'tudo bem',
  pfv: 'por favor',
  pff: 'por favor',
  cmg: 'comigo',
  ctz: 'com certeza',
  hj: 'hoje',
  amanha: 'amanhã',
  dps: 'depois',
  qdo: 'quando',
  oq: 'o que'
};

/**
 * Siglas da Saúde Pública que devem ficar em CAIXA ALTA
 */
const SIGLAS_SAUDE: Record<string, string> = {
  sus: 'SUS',
  esus: 'e-SUS',
  'e-sus': 'e-SUS',
  usf: 'USF',
  usfs: 'USFs',
  ubs: 'UBS',
  ubss: 'UBSs',
  acs: 'ACS',
  psf: 'PSF',
  pec: 'PEC',
  cpf: 'CPF',
  cpfs: 'CPFs',
  cns: 'CNS',
  rg: 'RG',
  cnes: 'CNES',
  upa: 'UPA',
  upas: 'UPAs',
  samu: 'SAMU',
  sms: 'SMS',
  pet: 'PET',
  'pet-saude': 'PET-Saúde',
  'petsaude': 'PET-Saúde',
  pirai: 'Piraí'
};

/**
 * Preserva o padrão de maiúsculas da palavra original
 */
function aplicarPadraoMaiusculas(original: string, substituta: string): string {
  if (original === original.toUpperCase() && original.length > 1) {
    return substituta.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase()) {
    return substituta.charAt(0).toUpperCase() + substituta.slice(1);
  }
  return substituta.toLowerCase();
}

/**
 * Limpa caracteres de pontuação ao redor de uma palavra mantendo os símbolos intactos
 */
function extrairPalavra(token: string): { prefixo: string; palavra: string; sufixo: string } {
  const match = token.match(/^([^a-zA-Z0-9áàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]*)(.*?)([^a-zA-Z0-9áàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]*)$/);
  if (!match) return { prefixo: '', palavra: token, sufixo: '' };
  return {
    prefixo: match[1] || '',
    palavra: match[2] || '',
    sufixo: match[3] || ''
  };
}

/**
 * Analisa e corrige um texto em Português do Brasil (PT-BR)
 */
export function analisarEcorrigirTexto(texto: string): ResultadoAnalise {
  if (!texto || !texto.trim()) {
    return {
      textoOriginal: texto,
      textoCorrigido: texto,
      temCorrecoes: false,
      totalSugestoes: 0,
      sugestoes: []
    };
  }

  const sugestoes: SugestaoCorrecao[] = [];
  const linhas = texto.split('\n');

  const linhasCorrigidas = linhas.map(linha => {
    // Se a linha for uma tag técnica intacta, preserva
    if (/^\s*\[(ATENDENTE|PAUSAR)\]\s*$/i.test(linha)) return linha;

    // Divide linha preservando espaços
    const partes = linha.split(/(\s+)/);

    const partesCorrigidas = partes.map(parte => {
      // Espaços preservados
      if (/^\s+$/.test(parte)) return parte;

      // Não alterar variáveis técnicas como {{protocolo}} ou {{nome}}
      if (/\{\{[^}]+\}\}/.test(parte) || /\[[A-Z0-9_-]+\]/i.test(parte)) {
        return parte;
      }

      // Não alterar URLs
      if (/^https?:\/\//i.test(parte)) return parte;

      const { prefixo, palavra, sufixo } = extrairPalavra(parte);
      if (!palavra) return parte;

      const palavraLower = palavra.toLowerCase();

      // 1. Sigla de Saúde Pública
      if (SIGLAS_SAUDE[palavraLower]) {
        const siglaCorreta = SIGLAS_SAUDE[palavraLower];
        if (palavra !== siglaCorreta) {
          sugestoes.push({
            original: palavra,
            corrigido: siglaCorreta,
            motivo: 'Padronização de sigla oficial da Saúde pública',
            tipo: 'sigla'
          });
          return `${prefixo}${siglaCorreta}${sufixo}`;
        }
        return parte;
      }

      // 2. Erro ortográfico ou abreviação
      if (ERROS_ORTOGRAFICOS[palavraLower]) {
        const correcao = ERROS_ORTOGRAFICOS[palavraLower];
        const corrigidaFormatada = aplicarPadraoMaiusculas(palavra, correcao);
        if (palavra !== corrigidaFormatada) {
          sugestoes.push({
            original: palavra,
            corrigido: corrigidaFormatada,
            motivo: 'Correção ortográfica PT-BR',
            tipo: 'ortografia'
          });
          return `${prefixo}${corrigidaFormatada}${sufixo}`;
        }
        return parte;
      }

      // 3. Acentuação gráfica
      if (DICIONARIO_ACENTOS[palavraLower]) {
        const correcao = DICIONARIO_ACENTOS[palavraLower];
        const corrigidaFormatada = aplicarPadraoMaiusculas(palavra, correcao);
        if (palavra !== corrigidaFormatada) {
          sugestoes.push({
            original: palavra,
            corrigido: corrigidaFormatada,
            motivo: 'Acentuação gráfica obrigatória',
            tipo: 'acento'
          });
          return `${prefixo}${corrigidaFormatada}${sufixo}`;
        }
        return parte;
      }

      return parte;
    });

    let linhaReconstituida = partesCorrigidas.join('');

    // Ajustes de pontuação e espaçamento na linha (sem quebrar tags ou markdown)
    // a) Espaço antes de vírgula ou ponto: "palavra , teste" -> "palavra, teste"
    const semEspacoAntesPontuacao = linhaReconstituida.replace(/(\w)\s+([,.:;!?])/g, '$1$2');
    if (semEspacoAntesPontuacao !== linhaReconstituida) {
      linhaReconstituida = semEspacoAntesPontuacao;
    }

    // b) Falta de espaço após vírgula: "palavra,outro" -> "palavra, outro" (ignora números como 1,5)
    const espacoAposVirgula = linhaReconstituida.replace(/([a-zA-ZáàâãéèêíóôõúçÁÀÂÃÉÈÊÍÓÔÕÚÇ]),([a-zA-ZáàâãéèêíóôõúçÁÀÂÃÉÈÊÍÓÔÕÚÇ])/g, '$1, $2');
    if (espacoAposVirgula !== linhaReconstituida) {
      linhaReconstituida = espacoAposVirgula;
    }

    return linhaReconstituida;
  });

  const textoFinal = linhasCorrigidas.join('\n');

  // Elimina sugestões duplicadas para visualização limpa
  const sugestoesUnicas: SugestaoCorrecao[] = [];
  const vistas = new Set<string>();

  for (const s of sugestoes) {
    const chave = `${s.original.toLowerCase()}->${s.corrigido.toLowerCase()}`;
    if (!vistas.has(chave)) {
      vistas.add(chave);
      sugestoesUnicas.push(s);
    }
  }

  return {
    textoOriginal: texto,
    textoCorrigido: textoFinal,
    temCorrecoes: sugestoesUnicas.length > 0 || textoFinal !== texto,
    totalSugestoes: sugestoesUnicas.length,
    sugestoes: sugestoesUnicas
  };
}

/**
 * Função utilitária rápida para aplicar correções
 */
export function corrigirTextoPTBR(texto: string): string {
  return analisarEcorrigirTexto(texto).textoCorrigido;
}
