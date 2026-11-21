"""
Persistência do Prosa (SQLite).

FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).

Decisão de LGPD, aplicada no esquema e não só na política:
  - Áudio NÃO é coluna de tabela. Ele é apagado logo após a análise
    (ver app.py, função de finalizar sessão).
  - Guardamos medidas numéricas e o texto transcrito.
  - O painel da família lê tendências. Não existe endpoint que devolva áudio,
    porque não existe áudio guardado.

Base legal: dado de saúde e dado biométrico ligados a uma pessoa são dados
pessoais sensíveis (LGPD, art. 5º, II) e exigem consentimento específico e
destacado (art. 11). A coluna `consentimento_em` registra quando a pessoa (ou
o responsável legal) consentiu.
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator, Optional

CAMINHO_BANCO = Path(__file__).resolve().parent.parent / "prosa.db"

ESQUEMA = """
CREATE TABLE IF NOT EXISTS pessoas (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    nome              TEXT    NOT NULL,
    idade             INTEGER,
    -- 1 = persona de demonstração com dados gerados. Precisa aparecer no painel.
    simulado          INTEGER NOT NULL DEFAULT 0,
    consentimento_em  TEXT,
    criado_em         TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS sessoes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    pessoa_id       INTEGER NOT NULL REFERENCES pessoas(id),
    canal           TEXT,
    agent_id        TEXT,
    iniciada_em     TEXT    NOT NULL,
    finalizada_em   TEXT,
    -- calibrando | verde | amarelo | vermelho
    status          TEXT,
    mensagem        TEXT,
    medidas_json    TEXT,
    mudancas_json   TEXT,
    simulado        INTEGER NOT NULL DEFAULT 0,
    -- Brincadeira em andamento ('fluencia' | 'memoria' | 'orientacao').
    -- Quem abre e fecha esta janela é o Custom LLM, via function calling: ele
    -- é o único que sabe que o minuto dos bichos começou. As falas que chegam
    -- com a janela aberta são etiquetadas com ela.
    brincadeira_aberta TEXT
);

CREATE TABLE IF NOT EXISTS falas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sessao_id   INTEGER NOT NULL REFERENCES sessoes(id),
    -- 'pessoa' ou 'clara'
    papel       TEXT    NOT NULL,
    texto       TEXT    NOT NULL,
    -- 'fluencia' | 'memoria' | 'orientacao' | NULL (conversa normal)
    brincadeira TEXT,
    registrado_em TEXT  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessoes_pessoa ON sessoes(pessoa_id, iniciada_em);
