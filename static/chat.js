(() => {
  const API =
    location.protocol === "file:" || location.port === "5500"
      ? "http://localhost:5000"
      : "";
  const widget = document.querySelector(".argo-widget");
  const launcher = document.getElementById("chatBtn");
  const closeButton = document.getElementById("chatClose");
  const expandButton = document.getElementById("chatExpand");
  const panel = document.getElementById("chatBox");
  const messages = document.getElementById("chatLog");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatIn");
  const sendButton = form.querySelector(".argo-send");
  const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  let historico = [];
  let enviando = false;

  function atualizarHorario(elemento) {
    const agora = new Date();
    elemento.dateTime = agora.toISOString();
    elemento.textContent = timeFormatter.format(agora);
  }

  function ajustarCampo() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    input.style.overflowY = input.scrollHeight > 120 ? "auto" : "hidden";
    sendButton.disabled = input.value.trim().length === 0 || enviando;
  }

  function abrirWidget() {
    widget.classList.add("is-open");
    launcher.setAttribute("aria-expanded", "true");
    panel.setAttribute("aria-hidden", "false");
    panel.inert = false;
    window.requestAnimationFrame(() => input.focus());
  }

  function alternarExpansao() {
    const expandido = widget.classList.toggle("is-expanded");
    expandButton.setAttribute("aria-pressed", String(expandido));
    expandButton.setAttribute(
      "aria-label",
      expandido ? "Reduzir chat" : "Expandir chat",
    );
  }

  function fecharWidget(devolverFoco = true) {
    widget.classList.remove("is-open");
    widget.classList.remove("is-expanded");
    expandButton.setAttribute("aria-pressed", "false");
    expandButton.setAttribute("aria-label", "Expandir chat");
    launcher.setAttribute("aria-expanded", "false");
    panel.setAttribute("aria-hidden", "true");
    panel.inert = true;
    if (devolverFoco) launcher.focus();
  }

  function adicionarMensagem(papel, texto) {
    const artigo = document.createElement("article");
    artigo.className = `argo-message argo-message--${papel}`;

    const paragrafo = document.createElement("p");
    paragrafo.textContent = texto;

    const horario = document.createElement("time");
    atualizarHorario(horario);
    artigo.append(paragrafo, horario);
    messages.appendChild(artigo);
    messages.scrollTop = messages.scrollHeight;
    return paragrafo;
  }

  launcher.addEventListener("click", abrirWidget);
  closeButton.addEventListener("click", () => fecharWidget());
  expandButton.addEventListener("click", alternarExpansao);

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && widget.classList.contains("is-open")) {
      fecharWidget();
    }
  });

  input.addEventListener("input", ajustarCampo);
  input.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      form.requestSubmit();
    }
  });

  widget.querySelectorAll(".argo-chip").forEach((botao) => {
    botao.addEventListener("click", () => {
      input.value = botao.textContent.trim();
      ajustarCampo();
      input.focus();
    });
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const mensagem = input.value.trim();
    if (!mensagem || enviando) return;

    adicionarMensagem("user", mensagem);
    input.value = "";
    enviando = true;
    input.disabled = true;
    ajustarCampo();
    const respostaPendente = adicionarMensagem(
      "assistant",
      "Argo está preparando uma resposta",
    );
    const mensagemPendente = respostaPendente.closest(".argo-message");
    respostaPendente.classList.add("argo-sr-only");
    respostaPendente.setAttribute("role", "status");
    mensagemPendente.classList.add("argo-thinking");
    const indicador = document.createElement("span");
    indicador.className = "argo-activity";
    indicador.setAttribute("aria-hidden", "true");
    for (let indice = 0; indice < 3; indice += 1) {
      indicador.appendChild(document.createElement("i"));
    }
    mensagemPendente.appendChild(indicador);

    function concluirResposta(texto) {
      respostaPendente.classList.remove("argo-sr-only");
      respostaPendente.removeAttribute("role");
      respostaPendente.textContent = texto;
      mensagemPendente.classList.remove("argo-thinking");
      indicador.remove();
    }

    try {
      const resposta = await fetch(API + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem, historico }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        throw new Error(dados.erro || "Não consegui responder agora.");
      }

      concluirResposta(dados.resposta);
      historico.push(
        { role: "user", content: mensagem },
        { role: "assistant", content: dados.resposta },
      );
    } catch (erro) {
      concluirResposta(erro.message || "Não consegui responder agora.");
    } finally {
      enviando = false;
      input.disabled = false;
      ajustarCampo();
      if (widget.classList.contains("is-open")) input.focus();
    }
  });

  const horarioInicial = messages.querySelector("[data-chat-time]");
  if (horarioInicial) atualizarHorario(horarioInicial);
  ajustarCampo();
})();
