"""Camada de acesso ao banco da ARGOS.

Dois modos, escolhidos pelo ambiente:
- Sem DATABASE_URL: SQLite local (arquivo argos.db). É o padrão para desenvolver e testar.
- Com DATABASE_URL (postgres://...): PostgreSQL externo, para os dados não sumirem
  quando o Render reinicia (o disco do plano gratuito é temporário).

O resto do código usa só esta interface: conectar(), execute(), inserir(), commit(), close().
As consultas continuam escritas com `?`; no PostgreSQL o `?` vira `%s` aqui dentro.
"""
import os
import sqlite3


def usa_postgres():
    # lido na hora, porque o .env só é carregado depois da importação dos módulos
    return os.environ.get("DATABASE_URL", "").strip().startswith(("postgres://", "postgresql://"))


def erros_integridade():
    """Classes de erro para UNIQUE/FOREIGN KEY violados, no banco em uso."""
    if usa_postgres():
        import psycopg2
        return (psycopg2.IntegrityError,)
    return (sqlite3.IntegrityError,)


class Conexao:
    def __init__(self, bruta, postgres):
        self.bruta = bruta
        self.pg = postgres

    def execute(self, sql, params=()):
        if self.pg:
            cur = self.bruta.cursor()
            cur.execute(sql.replace("?", "%s"), params)
            return cur
        return self.bruta.execute(sql, params)

    def inserir(self, sql, params=()):
        """Executa um INSERT e devolve o id da linha criada."""
        if self.pg:
            return self.execute(sql + " RETURNING id", params).fetchone()["id"]
        return self.bruta.execute(sql, params).lastrowid

    def executemany(self, sql, linhas):
        for linha in linhas:
            self.execute(sql, linha)

    def executescript(self, script):
        if self.pg:
            self.bruta.cursor().execute(script)
        else:
            self.bruta.executescript(script)

    def commit(self):
        self.bruta.commit()

    def close(self):
        self.bruta.close()


def conectar(caminho_sqlite):
    """Abre uma conexão. Linhas acessíveis por nome (linha["coluna"]) nos dois bancos."""
    if usa_postgres():
        import psycopg2
        from psycopg2.extras import RealDictCursor

        bruta = psycopg2.connect(
            os.environ["DATABASE_URL"].strip(),
            cursor_factory=RealDictCursor,
            connect_timeout=10,
        )
        return Conexao(bruta, True)
    bruta = sqlite3.connect(caminho_sqlite)
    bruta.row_factory = sqlite3.Row
    bruta.execute("PRAGMA foreign_keys = ON")  # no SQLite as chaves estrangeiras vêm desligadas
    return Conexao(bruta, False)
