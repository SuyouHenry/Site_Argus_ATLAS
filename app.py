"""Back end da ARGOS: API (Flask) e banco SQLite. O chatbot fica em chatbot.py."""
import os
import sqlite3

from dotenv import load_dotenv
from flask import Flask, g, jsonify, request
from flask_cors import CORS

from chatbot import chatbot_bp  # chatbot de IA (parte do Gustavo)

load_dotenv()
BASE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE, "argos.db")

app = Flask(__name__, static_folder="static", static_url_path="")
CORS(app)
app.config["DB_PATH"] = DB_PATH
app.register_blueprint(chatbot_bp)

SCHEMA = """
CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL,
  preco_centavos INTEGER NOT NULL,
  tipo TEXT NOT NULL            -- 'fisico' ou 'digital'
);
CREATE TABLE IF NOT EXISTS mensagens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL, email TEXT NOT NULL, mensagem TEXT NOT NULL,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  nome TEXT NOT NULL, email TEXT NOT NULL, quantidade INTEGER NOT NULL,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);
"""

# Produtos e preços FICTÍCIOS (cenário de demonstração do trabalho).
SEED = [
    ("A.T.L.A.S. Básico", "Robô controlado por gestos para terapia motora em casa.", 149000, "fisico"),
    ("A.T.L.A.S. Clínica", "Robô com câmera dedicada e sessões registradas para uso profissional.", 329000, "fisico"),
    ("Relatórios de Evolução com IA", "Assinatura mensal de relatórios de evolução motora gerados por IA.", 4990, "digital"),
]


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_):
    db = g.pop("db", None)
    if db:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.executescript(SCHEMA)
    if db.execute("SELECT COUNT(*) FROM produtos").fetchone()[0] == 0:
        db.executemany("INSERT INTO produtos (nome, descricao, preco_centavos, tipo) VALUES (?,?,?,?)", SEED)
    db.commit()
    db.close()


def erro(msg, codigo=400):
    return jsonify(erro=msg), codigo


def email_ok(e):
    return "@" in e and "." in e.split("@")[-1] and len(e) <= 120


@app.get("/")
def home():
    return app.send_static_file("index.html")


@app.get("/api/produtos")
def produtos():
    rows = get_db().execute("SELECT * FROM produtos ORDER BY id").fetchall()
    return jsonify([dict(r) for r in rows])


@app.post("/api/contato")
def contato():
    d = request.get_json(silent=True) or {}
    nome, email, msg = (str(d.get(k, "")).strip() for k in ("nome", "email", "mensagem"))
    if not nome or not msg or not email_ok(email):
        return erro("Informe nome, e-mail válido e mensagem.")
    if len(nome) > 100 or len(msg) > 1000:
        return erro("Texto muito longo.")
    db = get_db()
    db.execute("INSERT INTO mensagens (nome, email, mensagem) VALUES (?,?,?)", (nome, email, msg))
    db.commit()
    return jsonify(ok=True), 201


@app.post("/api/pedidos")
def pedidos():
    d = request.get_json(silent=True) or {}
    nome, email = str(d.get("nome", "")).strip(), str(d.get("email", "")).strip()
    try:
        produto_id, qtd = int(d.get("produto_id")), int(d.get("quantidade", 1))
    except (TypeError, ValueError):
        return erro("Produto ou quantidade inválidos.")
    if not nome or len(nome) > 100 or not email_ok(email) or not 1 <= qtd <= 100:
        return erro("Informe nome, e-mail válido e quantidade entre 1 e 100.")
    db = get_db()
    if not db.execute("SELECT 1 FROM produtos WHERE id = ?", (produto_id,)).fetchone():
        return erro("Produto não encontrado.", 404)
    cur = db.execute(
        "INSERT INTO pedidos (produto_id, nome, email, quantidade) VALUES (?,?,?,?)",
        (produto_id, nome, email, qtd),
    )
    db.commit()
    return jsonify(ok=True, pedido=cur.lastrowid), 201


init_db()

if __name__ == "__main__":
        app.run(host="0.0.0.0", port=5000)
