import crypto from 'crypto';
import axios from 'axios';
import { config } from '../config/env';

export class MetaWhatsAppService {
  get estaConfigurado(): boolean {
    const meta = config.whatsapp.meta;
    return !!(meta.phoneNumberId && meta.accessToken);
  }

  get numeroRemetente(): string {
    const meta = config.whatsapp.meta;
    return meta.numeroExibicao || meta.phoneNumberId || '—';
  }

  normalizarTelefone(telefone: string): string {
    if (!telefone) return '';
    const semPrefixo = telefone.replace(/whatsapp:/gi, '');
    return semPrefixo.replace(/[^\d]/g, '');
  }

  async enviarMensagem(telefone: string, mensagem: string): Promise<{ sucesso: boolean; erro?: string }> {
    if (!this.estaConfigurado) {
      return { sucesso: false, erro: 'WhatsApp não configurado. Preencha as credenciais da Meta no .env.' };
    }

    if (!telefone || !mensagem) {
      return { sucesso: false, erro: 'Informe o número de destino e o texto da mensagem.' };
    }

    const meta = config.whatsapp.meta;
    const url = `https://graph.facebook.com/${meta.versaoApi}/${meta.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizarTelefone(telefone),
      type: 'text',
      text: { preview_url: false, body: mensagem }
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${meta.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      });

      if (response.status >= 200 && response.status < 300) {
        return { sucesso: true };
      }
      return { sucesso: false, erro: `HTTP ${response.status}` };
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message;
      console.error('Falha ao enviar mensagem via Meta WhatsApp:', msg);
      return { sucesso: false, erro: msg };
    }
  }

  validarAssinatura(corpoBruto: string, assinaturaHeader?: string): boolean {
    if (!config.whatsapp.validarAssinatura) return true;

    const segredo = config.whatsapp.meta.appSecret;
    if (!segredo) {
      console.warn('Validação de assinatura ligada, mas META_APP_SECRET está vazio.');
      return false;
    }

    if (!assinaturaHeader) return false;

    let assinatura = assinaturaHeader;
    const prefixo = 'sha256=';
    if (assinatura.toLowerCase().startsWith(prefixo)) {
      assinatura = assinatura.slice(prefixo.length);
    }

    const hmac = crypto.createHmac('sha256', segredo);
    hmac.update(corpoBruto, 'utf8');
    const calculado = hmac.digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(calculado, 'utf8'),
        Buffer.from(assinatura.toLowerCase(), 'utf8')
      );
    } catch {
      return false;
    }
  }
}

export const metaWhatsAppService = new MetaWhatsAppService();
