import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5277', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/pesquisa_usuarios',
  whatsapp: {
    provedor: process.env.WHATSAPP_PROVEDOR || 'Meta',
    validarAssinatura: process.env.WHATSAPP_VALIDAR_ASSINATURA === 'true',
    urlPublica: process.env.WHATSAPP_URL_PUBLICA || '',
    meta: {
      phoneNumberId: process.env.META_PHONE_NUMBER_ID || '',
      accessToken: process.env.META_ACCESS_TOKEN || '',
      verifyToken: process.env.META_VERIFY_TOKEN || 'pesquisa-whats-2026',
      appSecret: process.env.META_APP_SECRET || '',
      versaoApi: process.env.META_VERSAO_API || 'v21.0',
      numeroExibicao: process.env.META_NUMERO_EXIBICAO || ''
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      numeroRemetente: process.env.TWILIO_NUMERO_REMETENTE || 'whatsapp:+14155238886'
    }
  }
};
