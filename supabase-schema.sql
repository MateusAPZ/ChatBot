-- ==============================================================
-- Script de Inicialização do Banco de Dados para Supabase
-- Chatbot Studio WhatsApp Business (React + Node.js)
-- ==============================================================

-- 1. Tabela de Fluxos
CREATE TABLE IF NOT EXISTS "Fluxos" (
  "Id" SERIAL PRIMARY KEY,
  "Nome" TEXT NOT NULL,
  "Status" BOOLEAN NOT NULL DEFAULT true,
  "DataCriacao" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "EhPadrao" BOOLEAN NOT NULL DEFAULT false
);

-- 2. Tabela de Mensagens
CREATE TABLE IF NOT EXISTS "Mensagens" (
  "Id" SERIAL PRIMARY KEY,
  "Conteudo" TEXT NOT NULL
);

-- 3. Tabela de Nós / Passos do Fluxo (FluxoMensagens)
CREATE TABLE IF NOT EXISTS "FluxoMensagens" (
  "Id" SERIAL PRIMARY KEY,
  "FluxoId" INT NOT NULL REFERENCES "Fluxos"("Id") ON DELETE CASCADE,
  "MensagemId" INT NOT NULL REFERENCES "Mensagens"("Id") ON DELETE CASCADE,
  "EhInicio" BOOLEAN NOT NULL DEFAULT false,
  "Titulo" TEXT NOT NULL DEFAULT '',
  "PosX" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "PosY" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "ProximaFluxoMensagemId" INT REFERENCES "FluxoMensagens"("Id") ON DELETE SET NULL
);

-- 4. Tabela de Respostas / Opções de Menu
CREATE TABLE IF NOT EXISTS "Respostas" (
  "Id" SERIAL PRIMARY KEY,
  "FluxoMensagemAtualId" INT NOT NULL REFERENCES "FluxoMensagens"("Id") ON DELETE CASCADE,
  "PalavraChave" TEXT NOT NULL,
  "ProximaFluxoMensagemId" INT NOT NULL REFERENCES "FluxoMensagens"("Id") ON DELETE CASCADE
);

