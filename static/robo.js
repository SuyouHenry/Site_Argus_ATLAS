// Robô virtual: anda no mapa conforme o gesto escolhido (botões ou câmera).
// Ele escuta os cliques dos botões de gesto, então funciona com a câmera sem ligação extra.
(function () {
  const tela = document.getElementById("roboTela");
  const info = document.getElementById("roboInfo");
  if (!tela || !info) return;
  const ctx = tela.getContext("2d");

  const COLUNAS = 9;
  const LINHAS = 7;
  const CELULA = 40; // 9 x 40 = 360 e 7 x 40 = 280
  const PASSO_MS = 450;
  const AZUL = "#2A1B6F";
  const CORAL = "#FF5E4C";

  // ângulo do botão (data-ang) -> deslocamento no mapa
  const DIRECOES = {
    0: { dc: 0, dr: -1, nome: "para cima" },
    90: { dc: 1, dr: 0, nome: "para a direita" },
    180: { dc: 0, dr: 1, nome: "para baixo" },
    "-90": { dc: -1, dr: 0, nome: "para a esquerda" },
  };

  let robo = { c: 1, r: 3 };
  let alvo = { c: 7, r: 3 };
  let dir = null; // direção atual ou null (parado)
  let timer = null;
  let entregas = 0;

  const naMeta = () => robo.c === alvo.c && robo.r === alvo.r;

  function desenhar() {
    ctx.clearRect(0, 0, tela.width, tela.height);
    ctx.fillStyle = "#EEF2F7";
    ctx.fillRect(0, 0, tela.width, tela.height);
    ctx.strokeStyle = "#D5DCE8";
    ctx.lineWidth = 1;
    for (let c = 1; c < COLUNAS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELULA, 0);
      ctx.lineTo(c * CELULA, tela.height);
      ctx.stroke();
    }
    for (let r = 1; r < LINHAS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELULA);
      ctx.lineTo(tela.width, r * CELULA);
      ctx.stroke();
    }

    // bandeira de destino
    const bx = alvo.c * CELULA;
    const by = alvo.r * CELULA;
    ctx.strokeStyle = AZUL;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx + 14, by + 34);
    ctx.lineTo(bx + 14, by + 6);
    ctx.stroke();
    ctx.fillStyle = CORAL;
    ctx.beginPath();
    ctx.moveTo(bx + 14, by + 6);
    ctx.lineTo(bx + 34, by + 14);
    ctx.lineTo(bx + 14, by + 22);
    ctx.closePath();
    ctx.fill();

    // robô: quadrado azul com uma seta coral apontando para onde ele vai
    const rx = robo.c * CELULA + 6;
    const ry = robo.r * CELULA + 6;
    ctx.fillStyle = AZUL;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(rx, ry, CELULA - 12, CELULA - 12, 6);
    else ctx.rect(rx, ry, CELULA - 12, CELULA - 12); // navegadores sem roundRect
    ctx.fill();
    const cx = robo.c * CELULA + CELULA / 2;
    const cy = robo.r * CELULA + CELULA / 2;
    if (dir) {
      ctx.fillStyle = CORAL;
      ctx.beginPath();
      ctx.moveTo(cx + dir.dc * 9, cy + dir.dr * 9);
      ctx.lineTo(cx - dir.dr * 6 - dir.dc * 3, cy + dir.dc * 6 - dir.dr * 3);
      ctx.lineTo(cx + dir.dr * 6 - dir.dc * 3, cy - dir.dc * 6 - dir.dr * 3);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = CORAL;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function parar() {
    clearInterval(timer);
    timer = null;
    dir = null;
  }

  function passo() {
    if (!dir) return;
    const c = robo.c + dir.dc;
    const r = robo.r + dir.dr;
    if (c < 0 || c >= COLUNAS || r < 0 || r >= LINHAS) {
      parar();
      info.textContent = "Parede! O robô parou. Escolha outra direção.";
      desenhar();
      return;
    }
    robo = { c, r };
    if (naMeta()) {
      parar();
      info.textContent = "Chegou na bandeira! Mostre o polegar para cima para entregar.";
    }
    desenhar();
  }

  function ir(nova) {
    dir = nova;
    clearInterval(timer);
    timer = setInterval(passo, PASSO_MS);
    info.textContent = "Robô indo " + nova.nome + ".";
    desenhar();
  }

  function novoAlvo() {
    let n;
    do {
      n = { c: Math.floor(Math.random() * COLUNAS), r: Math.floor(Math.random() * LINHAS) };
    } while (n.c === robo.c && n.r === robo.r);
    alvo = n;
  }

  function confirmar() {
    if (naMeta()) {
      entregas++;
      novoAlvo();
      info.textContent =
        "Entrega " + entregas + " concluída! Uma nova bandeira apareceu.";
    } else {
      info.textContent = "Confirmado, mas o robô ainda não está na bandeira.";
    }
    desenhar();
  }

  document.querySelectorAll(".gestos button").forEach((b) => {
    b.addEventListener("click", () => {
      if (b.dataset.acao === "parar") {
        parar();
        info.textContent = "Robô parado.";
        desenhar();
      } else if (b.dataset.acao === "confirmar") {
        confirmar();
      } else if (DIRECOES[b.dataset.ang]) {
        ir(DIRECOES[b.dataset.ang]);
      }
    });
  });

  // não deixa o robô rodando com a aba escondida
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && dir) {
      parar();
      info.textContent = "Robô parado ao sair da aba.";
      desenhar();
    }
  });

  desenhar();
})();
