const API =
  location.protocol === "file:" || location.port === "5500"
    ? "http://localhost:5000"
    : "";

// mão com 21 pontos (estilo MediaPipe)
const P = [
  [150, 310],
  [105, 270],
  [75, 235],
  [55, 200],
  [40, 168],
  [112, 180],
  [105, 130],
  [100, 95],
  [96, 62],
  [150, 168],
  [150, 112],
  [150, 76],
  [150, 42],
  [188, 178],
  [195, 128],
  [199, 96],
  [202, 66],
  [222, 200],
  [240, 162],
  [250, 136],
  [258, 112],
];
const C = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];
const svg = document.getElementById("mao"),
  NS = "http://www.w3.org/2000/svg";
C.forEach(([a, b], i) => {
  const l = document.createElementNS(NS, "line");
  l.setAttribute("x1", P[a][0]);
  l.setAttribute("y1", P[a][1]);
  l.setAttribute("x2", P[b][0]);
  l.setAttribute("y2", P[b][1]);
  l.style.animationDelay = 0.2 + i * 0.04 + "s";
  svg.appendChild(l);
});
P.forEach(([x, y], i) => {
  const c = document.createElementNS(NS, "circle");
  c.setAttribute("cx", x);
  c.setAttribute("cy", y);
  c.setAttribute("r", i % 4 === 0 && i > 0 ? 7 : 5);
  c.style.animationDelay = 0.5 + i * 0.05 + "s";
  svg.appendChild(c);
});

// demonstração de gestos
const btns = document.querySelectorAll(".gestos button"),
  seta = document.getElementById("seta"),
  saida = document.getElementById("saida");
let rotacao = 0; // gira sempre pelo caminho mais curto
btns.forEach((b) =>
  b.addEventListener("click", () => {
    btns.forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true");
    const dif = ((((Number(b.dataset.ang) - rotacao) % 360) + 540) % 360) - 180;
    rotacao += dif;
    seta.style.transform = "rotate(" + rotacao + "deg)";
    saida.textContent = b.dataset.txt;
  }),
);

// formulário de contato (envia para o back-end)
document.getElementById("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target,
    ok = document.getElementById("ok");
  if (
    !f.nome.value.trim() ||
    !f.email.validity.valid ||
    !f.email.value ||
    !f.msg.value.trim()
  ) {
    ok.style.color = "#F2B134";
    ok.textContent = "Preencha nome, e-mail válido e mensagem.";
    return;
  }
  ok.style.color = "#C9D2E3";
  ok.textContent = "Enviando...";
  try {
    const r = await fetch(API + "/api/contato", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: f.nome.value.trim(),
        email: f.email.value.trim(),
        mensagem: f.msg.value.trim(),
      }),
    });
    if (!r.ok) throw new Error();
    ok.style.color = "#7FE0AE";
    ok.textContent = "Mensagem enviada! Responderemos em breve.";
    f.reset();
  } catch {
    ok.style.color = "#F2B134";
    ok.textContent = "Não foi possível enviar. Tente de novo.";
  }
});

// produtos
const brl = (c) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function carregarProdutos() {
  const lista = document.getElementById("listaProdutos");
  const sel = document.querySelector("#pedido select");
  try {
    const r = await fetch(API + "/api/produtos");
    if (!r.ok) throw new Error();
    const produtos = await r.json();
    lista.innerHTML = "";
    produtos.forEach((p) => {
      const a = document.createElement("article");
      a.className = "card";
      const tipo = document.createElement("span");
      tipo.className = "tipo";
      tipo.textContent = p.tipo === "fisico" ? "Físico" : "Digital";
      const h = document.createElement("h3");
      h.textContent = p.nome;
      const d = document.createElement("p");
      d.textContent = p.descricao;
      const pr = document.createElement("p");
      pr.className = "preco";
      pr.textContent = brl(p.preco_centavos);
      a.append(tipo, h, d, pr);
      lista.appendChild(a);
      sel.add(new Option(p.nome + " – " + brl(p.preco_centavos), p.id));
    });
  } catch {
    lista.innerHTML =
      "<p>Não foi possível carregar os produtos. Confira se o servidor está rodando.</p>";
  }
}
carregarProdutos();

// pedido
document.getElementById("pedido").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target,
    ok = document.getElementById("okPedido");
  if (
    !f.produto_id.value ||
    !f.nome.value.trim() ||
    !f.email.value ||
    !f.email.validity.valid ||
    f.quantidade.value < 1
  ) {
    ok.style.color = "#B3261E";
    ok.textContent = "Preencha todos os campos corretamente.";
    return;
  }
  ok.style.color = "#4B566B";
  ok.textContent = "Enviando...";
  try {
    const r = await fetch(API + "/api/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: f.nome.value.trim(),
        email: f.email.value.trim(),
        produto_id: Number(f.produto_id.value),
        quantidade: Number(f.quantidade.value),
      }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.erro);
    ok.style.color = "#14683F";
    ok.textContent = "Pedido nº " + d.pedido + " registrado!";
    f.reset();
  } catch (err) {
    ok.style.color = "#B3261E";
    ok.textContent = err.message || "Não foi possível enviar o pedido.";
  }
});

// chatbot Argo
const chatBtn = document.getElementById("chatBtn"),
  chatBox = document.getElementById("chatBox"),
  chatLog = document.getElementById("chatLog"),
  chatForm = document.getElementById("chatForm"),
  chatIn = document.getElementById("chatIn");
let historico = [];

function add(quem, texto) {
  const d = document.createElement("div");
  d.className = "msg " + quem;
  d.textContent = texto;
  chatLog.appendChild(d);
  chatLog.scrollTop = chatLog.scrollHeight;
  return d;
}

chatBtn.addEventListener("click", () => {
  const abrir = chatBox.hidden;
  chatBox.hidden = !abrir;
  chatBtn.setAttribute("aria-expanded", abrir);
  if (abrir) {
    if (!chatLog.children.length)
      add("bot", "Olá! Eu sou o Argo. Como posso ajudar?");
    chatIn.focus();
  }
});

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const m = chatIn.value.trim();
  if (!m) return;
  add("user", m);
  chatIn.value = "";
  const espera = add("bot", "...");
  try {
    const r = await fetch(API + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensagem: m, historico }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.erro);
    espera.textContent = d.resposta;
    historico.push(
      { role: "user", content: m },
      { role: "assistant", content: d.resposta },
    );
  } catch (err) {
    espera.textContent = err.message || "Não consegui responder agora.";
  }
});
gyyy