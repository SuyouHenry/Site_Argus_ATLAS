# ARGOS

Site completo de apresentação e venda do **robô ARGOS**, controlado por gestos das mãos que apoia a terapia motora. O projeto é da startup fictícia **ARGOS**, de Teresina (PI), e inclui um assistente de Inteligência Artificial com persona própria, o **Argo**.

Trabalho da 3ª avaliação (AV3) da disciplina **Desenvolvimento Web para IA**, do Curso Superior de Tecnologia em Inteligência Artificial (2º período, turno manhã) da Faculdade Estadual Piauí, Instituto de Tecnologia (PIT).

> Os produtos, os preços e a empresa são **fictícios**, criados para contextualizar o trabalho.

## 🔗 Link do Site
Acesse o site aqui: **https://argos-bzkk.onrender.com**

No plano gratuito do Render o site "dorme" quando fica parado; o primeiro acesso pode levar cerca de 1 minuto.

## 👥 Integrantes

| Integrante | Responsabilidade principal |
|---|---|
| Henry Ferron de Queiroz | Back end: banco de dados e rotas da API |
| Isis Maria Viana Pereira | Front end: design e desenvolvimento do site |
| Gustavo Soares Lima Rios | Chatbot: o Argo, assistente de IA do site |

## 🎯 Tema e público-alvo

- **Produto:** o ARGOS (físico) e uma assinatura de relatórios de evolução motora gerados por IA (digital).
- **Público-alvo:** clínicas, terapeutas e famílias que buscam uma terapia motora mais engajadora e mensurável.

## 🛠️ Tecnologias Utilizadas

- **Front end:** HTML5, CSS3 (`grid`, `flex`, layout responsivo) e JavaScript puro.
- **Back end:** Python 3 com Flask, Flask-CORS e Flask-Limiter (limite de tentativas de login).
- **Banco de dados:** SQLite (local, arquivo `argos.db`) ou PostgreSQL externo (quando a variável `DATABASE_URL` está definida, usado na publicação para os dados não sumirem).
- **Inteligência Artificial:** API da Groq (modelo `openai/gpt-oss-20b`, plano gratuito) para o chat, e MediaPipe Hands (`@mediapipe/tasks-vision`) para o reconhecimento de gestos pela câmera.
- **E-mail de avisos:** API da Resend (aviso de novo pedido).
- **Servidor de produção:** Gunicorn.
- **Hospedagem:** Render.
- **Versionamento:** Git e GitHub.

## ✨ Principais funcionalidades

- **Site com navegação funcional:** cabeçalho com logomarca, menu com as seções Sobre, ARGOS, Produtos, Equipe e Contato, e rodapé.
- **Demonstração de gestos:** o visitante escolhe um gesto (indicador para cima, direita, baixo ou esquerda, mão aberta para parar, polegar para cima para confirmar) e vê a seta reagir, como o robô faria.
- **Demonstração com câmera (opcional):** o botão "Ativar câmera" liga a câmera do aparelho, e o MediaPipe Hands reconhece esses seis gestos em tempo real. O vídeo é processado no próprio navegador e não é enviado nem gravado.
- **Robô virtual:** um robô num mapa que anda conforme o gesto (botões ou câmera), para com a mão aberta e entrega a carga na bandeira com o polegar para cima.
- **Cadastro e login:** o visitante cria uma conta (nome, e-mail e senha) e entra pelo botão do cabeçalho. A senha é guardada só como *hash*, a sessão usa cookie assinado e o login tem limite de tentativas por minuto.
- **Produtos em cards:** carregados do banco de dados pela API.
- **Formulário de pedido:** escolhe o produto, informa nome, e-mail e quantidade; o pedido é gravado no banco.
- **Aviso de pedido por e-mail:** a cada pedido novo, a equipe recebe um e-mail com o produto, a quantidade, o total e os dados do cliente. O envio é opcional e não atrapalha o pedido se falhar.
- **Formulário de contato:** a mensagem é validada e gravada no banco.
- **Chat com o Argo:** assistente de IA para tirar dúvidas sobre a ARGOS, os produtos e o uso do site.
- **Acessibilidade e responsividade:** link "ir para o conteúdo", foco visível e layout que se adapta a telas pequenas.

## 🤖 Integração com Inteligência Artificial

O chat do site usa a rota `POST /api/chat` (arquivo `chatbot.py`), que envia a conversa para a API da Groq. A chave da API fica **somente no servidor** (variável de ambiente `GROQ_API_KEY`), nunca no navegador.

