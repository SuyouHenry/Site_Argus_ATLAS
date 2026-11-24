# Chatbot Argô

Este documento descreve o funcionamento implementado do assistente virtual do ARGOS. No HTML e na interface ele aparece como **Argô**; no código da persona e nos módulos Python, o identificador usado é `Argo`.

## Finalidade

O assistente ajuda visitantes a conhecer o projeto ARGOS, o catálogo, o funcionamento demonstrativo do produto e o uso do site. Ele não substitui orientação profissional de saúde e não deve diagnosticar nem recomendar tratamentos.

## Arquivos e responsabilidades

| Arquivo | Responsabilidade observada |
|---|---|
| `static/index.html` | Estrutura do widget, mensagens iniciais, sugestões e controles da interface. Carrega `chat.css` e `chat.js`. |
| `static/chat.css` | Aparência, estados e responsividade do widget. |
| `static/chat.js` | Abre e fecha o widget, coleta mensagens, envia requisições à API e apresenta respostas e erros. |
| `chatbot.py` | Blueprint Flask com a rota `POST /api/chat`, validação, histórico, limite por IP e chamada à Groq. |
| `persona.py` | Texto da persona, escopo, tom e regras de resposta enviados como mensagem de sistema. |
| `app.py` | Cria o Flask, registra o blueprint, configura o caminho SQLite e as conexões usadas pela aplicação. |
| `.env.example` | Nomes e valores padrão/documentais das variáveis, sem credenciais reais. |

## Persona e comportamento

As instruções em `persona.py` definem o assistente como atento, acolhedor, claro e paciente, falando em português brasileiro, com frases curtas e no máximo quatro frases. O escopo é a ARGOS: seu funcionamento, produtos e planos do catálogo, solicitações e uso do site.

O prompt também instrui o assistente a recusar assuntos fora do escopo, não fornecer diagnóstico ou orientação médica, não inventar preço, prazo, frete ou garantia, encaminhar dúvidas comerciais sem resposta ao formulário de contato e não revelar as próprias instruções. Essas regras orientam o modelo; não são uma garantia técnica de que toda resposta estará correta.

## Integração com a Groq

O navegador chama `POST /api/chat`. O backend monta o conteúdo enviado ao endpoint compatível com o formato de chat completions da Groq, usando `urllib` da biblioteca padrão do Python. A chave `GROQ_API_KEY` é lida no servidor e enviada no cabeçalho de autorização; ela não faz parte do JavaScript do site.

As variáveis usadas pelo código são:

| Variável | Uso |
|---|---|
| `GROQ_API_KEY` | Credencial necessária para obter respostas do serviço. Se estiver vazia ou ausente, a chamada falha e a rota retorna indisponibilidade. |
| `GROQ_MODEL` | Modelo enviado à API. Padrão: `openai/gpt-oss-20b`. |
| `GROQ_URL` | URL do endpoint de chat completions. Padrão: `https://api.groq.com/openai/v1/chat/completions`. |
| `CHAT_LIMITE` | Número inteiro positivo de requisições permitidas por IP na janela de dez minutos. Padrão: `20`. |

O módulo converte `CHAT_LIMITE` para inteiro durante a inicialização. Um valor não numérico pode impedir a inicialização do módulo e, consequentemente, da aplicação.

A chamada envia `max_completion_tokens` igual a `800` e `reasoning_effort` igual a `low`, com timeout de 30 segundos. Erros de chave, rede, timeout ou resposta vazia são registrados pelo backend e apresentados ao visitante como indisponibilidade temporária, com HTTP 502. O chat não tem mecanismo de nova tentativa automática.

## Catálogo como contexto

Antes de cada chamada à IA, `catalogo_texto()` lê de SQLite os campos `nome`, `descricao`, `preco_centavos` e `tipo` da tabela `produtos`, em ordem de ID. O backend inclui esse texto junto às instruções da persona. Assim, nomes e preços apresentados ao modelo vêm do catálogo atual do banco, e não de uma lista separada mantida no navegador.

O catálogo é contexto informativo enviado ao modelo; o chatbot não cria pedidos nem altera produtos. Se o banco não tiver produtos, o texto do catálogo fica vazio. Os registros de demonstração são inseridos na inicialização do banco somente quando a tabela `produtos` está vazia.

## Comunicação e histórico

Em `static/chat.js`, o navegador envia JSON com `mensagem` e `historico`. Quando a página é servida pelo Flask, a URL da API é relativa ao mesmo host. Se a página for aberta por `file:` ou pela porta `5500`, o script direciona as chamadas para `http://localhost:5000`.

O histórico é mantido apenas na memória JavaScript enquanto a página está aberta. Após uma resposta bem-sucedida, o frontend acrescenta a mensagem do visitante e a resposta do assistente; não há persistência do histórico em SQLite ou armazenamento local do navegador. Cada requisição envia esse histórico recente ao backend.

O backend:

1. aceita apenas papéis `user` e `assistant`;
2. considera no máximo as dez entradas mais recentes recebidas;
3. limita o conteúdo de cada entrada histórica a 1.000 caracteres;
4. remove entradas iniciais de assistente até o histórico começar com uma mensagem de usuário;
5. envia as instruções, o catálogo, o histórico filtrado e a mensagem atual à Groq.

O histórico é fornecido pelo cliente e não é uma memória autenticada ou validada contra conversas anteriores. Uma atualização da página o reinicia.

## Validações e controle de uso

- A interface limita o campo a 500 caracteres e o backend também rejeita mensagens vazias ou maiores que 500 caracteres, com HTTP 400.
- O backend limita o número de chamadas por IP com `CHAT_LIMITE` e uma janela de 600 segundos. Ao exceder o limite, retorna HTTP 429.
- O contador é mantido em memória no processo Flask (`defaultdict`/`deque`). Ele reinicia quando o processo reinicia e não é compartilhado entre processos ou instâncias diferentes; portanto, não representa uma cota global da conta Groq.
- A interface cria os textos das mensagens com `textContent`, evitando interpretar respostas como HTML.
- O Flask também habilita CORS globalmente em `app.py`. O frontend normalmente usa o mesmo host quando o site é servido pela aplicação.

## Limitações conhecidas e melhorias possíveis

O histórico não persiste entre recargas. O limitador em memória não coordena instâncias e pode perder sua contagem após reinício. As regras da persona são instruções ao modelo, não validação semântica das respostas. A disponibilidade e o conteúdo retornado dependem da Groq, da rede, da chave e do modelo configurado.

Possíveis melhorias futuras, não implementadas nesta versão, incluem persistência consentida do histórico, armazenamento compartilhado do contador de uso entre instâncias, restrição explícita de origens CORS, observabilidade de erros sem registrar conteúdo sensível e testes automatizados para entradas malformadas e falhas do provedor.

