# ARGOS · A.T.L.A.S.

Site completo de apresentação e venda do **A.T.L.A.S.** (Sistema de Assistência em Terapia e Locomoção Adaptativa), um robô controlado por gestos das mãos que apoia a terapia motora. O projeto é da startup fictícia **ARGOS**, de Teresina (PI), e inclui um assistente de Inteligência Artificial com persona própria, o **Argo**.

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

- **Produto:** o A.T.L.A.S. (físico) e uma assinatura de relatórios de evolução motora gerados por IA (digital).
- **Público-alvo:** clínicas, terapeutas e famílias que buscam uma terapia motora mais engajadora e mensurável.

## 🛠️ Tecnologias Utilizadas

- **Front end:** HTML5, CSS3 (`grid`, `flex`, layout responsivo) e JavaScript puro.
- **Back end:** Python 3 com Flask e Flask-CORS.
- **Banco de dados:** SQLite.
- **Inteligência Artificial:** API da Groq (modelo `openai/gpt-oss-20b`, plano gratuito).
- **Servidor de produção:** Gunicorn.
- **Hospedagem:** Render.
- **Versionamento:** Git e GitHub.

## ✨ Principais funcionalidades

- **Site com navegação funcional:** cabeçalho com logomarca, menu com as seções Sobre, A.T.L.A.S., Produtos, Equipe e Contato, e rodapé.
- **Demonstração de gestos:** o visitante escolhe um gesto da mão e vê como o robô reage.
- **Produtos em cards:** carregados do banco de dados pela API.
- **Formulário de pedido:** escolhe o produto, informa nome, e-mail e quantidade; o pedido é gravado no banco.
- **Formulário de contato:** a mensagem é validada e gravada no banco.
- **Chat com o Argo:** assistente de IA para tirar dúvidas sobre a ARGOS, o A.T.L.A.S., os produtos e o uso do site.
- **Acessibilidade e responsividade:** link "ir para o conteúdo", foco visível e layout que se adapta a telas pequenas.

## 🤖 Integração com Inteligência Artificial

O chat do site usa a rota `POST /api/chat` (arquivo `chatbot.py`), que envia a conversa para a API da Groq. A chave da API fica **somente no servidor** (variável de ambiente `GROQ_API_KEY`), nunca no navegador.

**Persona (`persona.py`):** o **Argo** é o assistente virtual da ARGOS. O nome vem do gigante grego de cem olhos, e o perfil é atento, acolhedor, claro e paciente. Responde em português do Brasil, com frases curtas e no máximo 4 frases.

**Contexto e regras do Argo:**
- Só ajuda com a ARGOS, o A.T.L.A.S., como funciona, produtos e planos, como comprar e como usar o site.
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
├── app.py              # Servidor Flask: rotas da API, banco SQLite e entrega do site
├── chatbot.py          # Rota /api/chat e integração com a API da Groq
├── persona.py          # Persona e regras do assistente Argo
├── requirements.txt    # Dependências do Python
├── render.yaml         # Configuração de deploy no Render
├── .env.example        # Modelo das variáveis de ambiente (sem chave real)
├── .gitignore          # Arquivos que não vão para o GitHub (.env, banco etc.)
├── BACKEND.md          # Documentação técnica complementar do back end
├── README.md           # Este arquivo
└── static/
    ├── index.html      # Página do site (estrutura e estilos)
    └── script.js       # Comportamento: gestos, formulários, produtos e chat
```

O arquivo `argos.db` (SQLite) é criado automaticamente na primeira execução, com os 3 produtos de demonstração.

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

# 4. Configurar a chave da IA
copy .env.example .env           # Windows  (Linux/Mac: cp .env.example .env)
# abra o arquivo .env e coloque sua GROQ_API_KEY

# 5. Rodar
python app.py
```

Abra **http://localhost:5000** no navegador. O Flask também serve o site da pasta `static/`.

**Chave gratuita da Groq:** crie uma conta em https://console.groq.com/keys e gere uma chave (começa com `gsk_`). Sem a chave, o site funciona normalmente, mas o chat responde que está indisponível.

**Variáveis de ambiente (`.env`):**

| Variável | Para que serve |
|---|---|
| `GROQ_API_KEY` | Chave da API da Groq (obrigatória para o chat) |
| `GROQ_MODEL` | Modelo usado (padrão: `openai/gpt-oss-20b`) |
| `CHAT_LIMITE` | Mensagens por IP a cada 10 minutos (padrão: 20) |

> Nunca envie o arquivo `.env` para o GitHub. O `.gitignore` já o protege.

## 🔌 Rotas da API

| Método | Rota | Corpo (JSON) | Resposta |
|---|---|---|---|
| GET | `/api/produtos` | – | Lista de produtos (alimenta os cards) |
| POST | `/api/contato` | `nome`, `email`, `mensagem` | 201 `{ok: true}` |
| POST | `/api/pedidos` | `nome`, `email`, `produto_id`, `quantidade` | 201 `{ok: true, pedido: id}` |
| POST | `/api/chat` | `mensagem`, `historico: [{role, content}]` | `{resposta}` |

## ☁️ Publicação (Render)

O arquivo `render.yaml` configura o deploy. No Render, use **New → Blueprint**, escolha este repositório e informe a `GROQ_API_KEY` no painel. A cada mudança na branch `main`, o Render atualiza o site automaticamente. Mais detalhes em [BACKEND.md](BACKEND.md).

No plano gratuito o disco é temporário: o `argos.db` é recriado a cada reinício, então pedidos e mensagens de contato não são preservados.

## ⚠️ Direitos Autorais e Licença (Copyright)
**Todos os direitos reservados.**

Este código é de propriedade estritamente privada. O código-fonte está visível publicamente no GitHub, mas **NÃO é de código aberto (Open Source)**.

Fica expressamente proibido:
* Copiar, duplicar ou clonar qualquer parte do código.
* Modificar ou criar projetos derivados.
* Usar o design, imagens ou textos para fins comerciais ou privados.

Caso queira utilizar qualquer parte deste projeto, entre em contato para solicitar permissão.
