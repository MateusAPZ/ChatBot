import { Request, Response } from 'express';
import { chatbotService } from '../services/ChatbotService';

export class FluxoController {
  async listar(req: Request, res: Response) {
    try {
      const fluxos = await chatbotService.listarFluxos();
      return res.json({ sucesso: true, fluxos });
    } catch (err: any) {
      console.error('Erro ao listar fluxos:', err);
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async obter(req: Request, res: Response) {
    try {
      const id = parseInt(String(req.params.id), 10);
      const fluxo = await chatbotService.obterFluxo(id);
      if (!fluxo) {
        return res.status(404).json({ sucesso: false, erro: 'Fluxo não encontrado' });
      }
      return res.json({ sucesso: true, fluxo });
    } catch (err: any) {
      console.error('Erro ao obter fluxo:', err);
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const { nome } = req.body;
      if (!nome || !nome.trim()) {
        return res.status(400).json({ sucesso: false, erro: 'Nome é obrigatório.' });
      }
      const fluxo = await chatbotService.criarFluxo(nome);
      return res.status(201).json({ sucesso: true, fluxo });
    } catch (err: any) {
      console.error('Erro ao criar fluxo:', err);
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async renomear(req: Request, res: Response) {
    try {
      const id = parseInt(String(req.params.id), 10);
      const { nome } = req.body;
      const ok = await chatbotService.renomearFluxo(id, nome);
      return res.json({ sucesso: ok, nome: nome?.trim() });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async alternarStatus(req: Request, res: Response) {
    try {
      const id = parseInt(String(req.params.id), 10);
      const ok = await chatbotService.alternarStatusFluxo(id);
      return res.json({ sucesso: ok });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async definirPadrao(req: Request, res: Response) {
    try {
      const id = parseInt(String(req.params.id), 10);
      const ok = await chatbotService.definirFluxoPadrao(id);
      return res.json({ sucesso: ok });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async excluir(req: Request, res: Response) {
    try {
      const id = parseInt(String(req.params.id), 10);
      const ok = await chatbotService.excluirFluxo(id);
      return res.json({ sucesso: ok });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  // --- Nós ---

  async criarNo(req: Request, res: Response) {
    try {
      const fluxoId = parseInt(String(req.params.id), 10);
      const { conteudo, posX, posY, titulo } = req.body;
      const noId = await chatbotService.criarNo(fluxoId, conteudo, posX || 120, posY || 140, titulo);
      const fluxo = await chatbotService.obterFluxo(fluxoId);
      return res.json({ sucesso: true, fluxo, extra: { noId } });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async atualizarNo(req: Request, res: Response) {
    try {
      const noId = parseInt(String(req.params.noId), 10);
      const { conteudo, titulo, fluxoId } = req.body;
      if (!conteudo || !conteudo.trim()) {
        return res.status(400).json({ sucesso: false, erro: 'A mensagem não pode ficar vazia.' });
      }
      const ok = await chatbotService.atualizarNo(noId, conteudo, titulo);
      const fluxo = fluxoId ? await chatbotService.obterFluxo(fluxoId) : null;
      return res.json({ sucesso: ok, fluxo });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async salvarPosicao(req: Request, res: Response) {
    try {
      const noId = parseInt(String(req.params.noId), 10);
      const { posX, posY } = req.body;
      const ok = await chatbotService.salvarPosicao(noId, posX, posY);
      return res.json({ sucesso: ok });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async salvarPosicoes(req: Request, res: Response) {
    try {
      const posicoes = req.body;
      if (Array.isArray(posicoes) && posicoes.length > 0) {
        await chatbotService.salvarPosicoes(posicoes);
      }
      return res.json({ sucesso: true });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async definirInicio(req: Request, res: Response) {
    try {
      const noId = parseInt(String(req.params.noId), 10);
      const { fluxoId } = req.body;
      const ok = await chatbotService.definirNoInicial(noId);
      const fluxo = fluxoId ? await chatbotService.obterFluxo(fluxoId) : null;
      return res.json({ sucesso: ok, fluxo });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async conectarSequencial(req: Request, res: Response) {
    try {
      const { origemId, destinoId, fluxoId } = req.body;
      const dest = destinoId === '' || destinoId === undefined || destinoId === null ? null : parseInt(String(destinoId), 10);
      const ok = await chatbotService.conectarSequencial(parseInt(String(origemId), 10), dest);
      const fluxo = fluxoId ? await chatbotService.obterFluxo(fluxoId) : null;
      return res.json({ sucesso: ok, fluxo });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async criarOpcao(req: Request, res: Response) {
    try {
      const noMenuId = parseInt(String(req.params.noId), 10);
      const { palavraChave, destinoId, conteudoNovoNo, fluxoId } = req.body;
      const dest = destinoId && destinoId !== 'novo' ? parseInt(String(destinoId), 10) : null;
      const ok = await chatbotService.criarOpcao(noMenuId, palavraChave, dest, conteudoNovoNo);
      if (!ok) {
        return res.status(400).json({ sucesso: false, erro: 'Gatilho inválido ou já existente neste bloco.' });
      }
      const fluxo = fluxoId ? await chatbotService.obterFluxo(fluxoId) : null;
      return res.json({ sucesso: true, fluxo });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async atualizarOpcao(req: Request, res: Response) {
    try {
      const opcaoId = parseInt(String(req.params.opcaoId), 10);
      const { palavraChave, destinoId, fluxoId } = req.body;
      const ok = await chatbotService.atualizarOpcao(opcaoId, palavraChave, parseInt(String(destinoId), 10));
      const fluxo = fluxoId ? await chatbotService.obterFluxo(fluxoId) : null;
      return res.json({ sucesso: ok, fluxo });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async excluirOpcao(req: Request, res: Response) {
    try {
      const opcaoId = parseInt(String(req.params.opcaoId), 10);
      const { fluxoId } = req.body;
      const ok = await chatbotService.excluirOpcao(opcaoId);
      const fluxo = fluxoId ? await chatbotService.obterFluxo(fluxoId) : null;
      return res.json({ sucesso: ok, fluxo });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async excluirNo(req: Request, res: Response) {
    try {
      const noId = parseInt(String(req.params.noId), 10);
      const { fluxoId } = req.body;
      const ok = await chatbotService.excluirNo(noId);
      const fluxo = fluxoId ? await chatbotService.obterFluxo(fluxoId) : null;
      return res.json({ sucesso: ok, fluxo });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }
}

export const fluxoController = new FluxoController();
