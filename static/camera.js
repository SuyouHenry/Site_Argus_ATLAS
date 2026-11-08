// Demonstração com câmera: reconhece a direção do dedo indicador (MediaPipe Hands)
// e move a seta. O vídeo é processado no próprio navegador; nada é enviado ao servidor.

const MP_VERSAO = "0.10.14";
const MP_JS = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSAO}/vision_bundle.mjs`;
const MP_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSAO}/wasm`;
const MP_MODELO =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

// Cada gesto aponta para o botão manual que tem o mesmo ângulo (ver data-ang no HTML).
const ANGULO = { cima: 0, direita: 90, baixo: 180, esquerda: -90 };
const NOME = {
  cima: "indicador para cima",
  direita: "indicador para a direita",
  baixo: "indicador para baixo",
  esquerda: "indicador para a esquerda",
};
const TOLERANCIA = 35; // graus de folga em torno de cada direção
const QUADROS_ESTAVEIS = 3; // quadros seguidos iguais antes de mudar a seta

/**
 * Recebe os 21 pontos da mão (x, y de 0 a 1, y cresce para baixo, imagem SEM espelho)
 * e devolve "cima", "direita", "baixo", "esquerda" ou null.
 * Só vale com o indicador esticado e os outros três dedos dobrados.
 * "direita"/"esquerda" são do ponto de vista de quem usa (como num espelho).
 */
function classificarGesto(lm) {
  if (!lm || lm.length < 21) return null;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const palma = dist(lm[0], lm[9]); // tamanho da mão, serve de régua
  if (!palma) return null;

  const esticado = (ponta, junta) => dist(lm[0], lm[ponta]) > dist(lm[0], lm[junta]) * 1.05;
  if (!esticado(8, 6)) return null; // indicador precisa estar esticado
  if (esticado(12, 10) || esticado(16, 14) || esticado(20, 18)) return null; // demais dobrados

  const dx = lm[8].x - lm[5].x;
  const dy = lm[8].y - lm[5].y;
  if (Math.hypot(dx, dy) < palma * 0.5) return null; // dedo apontando para a câmera

  const graus = (Math.atan2(-dy, dx) * 180) / Math.PI; // 0 = direita da imagem, 90 = cima
  const perto = (alvo) => Math.abs(((graus - alvo + 540) % 360) - 180) <= TOLERANCIA;
  if (perto(90)) return "cima";
  if (perto(-90)) return "baixo";
  if (perto(180)) return "direita"; // esquerda da imagem = direita de quem usa
  if (perto(0)) return "esquerda";
  return null; // diagonal: ambíguo
}

if (typeof module !== "undefined") module.exports = { classificarGesto };

