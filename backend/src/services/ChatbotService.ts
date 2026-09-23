import { pool, isDbConnected } from '../config/db';
import { Fluxo, FluxoBuilderViewModel, NoBuilder, RespostaBot } from '../types';
import { memoryStore } from './MemoryStore';

const LIMITE_MENSAGENS_POR_PASSO = 10;
const COMANDOS_REINICIO = ['menu', 'reiniciar', 'recomecar', 'recomeçar', 'inicio', 'início', 'voltar'];
const COMANDOS_SAIDA = ['sair', 'encerrar', 'finalizar'];

function normalizar(texto?: string | null): string {
  return (texto || '').trim().toLowerCase();
}

function gerarProtocolo(): string {
  const agora = new Date();
  const yy = String(agora.getUTCFullYear()).slice(-2);
  const mm = String(agora.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(agora.getUTCDate()).padStart(2, '0');
  const aleatorio = Math.floor(1000 + Math.random() * 9000);
  return `${yy}${mm}${dd}${aleatorio}`;
}

export class ChatbotService {
  // -------------------------------------------------------------
  // Fluxos
  // -------------------------------------------------------------

  async listarFluxos(): Promise<Fluxo[]> {
    if (!isDbConnected) {
      return memoryStore.listarFluxos();
    }

    const query = `
      SELECT 
        f."Id" as id,
        f."Nome" as nome,
        f."Status" as status,
        f."DataCriacao" as "dataCriacao",
        f."EhPadrao" as "ehPadrao",
        COALESCE(fm.total, 0) as "totalPassos",
        COALESCE(c.total, 0) as "totalConversas"
      FROM "Fluxos" f
      LEFT JOIN (
        SELECT "FluxoId", COUNT(*) as total 
        FROM "FluxoMensagens" 
        GROUP BY "FluxoId"
      ) fm ON fm."FluxoId" = f."Id"
      LEFT JOIN (
        SELECT "FluxoId", COUNT(*) as total 
        FROM "Conversas" 
        WHERE "FluxoId" IS NOT NULL
        GROUP BY "FluxoId"
      ) c ON c."FluxoId" = f."Id"
      ORDER BY f."EhPadrao" DESC, f."Id" DESC;
    `;
    const res = await pool.query(query);
    return res.rows.map(r => ({
      ...r,
      totalPassos: parseInt(r.totalPassos, 10),
      totalConversas: parseInt(r.totalConversas, 10)
    }));
  }

  async obterFluxo(id: number): Promise<FluxoBuilderViewModel | null> {
    if (!isDbConnected) {
      return memoryStore.obterFluxo(id);
    }
    const fRes = await pool.query('SELECT "Id" as id, "Nome" as nome, "Status" as status, "EhPadrao" as "ehPadrao" FROM "Fluxos" WHERE "Id" = $1', [id]);
    if (fRes.rowCount === 0) return null;
    const fluxo = fRes.rows[0];

    const nosRes = await pool.query(`
      SELECT 
        fm."Id" as id,
        fm."Titulo" as titulo,
        fm."EhInicio" as "ehInicio",
        fm."PosX" as "posX",
        fm."PosY" as "posY",
        fm."ProximaFluxoMensagemId" as "proximoId",
        m."Conteudo" as conteudo
      FROM "FluxoMensagens" fm
      JOIN "Mensagens" m ON m."Id" = fm."MensagemId"
      WHERE fm."FluxoId" = $1
      ORDER BY fm."Id" ASC
    `, [id]);

    const opcoesRes = await pool.query(`
      SELECT 
        r."Id" as id,
        r."FluxoMensagemAtualId" as "noId",
        r."PalavraChave" as "palavraChave",
        r."ProximaFluxoMensagemId" as "destinoId"
      FROM "Respostas" r
      JOIN "FluxoMensagens" fm ON fm."Id" = r."FluxoMensagemAtualId"
      WHERE fm."FluxoId" = $1
      ORDER BY r."Id" ASC
    `, [id]);

    const opcoesPorNo = new Map<number, any[]>();
    for (const op of opcoesRes.rows) {
      if (!opcoesPorNo.has(op.noId)) opcoesPorNo.set(op.noId, []);
      opcoesPorNo.get(op.noId)!.push({
        id: op.id,
        palavraChave: op.palavraChave,
        destinoId: op.destinoId
      });
    }

    const nos: NoBuilder[] = nosRes.rows.map(n => ({
      id: n.id,
      titulo: n.titulo,
      conteudo: n.conteudo || '',
      ehInicio: n.ehInicio,
      posX: n.posX,
      posY: n.posY,
      proximoId: n.proximoId,
      opcoes: opcoesPorNo.get(n.id) || []
    }));

    return {
      id: fluxo.id,
      nome: fluxo.nome,
      status: fluxo.status,
      ehPadrao: fluxo.ehPadrao,
      nos
    };
  }

  async criarFluxo(nome: string): Promise<FluxoBuilderViewModel> {
    if (!isDbConnected) {
      return memoryStore.criarFluxo(nome);
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insFluxo = await client.query(
        'INSERT INTO "Fluxos" ("Nome", "Status", "DataCriacao", "EhPadrao") VALUES ($1, true, NOW(), false) RETURNING "Id" as id, "Nome" as nome, "Status" as status, "EhPadrao" as "ehPadrao"',
        [nome.trim()]
      );
      const fluxoId = insFluxo.rows[0].id;

      // Mensagem inicial de boas-vindas padrão
      const insMsg = await client.query(
        'INSERT INTO "Mensagens" ("Conteudo") VALUES ($1) RETURNING "Id" as id',
        ['Olá! 👋 Seja bem-vindo(a). Digite *1* para começar.']
      );
      const msgId = insMsg.rows[0].id;

      await client.query(
        'INSERT INTO "FluxoMensagens" ("FluxoId", "MensagemId", "Titulo", "EhInicio", "PosX", "PosY", "ProximaFluxoMensagemId") VALUES ($1, $2, $3, true, 120, 160, NULL)',
        [fluxoId, msgId, 'Boas-vindas']
      );

      await client.query('COMMIT');
      return (await this.obterFluxo(fluxoId))!;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async renomearFluxo(fluxoId: number, nome: string): Promise<boolean> {
    if (!nome.trim()) return false;
    if (!isDbConnected) {
      return memoryStore.renomearFluxo(fluxoId, nome);
    }
    const res = await pool.query('UPDATE "Fluxos" SET "Nome" = $1 WHERE "Id" = $2', [nome.trim(), fluxoId]);
    return (res.rowCount ?? 0) > 0;
  }

  async alternarStatusFluxo(fluxoId: number): Promise<boolean> {
    if (!isDbConnected) {
      return memoryStore.alternarStatus(fluxoId);
    }
    const res = await pool.query(`
      UPDATE "Fluxos"
      SET 
        "Status" = NOT "Status",
        "EhPadrao" = CASE WHEN "Status" = true THEN false ELSE "EhPadrao" END
      WHERE "Id" = $1
      RETURNING "Status" as status
    `, [fluxoId]);
    return (res.rowCount ?? 0) > 0;
  }

  async definirFluxoPadrao(fluxoId: number): Promise<boolean> {
    if (!isDbConnected) {
      return memoryStore.definirPadrao(fluxoId);
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE "Fluxos" SET "EhPadrao" = false WHERE "EhPadrao" = true AND "Id" != $1', [fluxoId]);
      const res = await client.query('UPDATE "Fluxos" SET "EhPadrao" = true, "Status" = true WHERE "Id" = $1', [fluxoId]);
      await client.query('COMMIT');
      return (res.rowCount ?? 0) > 0;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async excluirFluxo(fluxoId: number): Promise<boolean> {
    if (!isDbConnected) {
      return memoryStore.excluirFluxo(fluxoId);
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const nosRes = await client.query('SELECT "Id", "MensagemId" FROM "FluxoMensagens" WHERE "FluxoId" = $1', [fluxoId]);
      const nosIds = nosRes.rows.map(r => r.Id);
      const msgIds = nosRes.rows.map(r => r.MensagemId);

      await client.query('DELETE FROM "Conversas" WHERE "FluxoId" = $1 OR "FluxoMensagemAtualId" = ANY($2::int[])', [fluxoId, nosIds]);

      if (nosIds.length > 0) {
        await client.query('DELETE FROM "Respostas" WHERE "FluxoMensagemAtualId" = ANY($1::int[]) OR "ProximaFluxoMensagemId" = ANY($1::int[])', [nosIds]);
        await client.query('UPDATE "FluxoMensagens" SET "ProximaFluxoMensagemId" = NULL WHERE "FluxoId" = $1', [fluxoId]);
        await client.query('DELETE FROM "FluxoMensagens" WHERE "FluxoId" = $1', [fluxoId]);
      }

      if (msgIds.length > 0) {
        await client.query('DELETE FROM "Mensagens" WHERE "Id" = ANY($1::int[])', [msgIds]);
      }

      const res = await client.query('DELETE FROM "Fluxos" WHERE "Id" = $1', [fluxoId]);
      await client.query('COMMIT');
      return (res.rowCount ?? 0) > 0;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // -------------------------------------------------------------
  // Construtor Visual (Nós e Conexões)
  // -------------------------------------------------------------

  async criarNo(fluxoId: number, conteudo: string, posX: number, posY: number, titulo?: string): Promise<number> {
    if (!isDbConnected) {
      return memoryStore.criarNo(fluxoId, conteudo, posX, posY, titulo);
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const msgRes = await client.query(
        'INSERT INTO "Mensagens" ("Conteudo") VALUES ($1) RETURNING "Id" as id',
        [conteudo || 'Nova mensagem']
      );
      const msgId = msgRes.rows[0].id;

      const countRes = await client.query('SELECT COUNT(*) as count FROM "FluxoMensagens" WHERE "FluxoId" = $1', [fluxoId]);
      const ehInicio = parseInt(countRes.rows[0].count, 10) === 0;

      const noRes = await client.query(
        'INSERT INTO "FluxoMensagens" ("FluxoId", "MensagemId", "Titulo", "EhInicio", "PosX", "PosY", "ProximaFluxoMensagemId") VALUES ($1, $2, $3, $4, $5, $6, NULL) RETURNING "Id" as id',
        [fluxoId, msgId, titulo || '', ehInicio, posX, posY]
      );

      await client.query('COMMIT');
      return noRes.rows[0].id;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async atualizarNo(noId: number, conteudo: string, titulo?: string): Promise<boolean> {
    if (!isDbConnected) {
      return memoryStore.atualizarNo(noId, conteudo, titulo);
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const noRes = await client.query('SELECT "MensagemId" FROM "FluxoMensagens" WHERE "Id" = $1', [noId]);
      if (noRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      const msgId = noRes.rows[0].MensagemId;

      await client.query('UPDATE "Mensagens" SET "Conteudo" = $1 WHERE "Id" = $2', [conteudo, msgId]);
      if (titulo !== undefined) {
        await client.query('UPDATE "FluxoMensagens" SET "Titulo" = $1 WHERE "Id" = $2', [titulo, noId]);
      }
      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async salvarPosicao(noId: number, posX: number, posY: number): Promise<boolean> {
    if (!isDbConnected) {
      return memoryStore.salvarPosicao(noId, posX, posY);
    }
    const res = await pool.query(
      'UPDATE "FluxoMensagens" SET "PosX" = $1, "PosY" = $2 WHERE "Id" = $3',
      [posX, posY, noId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async salvarPosicoes(posicoes: { noId: number; posX: number; posY: number }[]): Promise<boolean> {
    if (!isDbConnected) {
      for (const pos of posicoes) {
        memoryStore.salvarPosicao(pos.noId, pos.posX, pos.posY);
      }
      return true;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const pos of posicoes) {
        await client.query(
          'UPDATE "FluxoMensagens" SET "PosX" = $1, "PosY" = $2 WHERE "Id" = $3',
          [pos.posX, pos.posY, pos.noId]
        );
      }
      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async definirNoInicial(noId: number): Promise<boolean> {
    if (!isDbConnected) {
      return memoryStore.definirInicio(noId);
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const noRes = await client.query('SELECT "FluxoId" FROM "FluxoMensagens" WHERE "Id" = $1', [noId]);
      if (noRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      const fluxoId = noRes.rows[0].FluxoId;

      await client.query('UPDATE "FluxoMensagens" SET "EhInicio" = false WHERE "FluxoId" = $1', [fluxoId]);
      await client.query('UPDATE "FluxoMensagens" SET "EhInicio" = true WHERE "Id" = $1', [noId]);
      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async conectarSequencial(origemId: number, destinoId: number | null): Promise<boolean> {
    if (!isDbConnected) {
      return memoryStore.conectarSequencial(origemId, destinoId);
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (destinoId !== null) {
        if (origemId === destinoId) {
          await client.query('ROLLBACK');
          return false;
        }
        // Se conectou sequencial, remove opções de menu anteriores
        await client.query('DELETE FROM "Respostas" WHERE "FluxoMensagemAtualId" = $1', [origemId]);
      }
      const res = await client.query('UPDATE "FluxoMensagens" SET "ProximaFluxoMensagemId" = $1 WHERE "Id" = $2', [destinoId, origemId]);
      await client.query('COMMIT');
      return (res.rowCount ?? 0) > 0;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async criarOpcao(noMenuId: number, palavraChave: string, destinoId?: number | null, conteudoNovoNo?: string): Promise<boolean> {
    const chave = normalizar(palavraChave);
    if (!chave) return false;

    if (!isDbConnected) {
      return memoryStore.criarOpcao(noMenuId, palavraChave, destinoId, conteudoNovoNo);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const menuRes = await client.query('SELECT "FluxoId", "PosX", "PosY" FROM "FluxoMensagens" WHERE "Id" = $1', [noMenuId]);
      if (menuRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      const menu = menuRes.rows[0];

      const existe = await client.query('SELECT "Id" FROM "Respostas" WHERE "FluxoMensagemAtualId" = $1 AND "PalavraChave" = $2', [noMenuId, chave]);
      if ((existe.rowCount ?? 0) > 0) {
        await client.query('ROLLBACK');
        return false;
      }

      let finalDestinoId = destinoId;
      if (!finalDestinoId) {
        // Criar nó automático ao lado
        const opCountRes = await client.query('SELECT COUNT(*) as c FROM "Respostas" WHERE "FluxoMensagemAtualId" = $1', [noMenuId]);
        const opCount = parseInt(opCountRes.rows[0].c, 10);

        const msgRes = await client.query('INSERT INTO "Mensagens" ("Conteudo") VALUES ($1) RETURNING "Id"', [conteudoNovoNo || `Resposta para "${chave}"`]);
        const novoNoRes = await client.query(
          'INSERT INTO "FluxoMensagens" ("FluxoId", "MensagemId", "Titulo", "EhInicio", "PosX", "PosY", "ProximaFluxoMensagemId") VALUES ($1, $2, $3, false, $4, $5, NULL) RETURNING "Id"',
          [menu.FluxoId, msgRes.rows[0].Id, `Passo ${chave}`, menu.PosX + 340, menu.PosY + opCount * 160]
        );
        finalDestinoId = novoNoRes.rows[0].Id;
      }

      // Ao virar menu, nó perde próximo sequencial
      await client.query('UPDATE "FluxoMensagens" SET "ProximaFluxoMensagemId" = NULL WHERE "Id" = $1', [noMenuId]);

      await client.query(
        'INSERT INTO "Respostas" ("FluxoMensagemAtualId", "PalavraChave", "ProximaFluxoMensagemId") VALUES ($1, $2, $3)',
        [noMenuId, chave, finalDestinoId]
      );

      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async atualizarOpcao(opcaoId: number, palavraChave: string, destinoId: number): Promise<boolean> {
    const chave = normalizar(palavraChave);
    if (!chave) return false;
    if (!isDbConnected) {
      return memoryStore.atualizarOpcao(opcaoId, palavraChave, destinoId);
    }
    const res = await pool.query(
      'UPDATE "Respostas" SET "PalavraChave" = $1, "ProximaFluxoMensagemId" = $2 WHERE "Id" = $3',
      [chave, destinoId, opcaoId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async excluirOpcao(opcaoId: number): Promise<boolean> {
    if (!isDbConnected) {
      return memoryStore.excluirOpcao(opcaoId);
    }
    const res = await pool.query('DELETE FROM "Respostas" WHERE "Id" = $1', [opcaoId]);
    return (res.rowCount ?? 0) > 0;
  }

  async excluirNo(noId: number): Promise<boolean> {
    if (!isDbConnected) {
      return memoryStore.excluirNo(noId);
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const noRes = await client.query('SELECT "FluxoId", "MensagemId", "EhInicio" FROM "FluxoMensagens" WHERE "Id" = $1', [noId]);
      if (noRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      const { FluxoId, MensagemId, EhInicio } = noRes.rows[0];

      // Solta sequenciais e opções apontando para cá
      await client.query('UPDATE "FluxoMensagens" SET "ProximaFluxoMensagemId" = NULL WHERE "ProximaFluxoMensagemId" = $1', [noId]);
      await client.query('DELETE FROM "Respostas" WHERE "ProximaFluxoMensagemId" = $1', [noId]);
      await client.query('DELETE FROM "Respostas" WHERE "FluxoMensagemAtualId" = $1', [noId]);

      await client.query('UPDATE "Conversas" SET "FluxoMensagemAtualId" = NULL, "Finalizada" = true WHERE "FluxoMensagemAtualId" = $1', [noId]);

      await client.query('DELETE FROM "FluxoMensagens" WHERE "Id" = $1', [noId]);

      // Verifica se a mensagem ainda é usada
      const emUso = await client.query('SELECT "Id" FROM "FluxoMensagens" WHERE "MensagemId" = $1', [MensagemId]);
      if (emUso.rowCount === 0) {
        await client.query('DELETE FROM "Mensagens" WHERE "Id" = $1', [MensagemId]);
      }

      // Se era nó de início, promove outro
      if (EhInicio) {
        const cand = await client.query('SELECT "Id" FROM "FluxoMensagens" WHERE "FluxoId" = $1 ORDER BY "Id" ASC LIMIT 1', [FluxoId]);
        if ((cand.rowCount ?? 0) > 0) {
          await client.query('UPDATE "FluxoMensagens" SET "EhInicio" = true WHERE "Id" = $1', [cand.rows[0].Id]);
        }
      }

      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // -------------------------------------------------------------
  // Motor do Chatbot (Execução das Conversas)
  // -------------------------------------------------------------

  async obterNoInicial(fluxoId: number): Promise<number | null> {
    const res = await pool.query(
      'SELECT "Id" FROM "FluxoMensagens" WHERE "FluxoId" = $1 ORDER BY "EhInicio" DESC, "Id" ASC LIMIT 1',
      [fluxoId]
    );
    return res.rows[0]?.Id || null;
  }

  async iniciarConversa(telefone: string, fluxoId: number, canal: string, nomeContato?: string): Promise<RespostaBot> {
    if (!isDbConnected) {
      return memoryStore.iniciarConversa(telefone, fluxoId, canal);
    }
    const noInicialId = await this.obterNoInicial(fluxoId);
    if (!noInicialId) {
      return { sucesso: false, mensagens: ['Este fluxo ainda não tem nenhuma mensagem configurada.'], opcoes: [] };
    }

    const protocolo = gerarProtocolo();
    const tel = telefone.trim();

    const client = await pool.connect();
    let conversaId = 0;
    try {
      await client.query('BEGIN');
      const convRes = await client.query(
        'SELECT "Id" FROM "Conversas" WHERE "TelefoneUsuario" = $1 AND "Canal" = $2',
        [tel, canal]
      );

      if ((convRes.rowCount ?? 0) === 0) {
        const ins = await client.query(`
          INSERT INTO "Conversas" 
            ("Protocolo", "TelefoneUsuario", "Canal", "FluxoId", "FluxoMensagemAtualId", "NomeContato", "Finalizada", "DataInicio", "DataUltimaInteracao")
          VALUES ($1, $2, $3, $4, $5, $6, false, NOW(), NOW())
          RETURNING "Id"
        `, [protocolo, tel, canal, fluxoId, noInicialId, nomeContato || null]);
        conversaId = ins.rows[0].Id;
      } else {
        conversaId = convRes.rows[0].Id;
        await client.query(`
          UPDATE "Conversas" 
          SET 
            "Protocolo" = $1,
            "FluxoId" = $2,
            "FluxoMensagemAtualId" = $3,
            "Finalizada" = false,
            "DataInicio" = NOW(),
            "DataUltimaInteracao" = NOW(),
            "NomeContato" = COALESCE($4, "NomeContato")
          WHERE "Id" = $5
        `, [protocolo, fluxoId, noInicialId, nomeContato || null, conversaId]);
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const resposta = await this.percorrerAPartirDe(conversaId, noInicialId);
    resposta.protocolo = protocolo;
    await this.registrarHistorico(conversaId, 'saida', '', resposta.mensagens);
    return resposta;
  }

  async processarMensagem(telefone: string, texto: string, canal: string, nomeContato?: string): Promise<RespostaBot> {
    if (!isDbConnected) {
      return memoryStore.processarMensagem(telefone, texto, canal);
    }
    const tel = telefone.trim();
    const entrada = normalizar(texto);

    const convRes = await pool.query(
      'SELECT "Id", "Protocolo", "FluxoId", "FluxoMensagemAtualId", "Finalizada", "NomeContato" FROM "Conversas" WHERE "TelefoneUsuario" = $1 AND "Canal" = $2',
      [tel, canal]
    );

    let conversa = convRes.rows[0];

    // Sem conversa ou já finalizada: inicia no fluxo padrão
    if (!conversa || conversa.Finalizada || !conversa.FluxoMensagemAtualId) {
      let fluxoPadraoId = conversa?.FluxoId;
      if (!fluxoPadraoId) {
        const fpRes = await pool.query('SELECT "Id" FROM "Fluxos" WHERE "EhPadrao" = true AND "Status" = true LIMIT 1');
        fluxoPadraoId = fpRes.rows[0]?.Id;
        if (!fluxoPadraoId) {
          const primeiroFluxo = await pool.query('SELECT "Id" FROM "Fluxos" WHERE "Status" = true ORDER BY "Id" ASC LIMIT 1');
          fluxoPadraoId = primeiroFluxo.rows[0]?.Id;
        }
      }

      if (!fluxoPadraoId) {
        return {
          sucesso: false,
          mensagens: ['Nenhum fluxo está publicado no momento. Defina um fluxo padrão no painel do WhatsApp.'],
          opcoes: []
        };
      }

      if (conversa) {
        await this.registrarHistorico(conversa.Id, 'entrada', texto);
      }

      const abertura = await this.iniciarConversa(tel, fluxoPadraoId, canal, nomeContato);
      if (!conversa) {
        const nova = await pool.query('SELECT "Id" FROM "Conversas" WHERE "TelefoneUsuario" = $1 AND "Canal" = $2', [tel, canal]);
        if ((nova.rowCount ?? 0) > 0) {
          await this.registrarHistorico(nova.rows[0].Id, 'entrada', texto);
        }
      }
      return abertura;
    }

    const conversaId = conversa.Id;
    if (nomeContato && conversa.NomeContato !== nomeContato) {
      await pool.query('UPDATE "Conversas" SET "NomeContato" = $1 WHERE "Id" = $2', [nomeContato, conversaId]);
    }

    await this.registrarHistorico(conversaId, 'entrada', texto);

    // Comandos globais
    if (COMANDOS_SAIDA.includes(entrada)) {
      await pool.query('UPDATE "Conversas" SET "Finalizada" = true, "DataUltimaInteracao" = NOW() WHERE "Id" = $1', [conversaId]);
      const despedida: RespostaBot = {
        sucesso: true,
        finalizado: true,
        protocolo: conversa.Protocolo,
        mensagens: ['Atendimento encerrado. Se precisar, é só mandar uma mensagem que eu começo de novo. 👋'],
        opcoes: []
      };
      await this.registrarHistorico(conversaId, 'saida', '', despedida.mensagens);
      return despedida;
    }

    if (COMANDOS_REINICIO.includes(entrada) && conversa.FluxoId) {
      return await this.iniciarConversa(tel, conversa.FluxoId, canal, nomeContato);
    }

    // Resolver próximo passo
    const noAtualId = conversa.FluxoMensagemAtualId;
    const proximoNoId = await this.resolverProximoNo(noAtualId, texto);

    if (!proximoNoId) {
      const opcoesRes = await pool.query('SELECT "PalavraChave" as chave FROM "Respostas" WHERE "FluxoMensagemAtualId" = $1', [noAtualId]);
      const opcoes = opcoesRes.rows.map(r => r.chave);
      const invalida: RespostaBot = {
        sucesso: false,
        entradaInvalida: true,
        noAtualId,
        protocolo: conversa.Protocolo,
        opcoes,
        mensagens: [
          opcoes.length > 0
            ? `Não entendi 🤔 Responda com uma das opções: ${opcoes.join(', ')}.`
            : 'Não entendi. Digite *menu* para voltar ao início.'
        ]
      };
      await this.registrarHistorico(conversaId, 'saida', '', invalida.mensagens);
      return invalida;
    }

    await pool.query('UPDATE "Conversas" SET "FluxoMensagemAtualId" = $1, "DataUltimaInteracao" = NOW() WHERE "Id" = $2', [proximoNoId, conversaId]);

    const resposta = await this.percorrerAPartirDe(conversaId, proximoNoId);
    resposta.protocolo = conversa.Protocolo;
    await this.registrarHistorico(conversaId, 'saida', '', resposta.mensagens);
    return resposta;
  }

  private async resolverProximoNo(noAtualId: number, textoDigitado: string): Promise<number | null> {
    const noRes = await pool.query('SELECT "ProximaFluxoMensagemId" FROM "FluxoMensagens" WHERE "Id" = $1', [noAtualId]);
    if (noRes.rowCount === 0) return null;

    const sequencialDestino = noRes.rows[0].ProximaFluxoMensagemId;
    const opcoesRes = await pool.query('SELECT "PalavraChave", "ProximaFluxoMensagemId" FROM "Respostas" WHERE "FluxoMensagemAtualId" = $1', [noAtualId]);

    // Caso sequencial sem opções
    if (sequencialDestino && opcoesRes.rowCount === 0) {
      return sequencialDestino;
    }

    // Caso Menu: busca casamento exato e substring
    const busca = normalizar(textoDigitado);
    for (const op of opcoesRes.rows) {
      if (op.PalavraChave === busca) return op.ProximaFluxoMensagemId;
    }

    for (const op of opcoesRes.rows) {
      if (op.PalavraChave.length > 2 && busca.includes(op.PalavraChave)) {
        return op.ProximaFluxoMensagemId;
      }
    }

    return null;
  }

  private async percorrerAPartirDe(conversaId: number, noInicialId: number): Promise<RespostaBot> {
    const resposta: RespostaBot = {
      sucesso: true,
      mensagens: [],
      opcoes: [],
      noAtualId: noInicialId,
      finalizado: false
    };

    const visitados = new Set<number>();
    let atualId: number | null = noInicialId;

    while (atualId && resposta.mensagens.length < LIMITE_MENSAGENS_POR_PASSO) {
      if (visitados.has(atualId)) break;
      visitados.add(atualId);

      const noRes: any = await pool.query(`
        SELECT fm."Id", fm."ProximaFluxoMensagemId", m."Conteudo"
        FROM "FluxoMensagens" fm
        JOIN "Mensagens" m ON m."Id" = fm."MensagemId"
        WHERE fm."Id" = $1
      `, [atualId]);

      if (noRes.rowCount === 0) break;
      const no: any = noRes.rows[0];

      if (no.Conteudo && no.Conteudo.trim()) {
        resposta.mensagens.push(no.Conteudo);
      }
      resposta.noAtualId = no.Id;

      // Menu
      const opRes = await pool.query('SELECT "PalavraChave" FROM "Respostas" WHERE "FluxoMensagemAtualId" = $1 ORDER BY "Id" ASC', [no.Id]);
      if ((opRes.rowCount ?? 0) > 0) {
        resposta.opcoes = opRes.rows.map(r => r.PalavraChave);
        break; // Para no menu esperando resposta do usuário
      }

      // Fim do fluxo
      if (!no.ProximaFluxoMensagemId) {
        resposta.finalizado = true;
        break;
      }

      atualId = no.ProximaFluxoMensagemId;
    }

    if (resposta.noAtualId) {
      await pool.query('UPDATE "Conversas" SET "FluxoMensagemAtualId" = $1, "Finalizada" = $2, "DataUltimaInteracao" = NOW() WHERE "Id" = $3', [
        resposta.noAtualId,
        resposta.finalizado || false,
        conversaId
      ]);
    }

    if (resposta.mensagens.length === 0) {
      resposta.mensagens.push('Este passo do fluxo está sem texto configurado.');
    }

    return resposta;
  }

  private async registrarHistorico(conversaId: number, direcao: 'entrada' | 'saida', conteudo: string, respostasDoBot?: string[]) {
    if (!conversaId) return;
    const client = await pool.connect();
    try {
      if (conteudo && conteudo.trim()) {
        await client.query(
          'INSERT INTO "HistoricoMensagens" ("ConversaId", "Direcao", "Conteudo", "DataEnvio") VALUES ($1, $2, $3, NOW())',
          [conversaId, direcao, conteudo.trim()]
        );
      }
      if (respostasDoBot && respostasDoBot.length > 0) {
        for (const msg of respostasDoBot) {
          if (msg && msg.trim()) {
            await client.query(
              'INSERT INTO "HistoricoMensagens" ("ConversaId", "Direcao", "Conteudo", "DataEnvio") VALUES ($1, $2, $3, NOW())',
              [conversaId, 'saida', msg.trim()]
            );
          }
        }
      }
    } finally {
      client.release();
    }
  }
}

export const chatbotService = new ChatbotService();
