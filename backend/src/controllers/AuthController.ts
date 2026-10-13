import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService';

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { usuario, email, senha } = req.body;
      const identificador = usuario || email;

      if (!identificador || !senha) {
        return res.status(400).json({
          sucesso: false,
          erro: 'Informe o usuário/e-mail e a senha.'
        });
      }

      const resultado = authService.autenticar(identificador, senha);

      if (!resultado) {
        return res.status(401).json({
          sucesso: false,
          erro: 'Usuário ou senha incorretos. Verifique suas credenciais.'
        });
      }

      return res.json({
        sucesso: true,
        token: resultado.token,
        usuario: resultado.usuario
      });
    } catch (err: any) {
      console.error('Erro no login:', err);
      return res.status(500).json({ sucesso: false, erro: 'Erro interno ao autenticar.' });
    }
  }

  async me(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ sucesso: false, erro: 'Token não fornecido.' });
      }

      const token = authHeader.split(' ')[1];
      const usuario = authService.verificarToken(token);

      if (!usuario) {
        return res.status(401).json({ sucesso: false, erro: 'Sessão inválida ou expirada.' });
      }

      return res.json({
        sucesso: true,
        usuario
      });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err.message });
    }
  }

  async logout(_req: Request, res: Response) {
    return res.json({ sucesso: true, mensagem: 'Sessão encerrada com sucesso.' });
  }

  /**
   * Middleware para proteger endpoints da API
   */
  middleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Acesso restrito. Faça login para continuar.'
      });
    }

    const token = authHeader.split(' ')[1];
    const usuario = authService.verificarToken(token);

    if (!usuario) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Sessão expirada. Faça login novamente.'
      });
    }

    (req as any).user = usuario;
    next();
  }
}

export const authController = new AuthController();
