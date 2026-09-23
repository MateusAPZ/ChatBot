# Chatbot Studio · WhatsApp Business (React + Node.js)

Aplicação completa para criação visual de fluxos de atendimento, simulação em tempo real e integração direta com o WhatsApp via **Meta Cloud API** (oficial) ou **Twilio**.

Este projeto foi migrado integralmente de .NET MVC para uma arquitetura moderna **Full-Stack JavaScript/TypeScript**:
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Lucide Icons + React Router.
- **Backend**: Node.js + Express + TypeScript + PostgreSQL (`pg`) + Axios + Twilio SDK.

---

## 🚀 Funcionalidades

1. **Gestão de Fluxos de Atendimento**:
   - Criação, renomeação, ativação/desativação e exclusão de fluxos.
   - Publicação de fluxo como padrão do WhatsApp com 1 clique.
   - Contadores de passos e conversas em tempo real.

2. **Construtor Visual Interativo (Flow Builder)**:
   - Canvas infinito com suporte a Pan (arrastar tela) e Zoom suave.
   - Blocos arrastáveis coloridos por tipo (*Início*, *Mensagem*, *Menu*, *Fim*).
   - Curvas Bézier dinâmicas em SVG com setas indicativas de direção.
   - Editor lateral para alteração de mensagens, títulos, próximo passo e gatilhos de menu.
   - **Auto-organização inteligente**: reposiciona os nós em camadas automáticas a partir do início.
   - Indicador de salvamento em tempo real (*"salvando..."*, *"tudo salvo"*).

3. **Simulador de Conversa WhatsApp Web**:
   - Interface inspirada no WhatsApp Web com papel de parede temático.
   - Animação de digitação realista (*typing dots*) com atraso proporcional ao tamanho da mensagem.
   - *Quick replies* (botões de respostas rápidas clicáveis para menus).
   - Comandos padrão que funcionam em qualquer ponto (`menu`, `sair`).
   - Identificação de número fictício e protocolo de atendimento.

4. **Painel WhatsApp Business & Histórico**:
   - Suporte aos provedores **Meta Cloud API** (oficial) e **Twilio**.
   - Métricas em tempo real (total de conversas, conversas ativas, mensagens trocadas).
   - Passo a passo interativo de configuração com botões de cópia rápida para Webhook URL e Verify Token.
   - Formulário para envio de mensagem de teste direta para um número.
   - Tabela de conversas recentes com modal lateral/central para ler todo o histórico de mensagens trocadas.

---

## 🛠️ Como Executar o Projeto

### Pré-requisitos
- **Node.js** (v18 ou superior instalado).
- **PostgreSQL** (opcional para testes imediatos: o backend possui armazenamento em memória inteligente que permite usar 100% da interface mesmo se o banco estiver desligado temporariamente).

### 1. Instalação das Dependências

Na raiz do projeto:
```powershell
npm install
npm run --prefix backend install
npm run --prefix frontend install
```

### 2. Executar em Modo de Desenvolvimento (Hot-Reload)

Execute o comando único na raiz para iniciar o backend e o frontend simultaneamente:
```powershell
npm run dev
```

- **Frontend React**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5277](http://localhost:5277)

*(O Vite já está configurado com proxy automático para a API REST no backend).*

---

### 3. Executar em Modo de Produção

Compile e rode o servidor backend (que também serve o build do frontend):
```powershell
npm run build
npm start
```
Abra no navegador: [http://localhost:5277](http://localhost:5277)

---

## ⚙️ Configuração de Variáveis de Ambiente

As configurações de banco e WhatsApp ficam no arquivo `backend/.env`:

```env
PORT=5277
DATABASE_URL=postgres://postgres:senha@localhost:5432/pesquisa_usuarios

# Provedor: "Meta" ou "Twilio"
WHATSAPP_PROVEDOR=Meta
WHATSAPP_VALIDAR_ASSINATURA=false
WHATSAPP_URL_PUBLICA=

# Credenciais Meta Cloud API
META_PHONE_NUMBER_ID=
META_ACCESS_TOKEN=
META_VERIFY_TOKEN=pesquisa-whats-2026
META_APP_SECRET=
META_VERSAO_API=v21.0
META_NUMERO_EXIBICAO=

# Credenciais Twilio (caso use Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_NUMERO_REMETENTE=whatsapp:+14155238886
```

---

## 🌐 Endpoints de Webhook

| Rota | Método | Descrição |
|---|---|---|
| `/api/whatsapp/meta` | `GET` | Handshake de verificação do Webhook da Meta (`hub.challenge`) e health check |
| `/api/whatsapp/meta` | `POST` | Recebe mensagens dos clientes do WhatsApp da Meta; responde via Graph API |
| `/api/whatsapp/webhook` | `GET` | Health check do Webhook da Twilio |
| `/api/whatsapp/webhook` | `POST` | Recebe mensagens dos clientes via Twilio; responde em TwiML |
| `/api/whatsapp/status` | `POST` | Callback de status de entrega de mensagens (Twilio) |