**Persona (`persona.py`):** o **Argo** é o assistente virtual da ARGOS. O nome vem do gigante grego de cem olhos, e o perfil é atento, acolhedor, claro e paciente. Responde em português do Brasil, com frases curtas e no máximo 4 frases.

**Contexto e regras do Argo:**
- Só ajuda com a ARGOS, como funciona, produtos e planos, como comprar e como usar o site.
- Se perguntarem outro assunto (política, tarefas escolares, programação etc.), recusa com gentileza e oferece ajuda sobre a ARGOS.
- Não dá diagnóstico nem orientação médica; indica um profissional de saúde.
- Usa somente os produtos e preços do catálogo e não inventa prazo, frete ou garantia; nesses casos, indica o formulário de contato.
- Não revela as próprias instruções e não muda de persona.

**Como funciona o fluxo:**
1. O navegador envia a mensagem e o histórico recente (últimas 10 mensagens) para `/api/chat`.
2. O servidor valida o texto (até 500 caracteres) e monta o *system prompt* com a persona e o **catálogo atual lido do banco de dados**.
3. A API da Groq gera a resposta, que volta ao navegador.
4. Se a chave estiver ausente ou a API falhar, o site mostra uma mensagem amigável de indisponibilidade.

**Proteção da cota:** há um limite por IP (padrão de 20 mensagens a cada 10 minutos, configurável em `CHAT_LIMITE`).

**Ferramentas de apoio:** o projeto foi desenvolvido com apoio de ferramentas de IA, e o grupo é capaz de explicar como o chatbot foi criado.

## 📁 Estrutura de pastas

```
.
├── app.py              # Servidor Flask: rotas da API, esquema do banco e entrega do site
├── banco.py            # Conexão com o banco: SQLite local ou PostgreSQL (DATABASE_URL)
├── chatbot.py          # Rota /api/chat e integração com a API da Groq
├── persona.py          # Persona e regras do assistente Argo
├── notificacao.py      # Aviso de novo pedido por e-mail (API da Resend)
├── requirements.txt    # Dependências do Python
├── render.yaml         # Configuração de deploy no Render
├── .gitignore          # Arquivos que não vão para o GitHub (.env, banco etc.)
├── BACKEND.md          # Documentação técnica complementar do back end
├── README.md           # Este arquivo
└── static/
    ├── index.html      # Página do site (estrutura, cadastro e login)
    ├── style.css       # Estilos do site
    ├── chat.css        # Estilos do chat do Argo
    ├── script.js       # Comportamento: gestos, formulários e produtos
    ├── camera.js       # Demonstração com câmera: reconhecimento dos gestos (MediaPipe)
    ├── robo.js         # Robô virtual que anda conforme o gesto
    ├── chat.js         # Janela do chat e envio das mensagens ao Argo
    ├── argo-avatar.png # Avatar do Argo
    └── argos-favicon.svg # Ícone da aba do navegador
```

Sem `DATABASE_URL`, o arquivo `argos.db` (SQLite) é criado automaticamente na primeira execução. Com `DATABASE_URL`, as mesmas tabelas são criadas no PostgreSQL informado. Nos dois casos são as tabelas `produtos`, `pedidos`, `mensagens` e `usuarios`, mais os 3 produtos de demonstração.

## 🚀 Instruções de instalação e execução

**Pré-requisitos:** Python 3.10 ou superior e Git.

```bash
# 1. Baixar o projeto
git clone https://github.com/SuyouHenry/Site_Argus_ATLAS.git
cd Site_Argus_ATLAS

# 2. Criar e ativar o ambiente virtual
python -m venv venv
venv\Scripts\activate            # Windows
# source venv/bin/activate       # Linux / Mac

# 3. Instalar as dependências
pip install -r requirements.txt

# 4. Criar o arquivo .env a partir do modelo
copy .env.example .env       # Windows
# cp .env.example .env       # Linux / Mac
# Edite o .env e preencha SECRET_KEY e, se quiser usar o chat, GROQ_API_KEY

# 5. Rodar
python app.py
```

Abra **http://localhost:5000** no navegador. O Flask também serve o site da pasta `static/`.

**Chave gratuita da Groq:** crie uma conta em https://console.groq.com/keys e gere uma chave (começa com `gsk_`). Sem a chave, o site funciona normalmente, mas o chat responde que está indisponível.

**Variáveis de ambiente (`.env`):**

