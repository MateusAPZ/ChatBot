import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env';
import { testConnection } from './config/db';
import { fluxoController } from './controllers/FluxoController';
import { simuladorController } from './controllers/SimuladorController';
import { whatsAppController } from './controllers/WhatsAppController';
import { webhookController } from './controllers/WebhookController';

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

// 4. Webhooks (Meta & Twilio)
router.get('/whatsapp/meta', (req, res) => webhookController.metaVerificar(req, res));
router.post('/whatsapp/meta', (req, res) => webhookController.metaReceber(req, res));

router.get('/whatsapp/webhook', (req, res) => webhookController.twilioStatus(req, res));
router.post('/whatsapp/webhook', (req, res) => webhookController.twilioReceber(req, res));
router.post('/whatsapp/status', (req, res) => webhookController.twilioStatusEntrega(req, res));

// Healthcheck
router.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Registra o router tanto em /api quanto na raiz para compatibilidade total com Vercel
app.use('/api', router);
app.use('/', router);

// Servir frontend se estiver compilado (modo servidor tradicional)
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/whatsapp')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next();
  });
});

export { app };
export default app;

// Inicialização (apenas quando rodando diretamente no Node, e não como Serverless no Vercel)
if (!process.env.VERCEL) {
  testConnection().then(() => {
    app.listen(config.port, () => {
      console.log(`🚀 Servidor backend rodando com sucesso em http://localhost:${config.port}`);
      console.log(`📱 Webhook Meta disponível em: http://localhost:${config.port}/api/whatsapp/meta`);
      console.log(`📱 Webhook Twilio disponível em: http://localhost:${config.port}/api/whatsapp/webhook`);
    });
  }).catch((err) => {
    console.error('Erro ao inicializar o servidor:', err);
  });
}
