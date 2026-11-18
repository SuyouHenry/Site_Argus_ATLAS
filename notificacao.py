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
import urllib.request

log = logging.getLogger(__name__)
API_URL = "https://api.resend.com/emails"


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
    try:
        with urllib.request.urlopen(req, timeout=15):
            pass
    except Exception:  # o pedido já foi salvo; falha de e-mail não pode derrubá-lo
        log.exception("Falha ao enviar o aviso de pedido por e-mail.")


def avisar_pedido(pedido_id, produto, preco_centavos, qtd, nome, email):
    """Dispara o e-mail em segundo plano, para a resposta ao cliente não esperar a rede."""
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
    corpo = {
        "from": os.getenv("MAIL_FROM", "ARGOS <onboarding@resend.dev>"),
        "to": [destino],
        "subject": f"Novo pedido nº {pedido_id} - {produto}"[:150],
        "text": texto,
        "reply_to": email,
    }
    threading.Thread(target=_enviar, args=(corpo,), daemon=True).start()