(function () {
  if (typeof document === "undefined") return; // fora do navegador (testes)
  const btn = document.getElementById("camBtn");
  if (!btn) return; // página sem o bloco da câmera

  const status = document.getElementById("camStatus");
  const caixa = document.getElementById("camBox");
  const video = document.getElementById("camVideo");
  const tela = document.getElementById("camCanvas");
  const ctx = tela.getContext("2d");
  const botoes = document.querySelectorAll(".gestos button");
  const TEXTO_INICIAL = status.textContent;

  let fluxo = null;
  let detector = null;
  let ativo = false;
  let quadro = 0;
  let ultimoTempo = -1;
  let candidato = null;
  let repeticoes = 0;
  let atual = null;

  const dizer = (t) => (status.textContent = t);

  async function carregarDetector() {
    if (detector) return detector;
    const { FilesetResolver, HandLandmarker } = await import(MP_JS);
    const arquivos = await FilesetResolver.forVisionTasks(MP_WASM);
    const criar = (delegate) =>
      HandLandmarker.createFromOptions(arquivos, {
        baseOptions: { modelAssetPath: MP_MODELO, delegate },
        runningMode: "VIDEO",
        numHands: 1,
      });
    try {
      detector = await criar("GPU");
    } catch {
      detector = await criar("CPU"); // aparelhos sem suporte a GPU
    }
    return detector;
  }

  function parar(mensagem) {
    ativo = false;
    cancelAnimationFrame(quadro);
    if (fluxo) fluxo.getTracks().forEach((t) => t.stop());
    fluxo = null;
    video.srcObject = null;
    caixa.hidden = true;
    ctx.clearRect(0, 0, tela.width, tela.height);
    btn.textContent = "Ativar câmera";
    btn.setAttribute("aria-pressed", "false");
    btn.disabled = false;
    candidato = atual = null;
    repeticoes = 0;
    dizer(mensagem || TEXTO_INICIAL);
  }

  function desenhar(lm) {
    ctx.clearRect(0, 0, tela.width, tela.height);
    if (!lm) return;
    ctx.fillStyle = "#F2B134";
    for (const p of lm) {
      ctx.beginPath();
      ctx.arc(p.x * tela.width, p.y * tela.height, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function aplicar(gesto) {
    if (gesto === atual) return;
    atual = gesto;
    const alvo = [...botoes].find((b) => Number(b.dataset.ang) === ANGULO[gesto]);
    if (alvo) alvo.click(); // reaproveita a lógica dos botões (gira a seta e atualiza o texto)
  }

  function laco() {
    if (!ativo) return;
    quadro = requestAnimationFrame(laco);
    if (video.readyState < 2 || video.currentTime === ultimoTempo) return;
    ultimoTempo = video.currentTime;

    let lm = null;
    try {
      const r = detector.detectForVideo(video, performance.now());
      lm = r.landmarks && r.landmarks[0];
    } catch {
      return;
    }
    desenhar(lm);

    const gesto = classificarGesto(lm);
    if (!lm) dizer("Câmera ligada. Mostre a mão para a câmera.");
    else if (!gesto) dizer("Mão detectada. Dobre os outros dedos e aponte só o indicador.");
    else dizer("Detectado: " + NOME[gesto] + ".");

    if (gesto && gesto === candidato) repeticoes++;
    else {
      candidato = gesto;
      repeticoes = 1;
    }
    if (gesto && repeticoes >= QUADROS_ESTAVEIS) aplicar(gesto);
  }

  async function iniciar() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      dizer("Este navegador não permite usar a câmera aqui. Use os botões abaixo.");
      return;
    }
    btn.disabled = true;
    dizer("Pedindo permissão para usar a câmera...");
    try {
      fluxo = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch (e) {
      const msg =
        e && e.name === "NotAllowedError"
          ? "Permissão da câmera negada. Libere o acesso no navegador ou use os botões abaixo."
          : e && e.name === "NotFoundError"
            ? "Nenhuma câmera encontrada. Use os botões abaixo."
            : "Não foi possível abrir a câmera. Use os botões abaixo.";
      parar(msg);
      return;
    }

    video.srcObject = fluxo;
    caixa.hidden = false;
    try {
      await video.play();
    } catch {
      /* o navegador pode já estar tocando */
    }
    tela.width = video.videoWidth || 640;
    tela.height = video.videoHeight || 480;

    dizer("Carregando o reconhecimento de mão (pode levar alguns segundos)...");
    try {
      await carregarDetector();
    } catch {
      parar("Não foi possível carregar o reconhecimento de mão (verifique a internet). Use os botões abaixo.");
      return;
    }
    if (!fluxo) return; // a pessoa desligou enquanto carregava

    ativo = true;
    btn.disabled = false;
    btn.textContent = "Desativar câmera";
    btn.setAttribute("aria-pressed", "true");
    dizer("Câmera ligada. Aponte o indicador para cima, direita, baixo ou esquerda.");
    laco();
  }

  btn.addEventListener("click", () => {
    if (ativo || fluxo) parar();
    else iniciar();
  });
  // economiza bateria e privacidade: desliga a câmera ao sair da aba
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && (ativo || fluxo)) parar("Câmera desligada ao sair da aba.");
  });
  window.addEventListener("pagehide", () => parar());
})();
