/**
 * Corretor Ortográfico e Correspondência Fonética/Fuzzy PT-BR
 * Desenvolvido para o PET-Saúde / WhatsApp Chatbot Studio
 */

/**
 * Remove acentos e caracteres diacríticos para comparação insensível a acentuação
 */
export function removerAcentos(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Calcula a Distância de Levenshtein entre duas strings
 */
export function distanciaLevenshtein(a: string, b: string): number {
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  const matriz: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matriz[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matriz[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const custo = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,      // deleção
        matriz[i][j - 1] + 1,      // inserção
        matriz[i - 1][j - 1] + custo // substituição
      );
    }
  }

  return matriz[s1.length][s2.length];
}

/**
 * Dicionário de sinônimos e erros de digitação comuns no atendimento de saúde
 */
const ERROS_COMUNS_ENTRADA: Record<string, string> = {
  // Atendente / Humano
  atendete: 'atendente',
  atendetes: 'atendente',
  antendente: 'atendente',
  atendende: 'atendente',
  atendi: 'atendente',
  atendimento: 'atendente',
  humano: 'atendente',
  umano: 'atendente',
  pessoa: 'atendente',
  suporte: 'atendente',
  falar: 'atendente',
  ajuda: 'atendente',

  // Pesquisa
  pesquiza: 'pesquisa',
  peskisa: 'pesquisa',
  pesquizas: 'pesquisa',
  pesquisar: 'pesquisa',
  avaliacao: 'pesquisa',
  avaliar: 'pesquisa',

  // Unidades / USF
  usfs: 'usf',
  posto: 'localizar',
  postinho: 'localizar',
  unidade: 'localizar',
  localisar: 'localizar',
  onde: 'localizar',

  // Ouvidoria
  ouvidoriaa: 'ouvidoria',
  reclamar: 'ouvidoria',
  reclamacao: 'ouvidoria',
  elogio: 'ouvidoria',
  sugestao: 'ouvidoria',

  // e-SUS
  cadatro: 'esus',
  cadasatro: 'esus',
  cadastro: 'esus',
  carteirinha: 'esus'
};

/**
 * Normaliza o texto de entrada do munícipe corrigindo erros ortográficos e removendo pontuação supérflua
 */
export function normalizarEntradaMunicipe(textoDigitado: string): string {
  if (!textoDigitado) return '';
  let limpo = removerAcentos(textoDigitado).replace(/[.,;:!?\-_~*#]/g, ' ').replace(/\s+/g, ' ').trim();

  // Se o cidadão digitou apenas um número com texto ao redor (ex: "opcao 1", "quero a 2", "1 por favor")
  const matchNumero = limpo.match(/\b([1-9])\b/);
  if (matchNumero && (limpo.startsWith('opcao') || limpo.startsWith('numero') || limpo.length <= 15)) {
    return matchNumero[1];
  }

  // Verifica se há palavra corrigível no dicionário
  const palavras = limpo.split(' ');
  for (const p of palavras) {
    if (ERROS_COMUNS_ENTRADA[p]) {
      return ERROS_COMUNS_ENTRADA[p];
    }
  }

  return limpo;
}

/**
 * Verifica se a entrada do cidadão é correspondente ou similar a uma palavra-chave
 * Tolera 1 erro para palavras médias (4-6 letras) e até 2 erros para palavras longas (>= 7 letras)
 */
export function verificarCorrespondenciaFuzzy(entradaMunicipe: string, palavraChave: string): boolean {
  const normEntrada = removerAcentos(entradaMunicipe);
  const normChave = removerAcentos(palavraChave);

  // 1. Igualdade direta
  if (normEntrada === normChave) return true;

  // 2. Substring direta (ex: digitou "quero pesquisa" e a chave é "pesquisa")
  if (normChave.length >= 3 && normEntrada.includes(normChave)) return true;
  if (normEntrada.length >= 4 && normChave.includes(normEntrada)) return true;

  // 3. Verifica palavra a palavra
  const palavrasEntrada = normEntrada.split(/\s+/);
  for (const p of palavrasEntrada) {
    if (p === normChave) return true;

    // Tolerância a erros ortográficos (Levenshtein)
    const dist = distanciaLevenshtein(p, normChave);
    const limite = normChave.length >= 7 ? 2 : normChave.length >= 4 ? 1 : 0;
    if (limite > 0 && dist <= limite) {
      return true;
    }
  }

  return false;
}
