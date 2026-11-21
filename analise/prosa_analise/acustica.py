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

Limitação honesta e importante: todas estas medidas dependem do microfone, do
ambiente e do estado da pessoa (resfriado, cansaço, humor). Por isso nenhuma
delas gera alerta isolada — ver a regra de persistência em linha_base.py.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass
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

# Silêncio relativo ao pico de intensidade da gravação.
SILENCIO_DB = -25.0

# Abaixo disso não há fala suficiente para medir nada com honestidade.
DURACAO_MINIMA_S = 1.5


@dataclass
class MedidasAcusticas:
    """Medidas de um trecho de fala. Campos em None = não foi possível medir."""

    duracao_total_s: float
    duracao_fala_s: float
    taxa_articulacao_sil_s: Optional[float]
    proporcao_pausas: Optional[float]
    duracao_media_pausa_s: Optional[float]
    f0_media_hz: Optional[float]
    variacao_tom_st: Optional[float]
    jitter_local: Optional[float]
    shimmer_local: Optional[float]
    hnr_db: Optional[float]

    def to_dict(self) -> dict:
        return asdict(self)


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


def medir(caminho_wav: str) -> MedidasAcusticas:
    """
    Extrai as medidas acústicas de um arquivo de áudio.

    Espera WAV PCM. O gravador do navegador já entrega nesse formato, de
    propósito: evita depender de ffmpeg para converter.
    """
    som = parselmouth.Sound(caminho_wav)
    duracao_total = float(som.get_total_duration())

    if duracao_total < DURACAO_MINIMA_S:
        return MedidasAcusticas(
            duracao_total_s=duracao_total,
            duracao_fala_s=0.0,
            taxa_articulacao_sil_s=None,
            proporcao_pausas=None,
            duracao_media_pausa_s=None,
            f0_media_hz=None,
            variacao_tom_st=None,
            jitter_local=None,
            shimmer_local=None,
            hnr_db=None,
        )

    # --- tempo de fala, pausas ---
    intervalos = _intervalos_de_fala(som)
    duracao_fala = sum(fim - ini for ini, fim in intervalos)

    pausas: list[float] = []
    for anterior, seguinte in zip(intervalos, intervalos[1:]):
        gap = seguinte[0] - anterior[1]
        if PAUSA_MIN_S <= gap <= PAUSA_MAX_S:
            pausas.append(gap)

    proporcao_pausas = None
    if duracao_total > 0 and intervalos:
        proporcao_pausas = max(0.0, 1.0 - (duracao_fala / duracao_total))

    duracao_media_pausa = float(np.mean(pausas)) if pausas else None

    # --- velocidade de articulação ---
    nucleos = _contar_nucleos_silabicos(som, intervalos)
    taxa_articulacao = None
    if nucleos is not None and duracao_fala > 0.5:
        taxa_articulacao = nucleos / duracao_fala

    # --- tom: média e variação em semitons ---
    f0_media = None
    variacao_st = None
    try:
        pitch = som.to_pitch_ac(pitch_floor=F0_MIN_HZ, pitch_ceiling=F0_MAX_HZ)
        f0 = pitch.selected_array["frequency"]
        f0 = f0[f0 > 0]  # 0 = trecho não sonorizado
        if f0.size >= 10:
            f0_media = float(np.mean(f0))
            # Semitons, não Hz: a percepção de tom é logarítmica, e semitom
            # permite comparar voz grave com voz aguda na mesma escala.
            semitons = 12.0 * np.log2(f0 / np.median(f0))
            variacao_st = float(np.std(semitons))
    except Exception:
        pass

    # --- qualidade vocal: jitter, shimmer, HNR ---
    jitter = shimmer = None
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

    hnr = None
    try:
        harmonicidade = call(som, "To Harmonicity (cc)", 0.01, F0_MIN_HZ, 0.1, 1.0)
        hnr = _finito(call(harmonicidade, "Get mean", 0, 0))
    except Exception:
        pass

    return MedidasAcusticas(
        duracao_total_s=round(duracao_total, 3),
        duracao_fala_s=round(duracao_fala, 3),
        taxa_articulacao_sil_s=taxa_articulacao,
        proporcao_pausas=proporcao_pausas,
        duracao_media_pausa_s=duracao_media_pausa,
        f0_media_hz=f0_media,
        variacao_tom_st=variacao_st,
        jitter_local=jitter,
        shimmer_local=shimmer,
        hnr_db=hnr,
    )