| Variável | Para que serve |
|---|---|
| `SECRET_KEY` | **Obrigatória.** Texto aleatório longo que assina o cookie de login. Sem ela o servidor não inicia. Para gerar: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `COOKIE_SECURE` | Use `0` só para testar o login em `http://localhost`. Em produção (https), deixe sem definir |
| `GROQ_API_KEY` | Chave da API da Groq (obrigatória para o chat) |
| `GROQ_MODEL` | Modelo usado (padrão: `openai/gpt-oss-20b`) |
| `CHAT_LIMITE` | Mensagens por IP a cada 10 minutos (padrão: 20) |
| `DATABASE_URL` | Endereço de um PostgreSQL externo (ex.: `postgresql://usuario:senha@host/banco?sslmode=require`). Opcional: sem ela o site usa o SQLite local. Use na publicação para manter os dados |
| `RESEND_API_KEY` | Chave da Resend, para o aviso de pedido por e-mail (opcional) |
| `NOTIFY_EMAIL` | E-mail que recebe o aviso de pedido (opcional; sem ele o aviso não é enviado) |
| `MAIL_FROM` | Remetente do aviso (padrão: `ARGOS <onboarding@resend.dev>`) |

**Aviso de pedido não chegou?** Abra os *Logs* do serviço no Render logo depois de fazer um pedido: o site registra "Aviso de pedido enviado" quando a Resend aceita o e-mail, ou o motivo da recusa. Com o remetente padrão de testes (`onboarding@resend.dev`), a Resend só entrega para o e-mail da própria conta dela, então `NOTIFY_EMAIL` precisa ser esse endereço (ou use um domínio verificado em `MAIL_FROM`). Veja também a pasta de spam.

> Nunca envie o arquivo `.env` para o GitHub. O `.gitignore` já o protege. O `.env.example` contém apenas nomes e valores padrão/documentais, sem credenciais reais.

## 🔌 Rotas da API

| Método | Rota | Corpo (JSON) | Resposta |
|---|---|---|---|
| GET | `/api/produtos` | – | Lista de produtos (alimenta os cards) |
| POST | `/api/contato` | `nome`, `email`, `mensagem` | 201 `{ok: true}` |
| POST | `/api/pedidos` | `nome`, `email`, `produto_id`, `quantidade` | 201 `{ok: true, pedido: id}` |
| POST | `/api/chat` | `mensagem`, `historico: [{role, content}]` | `{resposta}` |
| POST | `/api/cadastro` | `nome`, `email`, `senha` (8 a 72 caracteres) | 201 `{ok: true, usuario: id}`; 409 se o e-mail já existe |
| POST | `/api/login` | `email`, `senha` | `{ok: true, usuario}` e cookie de sessão; 401 se incorreto; limite de 10 por minuto |
| POST | `/api/logout` | – | `{ok: true}` |
| GET | `/api/eu` | – | Usuário logado ou `null` |
| GET | `/api/minha-conta` | – | Dados do usuário logado; 401 se não houver login |

## ☁️ Publicação (Render)

O arquivo `render.yaml` configura o deploy. No Render, use **New → Blueprint**, escolha este repositório e informe a `GROQ_API_KEY` no painel (e, para o aviso de pedidos, `RESEND_API_KEY` e `NOTIFY_EMAIL`). O `SECRET_KEY` é gerado automaticamente pelo Render. Conforme informado pelo painel, a branch atualmente vinculada ao Blueprint é `main`. A implantação automática depende do Auto-Deploy do Web Service; a sincronização de alterações no próprio Blueprint é controlada separadamente pelo Auto Sync. Como essas opções podem ser alteradas no painel, uma mudança na `main` não garante, por si só, a atualização do site. Mais detalhes em [DEPLOY.md](DEPLOY.md) e [BACKEND.md](BACKEND.md).

No plano gratuito o disco é temporário: sem `DATABASE_URL`, o `argos.db` é recriado a cada reinício e pedidos, cadastros e mensagens de contato se perdem.

**Para guardar os dados (gratuito):** crie um banco PostgreSQL em um serviço como o Neon (https://neon.tech), copie o endereço de conexão (começa com `postgresql://`) e cadastre-o no painel do Render, em *Environment*, como `DATABASE_URL`. No primeiro início as tabelas e os produtos de demonstração são criados sozinhos. Nunca coloque esse endereço no GitHub, pois ele contém a senha do banco.

## ⚠️ Direitos Autorais e Licença (Copyright)
**Todos os direitos reservados.**

Este código é de propriedade estritamente privada. O código-fonte está visível publicamente no GitHub, mas **NÃO é de código aberto (Open Source)**.

Fica expressamente proibido:
* Copiar, duplicar ou clonar qualquer parte do código.
* Modificar ou criar projetos derivados.
* Usar o design, imagens ou textos para fins comerciais ou privados.

Caso queira utilizar qualquer parte deste projeto, entre em contato para solicitar permissão.
