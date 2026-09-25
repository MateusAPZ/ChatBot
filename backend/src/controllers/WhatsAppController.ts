import { Request, Response } from 'express';
import { pool, isDbConnected } from '../config/db';
import { config } from '../config/env';
import { metaWhatsAppService } from '../services/MetaWhatsAppService';
import { twilioWhatsAppService } from '../services/TwilioWhatsAppService';
import { memoryStore } from '../services/MemoryStore';

function mascarar(valor?: string | null): string {
  if (!valor) return '—';
  if (valor.length <= 8) return '•'.repeat(valor.length);
  return valor.slice(0, 4) + '•'.repeat(valor.length - 8) + valor.slice(-4);
}

export class WhatsAppController {
  async obterPainel(req: Request, res: Response) {
    try {
      if (!isDbConnected) {
        return res.json({
          sucesso: true,
          painel: memoryStore.obterPainelWhatsApp(config.port)
        });
      }
      const usaMeta = config.whatsapp.provedor.toLowerCase() === 'meta';
      const service = usaMeta ? metaWhatsAppService : twilioWhatsAppService;

      const rotaWebhook = usaMeta ? '/api/whatsapp/meta' : '/api/whatsapp/webhook';
      const host = req.get('host') || `localhost:${config.port}`;
      const scheme = req.protocol;

      const baseUrl = config.whatsapp.urlPublica
        ? config.whatsapp.urlPublica.replace(/\/+$/, '')
        : `${scheme}://${host}${rotaWebhook}`;

      const urlWebhook = baseUrl;
      const urlStatus = baseUrl.replace('/webhook', '/status');
      const ehLocalhost = urlWebhook.includes('localhost') || urlWebhook.includes('127.0.0.1');

      // Métricas e estatísticas
      const totalConvRes = await pool.query('SELECT COUNT(*) as c FROM "Conversas" WHERE "Canal" = $1', ['whatsapp']);
      const totalConversas = parseInt(totalConvRes.rows[0].c, 10);

      const ativasRes = await pool.query('SELECT COUNT(*) as c FROM "Conversas" WHERE "Canal" = $1 AND "Finalizada" = false', ['whatsapp']);
      const conversasAtivas = parseInt(ativasRes.rows[0].c, 10);

      const msgCountRes = await pool.query('SELECT COUNT(*) as c FROM "HistoricoMensagens"');
      const mensagensTrocadas = parseInt(msgCountRes.rows[0].c, 10);

      // Conversas recentes
      const convListRes = await pool.query(`
        SELECT 
          c."Id" as id,
          c."Protocolo" as protocolo,
          c."TelefoneUsuario" as telefone,
          c."NomeContato" as "nomeContato",
          c."Canal" as canal,
          COALESCE(f."Nome", '—') as "fluxoNome",
          COALESCE(m."Conteudo", '—') as "passoAtual",
          c."Finalizada" as finalizada,
          COALESCE(h.total, 0) as "totalMensagens",
          c."DataUltimaInteracao" as "dataUltimaInteracao"
        FROM "Conversas" c
        LEFT JOIN "Fluxos" f ON f."Id" = c."FluxoId"
        LEFT JOIN "FluxoMensagens" fm ON fm."Id" = c."FluxoMensagemAtualId"
        LEFT JOIN "Mensagens" m ON m."Id" = fm."MensagemId"
        LEFT JOIN (
          SELECT "ConversaId", COUNT(*) as total 
          FROM "HistoricoMensagens" 
          GROUP BY "ConversaId"
        ) h ON h."ConversaId" = c."Id"
        ORDER BY c."DataUltimaInteracao" DESC
        LIMIT 25
      `);

      const fluxosRes = await pool.query('SELECT "Id" as id, "Nome" as nome, "Status" as status, "EhPadrao" as "ehPadrao" FROM "Fluxos" ORDER BY "Nome" ASC');
      const fluxoPadrao = fluxosRes.rows.find(f => f.ehPadrao) || null;

      const contaOriginal = usaMeta ? config.whatsapp.meta.phoneNumberId : config.whatsapp.twilio.accountSid;

      return res.json({
        sucesso: true,
        painel: {
          configurado: service.estaConfigurado,
          provedor: config.whatsapp.provedor,
          usaMeta,
          numeroRemetente: service.numeroRemetente,
          contaMascarada: mascarar(contaOriginal),
          verifyToken: config.whatsapp.meta.verifyToken,
          validacaoAssinatura: config.whatsapp.validarAssinatura,
          urlWebhook,
          urlStatus,
          ehLocalhost,
          portaLocal: String(config.port),
          fluxos: fluxosRes.rows,
          fluxoPadrao,
          totalConversas,
          conversasAtivas,
          mensagensTrocadas,
          conversas: convListRes.rows.map(r => ({
            ...r,
            totalMensagens: parseInt(r.totalMensagens, 10)
          }))
        }
      });
    } catch (err: any) {
      console.error('Erro ao obter painel do WhatsApp:', err);
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async enviarTeste(req: Request, res: Response) {
    try {
      const { telefone, mensagem } = req.body;
      const usaMeta = config.whatsapp.provedor.toLowerCase() === 'meta';
      const service = usaMeta ? metaWhatsAppService : twilioWhatsAppService;

      const resultado = await service.enviarMensagem(
        telefone,
        mensagem || 'Teste de conexão do chatbot ✅'
      );

      return res.json(resultado);
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async obterHistorico(req: Request, res: Response) {
    try {
      const conversaId = parseInt(String(req.params.id), 10);
      if (!isDbConnected) {
        const hist = memoryStore.obterHistoricoConversa(conversaId);
        if (!hist) {
          return res.status(404).json({ sucesso: false, erro: 'Conversa não encontrada.' });
        }
        return res.json({ sucesso: true, ...hist });
      }

      const convRes = await pool.query('SELECT "Protocolo" as protocolo, "TelefoneUsuario" as telefone, "NomeContato" as contato FROM "Conversas" WHERE "Id" = $1', [conversaId]);
      if (convRes.rowCount === 0) {
        return res.status(404).json({ sucesso: false, erro: 'Conversa não encontrada.' });
      }

      const c = convRes.rows[0];
      const histRes = await pool.query(
        'SELECT "Direcao" as direcao, "Conteudo" as conteudo, "DataEnvio" as data FROM "HistoricoMensagens" WHERE "ConversaId" = $1 ORDER BY "Id" ASC',
        [conversaId]
      );

      const msgs = histRes.rows.map(m => {
        const d = new Date(m.data);
        const dataStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        return {
          direcao: m.direcao,
          conteudo: m.conteudo,
          data: dataStr
        };
      });

      return res.json({
        sucesso: true,
        protocolo: c.protocolo,
        telefone: c.telefone,
        contato: c.contato,
        mensagens: msgs
      });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async encerrarConversa(req: Request, res: Response) {
    try {
      const conversaId = parseInt(String(req.params.id), 10);
      if (!isDbConnected) {
        memoryStore.encerrarConversa(conversaId);
        return res.json({ sucesso: true });
      }

      await pool.query('UPDATE "Conversas" SET "Finalizada" = true, "FluxoMensagemAtualId" = NULL WHERE "Id" = $1', [conversaId]);
      return res.json({ sucesso: true });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }
}

export const whatsAppController = new WhatsAppController();
