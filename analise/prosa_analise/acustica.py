"""
Medidas acústicas da fala, via Praat (parselmouth).

FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).

O que este módulo NÃO faz: ele não classifica doença, não dá score de risco e
não compara a pessoa com nenhuma população. Ele só extrai números descritivos
de um arquivo de áudio. A comparação é sempre com a linha de base da própria
pessoa, em linha_base.py.

As medidas escolhidas são as que a literatura de triagem por voz usa com mais
frequência (ver README, seção de ciência): lentificação da fala, pausas,
monotonia (variação de tom) e qualidade vocal (jitter, shimmer, HNR).

── O portão de qualidade ──────────────────────────────────────────────────
Medida ruim é PIOR que medida ausente. Um microfone saturando inflama o
shimmer; ganho baixo demais zera a detecção de pausas; áudio em 8 kHz (banda
de telefonia) torna jitter e shimmer inúteis. Em vez de produzir um número
bonito a partir de áudio ruim — e com isso acender um alerta falso para a
família — avaliamos a captura e **suprimimos** o que ela não sustenta.

Limitação honesta que permanece: todas estas medidas dependem do microfone, do
ambiente e do estado da pessoa (resfriado, cansaço, humor). Por isso nenhuma
delas gera alerta isolada — ver a regra de persistência em linha_base.py.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass, field
from typing import Optional

import numpy as np
import parselmouth
from parselmouth.praat import call

# Faixa de busca de F0. Ampla de propósito, para cobrir voz masculina e
# feminina de pessoa idosa sem precisar perguntar o sexo da pessoa.
F0_MIN_HZ = 60.0
F0_MAX_HZ = 500.0

# Uma pausa que conta como pausa de fala. Abaixo de 250 ms é articulação
# normal (oclusiva, respiração curta); acima de 2 s já é fim de turno.
PAUSA_MIN_S = 0.25
PAUSA_MAX_S = 2.0

# Pausa "longa" — hesitação, não respiração.
PAUSA_LONGA_S = 1.0

# Silêncio relativo ao pico de intensidade da gravação.
SILENCIO_DB = -25.0

# Abaixo disso não há fala suficiente para medir nada com honestidade.
DURACAO_MINIMA_S = 1.5
FALA_MINIMA_S = 3.0

# ── Limiares do portão de qualidade ───────────────────────────────────────

# Jitter, shimmer e HNR precisam de taxa alta. O Praat recomenda >= 44,1 kHz;
# aceitamos 22,05 kHz como piso. Abaixo disso, suprimimos as três.
TAXA_MINIMA_QUALIDADE_VOCAL_HZ = 22050

# Acima de 1% de amostras no teto, o shimmer já está inflado pela distorção.
SATURACAO_MAXIMA = 0.01

# Sinal médio abaixo disso é quase silêncio: microfone longe ou mudo.
NIVEL_MEDIO_MINIMO_DBFS = -50.0


@dataclass
class MedidasAcusticas:
    """Medidas de um trecho de fala. Campos em None = não foi possível medir."""

    duracao_total_s: float
    duracao_fala_s: float

    # ── ritmo ──
    taxa_articulacao_sil_s: Optional[float]   # sílabas por segundo DE FALA
    taxa_fala_sil_s: Optional[float]          # sílabas por segundo TOTAL
    razao_fala_articulacao: Optional[float]   # quanto a pausa come da fala
    proporcao_pausas: Optional[float]
    duracao_media_pausa_s: Optional[float]
    pausas_longas_por_min: Optional[float]

    # ── tom e intensidade ──
    f0_media_hz: Optional[float]
    variacao_tom_st: Optional[float]
    amplitude_tom_st: Optional[float]         # faixa p5–p95, em semitons
    variacao_intensidade_db: Optional[float]
    fracao_vozeada: Optional[float]

    # ── qualidade vocal (exige taxa alta) ──
    jitter_local: Optional[float]
    shimmer_local: Optional[float]
    hnr_db: Optional[float]

    # ── metadados do portão de qualidade ──
    taxa_amostragem_hz: Optional[int] = None
    confiavel: bool = True
    avisos: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class QualidadeCaptura:
    """Espelha o que o gravador do navegador envia (lib/gravador.ts)."""

    taxa_amostragem: Optional[int] = None
    fracao_saturada: Optional[float] = None
    nivel_medio_dbfs: Optional[float] = None
    nivel_pico_dbfs: Optional[float] = None
    cancelamento_de_eco: Optional[bool] = None

    @classmethod
    def de_dict(cls, d: Optional[dict]) -> "QualidadeCaptura":
        d = d or {}
        return cls(
            taxa_amostragem=d.get("taxaAmostragem") or d.get("taxa_amostragem"),
            fracao_saturada=d.get("fracaoSaturada") or d.get("fracao_saturada"),
            nivel_medio_dbfs=(
                d.get("nivelMedioDbfs")
                if d.get("nivelMedioDbfs") is not None
                else d.get("nivel_medio_dbfs")
            ),
            nivel_pico_dbfs=(
                d.get("nivelPicoDbfs")
                if d.get("nivelPicoDbfs") is not None
                else d.get("nivel_pico_dbfs")
            ),
            cancelamento_de_eco=(
                d.get("cancelamentoDeEco")
                if d.get("cancelamentoDeEco") is not None
                else d.get("cancelamento_de_eco")
            ),
        )


def _finito(valor) -> Optional[float]:
    """Praat devolve NaN/undefined quando não consegue medir. Viramos None."""
    try:
        f = float(valor)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return f


def _intervalos_de_fala(som: parselmouth.Sound) -> list[tuple[float, float]]:
    """
    Devolve os intervalos (início, fim) em que há fala, usando o detector de
    silêncios do próprio Praat.
    """
    try:
        grade = call(
            som,
            "To TextGrid (silences)",
            F0_MIN_HZ,
            0.0,            # time step automático
            SILENCIO_DB,
            PAUSA_MIN_S,    # duração mínima de silêncio
            0.1,            # duração mínima de trecho sonoro
            "silencio",
            "fala",
        )
    except Exception:
        return []

    intervalos: list[tuple[float, float]] = []
    n = int(call(grade, "Get number of intervals", 1))
    for i in range(1, n + 1):
        rotulo = call(grade, "Get label of interval", 1, i)
        if rotulo != "fala":
            continue
        inicio = float(call(grade, "Get start time of interval", 1, i))
        fim = float(call(grade, "Get end time of interval", 1, i))
        intervalos.append((inicio, fim))
    return intervalos


def _contar_nucleos_silabicos(
    som: parselmouth.Sound,
    intervalos_fala: list[tuple[float, float]],
) -> Optional[int]:
    """
    Conta núcleos silábicos (picos de intensidade em trecho sonorizado).

    Versão simplificada do método de De Jong & Wempe (2009), que é o padrão
    para medir velocidade de fala sem precisar transcrever.

    A regra: um pico de intensidade só vale como sílaba se (a) estiver acima do
    limiar de silêncio, (b) houver um vale de pelo menos 2 dB em relação ao
    pico anterior e (c) o instante do pico tiver F0 definida (ou seja, é som
    de voz, não estalo ou batida na mesa).
    """
    if not intervalos_fala:
        return None

    try:
        intensidade = som.to_intensity(minimum_pitch=F0_MIN_HZ)
        pitch = som.to_pitch_ac(pitch_floor=F0_MIN_HZ, pitch_ceiling=F0_MAX_HZ)
    except Exception:
        return None

    valores = intensidade.values[0]
    tempos = intensidade.xs()
    if valores.size == 0:
        return None

    pico_max = float(np.nanmax(valores))
    limiar = pico_max + SILENCIO_DB  # SILENCIO_DB é negativo

    def dentro_da_fala(t: float) -> bool:
        return any(ini <= t <= fim for ini, fim in intervalos_fala)

    nucleos = 0
    ultimo_vale = float(valores[0])
    i = 1
    while i < len(valores) - 1:
        v = float(valores[i])
        if math.isnan(v):
            i += 1
            continue

        e_pico = v > float(valores[i - 1]) and v >= float(valores[i + 1])
        if not (e_pico and v > limiar and v - ultimo_vale >= 2.0):
            if not math.isnan(v):
                ultimo_vale = min(ultimo_vale, v)
            i += 1
            continue

        t = float(tempos[i])
        if dentro_da_fala(t):
            f0 = pitch.get_value_at_time(t)
            if _finito(f0) is not None:
                nucleos += 1
                ultimo_vale = v

        i += 1

    return nucleos


def _vazio(
    duracao_total: float,
    *,
    taxa: Optional[int] = None,
    avisos: Optional[list[str]] = None,
    confiavel: bool = False,
) -> MedidasAcusticas:
    """Resultado sem nenhuma medida — quando o áudio não sustenta nada."""
    return MedidasAcusticas(
        duracao_total_s=round(duracao_total, 3),
        duracao_fala_s=0.0,
        taxa_articulacao_sil_s=None,
        taxa_fala_sil_s=None,
        razao_fala_articulacao=None,
        proporcao_pausas=None,
        duracao_media_pausa_s=None,
        pausas_longas_por_min=None,
        f0_media_hz=None,
        variacao_tom_st=None,
        amplitude_tom_st=None,
        variacao_intensidade_db=None,
        fracao_vozeada=None,
        jitter_local=None,
        shimmer_local=None,
        hnr_db=None,
        taxa_amostragem_hz=taxa,
        confiavel=confiavel,
        avisos=avisos or [],
    )


def medir(
    caminho_wav: str,
    qualidade: Optional[QualidadeCaptura | dict] = None,
) -> MedidasAcusticas:
    """
    Extrai as medidas acústicas de um arquivo de áudio.

    Espera WAV PCM. O gravador do navegador já entrega nesse formato, de
    propósito: evita depender de ffmpeg para converter.

    `qualidade` é o que o gravador mediu durante a captura (taxa real,
    saturação, nível). Quando informado, o portão de qualidade usa esses
    valores para suprimir medidas que o áudio não sustenta.
    """
    if isinstance(qualidade, dict):
        qualidade = QualidadeCaptura.de_dict(qualidade)

    som = parselmouth.Sound(caminho_wav)
    duracao_total = float(som.get_total_duration())
    taxa = int(round(som.sampling_frequency))

    avisos: list[str] = []
    confiavel = True

    # ── portão de qualidade: o que já descarta a sessão inteira ──
    if duracao_total < DURACAO_MINIMA_S:
        return _vazio(
            duracao_total,
            taxa=taxa,
            avisos=["áudio curto demais para medir"],
        )

    if qualidade:
        if (
            qualidade.fracao_saturada is not None
            and qualidade.fracao_saturada > SATURACAO_MAXIMA
        ):
            return _vazio(
                duracao_total,
                taxa=taxa,
                avisos=[
                    f"microfone saturando ({qualidade.fracao_saturada:.1%} das "
                    "amostras no teto) — afasta o microfone ou abaixa o ganho"
                ],
            )

        if (
            qualidade.nivel_medio_dbfs is not None
            and qualidade.nivel_medio_dbfs < NIVEL_MEDIO_MINIMO_DBFS
        ):
            return _vazio(
                duracao_total,
                taxa=taxa,
                avisos=[
                    f"sinal muito baixo ({qualidade.nivel_medio_dbfs:.0f} dBFS)"
                    " — microfone longe, abafado ou mudo"
                ],
            )

        if qualidade.cancelamento_de_eco:
            avisos.append(
                "cancelamento de eco ligado: altera levemente jitter e shimmer"
            )

    # ── tempo de fala, pausas ──
    intervalos = _intervalos_de_fala(som)
    duracao_fala = sum(fim - ini for ini, fim in intervalos)

    if duracao_fala < FALA_MINIMA_S:
        return _vazio(
            duracao_total,
            taxa=taxa,
            avisos=avisos
            + [f"só {duracao_fala:.1f}s de fala detectada — pouco para medir"],
        )

    pausas: list[float] = []
    pausas_longas = 0
    for anterior, seguinte in zip(intervalos, intervalos[1:]):
        gap = seguinte[0] - anterior[1]
        if PAUSA_MIN_S <= gap <= PAUSA_MAX_S:
            pausas.append(gap)
        if gap >= PAUSA_LONGA_S:
            pausas_longas += 1

    proporcao_pausas = None
    if duracao_total > 0 and intervalos:
        proporcao_pausas = max(0.0, 1.0 - (duracao_fala / duracao_total))

    duracao_media_pausa = float(np.mean(pausas)) if pausas else None

    pausas_longas_por_min = (
        pausas_longas / (duracao_total / 60.0) if duracao_total > 0 else None
    )

    # ── velocidade: de articulação (só fala) e de fala (com pausas) ──
    nucleos = _contar_nucleos_silabicos(som, intervalos)
    taxa_articulacao = taxa_fala = razao = None
    if nucleos is not None and duracao_fala > 0.5:
        taxa_articulacao = nucleos / duracao_fala
        taxa_fala = nucleos / duracao_total
        # Razão < 1. Quanto menor, mais a pausa come o tempo da conversa.
        # Separa "fala devagar" de "fala normal mas pausa muito".
        if taxa_articulacao > 0:
            razao = taxa_fala / taxa_articulacao

    # ── tom: média, variação, amplitude e fração vozeada ──
    f0_media = variacao_st = amplitude_st = fracao_vozeada = None
    try:
        pitch = som.to_pitch_ac(pitch_floor=F0_MIN_HZ, pitch_ceiling=F0_MAX_HZ)
        bruto = pitch.selected_array["frequency"]
        f0 = bruto[bruto > 0]  # 0 = trecho não sonorizado

        if bruto.size:
            fracao_vozeada = float(f0.size / bruto.size)

        if f0.size >= 10:
            f0_media = float(np.mean(f0))
            # Semitons, não Hz: a percepção de tom é logarítmica, e semitom
            # permite comparar voz grave com voz aguda na mesma escala.
            semitons = 12.0 * np.log2(f0 / np.median(f0))
            variacao_st = float(np.std(semitons))
            # p5–p95 em vez de min–max: imune a um único estalo de pitch.
            amplitude_st = float(
                np.percentile(semitons, 95) - np.percentile(semitons, 5)
            )
    except Exception:
        pass

    # ── intensidade: dinâmica de volume dentro da fala ──
    variacao_intensidade = None
    try:
        intensidade = som.to_intensity(minimum_pitch=F0_MIN_HZ)
        vals = intensidade.values[0]
        tempos = intensidade.xs()
        dentro = [
            float(v)
            for v, t in zip(vals, tempos)
            if not math.isnan(v)
            and any(ini <= t <= fim for ini, fim in intervalos)
        ]
        if len(dentro) >= 10:
            variacao_intensidade = float(np.std(dentro))
    except Exception:
        pass

    # ── qualidade vocal: jitter, shimmer, HNR ──
    # Só medimos se a taxa sustenta. Em 8 kHz (telefonia) estas três são
    # inúteis, e reportá-las seria inventar precisão que não existe.
    jitter = shimmer = hnr = None
    taxa_efetiva = qualidade.taxa_amostragem if (qualidade and qualidade.taxa_amostragem) else taxa

    if taxa_efetiva and taxa_efetiva < TAXA_MINIMA_QUALIDADE_VOCAL_HZ:
        avisos.append(
            f"áudio em {taxa_efetiva} Hz: jitter, shimmer e HNR suprimidos "
            f"(precisam de ao menos {TAXA_MINIMA_QUALIDADE_VOCAL_HZ} Hz)"
        )
    else:
        try:
            pontos = call(som, "To PointProcess (periodic, cc)", F0_MIN_HZ, F0_MAX_HZ)
            # Assinatura do Praat: (início, fim, período mín, período máx, fator máximo)
            jitter = _finito(
                call(pontos, "Get jitter (local)", 0, 0, 1e-4, 0.02, 1.3)
            )
            shimmer = _finito(
                call(
                    [som, pontos],
                    "Get shimmer (local)",
                    0, 0, 1e-4, 0.02, 1.3, 1.6,
                )
            )
        except Exception:
            pass

        try:
            harmonicidade = call(som, "To Harmonicity (cc)", 0.01, F0_MIN_HZ, 0.1, 1.0)
            hnr = _finito(call(harmonicidade, "Get mean", 0, 0))
        except Exception:
            pass

    return MedidasAcusticas(
        duracao_total_s=round(duracao_total, 3),
        duracao_fala_s=round(duracao_fala, 3),
        taxa_articulacao_sil_s=taxa_articulacao,
        taxa_fala_sil_s=taxa_fala,
        razao_fala_articulacao=razao,
        proporcao_pausas=proporcao_pausas,
        duracao_media_pausa_s=duracao_media_pausa,
        pausas_longas_por_min=pausas_longas_por_min,
        f0_media_hz=f0_media,
        variacao_tom_st=variacao_st,
        amplitude_tom_st=amplitude_st,
        variacao_intensidade_db=variacao_intensidade,
        fracao_vozeada=fracao_vozeada,
        jitter_local=jitter,
        shimmer_local=shimmer,
        hnr_db=hnr,
        taxa_amostragem_hz=taxa,
        confiavel=confiavel,
        avisos=avisos,
    )