-- 5. Tabela de Conversas
CREATE TABLE IF NOT EXISTS "Conversas" (
  "Id" SERIAL PRIMARY KEY,
  "Protocolo" TEXT NOT NULL,
  "TelefoneUsuario" TEXT NOT NULL,
  "NomeContato" TEXT,
  "Canal" TEXT NOT NULL DEFAULT 'whatsapp',
  "FluxoId" INT REFERENCES "Fluxos"("Id") ON DELETE SET NULL,
  "FluxoMensagemAtualId" INT REFERENCES "FluxoMensagens"("Id") ON DELETE SET NULL,
  "Finalizada" BOOLEAN NOT NULL DEFAULT false,
  "DataInicio" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "DataUltimaInteracao" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tabela de Histórico de Mensagens
CREATE TABLE IF NOT EXISTS "HistoricoMensagens" (
  "Id" SERIAL PRIMARY KEY,
  "ConversaId" INT NOT NULL REFERENCES "Conversas"("Id") ON DELETE CASCADE,
  "Direcao" TEXT NOT NULL,
  "Conteudo" TEXT NOT NULL,
  "DataEnvio" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para alta performance
CREATE INDEX IF NOT EXISTS "idx_fluxomensagens_fluxoid" ON "FluxoMensagens"("FluxoId");
CREATE INDEX IF NOT EXISTS "idx_respostas_fluxomensagematualid" ON "Respostas"("FluxoMensagemAtualId");
CREATE INDEX IF NOT EXISTS "idx_conversas_telefone_canal" ON "Conversas"("TelefoneUsuario", "Canal");
CREATE INDEX IF NOT EXISTS "idx_historico_conversaid" ON "HistoricoMensagens"("ConversaId");

-- ==============================================================
-- Carga Inicial (Fluxo de Exemplo Padrão)
-- ==============================================================
DO $$
DECLARE
  v_fluxo_id INT;
  v_msg1_id INT;
  v_msg2_id INT;
  v_msg3_id INT;
  v_msg4_id INT;
  v_no1_id INT;
  v_no2_id INT;
  v_no3_id INT;
  v_no4_id INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Fluxos" LIMIT 1) THEN
    -- Inserir fluxo principal
    INSERT INTO "Fluxos" ("Nome", "Status", "DataCriacao", "EhPadrao")
    VALUES ('Fluxo de Atendimento Principal', true, NOW(), true)
    RETURNING "Id" INTO v_fluxo_id;

    -- Inserir mensagens
    INSERT INTO "Mensagens" ("Conteudo") VALUES ('Olá! 👋 Seja bem-vindo ao Chatbot Studio.

Digite *1* para Suporte
Digite *2* para Financeiro
Digite *3* para Encerrar') RETURNING "Id" INTO v_msg1_id;

    INSERT INTO "Mensagens" ("Conteudo") VALUES ('Você escolheu *Suporte* 🛠️. Em instantes um de nossos especialistas irá te responder.') RETURNING "Id" INTO v_msg2_id;
    INSERT INTO "Mensagens" ("Conteudo") VALUES ('Você escolheu *Financeiro* 💳. Para consultar boletos ou pagamentos, envie o CPF.') RETURNING "Id" INTO v_msg3_id;
    INSERT INTO "Mensagens" ("Conteudo") VALUES ('Atendimento finalizado com sucesso. Se precisar de algo mais, basta nos mandar uma mensagem! 👋') RETURNING "Id" INTO v_msg4_id;

    -- Inserir nós
    INSERT INTO "FluxoMensagens" ("FluxoId", "MensagemId", "EhInicio", "Titulo", "PosX", "PosY")
    VALUES (v_fluxo_id, v_msg1_id, true, 'Boas-vindas', 120, 160) RETURNING "Id" INTO v_no1_id;

    INSERT INTO "FluxoMensagens" ("FluxoId", "MensagemId", "EhInicio", "Titulo", "PosX", "PosY")
    VALUES (v_fluxo_id, v_msg2_id, false, 'Suporte', 480, 100) RETURNING "Id" INTO v_no2_id;

    INSERT INTO "FluxoMensagens" ("FluxoId", "MensagemId", "EhInicio", "Titulo", "PosX", "PosY")
    VALUES (v_fluxo_id, v_msg3_id, false, 'Financeiro', 480, 280) RETURNING "Id" INTO v_no3_id;

    INSERT INTO "FluxoMensagens" ("FluxoId", "MensagemId", "EhInicio", "Titulo", "PosX", "PosY")
    VALUES (v_fluxo_id, v_msg4_id, false, 'Encerramento', 480, 460) RETURNING "Id" INTO v_no4_id;

    -- Inserir opções do menu
    INSERT INTO "Respostas" ("FluxoMensagemAtualId", "PalavraChave", "ProximaFluxoMensagemId") VALUES (v_no1_id, '1', v_no2_id);
    INSERT INTO "Respostas" ("FluxoMensagemAtualId", "PalavraChave", "ProximaFluxoMensagemId") VALUES (v_no1_id, 'suporte', v_no2_id);
    INSERT INTO "Respostas" ("FluxoMensagemAtualId", "PalavraChave", "ProximaFluxoMensagemId") VALUES (v_no1_id, '2', v_no3_id);
    INSERT INTO "Respostas" ("FluxoMensagemAtualId", "PalavraChave", "ProximaFluxoMensagemId") VALUES (v_no1_id, 'financeiro', v_no3_id);
    INSERT INTO "Respostas" ("FluxoMensagemAtualId", "PalavraChave", "ProximaFluxoMensagemId") VALUES (v_no1_id, '3', v_no4_id);
    INSERT INTO "Respostas" ("FluxoMensagemAtualId", "PalavraChave", "ProximaFluxoMensagemId") VALUES (v_no1_id, 'sair', v_no4_id);
  END IF;
END $$;
