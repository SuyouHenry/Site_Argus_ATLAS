"""Back end da ARGOS: API (Flask) e banco SQLite. O chatbot fica em chatbot.py."""
import os
import sqlite3
from datetime import timedelta
from functools import wraps

from dotenv import load_dotenv
from flask import Flask, g, jsonify, request, session
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import check_password_hash, generate_password_hash

from chatbot import chatbot_bp  # chatbot de IA 

load_dotenv()
BASE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE, "argos.db")

app = Flask(__name__, static_folder="static", static_url_path="")
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)  # atrás do proxy da hospedagem
CORS(app)
app.config["DB_PATH"] = DB_PATH

# --- Sessão de login (cookie assinado) ---
# SECRET_KEY: gere uma com  python -c "import secrets; print(secrets.token_hex(32))"
# Coloque no .env (local) e nas variáveis de ambiente da hospedagem. Nunca no GitHub.
app.secret_key = os.environ.get("SECRET_KEY")
if not app.secret_key:
    raise RuntimeError("Defina SECRET_KEY no .env e nas variáveis de ambiente da hospedagem.")
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,      # o JavaScript da página não consegue ler o cookie
    SESSION_COOKIE_SAMESITE="Lax",     # o navegador não envia o cookie em requisições de outros sites
    SESSION_COOKIE_SECURE=os.environ.get("COOKIE_SECURE", "1") == "1",  # COOKIE_SECURE=0 só para testar em http local
    PERMANENT_SESSION_LIFETIME=timedelta(days=7),
)

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
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,   -- UNIQUE: o banco impede e-mail repetido
  senha_hash TEXT NOT NULL,     -- nunca a senha em texto puro
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


@app.post("/api/cadastro")
def cadastro():
    d = request.get_json(silent=True) or {}
    nome = str(d.get("nome", "")).strip()
    email = str(d.get("email", "")).strip().lower()
    senha = str(d.get("senha", ""))
    if not nome or len(nome) > 100 or not email_ok(email):
        return erro("Informe nome e e-mail válido.")
    if not 8 <= len(senha) <= 72:
        return erro("A senha deve ter entre 8 e 72 caracteres.")
    db = get_db()
    try:
        cur = db.execute(
            "INSERT INTO usuarios (nome, email, senha_hash) VALUES (?,?,?)",
            (nome, email, generate_password_hash(senha)),
        )
        db.commit()
    except sqlite3.IntegrityError:
        return erro("Este e-mail já está cadastrado.", 409)
    return jsonify(ok=True, usuario=cur.lastrowid), 201


# ---------------------------------------------------------------------------
# Login, logout e sessão
# ---------------------------------------------------------------------------
# Hash falso: se o e-mail não existe, comparamos a senha com ele mesmo assim.
# Assim a resposta demora o mesmo tempo e ninguém descobre quais e-mails existem.
DUMMY_HASH = generate_password_hash("senha-falsa-so-para-igualar-o-tempo")


def usuario_atual():
    """Usuário logado (linha do banco) ou None."""
    uid = session.get("usuario_id")
    if uid is None:
        return None
    return get_db().execute(
        "SELECT id, nome, email, criado_em FROM usuarios WHERE id = ?", (uid,)
    ).fetchone()


def login_obrigatorio(f):
    """Use em rotas que só quem está logado pode acessar (veja /api/minha-conta)."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        u = usuario_atual()
        if u is None:
            return erro("Faça login para continuar.", 401)
        g.usuario = u
        return f(*args, **kwargs)
    return wrapper


from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(get_remote_address, app=app, storage_uri="memory://")


@app.errorhandler(429)
def muitas_tentativas(_):
    return erro("Muitas tentativas. Espere um minuto e tente de novo.", 429)


@app.post("/api/login")
@limiter.limit("10 per minute")
def login():
    d = request.get_json(silent=True)
    d = d if isinstance(d, dict) else {}
    email = str(d.get("email", "")).strip().lower()
    senha = str(d.get("senha", ""))
    if not email or not senha or len(email) > 120 or len(senha) > 72:
        return erro("E-mail ou senha incorretos.", 401)
    u = get_db().execute(
        "SELECT id, nome, senha_hash FROM usuarios WHERE email = ?", (email,)
    ).fetchone()
    senha_ok = check_password_hash(u["senha_hash"] if u else DUMMY_HASH, senha)
    if not u or not senha_ok:
        return erro("E-mail ou senha incorretos.", 401)
    session.clear()  # descarta qualquer sessão anterior
    session["usuario_id"] = u["id"]
    session.permanent = True
    return jsonify(ok=True, usuario={"id": u["id"], "nome": u["nome"]})


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify(ok=True)


@app.get("/api/eu")
def eu():
    """Quem está logado agora. A página usa isso para escolher o botão do canto superior."""
    u = usuario_atual()
    resp = jsonify(usuario={"id": u["id"], "nome": u["nome"]} if u else None)
    resp.headers["Cache-Control"] = "no-store"
    return resp


@app.get("/api/minha-conta")
@login_obrigatorio
def minha_conta():
    """Exemplo de rota protegida: só responde para quem está logado."""
    u = g.usuario
    return jsonify(id=u["id"], nome=u["nome"], email=u["email"], criado_em=u["criado_em"])


init_db()

if __name__ == "__main__":
        app.run(host="0.0.0.0", port=5000)
