# Execução local e implantação

Este guia documenta a configuração que aparece no repositório ARGOS: Flask, SQLite, dependências de `requirements.txt` e serviço Render definido por `render.yaml`.

## Pré-requisitos

- Python 3.10 ou superior para execução local, conforme o `README.md`.
- Git para clonar o repositório.
- Acesso à internet para instalar as dependências e, se configurada, chamar a API da Groq ou da Resend.

No Render, `render.yaml` fixa `PYTHON_VERSION` em `3.12.3`.

## Instalação local

Clone o repositório e entre na pasta:

```bash
git clone https://github.com/SuyouHenry/Site_Argus_ATLAS.git
cd Site_Argus_ATLAS
```

Crie e ative um ambiente virtual e instale as dependências:

**Windows PowerShell:**

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

As dependências declaradas são Flask, Flask-CORS, python-dotenv, Gunicorn e Flask-Limiter. O chatbot e o aviso por e-mail usam `urllib` da biblioteca padrão; não há cliente Python separado para Groq ou Resend em `requirements.txt`.

## Ambiente local

Na raiz do projeto, copie o modelo para criar seu arquivo local:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# Linux
cp .env.example .env
```

Edite somente o `.env` local. Para gerar a `SECRET_KEY` exigida pelo Flask, execute:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Copie a saída para `SECRET_KEY` no `.env`; não publique essa saída nem o arquivo `.env`. Para desenvolvimento em `http://localhost`, o modelo já define `COOKIE_SECURE=0`. Em HTTPS, mantenha o cookie seguro habilitado (`COOKIE_SECURE=1`); esse é o padrão aplicado pelo código quando a variável não está definida.

### Variáveis de ambiente

| Variável | Necessidade e comportamento |
|---|---|
| `SECRET_KEY` | Obrigatória para iniciar a aplicação; usada para assinar sessões. |
| `COOKIE_SECURE` | `0` permite cookies de sessão em HTTP local; em produção HTTPS, use `1` ou omita para manter o padrão seguro do código. |
| `GROQ_API_KEY` | Necessária para o assistente responder pela Groq. Sem ela, o site inicia, mas a rota de chat retorna indisponibilidade. |
| `GROQ_MODEL` | Opcional; modelo padrão `openai/gpt-oss-20b`. |
| `GROQ_URL` | Opcional; endpoint padrão `https://api.groq.com/openai/v1/chat/completions`. |
| `CHAT_LIMITE` | Opcional; deve ser um inteiro positivo. Define o limite por IP a cada dez minutos; padrão `20`. Um valor não numérico pode impedir a inicialização do módulo do chatbot e da aplicação. |
| `RESEND_API_KEY` | Opcional; habilita a tentativa de envio de avisos de pedido pela Resend. |
| `NOTIFY_EMAIL` | Opcional; endereço de destino dos avisos. Sem ele, o aviso não é enviado. |
| `MAIL_FROM` | Opcional; remetente. O código usa `ARGOS <onboarding@resend.dev>` como padrão. |

O `.env.example` contém os nomes e valores documentais, sem credenciais reais. Não abra, copie para documentação ou envie o `.env` a outras pessoas ou ao Git.

## Executar localmente

Com o ambiente virtual ativo e o `.env` preenchido:

```bash
python app.py
```

Abra `http://localhost:5000`. O Flask serve o site da pasta `static/` e registra as rotas da API. Se o frontend for aberto por `file:` ou pela porta `5500`, `static/chat.js` direciona as chamadas do chatbot para `http://localhost:5000`.

## Banco SQLite

O caminho configurado em `app.py` é `<pasta do projeto>/argos.db`. Ao importar/iniciar a aplicação, `init_db()` cria as tabelas ausentes com `CREATE TABLE IF NOT EXISTS`, ativa chaves estrangeiras, cria `idx_pedidos_produto` em `pedidos(produto_id)` e insere os três produtos fictícios apenas se `produtos` estiver vazia. O banco não é um arquivo versionado para distribuição.

Na execução local, o arquivo fica na pasta do projeto. Faça cópias de segurança antes de qualquer manutenção manual e não envie bancos que possam conter pedidos, cadastros ou contatos reais.

## Implantar no Render

O `render.yaml` declara um serviço Blueprint com esta configuração:

