import crypto from 'crypto';
import { Usuario } from '../types';

interface PayloadToken {
  id: number;
  usuario: string;
  nome: string;
  email: string;
  perfil: 'admin' | 'atendente';
  cargo: string;
  exp: number; // timestamp em ms
}

const JWT_SECRET = process.env.JWT_SECRET || 'pet-saude-pirai-auth-secret-key-2026';
const DURACAO_TOKEN_MS = 24 * 60 * 60 * 1000; // 24 horas de sessão

export class AuthService {
  private usuariosPadrao: (Usuario & { senhaHashOuTexto: string })[] = [
    {
      id: 1,
      usuario: 'admin',
      nome: 'Administrador (Coordenação)',
      email: 'admin@pirai.rj.gov.br',
      perfil: 'admin',
      cargo: 'Coordenação Geral PET-Saúde',
      senhaHashOuTexto: process.env.ADMIN_PASSWORD || 'admin123'
    },
    {
      id: 2,
      usuario: 'saude',
      nome: 'Equipe de Saúde da Família',
      email: 'saude@pirai.rj.gov.br',
      perfil: 'atendente',
      cargo: 'Atendimento USF / SUS Piraí',
      senhaHashOuTexto: process.env.SAUDE_PASSWORD || 'saude123'
    },
    {
      id: 3,
      usuario: 'atendente',
      nome: 'Atendimento & Ouvidoria',
      email: 'atendimento@pirai.rj.gov.br',
      perfil: 'atendente',
      cargo: 'Ouvidoria Municipal de Saúde',
      senhaHashOuTexto: 'atendente123'
    }
  ];

  /**
   * Valida credenciais e gera token de sessão autenticada
   */
  autenticar(identificador: string, senhaDigitada: string): { token: string; usuario: Usuario } | null {
    if (!identificador || !senhaDigitada) return null;

    const loginLimpo = identificador.trim().toLowerCase();
    const senhaLimpa = senhaDigitada.trim();

    const usuarioEncontrado = this.usuariosPadrao.find(
      u => u.usuario.toLowerCase() === loginLimpo || u.email.toLowerCase() === loginLimpo
    );

    if (!usuarioEncontrado) return null;

    if (usuarioEncontrado.senhaHashOuTexto !== senhaLimpa) {
      return null;
    }

    const { senhaHashOuTexto, ...usuarioDados } = usuarioEncontrado;
    const token = this.gerarToken(usuarioDados);

    return {
      token,
      usuario: usuarioDados
    };
  }

  /**
   * Gera token assinado via HMAC SHA-256
   */
  private gerarToken(usuario: Usuario): string {
    const payload: PayloadToken = {
      ...usuario,
      exp: Date.now() + DURACAO_TOKEN_MS
    };

    const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const assinatura = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    return `${headerB64}.${payloadB64}.${assinatura}`;
  }

  /**
   * Valida assinatura e expiração do token
   */
  verificarToken(token: string): Usuario | null {
    if (!token) return null;

    try {
      const partes = token.split('.');
      if (partes.length !== 3) return null;

      const [headerB64, payloadB64, assinatura] = partes;

      const assinaturaEsperada = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(assinaturaEsperada))) {
        return null;
      }

      const payload: PayloadToken = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));

      if (Date.now() > payload.exp) {
        return null; // Token expirado
      }

      return {
        id: payload.id,
        usuario: payload.usuario,
        nome: payload.nome,
        email: payload.email,
        perfil: payload.perfil,
        cargo: payload.cargo
      };
    } catch {
      return null;
    }
  }

  /**
   * Retorna lista de contas disponíveis para informação no painel
   */
  obterContasDisponiveis() {
    return this.usuariosPadrao.map(u => ({
      usuario: u.usuario,
      nome: u.nome,
      perfil: u.perfil,
      cargo: u.cargo
    }));
  }
}

export const authService = new AuthService();
