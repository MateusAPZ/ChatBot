let app;

try {
  const server = require('../backend/dist/server');
  app = server.default || server.app;
} catch (err) {
  console.error('Erro ao carregar app serverless no Vercel:', err);
  const express = require('express');
  app = express();
  app.use(express.json());
  app.all('*', (req, res) => {
    res.status(500).json({
      sucesso: false,
      erro: 'Falha ao inicializar API no Vercel',
      detalhes: err.message,
      stack: err.stack
    });
  });
}

module.exports = app;
