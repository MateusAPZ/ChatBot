import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env';
import { testConnection, isDbConnected } from './config/db';
import { fluxoController } from './controllers/FluxoController';
import { simuladorController } from './controllers/SimuladorController';
import { whatsAppController } from './controllers/WhatsAppController';
import { webhookController } from './controllers/WebhookController';
import { authController } from './controllers/AuthController';
import { chatbotService } from './services/ChatbotService';
import { esusService, UNIDADES_SAUDE_PIRAI } from './services/EsusService';
import { baileysWhatsAppService } from './services/BaileysWhatsAppService';

const app = express();

// Captura do corpo bruto (Buffer) para validação HMAC da Meta
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true }));

// Habilita CORS para requisições do frontend React
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-hub-signature-256', 'x-twilio-signature']
}));

// Middleware de conexão com banco de dados
app.use(async (_req, _res, next) => {
  await testConnection();
  next();
});

// Router central com todas as rotas da API
const router = express.Router();

// 0. Autenticação & Sessão Administrativa (PET-Saúde / Prefeitura de Piraí)
router.post('/auth/login', (req, res) => authController.login(req, res));
router.post('/auth/logout', (req, res) => authController.logout(req, res));
router.get('/auth/me', (req, res) => authController.me(req, res));

// Middleware de proteção para rotas administrativas internas
const autenticar = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return authController.middleware(req, res, next);
};

// Rotas protegidas (exigem cabeçalho Authorization: Bearer <token>)
router.use('/fluxos', autenticar);
router.use('/simulador', autenticar);
router.use('/esus', autenticar);
router.use('/whatsapp/painel', autenticar);
router.use('/whatsapp/teste', autenticar);
router.use('/whatsapp/conversas', autenticar);
router.use('/whatsapp/baileys', autenticar);

// 1. Fluxos
router.get('/fluxos', (req, res) => fluxoController.listar(req, res));
router.post('/fluxos', (req, res) => fluxoController.criar(req, res));
router.get('/fluxos/:id', (req, res) => fluxoController.obter(req, res));
router.put('/fluxos/:id/renomear', (req, res) => fluxoController.renomear(req, res));
router.post('/fluxos/:id/status', (req, res) => fluxoController.alternarStatus(req, res));
router.post('/fluxos/:id/padrao', (req, res) => fluxoController.definirPadrao(req, res));
router.delete('/fluxos/:id', (req, res) => fluxoController.excluir(req, res));

// Nós do Fluxo
router.post('/fluxos/:id/nos', (req, res) => fluxoController.criarNo(req, res));
router.put('/fluxos/nos/:noId', (req, res) => fluxoController.atualizarNo(req, res));
router.post('/fluxos/nos/:noId/posicao', (req, res) => fluxoController.salvarPosicao(req, res));
router.post('/fluxos/salvar-posicoes', (req, res) => fluxoController.salvarPosicoes(req, res));
router.post('/fluxos/nos/:noId/inicio', (req, res) => fluxoController.definirInicio(req, res));
router.post('/fluxos/conectar-sequencial', (req, res) => fluxoController.conectarSequencial(req, res));
router.post('/fluxos/nos/:noId/opcoes', (req, res) => fluxoController.criarOpcao(req, res));
router.put('/fluxos/opcoes/:opcaoId', (req, res) => fluxoController.atualizarOpcao(req, res));
router.delete('/fluxos/opcoes/:opcaoId', (req, res) => fluxoController.excluirOpcao(req, res));
router.delete('/fluxos/nos/:noId', (req, res) => fluxoController.excluirNo(req, res));

// 2. Simulador
router.get('/simulador/fluxos', (req, res) => simuladorController.obterFluxos(req, res));
router.post('/simulador/iniciar', (req, res) => simuladorController.iniciarSimulacao(req, res));
router.post('/simulador/mensagem', (req, res) => simuladorController.enviarMensagem(req, res));

// 3. Painel WhatsApp & Conversas
router.get('/whatsapp/painel', (req, res) => whatsAppController.obterPainel(req, res));
router.post('/whatsapp/teste', (req, res) => whatsAppController.enviarTeste(req, res));
router.get('/whatsapp/conversas/:id/historico', (req, res) => whatsAppController.obterHistorico(req, res));
router.post('/whatsapp/conversas/:id/encerrar', (req, res) => whatsAppController.encerrarConversa(req, res));
router.post('/whatsapp/conversas/:id/alternar-atendimento', (req, res) => whatsAppController.alternarAtendimento(req, res));
router.post('/whatsapp/conversas/:id/responder-atendente', (req, res) => whatsAppController.responderComoAtendente(req, res));

// 4. Webhooks (Meta & Twilio)
router.get('/whatsapp/meta', (req, res) => webhookController.metaVerificar(req, res));
router.post('/whatsapp/meta', (req, res) => webhookController.metaReceber(req, res));

