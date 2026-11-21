"""
Testes do Prosa.

FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).

Cobrem o que pode quebrar silenciosamente e estragar a demo ou, pior, gerar
alerta errado para uma família:
  - as medidas acústicas discriminam fala lenta/monótona de fala normal
  - as brincadeiras são contadas corretamente (bichos, memória, orientação)
  - o semáforo NÃO acende com pessoa estável e acende com deriva
  - vermelho exige persistência (um dia ruim não vira alerta)
  - o áudio é apagado depois da análise
  - o fluxo HTTP inteiro funciona ponta a ponta

Rodar:  python -m pytest -q
"""

from __future__ import annotations

import wave
from datetime import date
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

from prosa_analise import acustica, db, texto
from prosa_analise.linha_base import avaliar, calcular_linha_base


# --------------------------------------------------------------------------
# apoio
# --------------------------------------------------------------------------

TAXA = 16000


def _fala_sintetica(
    caminho: Path,
    *,
    n_silabas: int = 40,
    f0: float = 180.0,
    pausa_s: float = 0.35,
    variacao_tom: float = 1.0,
    semente: int = 7,
) -> Path:
    """
    Gera um WAV parecido com fala: sílabas vozeadas separadas por pausas.

    Não é fala de verdade, mas tem o que as medidas procuram — picos de
    intensidade vozeados, silêncios e variação de F0.
    """
    rng = np.random.default_rng(semente)
    partes: list[np.ndarray] = []

    for i in range(n_silabas):
        freq = f0 * (1 + variacao_tom * rng.standard_normal() * 0.06)
        dur = 0.18
        t = np.linspace(0, dur, int(TAXA * dur), endpoint=False)
        fase = np.cumsum(2 * np.pi * freq / TAXA) * np.ones_like(t)
        fase = np.cumsum(np.full(t.size, 2 * np.pi * freq / TAXA))
        onda = sum((1.0 / (k + 1)) * np.sin((k + 1) * fase) for k in range(6))
        partes.append(onda * np.hanning(t.size))
        partes.append(np.zeros(int(TAXA * 0.04)))
        if (i + 1) % 5 == 0:
            partes.append(np.zeros(int(TAXA * pausa_s)))

    sinal = np.concatenate(partes)
    sinal = sinal / np.max(np.abs(sinal)) * 0.8

    with wave.open(str(caminho), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(TAXA)
        w.writeframes((sinal * 32767).astype("<i2").tobytes())

    return caminho


def _perfil_estavel() -> dict[str, tuple[float, float]]:
    return {
        "taxa_articulacao_sil_s": (4.60, 0.20),
        "proporcao_pausas": (0.280, 0.025),
        "duracao_media_pausa_s": (0.450, 0.040),
        "variacao_tom_st": (2.60, 0.20),
        "palavras_por_turno": (11.0, 1.0),
        "mattr": (0.720, 0.025),
    }


def _sessao(rng: np.random.Generator, deriva: dict[str, float] | None = None) -> dict:
    medidas = {}
    for chave, (media, desvio) in _perfil_estavel().items():
        valor = float(rng.normal(media, desvio))
        if deriva and chave in deriva:
            valor += media * deriva[chave]
        medidas[chave] = valor
    return medidas


@pytest.fixture()
def cliente(tmp_path, monkeypatch):
    """Cliente HTTP com banco próprio, isolado do prosa.db de desenvolvimento."""
    banco = tmp_path / "teste.db"
    monkeypatch.setattr(db, "CAMINHO_BANCO", banco)

    from prosa_analise import app as modulo_app

    with TestClient(modulo_app.app) as c:
        yield c


# --------------------------------------------------------------------------
# 1-3. medidas acústicas
# --------------------------------------------------------------------------

def test_acustica_mede_fala_normal(tmp_path):
    caminho = _fala_sintetica(tmp_path / "normal.wav")
    m = acustica.medir(str(caminho))

    assert m.duracao_total_s > 5
    assert m.duracao_fala_s > 0
    assert m.f0_media_hz is not None
    # O sinal foi gerado em 180 Hz; aceitamos folga para o estimador do Praat.
    assert 150 < m.f0_media_hz < 210
    assert m.taxa_articulacao_sil_s is not None
    assert m.hnr_db is not None


def test_acustica_discrimina_pausas_e_monotonia(tmp_path):
    """
    O coração da detecção: fala com pausa longa e pouca variação de tom tem
    que medir diferente de fala normal. Se isto quebrar, o semáforo fica cego.
    """
    normal = acustica.medir(
        str(_fala_sintetica(tmp_path / "n.wav", pausa_s=0.35, variacao_tom=1.0))
    )
    alterada = acustica.medir(
        str(
            _fala_sintetica(
                tmp_path / "a.wav", n_silabas=20, pausa_s=1.2, variacao_tom=0.2
            )
        )
    )

    assert alterada.proporcao_pausas > normal.proporcao_pausas
    assert alterada.duracao_media_pausa_s > normal.duracao_media_pausa_s
    assert alterada.variacao_tom_st < normal.variacao_tom_st


def test_acustica_audio_curto_nao_inventa_medida(tmp_path):
    """Áudio curto demais devolve None, nunca um número inventado."""
    caminho = tmp_path / "curto.wav"
    with wave.open(str(caminho), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(TAXA)
        w.writeframes((np.zeros(int(TAXA * 0.5)) * 32767).astype("<i2").tobytes())

    m = acustica.medir(str(caminho))
    assert m.taxa_articulacao_sil_s is None
    assert m.f0_media_hz is None


# --------------------------------------------------------------------------
# 4-6. medidas de texto e brincadeiras
# --------------------------------------------------------------------------

def test_conta_bichos_sem_repetir_e_com_plural():
    # 'cachorros' é o mesmo bicho que 'cachorro'; 'leoes' -> 'leao'.
    assert texto.contar_bichos("cachorro cachorros gato gata") == 3
    assert texto.contar_bichos("leoes e jacare") == 2
    # Nome composto não deve ser contado duas vezes (beija + flor).
    assert texto.contar_bichos("beija flor") == 1
    # Palavra que não é bicho não conta.
    assert texto.contar_bichos("mesa cadeira janela") == 0


def test_memoria_e_orientacao():
    assert texto.checar_memoria(
        "era casa, banana e chinelo", ["casa", "banana", "chinelo"]
    ) == (3, 3)
    assert texto.checar_memoria("só lembro de casa", ["casa", "banana", "chinelo"]) == (
        1,
        3,
    )

    sabado = date(2026, 11, 21)
    assert texto.checar_orientacao("hoje é sábado", sabado) is True
    assert texto.checar_orientacao("hoje é terça", sabado) is False
    # Não respondeu: não dá para dizer que errou.
    assert texto.checar_orientacao("ah, não sei", sabado) is None


def test_mattr_nao_depende_do_tamanho_do_texto():
    """
    Por isso usamos MATTR e não TTR: o TTR cai conforme o texto cresce, então
    compararia tamanho de conversa, não riqueza de vocabulário.
    """
    base = "gato cavalo arvore janela pedra livro campo rio monte vento "
    curto = texto.palavras(base * 6)
    longo = texto.palavras(base * 20)

    m_curto = texto.mattr(curto)
    m_longo = texto.mattr(longo)

    assert m_curto is not None and m_longo is not None
    assert abs(m_curto - m_longo) < 0.05


# --------------------------------------------------------------------------
# 7-10. semáforo
# --------------------------------------------------------------------------

def test_semaforo_calibrando_sem_linha_base():
    rng = np.random.default_rng(1)
    historico = [_sessao(rng) for _ in range(3)]  # menos que o mínimo
    r = avaliar(
        _sessao(rng),
        calcular_linha_base(historico),
        n_sessoes_base=len(historico),
    )
    assert r.status == "calibrando"
    assert "Faltam" in r.mensagem


def test_semaforo_fica_verde_com_pessoa_estavel():
    """
    Pessoa estável não pode acender o semáforo. Falso alarme em saúde gera
    ansiedade na família — este teste é o guarda dessa promessa.
    """
    rng = np.random.default_rng(42)
    acendeu = 0
    for _ in range(60):
        historico = [_sessao(rng) for _ in range(5)]
        r = avaliar(
            _sessao(rng),
            calcular_linha_base(historico),
            n_sessoes_base=5,
        )
        if r.status != "verde":
            acendeu += 1

    # Com a regra atual a taxa medida é bem abaixo de 1%; 3 em 60 dá folga
    # para a variação do sorteio sem deixar passar uma regressão real.
    assert acendeu <= 3, f"{acendeu} falsos alarmes em 60 conversas estáveis"


def test_semaforo_acende_amarelo_com_deriva():
    rng = np.random.default_rng(7)
    historico = [_sessao(rng) for _ in range(5)]

    deriva = {
        "taxa_articulacao_sil_s": -0.18,
        "proporcao_pausas": +0.45,
        "duracao_media_pausa_s": +0.40,
        "variacao_tom_st": -0.30,
    }
    r = avaliar(
        _sessao(rng, deriva),
        calcular_linha_base(historico),
        sessao_anterior_alterada=False,
        n_sessoes_base=5,
    )

    assert r.status == "amarelo"
    assert len(r.mudancas) >= 3
    # A mensagem descreve a mudança em linguagem comum, sem nome de doença.
    for proibida in ("Alzheimer", "demência", "diagnóst", "doença"):
        assert proibida.lower() not in r.mensagem.lower()


def test_vermelho_exige_persistencia():
    """Um dia ruim é amarelo. Vermelho só quando se repete."""
    rng = np.random.default_rng(7)
    historico = [_sessao(rng) for _ in range(5)]
    linha_base = calcular_linha_base(historico)

    deriva = {
        "taxa_articulacao_sil_s": -0.18,
        "proporcao_pausas": +0.45,
        "duracao_media_pausa_s": +0.40,
        "variacao_tom_st": -0.30,
    }
    atual = _sessao(rng, deriva)

    primeira = avaliar(
        atual, linha_base, sessao_anterior_alterada=False, n_sessoes_base=5
    )
    segunda = avaliar(
        atual, linha_base, sessao_anterior_alterada=True, n_sessoes_base=5
    )

    assert primeira.status == "amarelo"
    assert segunda.status == "vermelho"
    assert "profissional" in segunda.mensagem


# --------------------------------------------------------------------------
# 11-13. fluxo HTTP
# --------------------------------------------------------------------------

def test_fluxo_http_completo(cliente):
    pessoa_id = cliente.post(
        "/api/pessoas", json={"nome": "Teste", "idade": 70, "consentimento": True}
    ).json()["pessoa_id"]

    sessao_id = cliente.post(
        "/api/sessoes", json={"pessoa_id": pessoa_id, "canal": "canal-teste"}
    ).json()["sessao_id"]

    for fala in ["oi clara, tudo bem por aqui", "dormi bem, obrigada"]:
        r = cliente.post(
            f"/api/sessoes/{sessao_id}/falas",
            json={"papel": "pessoa", "texto": fala},
        )
        assert r.status_code == 200

    final = cliente.post(f"/api/sessoes/{sessao_id}/finalizar", json={}).json()

    # Primeira conversa da pessoa: não há com o que comparar.
    assert final["status"] == "calibrando"
    assert final["medidas"]["n_turnos"] == 2

    painel = cliente.get(f"/api/painel/{pessoa_id}").json()
    assert painel["pessoa"]["nome"] == "Teste"
    assert painel["dados_simulados"] is False
    assert len(painel["sessoes"]) == 1


def test_janela_de_brincadeira_etiqueta_as_falas(cliente):
    """
    Quem sabe que o minuto dos bichos começou é o Custom LLM. Ele abre a
    janela, e as falas que chegam sem etiqueta herdam ela.
    """
    pessoa_id = cliente.post("/api/pessoas", json={"nome": "Teste"}).json()[
        "pessoa_id"
    ]
    sessao_id = cliente.post(
        "/api/sessoes", json={"pessoa_id": pessoa_id}
    ).json()["sessao_id"]

    # Fora da janela: conversa normal.
    cliente.post(
        f"/api/sessoes/{sessao_id}/falas",
        json={"papel": "pessoa", "texto": "que calor hoje"},
    )

    cliente.post(
        f"/api/sessoes/{sessao_id}/brincadeira",
        json={"acao": "abrir", "tipo": "fluencia"},
    )
    cliente.post(
        f"/api/sessoes/{sessao_id}/falas",
        json={"papel": "pessoa", "texto": "cachorro gato cavalo galinha pato"},
    )
    cliente.post(f"/api/sessoes/{sessao_id}/brincadeira", json={"acao": "fechar"})

    cliente.post(
        f"/api/sessoes/{sessao_id}/falas",
        json={"papel": "pessoa", "texto": "gostei de brincar"},
    )

    final = cliente.post(f"/api/sessoes/{sessao_id}/finalizar", json={}).json()

    # Só os bichos ditos DENTRO da janela contam.
    assert final["medidas"]["bichos_diferentes"] == 5


def test_audio_e_apagado_depois_da_analise(cliente, tmp_path):
    """
    Promessa de LGPD verificada por teste: o áudio não fica em lugar nenhum.
    Checamos que nada sobrou na pasta temporária e que a resposta confirma.
    """
    import tempfile

    pessoa_id = cliente.post("/api/pessoas", json={"nome": "Teste"}).json()[
        "pessoa_id"
    ]
    sessao_id = cliente.post(
        "/api/sessoes", json={"pessoa_id": pessoa_id}
    ).json()["sessao_id"]

    caminho = _fala_sintetica(tmp_path / "conversa.wav")
    antes = set(Path(tempfile.gettempdir()).glob("*.wav"))

    with open(caminho, "rb") as f:
        resposta = cliente.post(
            f"/api/sessoes/{sessao_id}/audio",
            files={"arquivo": ("conversa.wav", f, "audio/wav")},
        )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["audio_descartado"] is True
    assert corpo["medidas_acusticas"]["f0_media_hz"] is not None

    depois = set(Path(tempfile.gettempdir()).glob("*.wav"))
    assert depois <= antes, "sobrou arquivo de áudio na pasta temporária"
