# ARGOS · Back end

API em Flask com banco SQLite e o assistente de IA **Argo** (Claude, da Anthropic).

## Como rodar
```bash
python -m venv venv
venv\Scripts\activate          # Windows  (Linux/Mac: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env         # Linux/Mac: cp .env.example .env  → coloque sua ANTHROPIC_API_KEY
python app.py
```
Abra http://localhost:5000 (o Flask também serve o site da pasta `static/`).

## Rotas
| Método | Rota | Corpo (JSON) | Resposta |
|---|---|---|---|
| GET | `/api/produtos` | – | lista de produtos (alimenta os cards) |
| POST | `/api/contato` | `nome`, `email`, `mensagem` | 201 `{ok:true}` |
| POST | `/api/pedidos` | `nome`, `email`, `produto_id`, `quantidade` | 201 `{ok:true, pedido:id}` |
| POST | `/api/chat` | `mensagem`, `historico:[{role,content}]` | `{resposta}` |

## Integração com IA
A rota `/api/chat` (em `chatbot.py`) envia a mensagem para a API do Claude com um *system prompt* (`persona.py`) que define a persona **Argo**, as regras de escopo e o catálogo atual lido do banco. Assim o assistente só fala da ARGOS e do A.T.L.A.S. e recusa assuntos fora do contexto. A chave fica só no servidor (`.env`), nunca no navegador.

## Exemplo para o front end
```js
// chat
const r = await fetch('/api/chat', {method:'POST', headers:{'Content-Type':'application/json'},
  body: JSON.stringify({mensagem: texto, historico})});
const {resposta} = await r.json();
historico.push({role:'user',content:texto},{role:'assistant',content:resposta});

// cards de produtos
const produtos = await (await fetch('/api/produtos')).json();
// preço: (p.preco_centavos/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
```

## Estrutura
```
app.py           rotas da loja e banco de dados (SQLite)
chatbot.py       rota /api/chat e chamada à API de IA
persona.py       persona e regras do Argo
static/          front end (index.html, css, js)
requirements.txt dependências
.env.example     modelo de variáveis (copie para .env)
```

## Publicar na internet (Render, plano gratuito)
1. Em https://render.com, entre com sua conta do GitHub.
2. **New → Blueprint** e escolha este repositório (o `render.yaml` configura tudo).
3. Quando pedir, informe a variável `ANTHROPIC_API_KEY` com sua chave real (ela fica só no painel do Render, nunca no GitHub).
4. Aguarde o deploy; o Render dá um endereço `https://argos-xxxx.onrender.com` que abre em qualquer computador.

Observações do plano gratuito: o site "dorme" após alguns minutos sem acesso (o primeiro acesso demora ~1 min) e o disco é temporário, então `argos.db` é recriado a cada deploy/reinício (pedidos e mensagens de contato não são preservados). Para guardar dados de verdade, use um disco persistente (plano pago) ou um banco externo.
O chat tem limite por IP (padrão 20 mensagens a cada 10 min; ajuste com `CHAT_LIMITE`) para proteger sua cota da API.
