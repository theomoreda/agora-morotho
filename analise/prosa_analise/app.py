"""
Serviço de análise do Prosa.

FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).

Fica ao lado do app da Agora (o quickstart Next.js, em ../app). O app cuida da
conversa em tempo real; este serviço cuida das medidas, da linha de base e do
painel da família.

Fluxo de uma conversa:
    1. app chama  POST /api/sessoes                   -> abre a sessão
    2. durante a conversa, as falas transcritas chegam em POST .../falas
    3. ao encerrar, o navegador manda o áudio em      POST .../audio
       -> medimos e APAGAMOS o arquivo na mesma requisição (LGPD)
    4. app chama  POST .../finalizar                  -> semáforo + mensagem
    5. a família abre  GET /painel?pessoa=<id>
"""

from __future__ import annotations

import os
import tempfile
from datetime import date
from pathlib import Path
from typing import Any, Optional

from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from . import acustica, db, texto as texto_mod
from .linha_base import (
    MEDIDAS,
    SESSOES_LINHA_BASE,
    avaliar,
    calcular_linha_base,
)

PASTA_WEB = Path(__file__).resolve().parent.parent / "web"

@asynccontextmanager
async def ciclo_de_vida(_: FastAPI):
    db.criar_esquema()
    yield


app = FastAPI(
    lifespan=ciclo_de_vida,
    title="Prosa — serviço de análise",
    version="1.0.0-hackathon",
    description=(
        "Medidas de voz e de texto, linha de base individual e painel da "
        "família. Não faz diagnóstico."
    ),
)

# O app da Agora roda em outra porta (3000), então precisa de CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- modelos de requisição ---

class NovaPessoa(BaseModel):
    nome: str
    idade: Optional[int] = None
    simulado: bool = False
    consentimento: bool = False


class NovaSessao(BaseModel):
    pessoa_id: int
    canal: Optional[str] = None
    agent_id: Optional[str] = None


class NovaFala(BaseModel):
    papel: str = Field(description="'pessoa' ou 'clara'")
    texto: str
    brincadeira: Optional[str] = Field(
        default=None, description="'fluencia' | 'memoria' | 'orientacao'"
    )


class Finalizar(BaseModel):
    palavras_memoria: Optional[list[str]] = None


class JanelaBrincadeira(BaseModel):
    tipo: Optional[str] = Field(
        default=None, description="'fluencia' | 'memoria' | 'orientacao'"
    )
    acao: str = Field(description="'abrir' ou 'fechar'")


# --- pessoas ---

@app.post("/api/pessoas")
def criar_pessoa(corpo: NovaPessoa) -> dict:
    pessoa_id = db.criar_pessoa(
        corpo.nome,
        corpo.idade,
        simulado=corpo.simulado,
        consentimento=corpo.consentimento,
    )
    return {"pessoa_id": pessoa_id}


@app.get("/api/pessoas")
def listar_pessoas() -> dict:
    return {"pessoas": db.listar_pessoas()}


# --- sessões ---

@app.post("/api/sessoes")
def abrir_sessao(corpo: NovaSessao) -> dict:
    pessoa = db.obter_pessoa(corpo.pessoa_id)
    if not pessoa:
        raise HTTPException(404, "pessoa não encontrada")

    sessao_id = db.criar_sessao(
        corpo.pessoa_id,
        canal=corpo.canal,
        agent_id=corpo.agent_id,
        simulado=bool(pessoa["simulado"]),
    )
    return {"sessao_id": sessao_id}


@app.post("/api/sessoes/{sessao_id}/falas")
def registrar_fala(sessao_id: int, corpo: NovaFala) -> dict:
    if not db.obter_sessao(sessao_id):
        raise HTTPException(404, "sessão não encontrada")

    fala_id = db.registrar_fala(
        sessao_id,
        corpo.papel,
        corpo.texto,
        brincadeira=corpo.brincadeira,
    )
    return {"fala_id": fala_id}


@app.post("/api/sessoes/{sessao_id}/brincadeira")
def janela_brincadeira(sessao_id: int, corpo: JanelaBrincadeira) -> dict:
    """
    Abre ou fecha a janela de uma brincadeira.

    Chamado pelo Custom LLM (function calling), que é o único que sabe quando
    o minuto dos bichos começou. Enquanto a janela está aberta, toda fala
    registrada sem etiqueta é atribuída àquela brincadeira.
    """
    if not db.obter_sessao(sessao_id):
        raise HTTPException(404, "sessão não encontrada")

    validas = {"fluencia", "memoria", "orientacao"}

    if corpo.acao == "abrir":
        if corpo.tipo not in validas:
            raise HTTPException(400, f"tipo deve ser um de {sorted(validas)}")
        db.definir_brincadeira_aberta(sessao_id, corpo.tipo)
        return {"brincadeira_aberta": corpo.tipo}

    if corpo.acao == "fechar":
        db.definir_brincadeira_aberta(sessao_id, None)
        return {"brincadeira_aberta": None}

    raise HTTPException(400, "acao deve ser 'abrir' ou 'fechar'")


