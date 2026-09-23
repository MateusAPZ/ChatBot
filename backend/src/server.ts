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

// -------------------------------------------------------------
// Rotas da API REST
// -------------------------------------------------------------

// 1. Fluxos
app.get('/api/fluxos', (req, res) => fluxoController.listar(req, res));
app.post('/api/fluxos', (req, res) => fluxoController.criar(req, res));
app.get('/api/fluxos/:id', (req, res) => fluxoController.obter(req, res));
app.put('/api/fluxos/:id/renomear', (req, res) => fluxoController.renomear(req, res));
app.post('/api/fluxos/:id/status', (req, res) => fluxoController.alternarStatus(req, res));
app.post('/api/fluxos/:id/padrao', (req, res) => fluxoController.definirPadrao(req, res));
app.delete('/api/fluxos/:id', (req, res) => fluxoController.excluir(req, res));

// Nós do Fluxo
app.post('/api/fluxos/:id/nos', (req, res) => fluxoController.criarNo(req, res));
app.put('/api/fluxos/nos/:noId', (req, res) => fluxoController.atualizarNo(req, res));
app.post('/api/fluxos/nos/:noId/posicao', (req, res) => fluxoController.salvarPosicao(req, res));
app.post('/api/fluxos/salvar-posicoes', (req, res) => fluxoController.salvarPosicoes(req, res));
app.post('/api/fluxos/nos/:noId/inicio', (req, res) => fluxoController.definirInicio(req, res));
app.post('/api/fluxos/conectar-sequencial', (req, res) => fluxoController.conectarSequencial(req, res));
app.post('/api/fluxos/nos/:noId/opcoes', (req, res) => fluxoController.criarOpcao(req, res));
app.put('/api/fluxos/opcoes/:opcaoId', (req, res) => fluxoController.atualizarOpcao(req, res));
app.delete('/api/fluxos/opcoes/:opcaoId', (req, res) => fluxoController.excluirOpcao(req, res));
app.delete('/api/fluxos/nos/:noId', (req, res) => fluxoController.excluirNo(req, res));

// 2. Simulador
app.get('/api/simulador/fluxos', (req, res) => simuladorController.obterFluxos(req, res));
app.post('/api/simulador/iniciar', (req, res) => simuladorController.iniciarSimulacao(req, res));
app.post('/api/simulador/mensagem', (req, res) => simuladorController.enviarMensagem(req, res));

// 3. Painel WhatsApp & Conversas
app.get('/api/whatsapp/painel', (req, res) => whatsAppController.obterPainel(req, res));
app.post('/api/whatsapp/teste', (req, res) => whatsAppController.enviarTeste(req, res));
app.get('/api/whatsapp/conversas/:id/historico', (req, res) => whatsAppController.obterHistorico(req, res));
app.post('/api/whatsapp/conversas/:id/encerrar', (req, res) => whatsAppController.encerrarConversa(req, res));

// 4. Webhooks (Meta & Twilio)
app.get('/api/whatsapp/meta', (req, res) => webhookController.metaVerificar(req, res));
app.post('/api/whatsapp/meta', (req, res) => webhookController.metaReceber(req, res));

app.get('/api/whatsapp/webhook', (req, res) => webhookController.twilioStatus(req, res));
app.post('/api/whatsapp/webhook', (req, res) => webhookController.twilioReceber(req, res));
app.post('/api/whatsapp/status', (req, res) => webhookController.twilioStatusEntrega(req, res));

// Servir frontend se estiver compilado
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next();
  });
});

// Inicialização
async function main() {
  await testConnection();
  app.listen(config.port, () => {
    console.log(`🚀 Servidor backend rodando com sucesso em http://localhost:${config.port}`);
    console.log(`📱 Webhook Meta disponível em: http://localhost:${config.port}/api/whatsapp/meta`);
    console.log(`📱 Webhook Twilio disponível em: http://localhost:${config.port}/api/whatsapp/webhook`);
  });
}

main().catch((err) => {
  console.error('Erro ao inicializar o servidor:', err);
});
