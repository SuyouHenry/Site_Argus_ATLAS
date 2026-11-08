(() => {
  const API =
    location.protocol === "file:" || location.port === "5500"
      ? "http://localhost:5000"
      : "";
  const widget = document.querySelector(".argo-widget");
  const launcher = document.getElementById("chatBtn");
  const launcherLabel = launcher.getAttribute("aria-label");
  const closeButton = document.getElementById("chatClose");
  const expandButton = document.getElementById("chatExpand");
  const avatarButton = document.getElementById("argoAvatar");
  const panel = document.getElementById("chatBox");
  const messages = document.getElementById("chatLog");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatIn");
  const sendButton = form.querySelector(".argo-send");
  const apresentacaoInicial = messages.querySelector(".argo-message--assistant");
  const sugestoes = widget.querySelector(".argo-suggestions");
  const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  let historico = [];
  let enviando = false;

  function atualizarNotificacao(pendente) {
    launcher.classList.toggle("has-notification", pendente);
    launcher.setAttribute(
      "aria-label",
      pendente
        ? `${launcherLabel}, mensagem não visualizada`
        : launcherLabel,
    );
  }

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
    atualizarNotificacao(false);
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

  function prepararApresentacaoInicial() {
    if (!apresentacaoInicial) return;

    const texto = apresentacaoInicial.querySelector("p");
    if (!texto || apresentacaoInicial.querySelector(".argo-welcome-actions")) return;

    texto.textContent =
      "Olá! Seja bem-vindo!\n\n" +
      "Sou o Argô, assistente virtual do projeto. Estou aqui para ajudar você a conhecer o A.T.L.A.S., entender como funciona e descobrir nossas soluções.\n\n" +
      "Que tal experimentar uma demonstração do reconhecimento de gestos? Você poderá conhecer um pouco da tecnologia na prática!";

    const acoes = document.createElement("div");
    acoes.className = "argo-welcome-actions";

    const experimentar = document.createElement("button");
    experimentar.type = "button";
    experimentar.className = "argo-welcome-primary";
    experimentar.textContent = "Sim, quero experimentar!";
    experimentar.addEventListener("click", () => {
      const demonstracao = document.getElementById("produto");
      fecharWidget();
      if (demonstracao) window.location.hash = demonstracao.id;
    });

    const continuar = document.createElement("button");
    continuar.type = "button";
    continuar.className = "argo-welcome-secondary";
    continuar.textContent = "Agora não, preciso de outra coisa.";
    continuar.addEventListener("click", () => {
      apresentacaoInicial.remove();
      const textoSugestoes = adicionarMensagem(
        "assistant",
        "Escolha um assunto para começarmos.",
      );
      const mensagemSugestoes = textoSugestoes.closest(".argo-message");
      mensagemSugestoes.classList.add("argo-suggestion-message");
      sugestoes.hidden = false;
      mensagemSugestoes.insertBefore(sugestoes, mensagemSugestoes.querySelector("time"));
      messages.scrollTop = messages.scrollHeight;
      input.focus();
    });

    acoes.append(experimentar, continuar);
    apresentacaoInicial.appendChild(acoes);
  }

  launcher.addEventListener("click", abrirWidget);
  avatarButton.addEventListener("click", () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    avatarButton.classList.remove("is-reacting");
    void avatarButton.offsetWidth;
    avatarButton.classList.add("is-reacting");
  });
  avatarButton.addEventListener("animationend", () => {
    avatarButton.classList.remove("is-reacting");
  });
  closeButton.addEventListener("click", () => fecharWidget());
  expandButton.addEventListener("click", alternarExpansao);

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && widget.classList.contains("is-open")) {
      fecharWidget();
    }
  });

  input.addEventListener("input", () => {
    if (input.value.trim() && apresentacaoInicial.isConnected) {
      apresentacaoInicial.remove();
    }
    ajustarCampo();
  });
  input.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      form.requestSubmit();
    }
  });

  widget.querySelectorAll(".argo-chip").forEach((botao) => {
    botao.addEventListener("click", () => {
      input.value = botao.textContent.trim();
      botao.closest(".argo-suggestion-message")?.remove();
      ajustarCampo();
      input.focus();
    });
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const mensagem = input.value.trim();
    if (!mensagem || enviando) return;

    if (apresentacaoInicial.isConnected) apresentacaoInicial.remove();
    adicionarMensagem("user", mensagem);
    input.value = "";
    enviando = true;
    input.disabled = true;
    ajustarCampo();
    const respostaPendente = adicionarMensagem(
      "assistant",
      "Argô está preparando uma resposta",
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
      if (!widget.classList.contains("is-open")) {
        atualizarNotificacao(true);
      }
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
  atualizarNotificacao(true);
  if (horarioInicial) atualizarHorario(horarioInicial);
  sugestoes.hidden = true;
  prepararApresentacaoInicial();
  ajustarCampo();
})();
