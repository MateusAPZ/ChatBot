import twilio from 'twilio';
import { config } from '../config/env';

export class TwilioWhatsAppService {
  private client: twilio.Twilio | null = null;

  constructor() {
    if (this.estaConfigurado) {
      this.client = twilio(config.whatsapp.twilio.accountSid, config.whatsapp.twilio.authToken);
    }
  }

  get estaConfigurado(): boolean {
    const tw = config.whatsapp.twilio;
    return !!(tw.accountSid && tw.authToken);
  }

  get numeroRemetente(): string {
    return config.whatsapp.twilio.numeroRemetente;
  }

  normalizarTelefone(telefone: string): string {
    if (!telefone) return '';
    const semPrefixo = telefone.replace(/whatsapp:/gi, '');
    return semPrefixo.replace(/[^\d]/g, '');
  }

  formatarParaTwilio(telefone: string): string {
    const limpo = (telefone || '').trim();
    if (limpo.toLowerCase().startsWith('whatsapp:')) return limpo;
    const digitos = limpo.replace(/[^\d]/g, '');
    return `whatsapp:+${digitos}`;
  }

  async enviarMensagem(telefone: string, mensagem: string): Promise<{ sucesso: boolean; erro?: string }> {
    if (!this.estaConfigurado || !this.client) {
      return { sucesso: false, erro: 'WhatsApp não configurado. Preencha as credenciais da Twilio no .env.' };
    }

    if (!telefone || !mensagem) {
      return { sucesso: false, erro: 'Informe o número de destino e o texto da mensagem.' };
    }

    try {
      await this.client.messages.create({
        from: this.formatarParaTwilio(this.numeroRemetente),
        to: this.formatarParaTwilio(telefone),
        body: mensagem
      });
      return { sucesso: true };
    } catch (err: any) {
      console.error('Falha ao enviar mensagem via Twilio:', err.message);
      return { sucesso: false, erro: err.message };
    }
  }

  validarAssinatura(url: string, params: Record<string, any>, signature?: string): boolean {
    if (!config.whatsapp.validarAssinatura) return true;
    const token = config.whatsapp.twilio.authToken;
    if (!token || !signature) return false;
    return twilio.validateRequest(token, signature, url, params);
  }
}

export const twilioWhatsAppService = new TwilioWhatsAppService();