router.get('/whatsapp/webhook', (req, res) => webhookController.twilioStatus(req, res));
router.post('/whatsapp/webhook', (req, res) => webhookController.twilioReceber(req, res));
router.post('/whatsapp/status', (req, res) => webhookController.twilioStatusEntrega(req, res));

// Healthcheck & Diagnóstico de Testes
router.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
router.get('/diagnostico', async (_req, res) => {
  try {
    const fluxos = await chatbotService.listarFluxos();
    return res.json({
      sucesso: true,
      status: 'online',
      armazenamento: isDbConnected ? 'PostgreSQL' : 'Memória Local (MemoryStore)',
      isDbConnected,
      totalFluxos: fluxos.length,
      provedor: config.whatsapp.provedor,
      porta: config.port,
      uptimeSegundos: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// Endpoint auxiliar para testes de webhook simulado direto da interface
router.post('/testes/webhook-simulado', async (req, res) => {
  try {
    const { telefone, texto, nome } = req.body;
    const tel = (telefone || '5511999999999').toString().trim();
    const txt = (texto || 'Olá').toString().trim();
    const resposta = await chatbotService.processarMensagem(tel, txt, 'simulador', nome || 'Cliente Teste');
    return res.json({
      sucesso: true,
      entrada: { telefone: tel, texto: txt, nome: nome || 'Cliente Teste' },
      respostaBot: resposta
    });
  } catch (err: any) {
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// 6. Integração e-SUS APS PEC (Piraí)
router.post('/esus/consultar', async (req, res) => {
  try {
    const { termo, cpf } = req.body;
    const busca = (termo || cpf || '').toString().trim();
    if (!busca) {
      return res.status(400).json({ sucesso: false, erro: 'Informe o CPF ou CNS para consulta.' });
    }
    const dados = await esusService.consultarCidadao(busca);
    return res.json({
      sucesso: true,
      valido: esusService.validarCPF(busca),
      cidadao: dados
    });
  } catch (err: any) {
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
});

router.get('/esus/unidades', (_req, res) => {
  return res.json({ sucesso: true, unidades: UNIDADES_SAUDE_PIRAI });
});

// 7. WhatsApp Web Nativo (Baileys / Zero Custo via QR Code)
router.get('/whatsapp/baileys/status', (_req, res) => {
  return res.json({ sucesso: true, ...baileysWhatsAppService.obterStatus() });
});

router.post('/whatsapp/baileys/conectar', async (_req, res) => {
  try {
    const status = await baileysWhatsAppService.iniciarConexao();
    return res.json({ sucesso: true, ...status });
  } catch (err: any) {
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
});

router.post('/whatsapp/baileys/desconectar', async (req, res) => {
  try {
    const limpar = req.body?.limparSessao === true;
    const status = await baileysWhatsAppService.desconectar(limpar);
    return res.json({ sucesso: true, ...status });
  } catch (err: any) {
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
});

// 1. Registra todas as rotas da API em /api e diretamente na raiz (compatibilidade Vercel Serverless)
app.use('/api', router);
app.use(router);

// Compatibilidade para webhooks externos sem prefixo /api (caso configurado assim em provedores)
app.post('/whatsapp/meta', (req, res) => webhookController.metaReceber(req, res));
app.get('/whatsapp/meta', (req, res) => webhookController.metaVerificar(req, res));
app.post('/whatsapp/webhook', (req, res) => webhookController.twilioReceber(req, res));
app.post('/whatsapp/status', (req, res) => webhookController.twilioStatusEntrega(req, res));

// 2. Servir frontend compilado apenas no Node local (no Vercel o Edge CDN serve frontend/dist automaticamente)
if (!process.env.VERCEL) {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));

  // Fallback SPA: qualquer rota de página (/fluxos, /fluxos/1, /fluxo/1, /whatsapp, /simulador) entrega index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
      if (err) next();
    });
  });
}

export { app };
export default app;

// Inicialização (apenas quando rodando diretamente no Node, e não como Serverless no Vercel)
if (!process.env.VERCEL) {
  testConnection().then(() => {
    app.listen(config.port, () => {
      console.log(`🚀 Servidor backend rodando com sucesso em http://localhost:${config.port}`);
      console.log(`📱 Webhook Meta disponível em: http://localhost:${config.port}/api/whatsapp/meta`);
      console.log(`📱 Webhook Twilio disponível em: http://localhost:${config.port}/api/whatsapp/webhook`);

      // Auto-reconectar WhatsApp Baileys caso já existam credenciais salvas em auth_baileys
      baileysWhatsAppService.autoConectarSeCredenciaisExistirem();
    });
  }).catch((err) => {
    console.error('Erro ao inicializar o servidor:', err);
  });
}
