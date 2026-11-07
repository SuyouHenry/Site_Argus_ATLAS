"""Chatbot Argo (IA): rota /api/chat, integração com a API do Claude e uso da persona."""
import os
import sqlite3
import time
from collections import defaultdict, deque

import anthropic
from dotenv import load_dotenv
from flask import Blueprint, current_app, jsonify, request

from persona import PERSONA

load_dotenv()
MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5")
client = anthropic.Anthropic()  # lê ANTHROPIC_API_KEY do ambiente (.env)

chatbot_bp = Blueprint("chatbot", __name__)

# Limite por IP: evita que um visitante gaste sua cota da API (padrão: 20 mensagens / 10 min)
LIMITE = int(os.getenv("CHAT_LIMITE", "20"))
JANELA = 600
_acessos = defaultdict(deque)


def excedeu_limite(ip):
    agora = time.time()
    fila = _acessos[ip]
    while fila and agora - fila[0] > JANELA:
        fila.popleft()
    if len(fila) >= LIMITE:
        return True
    fila.append(agora)
    return False


def catalogo_texto():
    """Lê os produtos do banco para o Argo sempre falar do catálogo real."""
    db = sqlite3.connect(current_app.config["DB_PATH"])
    linhas = [
        f"- {nome} ({tipo}): {desc} R$ {preco / 100:.2f}"
        for nome, desc, preco, tipo in db.execute(
            "SELECT nome, descricao, preco_centavos, tipo FROM produtos ORDER BY id"
        )
    ]
    db.close()
    return "\n".join(linhas)


@chatbot_bp.post("/api/chat")
def chat():
    if excedeu_limite(request.remote_addr):
        return jsonify(erro="Muitas mensagens em pouco tempo. Tente de novo em alguns minutos."), 429
    d = request.get_json(silent=True) or {}
    msg = str(d.get("mensagem", "")).strip()
    if not msg or len(msg) > 500:
        return jsonify(erro="Escreva uma mensagem de até 500 caracteres."), 400

    # histórico recente enviado pelo front end (só papéis válidos, tamanho limitado)
    hist = [
        {"role": h["role"], "content": h["content"][:1000]}
        for h in (d.get("historico") or [])[-10:]
        if isinstance(h, dict) and h.get("role") in ("user", "assistant") and isinstance(h.get("content"), str)
    ]
    while hist and hist[0]["role"] != "user":
        hist.pop(0)

    try:
        resp = client.messages.create(
            model=MODEL,
            max_tokens=400,
            system=f"{PERSONA}\n\nCatálogo atual:\n{catalogo_texto()}",
            messages=hist + [{"role": "user", "content": msg}],
        )
        return jsonify(resposta=resp.content[0].text)
    except Exception as e:  # chave ausente, limite da API, falta de internet...
        current_app.logger.error("Falha no chat: %s", e)
        return jsonify(erro="O Argo está indisponível agora. Tente de novo em instantes."), 502
