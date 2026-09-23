import { Request, Response } from 'express';
import { config } from '../config/env';
import { chatbotService } from '../services/ChatbotService';
import { metaWhatsAppService } from '../services/MetaWhatsAppService';
import { twilioWhatsAppService } from '../services/TwilioWhatsAppService';

export class WebhookController {
  // -------------------------------------------------------------
  // Meta Cloud API Webhook
  // -------------------------------------------------------------

  metaVerificar(req: Request, res: Response) {
    const modo = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const desafio = req.query['hub.challenge'] as string;

    if (!modo && !token) {
      return res.json({
        status: 'online',
        provedor: config.whatsapp.provedor,
        configurado: metaWhatsAppService.estaConfigurado,
        mensagem: 'Webhook pronto. Cadastre esta URL no painel da Meta.'
      });
    }

    const esperado = config.whatsapp.meta.verifyToken;
    if (modo === 'subscribe' && esperado && token === esperado) {
      console.log('Webhook da Meta verificado com sucesso.');
      return res.type('text/plain').send(desafio || '');
    }

    console.warn('Verificação do webhook da Meta recusada (token não confere).');
    return res.status(403).send('Forbidden');
  }

  async metaReceber(req: Request, res: Response) {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const assinatura = req.header('x-hub-signature-256');

    if (!metaWhatsAppService.validarAssinatura(rawBody, assinatura)) {
      console.warn('Webhook da Meta recusado: assinatura inválida.');
      return res.status(403).send('Forbidden');
    }

    const mensagensRecebidas = this.extrairMensagensMeta(req.body);

    for (const msg of mensagensRecebidas) {
      console.log(`WhatsApp recebido de ${msg.telefone}: ${msg.texto}`);

      try {
        const resposta = await chatbotService.processarMensagem(
          msg.telefone,
          msg.texto,
          'whatsapp',
          msg.nome || undefined
        );

        for (const textoResposta of resposta.mensagens) {
          const envio = await metaWhatsAppService.enviarMensagem(msg.telefone, textoResposta);
          if (!envio.sucesso) {
            console.error(`Não foi possível responder ${msg.telefone}:`, envio.erro);
            break;
          }
        }
      } catch (err: any) {
        console.error('Erro ao processar mensagem do webhook da Meta:', err);
      }
    }

    return res.status(200).send('EVENT_RECEIVED');
  }

  private extrairMensagensMeta(corpo: any): { telefone: string; texto: string; nome?: string }[] {
    const resultado: { telefone: string; texto: string; nome?: string }[] = [];
    if (!corpo || !corpo.entry) return resultado;

    try {
      for (const entry of corpo.entry) {
        if (!entry.changes) continue;
        for (const change of entry.changes) {
          const value = change.value;
          if (!value || !value.messages) continue;

          let nome: string | undefined;
          if (value.contacts && value.contacts.length > 0) {
            nome = value.contacts[0]?.profile?.name;
          }

          for (const msg of value.messages) {
            const de = msg.from;
            if (!de) continue;

            let texto = '';
            if (msg.type === 'text') {
              texto = msg.text?.body || '';
            } else if (msg.type === 'button') {
              texto = msg.button?.text || '';
            } else if (msg.type === 'interactive') {
              texto = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
            }

            resultado.push({
              telefone: metaWhatsAppService.normalizarTelefone(de),
              texto,
              nome
            });
          }
        }
      }
    } catch (e) {
      console.error('Erro ao interpretar payload da Meta:', e);
    }

    return resultado;
  }

  // -------------------------------------------------------------
  // Twilio Webhook
  // -------------------------------------------------------------

  twilioStatus(req: Request, res: Response) {
    return res.json({
      status: 'online',
      provedor: config.whatsapp.provedor,
      configurado: twilioWhatsAppService.estaConfigurado,
      mensagem: 'Webhook pronto. Aponte esta URL no console da Twilio (método POST).'
    });
  }

  async twilioReceber(req: Request, res: Response) {
    const form = req.body || {};
    const signature = req.header('x-twilio-signature');

    const protocol = req.protocol;
    const host = req.get('host');
    const url = config.whatsapp.urlPublica
      ? config.whatsapp.urlPublica.replace(/\/+$/, '')
      : `${protocol}://${host}${req.originalUrl}`;

    if (!twilioWhatsAppService.validarAssinatura(url, form, signature)) {
      console.warn('Webhook do WhatsApp Twilio recusado: assinatura inválida.');
      return res.status(403).send('Forbidden');
    }

    const de = form.From || '';
    const corpo = form.Body || '';
    const nomeContato = form.ProfileName || undefined;

    const telefone = twilioWhatsAppService.normalizarTelefone(de);
    if (!telefone) {
      return res.type('application/xml').send('<Response></Response>');
    }

    console.log(`Twilio WhatsApp recebido de ${telefone}: ${corpo}`);

    const resposta = await chatbotService.processarMensagem(
      telefone,
      corpo,
      'whatsapp',
      nomeContato
    );

    let twiml = '<Response>';
    for (const msg of resposta.mensagens) {
      twiml += `<Message>${this.escapeXml(msg)}</Message>`;
    }
    twiml += '</Response>';

    return res.type('application/xml').send(twiml);
  }

  twilioStatusEntrega(req: Request, res: Response) {
    const { MessageStatus, To } = req.body || {};
    console.log(`Status de entrega Twilio: ${MessageStatus} para ${To}`);
    return res.status(200).send('OK');
  }

  private escapeXml(unsafe: string): string {
    return (unsafe || '').replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
}

export const webhookController = new WebhookController();