CREATE INDEX IF NOT EXISTS idx_falas_sessao   ON falas(sessao_id);
"""


def agora_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@contextmanager
def conectar(caminho: Optional[Path] = None) -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(caminho or CAMINHO_BANCO)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def criar_esquema(caminho: Optional[Path] = None) -> None:
    with conectar(caminho) as conn:
        conn.executescript(ESQUEMA)
        _migrar(conn)


def _migrar(conn: sqlite3.Connection) -> None:
    """
    Migrações leves. `CREATE TABLE IF NOT EXISTS` não altera tabela existente,
    então um banco criado antes de uma coluna nova continuaria sem ela.
    """
    colunas = {
        r["name"] for r in conn.execute("PRAGMA table_info(sessoes)").fetchall()
    }
    if "brincadeira_aberta" not in colunas:
        conn.execute("ALTER TABLE sessoes ADD COLUMN brincadeira_aberta TEXT")


def definir_brincadeira_aberta(
    sessao_id: int,
    tipo: Optional[str],
    caminho: Optional[Path] = None,
) -> None:
    """Abre (tipo) ou fecha (None) a janela de brincadeira da sessão."""
    with conectar(caminho) as conn:
        conn.execute(
            "UPDATE sessoes SET brincadeira_aberta = ? WHERE id = ?",
            (tipo, sessao_id),
        )


def obter_brincadeira_aberta(
    sessao_id: int,
    caminho: Optional[Path] = None,
) -> Optional[str]:
    with conectar(caminho) as conn:
        row = conn.execute(
            "SELECT brincadeira_aberta FROM sessoes WHERE id = ?", (sessao_id,)
        ).fetchone()
        return row["brincadeira_aberta"] if row else None


# --- pessoas ---

def criar_pessoa(
    nome: str,
    idade: Optional[int] = None,
    *,
    simulado: bool = False,
    consentimento: bool = False,
    caminho: Optional[Path] = None,
) -> int:
    with conectar(caminho) as conn:
        cur = conn.execute(
            "INSERT INTO pessoas (nome, idade, simulado, consentimento_em, criado_em)"
            " VALUES (?, ?, ?, ?, ?)",
            (
                nome,
                idade,
                1 if simulado else 0,
                agora_iso() if consentimento else None,
                agora_iso(),
            ),
        )
        return int(cur.lastrowid)


def obter_pessoa(pessoa_id: int, caminho: Optional[Path] = None) -> Optional[dict]:
    with conectar(caminho) as conn:
        row = conn.execute(
            "SELECT * FROM pessoas WHERE id = ?", (pessoa_id,)
        ).fetchone()
        return dict(row) if row else None


def listar_pessoas(caminho: Optional[Path] = None) -> list[dict]:
    with conectar(caminho) as conn:
        return [
            dict(r)
            for r in conn.execute("SELECT * FROM pessoas ORDER BY id").fetchall()
        ]


# --- sessões ---

def criar_sessao(
    pessoa_id: int,
    *,
    canal: Optional[str] = None,
    agent_id: Optional[str] = None,
    simulado: bool = False,
    iniciada_em: Optional[str] = None,
    caminho: Optional[Path] = None,
) -> int:
    with conectar(caminho) as conn:
        cur = conn.execute(
            "INSERT INTO sessoes (pessoa_id, canal, agent_id, iniciada_em, simulado)"
            " VALUES (?, ?, ?, ?, ?)",
            (
                pessoa_id,
                canal,
                agent_id,
                iniciada_em or agora_iso(),
                1 if simulado else 0,
            ),
        )
        return int(cur.lastrowid)


def finalizar_sessao(
    sessao_id: int,
    *,
    status: str,
    mensagem: str,
    medidas: dict[str, Any],
    mudancas: list[dict[str, Any]],
    caminho: Optional[Path] = None,
) -> None:
    with conectar(caminho) as conn:
        conn.execute(
            "UPDATE sessoes SET finalizada_em = ?, status = ?, mensagem = ?,"
            " medidas_json = ?, mudancas_json = ? WHERE id = ?",
            (
                agora_iso(),
                status,
                mensagem,
                json.dumps(medidas, ensure_ascii=False),
                json.dumps(mudancas, ensure_ascii=False),
                sessao_id,
            ),
        )


def obter_sessao(sessao_id: int, caminho: Optional[Path] = None) -> Optional[dict]:
    with conectar(caminho) as conn:
        row = conn.execute(
            "SELECT * FROM sessoes WHERE id = ?", (sessao_id,)
        ).fetchone()
        return _hidratar_sessao(row) if row else None


def listar_sessoes(
    pessoa_id: int,
    *,
    somente_finalizadas: bool = True,
    caminho: Optional[Path] = None,
) -> list[dict]:
    """Da mais antiga para a mais recente — a ordem que a linha de base espera."""
    sql = "SELECT * FROM sessoes WHERE pessoa_id = ?"
    if somente_finalizadas:
        sql += " AND finalizada_em IS NOT NULL"
    sql += " ORDER BY iniciada_em, id"

    with conectar(caminho) as conn:
        return [_hidratar_sessao(r) for r in conn.execute(sql, (pessoa_id,)).fetchall()]


def _hidratar_sessao(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["medidas"] = json.loads(d.pop("medidas_json") or "{}")
    d["mudancas"] = json.loads(d.pop("mudancas_json") or "[]")
    return d


# --- falas ---

def registrar_fala(
    sessao_id: int,
    papel: str,
    texto: str,
    *,
    brincadeira: Optional[str] = None,
    caminho: Optional[Path] = None,
) -> int:
    # Sem etiqueta explícita, herda a brincadeira que estiver aberta. É assim
    # que o navegador manda a fala "crua" e ela sai etiquetada corretamente.
    if brincadeira is None:
        brincadeira = obter_brincadeira_aberta(sessao_id, caminho)

    with conectar(caminho) as conn:
        cur = conn.execute(
            "INSERT INTO falas (sessao_id, papel, texto, brincadeira, registrado_em)"
            " VALUES (?, ?, ?, ?, ?)",
            (sessao_id, papel, texto, brincadeira, agora_iso()),
        )
        return int(cur.lastrowid)


def listar_falas(
    sessao_id: int,
    *,
    papel: Optional[str] = None,
    brincadeira: Optional[str] = None,
    caminho: Optional[Path] = None,
) -> list[dict]:
    sql = "SELECT * FROM falas WHERE sessao_id = ?"
    params: list[Any] = [sessao_id]
    if papel:
        sql += " AND papel = ?"
        params.append(papel)
    if brincadeira:
        sql += " AND brincadeira = ?"
        params.append(brincadeira)
    sql += " ORDER BY id"

    with conectar(caminho) as conn:
        return [dict(r) for r in conn.execute(sql, params).fetchall()]
