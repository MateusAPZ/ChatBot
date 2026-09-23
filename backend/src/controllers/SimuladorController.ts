import { Request, Response } from 'express';
import { pool } from '../config/db';
import { chatbotService } from '../services/ChatbotService';

export class SimuladorController {
  async obterFluxos(req: Request, res: Response) {
    try {
      const fluxosRes = await pool.query('SELECT "Id" as id, "Nome" as nome, "EhPadrao" as "ehPadrao" FROM "Fluxos" WHERE "Status" = true ORDER BY "Nome" ASC');
      const padrao = fluxosRes.rows.find(f => f.ehPadrao)?.id || fluxosRes.rows[0]?.id || null;
      return res.json({ sucesso: true, fluxos: fluxosRes.rows, fluxoSelecionado: padrao });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async iniciarSimulacao(req: Request, res: Response) {
    try {
      const { telefone, fluxoId } = req.body;
      if (!telefone || !telefone.trim()) {
        return res.json({ sucesso: false, mensagens: ['Informe um número de telefone.'] });
      }
      if (!fluxoId) {
        return res.json({ sucesso: false, mensagens: ['Selecione um fluxo válido.'] });
      }

      const resposta = await chatbotService.iniciarConversa(
        telefone.trim(),
        parseInt(fluxoId, 10),
        'simulador'
      );

      return res.json({
        sucesso: resposta.sucesso,
        mensagens: resposta.mensagens,
        opcoes: resposta.opcoes,
        noId: resposta.noAtualId,
        protocolo: resposta.protocolo,
        finalizado: resposta.finalizado
      });
    } catch (err: any) {
      console.error('Erro ao iniciar simulação:', err);
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async enviarMensagem(req: Request, res: Response) {
    try {
      const { telefone, texto } = req.body;
      const resposta = await chatbotService.processarMensagem(
        (telefone || '').trim(),
        texto || '',
        'simulador'
      );

      return res.json({
        sucesso: resposta.sucesso,
        mensagens: resposta.mensagens,
        opcoes: resposta.opcoes,
        noId: resposta.noAtualId,
        protocolo: resposta.protocolo,
        finalizado: resposta.finalizado,
        entradaInvalida: resposta.entradaInvalida
      });
    } catch (err: any) {
      console.error('Erro ao enviar mensagem simulada:', err);
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }
}

export const simuladorController = new SimuladorController();