@app.post("/api/sessoes/{sessao_id}/audio")
async def receber_audio(sessao_id: int, arquivo: UploadFile = File(...)) -> dict:
    """
    Recebe o áudio da conversa, mede e **apaga o arquivo**.

    O áudio nunca é persistido. Ele existe como arquivo temporário apenas
    durante esta requisição, porque o Praat lê de disco. O `finally` garante a
    remoção mesmo se a análise falhar.
    """
    sessao = db.obter_sessao(sessao_id)
    if not sessao:
        raise HTTPException(404, "sessão não encontrada")

    conteudo = await arquivo.read()
    if not conteudo:
        raise HTTPException(400, "áudio vazio")

    caminho_temp = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(conteudo)
            caminho_temp = tmp.name

        medidas = acustica.medir(caminho_temp)
    except Exception as exc:
        raise HTTPException(422, f"não foi possível analisar o áudio: {exc}")
    finally:
        if caminho_temp and os.path.exists(caminho_temp):
            os.unlink(caminho_temp)  # LGPD: áudio apagado logo após a análise

    # Guardamos as medidas acústicas já; o /finalizar junta as de texto.
    db.finalizar_sessao(
        sessao_id,
        status=sessao.get("status") or "",
        mensagem=sessao.get("mensagem") or "",
        medidas={**sessao.get("medidas", {}), **medidas.to_dict()},
        mudancas=sessao.get("mudancas", []),
    )

    return {
        "audio_descartado": True,
        "medidas_acusticas": medidas.to_dict(),
    }


@app.post("/api/sessoes/{sessao_id}/finalizar")
def finalizar(sessao_id: int, corpo: Finalizar | None = None) -> dict:
    """
    Fecha a conversa: junta medidas de texto, compara com a linha de base da
    própria pessoa e devolve o semáforo.
    """
    sessao = db.obter_sessao(sessao_id)
    if not sessao:
        raise HTTPException(404, "sessão não encontrada")

    pessoa_id = int(sessao["pessoa_id"])

    # --- medidas de texto, a partir das falas transcritas ---
    falas_pessoa = db.listar_falas(sessao_id, papel="pessoa")

    def juntar(brincadeira: str) -> Optional[str]:
        trechos = [
            f["texto"] for f in falas_pessoa if f["brincadeira"] == brincadeira
        ]
        return " ".join(trechos) if trechos else None

    medidas_texto = texto_mod.medir(
        [f["texto"] for f in falas_pessoa],
        texto_fluencia=juntar("fluencia"),
        texto_memoria=juntar("memoria"),
        palavras_memoria=(corpo.palavras_memoria if corpo else None),
        texto_orientacao=juntar("orientacao"),
        hoje=date.today(),
    )

    medidas = {**sessao.get("medidas", {}), **medidas_texto.to_dict()}

    # --- linha de base da própria pessoa ---
    anteriores = [
        s
        for s in db.listar_sessoes(pessoa_id)
        if int(s["id"]) != sessao_id and s.get("medidas")
    ]
    historico = [s["medidas"] for s in anteriores]
    linha_base = calcular_linha_base(historico)

    anterior_alterada = bool(
        anteriores and anteriores[-1].get("status") in ("amarelo", "vermelho")
    )

    resultado = avaliar(
        medidas,
        linha_base,
        sessao_anterior_alterada=anterior_alterada,
        n_sessoes_base=len(historico),
    )

    db.finalizar_sessao(
        sessao_id,
        status=resultado.status,
        mensagem=resultado.mensagem,
        medidas=medidas,
        mudancas=[
            {
                "chave": m.chave,
                "rotulo": m.rotulo,
                "valor_atual": m.valor_atual,
                "media_base": m.media_base,
                "z": m.z,
                "variacao_relativa": m.variacao_relativa,
                "descricao": m.descrever(),
            }
            for m in resultado.mudancas
        ],
    )

    return {
        "sessao_id": sessao_id,
        "status": resultado.status,
        "cor": resultado.cor,
        "mensagem": resultado.mensagem,
        "n_sessoes_base": resultado.n_sessoes_base,
        "medidas": medidas,
        "mudancas": [m.descrever() for m in resultado.mudancas],
    }


# --- painel da família ---

@app.get("/api/painel/{pessoa_id}")
def dados_painel(pessoa_id: int) -> dict:
    pessoa = db.obter_pessoa(pessoa_id)
    if not pessoa:
        raise HTTPException(404, "pessoa não encontrada")

    sessoes = db.listar_sessoes(pessoa_id)

    series: dict[str, list[Optional[float]]] = {chave: [] for chave in MEDIDAS}
    for s in sessoes:
        for chave in MEDIDAS:
            valor = s["medidas"].get(chave)
            series[chave].append(float(valor) if valor is not None else None)

    historico = [s["medidas"] for s in sessoes]
    linha_base = calcular_linha_base(historico)

    return {
        "pessoa": {
            "id": pessoa["id"],
            "nome": pessoa["nome"],
            "idade": pessoa["idade"],
            "simulado": bool(pessoa["simulado"]),
            "consentimento_em": pessoa["consentimento_em"],
        },
        # O painel precisa deixar claro que são dados gerados, não uma pessoa real.
        "dados_simulados": bool(pessoa["simulado"]),
        "sessoes_linha_base": SESSOES_LINHA_BASE,
        "rotulos": {chave: rotulo for chave, (rotulo, _) in MEDIDAS.items()},
        "linha_base": {
            chave: {"media": media, "desvio": desvio}
            for chave, (media, desvio) in linha_base.items()
        },
        "series": series,
        "sessoes": [
            {
                "id": s["id"],
                "iniciada_em": s["iniciada_em"],
                "status": s["status"],
                "mensagem": s["mensagem"],
                "mudancas": [m.get("descricao") for m in s["mudancas"]],
            }
            for s in sessoes
        ],
    }


@app.get("/painel")
def painel() -> FileResponse:
    return FileResponse(PASTA_WEB / "painel.html")


@app.get("/api/saude")
def saude() -> dict:
    return {"ok": True, "servico": "prosa-analise", "versao": app.version}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("PORT", "8000")))
