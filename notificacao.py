"""Aviso por e-mail quando chega um pedido novo (API da Resend, usando só a biblioteca padrão).

Variáveis de ambiente (nenhum endereço fica escrito no código):
  RESEND_API_KEY  chave da Resend (sem ela, o aviso é pulado e o pedido continua sendo salvo)
  NOTIFY_EMAIL    e-mail que recebe o aviso (sem ele, o aviso é pulado)
  MAIL_FROM       remetente (padrão: ARGOS <onboarding@resend.dev>)
"""
import json
import logging
import os
import threading
import time
import urllib.error
import urllib.request

# logger do Gunicorn: as mensagens (inclusive as de sucesso) aparecem nos Logs do Render
log = logging.getLogger("gunicorn.error")
API_URL = os.getenv("RESEND_API_URL", "https://api.resend.com/emails")


def _brl(centavos):
    return f"R$ {centavos / 100:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _linha(texto):
    """Tira quebras de linha de textos digitados por visitantes (evita injetar cabeçalhos)."""
    return " ".join(str(texto).split())


def _enviar(corpo):
    chave = os.getenv("RESEND_API_KEY")
    if not chave:
        log.warning("RESEND_API_KEY ausente: aviso de pedido não enviado.")
        return
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(corpo).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {chave}",
            "Content-Type": "application/json",
            "User-Agent": "python-urllib",
        },
        method="POST",
    )
    # até 2 tentativas: repete só se a Resend estiver fora do ar (5xx) ou sem rede
    for tentativa in (1, 2):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                log.info("Aviso de pedido enviado (HTTP %s): %s", resp.status, resp.read().decode("utf-8", "replace")[:200])
            return
        except urllib.error.HTTPError as e:
            # a Resend explica o motivo no corpo da resposta (ex.: destinatário não permitido)
            detalhe = e.read().decode("utf-8", "replace")[:500]
            log.error("Resend recusou o aviso de pedido (HTTP %s): %s", e.code, detalhe)
            if e.code < 500:
                return  # erro nosso (chave, remetente, destinatário): repetir não adianta
        except Exception:  # sem rede, tempo esgotado etc.; o pedido já foi salvo
            log.exception("Falha de rede ao enviar o aviso de pedido.")
        if tentativa == 1:
            time.sleep(2)


def _disparar(destino, assunto, texto, responder_para):
    """Monta o e-mail e envia em segundo plano, para a resposta ao visitante não esperar a rede."""
    corpo = {
        "from": os.getenv("MAIL_FROM", "ARGOS <onboarding@resend.dev>"),
        "to": [destino],
        "subject": assunto[:150],
        "text": texto,
        "reply_to": responder_para,
    }
    threading.Thread(target=_enviar, args=(corpo,), daemon=True).start()


def avisar_pedido(pedido_id, produto, preco_centavos, qtd, nome, email):
    """Aviso de novo pedido."""
    destino = os.getenv("NOTIFY_EMAIL")
    if not destino:
        log.warning("NOTIFY_EMAIL ausente: aviso de pedido não enviado.")
        return
    nome, email, produto = _linha(nome), _linha(email), _linha(produto)
    texto = (
        f"Novo pedido nº {pedido_id} no site ARGOS\n\n"
        f"Produto: {produto}\n"
        f"Quantidade: {qtd}\n"
        f"Valor unitário: {_brl(preco_centavos)}\n"
        f"Total: {_brl(preco_centavos * qtd)}\n\n"
        f"Cliente: {nome}\n"
        f"E-mail do cliente: {email}\n"
    )
    _disparar(destino, f"Novo pedido nº {pedido_id} - {produto}", texto, email)


def avisar_contato(nome, email, mensagem):
    """Aviso de nova mensagem enviada pelo formulário de contato (responder cai no e-mail do visitante)."""
    destino = os.getenv("NOTIFY_EMAIL")
    if not destino:
        log.warning("NOTIFY_EMAIL ausente: aviso de contato não enviado.")
        return
    nome, email = _linha(nome), _linha(email)
    texto = (
        "Nova mensagem pelo formulário de contato do site ARGOS\n\n"
        f"Nome: {nome}\n"
        f"E-mail: {email}\n\n"
        f"Mensagem:\n{str(mensagem).strip()}\n"
    )
    _disparar(destino, f"Novo contato no site - {nome}", texto, email)