- tipo `web`, nome `argos` e plano `free`;
- runtime Python, versão `3.12.3`;
- comando de build: `pip install -r requirements.txt`;
- comando de inicialização: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 1`.

Procedimento documentado pelo projeto:

1. Envie/tenha o repositório disponível no GitHub.
2. No Render, escolha **New → Blueprint** e selecione o repositório ARGOS. Conforme informado pelo painel, a branch atualmente vinculada ao Blueprint é `main`.
3. Revise a configuração que o Render lê de `render.yaml` e conclua a criação do serviço. O arquivo não fixa uma branch; a branch vinculada ao Blueprint e as configurações existentes no painel determinam o comportamento.
4. Configure no painel as variáveis protegidas que deseja usar. Não cole valores secretos em arquivos do repositório, documentação, issues ou logs.
5. Acompanhe o build e os logs de inicialização no painel do Render.

O YAML declara `SECRET_KEY` com geração automática (`generateValue: true`), `GROQ_MODEL` com seu padrão e variáveis não sincronizadas (`sync: false`) para `GROQ_API_KEY`, `RESEND_API_KEY` e `NOTIFY_EMAIL`. O campo `sync: false` não contém o valor dessas variáveis: elas devem ser fornecidas pelo responsável no painel quando forem usadas.

O arquivo não declara `GROQ_URL`, `CHAT_LIMITE`, `COOKIE_SECURE` ou `MAIL_FROM`. O código aplica seus padrões se não forem configuradas. Se desejar substituir esses padrões no Render, adicione a variável no painel do serviço sem alterar `render.yaml`.

### Branch e sincronização

A branch `main` é a branch atualmente vinculada ao Blueprint, conforme a informação fornecida pelo painel do Render. Essa configuração não está escrita em `render.yaml`; confirme-a no painel se o vínculo for alterado.

**Auto-Deploy do Web Service** controla se novos commits na branch vinculada iniciam a implantação da aplicação. **Auto Sync do Blueprint** controla se alterações na configuração do Blueprint, como mudanças em `render.yaml`, são sincronizadas com os recursos do Render. São controles distintos. Não há confirmação aqui de que ambos estejam habilitados no serviço atual; portanto, uma alteração na `main` não garante, por si só, que o site será atualizado. Verifique as duas configurações no painel.

### Integrações opcionais

**Groq:** informe `GROQ_API_KEY` nas variáveis protegidas do serviço. `GROQ_MODEL` já vem definido no Blueprint; `GROQ_URL` pode ser configurada manualmente se for necessário substituir o endpoint padrão. Sem a chave, a página e o restante do backend podem iniciar, mas o chatbot não responde com IA.

**Resend:** informe `RESEND_API_KEY` e `NOTIFY_EMAIL` para solicitar avisos de novos pedidos. O envio ocorre em segundo plano. A ausência dessas variáveis desativa o aviso; falhas no envio não desfazem o pedido já gravado. `MAIL_FROM` pode ser configurada manualmente; caso contrário, aplica-se o remetente padrão do código.

## Persistência no Render

**Persistência com PostgreSQL externo:** se a variável `DATABASE_URL` estiver definida no painel do Render (por exemplo, com o endereço de um banco gratuito do Neon), `banco.py` usa esse PostgreSQL no lugar do SQLite e os dados sobrevivem a reinícios e deploys. Sem a variável, vale o comportamento descrito abaixo.

O serviço definido em `render.yaml` não declara disco persistente nem ponto de montagem para o SQLite. `argos.db` é criado no caminho local indicado pelo código, dentro do filesystem do serviço. No plano Free, a instância pode entrar em suspensão após 15 minutos sem tráfego; o filesystem local é efêmero e os dados não têm persistência garantida após suspensão, reinicializações, substituição da instância ou novos deploys. **Pedidos, usuários e mensagens podem ser perdidos** nesses eventos.

Para demonstrar persistência de forma reprodutível com a configuração atual, execute localmente e verifique o mesmo arquivo SQLite após atualizar a página ou reiniciar o processo. Um disco persistente ou serviço de banco durável exigiria configuração e validação próprias; não está incluído no `render.yaml` atual.

## Segurança e manutenção

- Mantenha `.env` fora do Git; o `.gitignore` lista `.env` e `argos.db`.
- Nunca registre ou compartilhe `SECRET_KEY`, chaves Groq/Resend, senhas ou dados pessoais de clientes.
- Configure segredos diretamente no painel do Render e rotacione qualquer credencial que tenha sido exposta.
- Use HTTPS em produção e mantenha `COOKIE_SECURE` habilitado.
- As consultas SQLite do backend usam parâmetros; continue usando consultas parametrizadas ao adicionar rotas.
- O limitador de chat mantém contadores em memória do processo. Não é um limite global entre reinícios ou múltiplas instâncias.
- Em alterações no banco local, faça backup antes de manutenção. Não apague `argos.db` para “corrigir” uma implantação sem antes preservar os dados que precisar.
- A branch atualmente vinculada ao Blueprint é `main`, conforme informação do painel. Auto-Deploy do Web Service e Auto Sync do Blueprint são controles distintos; confirme no painel se estão habilitados antes de esperar uma implantação automática.

