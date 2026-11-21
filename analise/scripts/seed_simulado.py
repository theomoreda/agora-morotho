"""
Gera a persona de demonstração do Prosa: "Dona Cida, 78 anos".

FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).

>>> ATENÇÃO: TODOS OS DADOS GERADOS AQUI SÃO SIMULADOS. <<<
Dona Cida não existe. Nenhuma pessoa real foi gravada para produzir estes
números. A pessoa é marcada com `simulado = 1` no banco, e o painel mostra o
selo "DADOS SIMULADOS" por causa dessa marca.

Por que simular: o Prosa detecta mudança ao longo de semanas. Um hackathon de
dois dias não produz esse histórico. Em vez de fingir que produziu, geramos um
histórico declaradamente sintético para demonstrar a lógica do semáforo.

O que é simulado: as MEDIDAS (números de voz e de texto).
O que NÃO é simulado: a regra de decisão. O status de cada dia é calculado
pelo mesmo código que roda numa conversa real (linha_base.avaliar).

Uso:
    python -m scripts.seed_simulado
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# O console do Windows abre em cp1252 e quebra ao imprimir os emojis do
# semáforo. Forçamos UTF-8 na saída.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from prosa_analise import db  # noqa: E402
from prosa_analise.linha_base import avaliar, calcular_linha_base  # noqa: E402

DIAS = 14

# Linha de base da Dona Cida: (média, desvio). Valores plausíveis para uma
# pessoa de 78 anos conversando por alguns minutos.
PERFIL = {
    # ── ritmo ──
    "taxa_articulacao_sil_s": (4.60, 0.22),
    "taxa_fala_sil_s": (3.30, 0.20),
    "razao_fala_articulacao": (0.720, 0.040),
    "proporcao_pausas": (0.280, 0.028),
    "duracao_media_pausa_s": (0.450, 0.045),
    "pausas_longas_por_min": (2.00, 0.50),
    # ── tom ──
    "variacao_tom_st": (2.60, 0.22),
    "amplitude_tom_st": (8.00, 0.80),
    # ── intensidade ──
    "variacao_intensidade_db": (7.00, 0.70),
    # ── qualidade vocal ──
    "jitter_local": (0.0180, 0.0025),
    "shimmer_local": (0.0850, 0.0090),
    "hnr_db": (17.0, 1.3),
    "fracao_vozeada": (0.520, 0.040),
    # ── texto ──
    "palavras_por_turno": (11.0, 1.1),
    "mattr": (0.720, 0.028),
    "hesitacoes_por_100": (3.00, 0.90),
    "repeticao_imediata_por_100": (1.20, 0.50),
    "proporcao_conteudo": (0.620, 0.030),
    # ── brincadeira ──
    "bichos_diferentes": (16.0, 1.4),
}

# A deriva dos últimos dias. Fração aplicada à média, na direção que significa
# piora. Cresce devagar: o dia 11 ainda não cruza o limiar, o 12 cruza.
DERIVA = {
    # ritmo
    "taxa_articulacao_sil_s": -0.16,       # fala mais lenta
    "taxa_fala_sil_s": -0.24,              # e com mais pausa no meio
    "razao_fala_articulacao": -0.12,       # pausa come mais da conversa
    "proporcao_pausas": +0.42,
    "duracao_media_pausa_s": +0.38,
    "pausas_longas_por_min": +0.55,        # mais hesitação longa
    # tom
    "variacao_tom_st": -0.28,              # fala mais monótona
    "amplitude_tom_st": -0.22,
    # intensidade
    "variacao_intensidade_db": -0.18,
    # texto
    "palavras_por_turno": -0.22,           # respostas mais curtas
    "hesitacoes_por_100": +0.50,
    "repeticao_imediata_por_100": +0.45,
    # brincadeira
    "bichos_diferentes": -0.32,
}

# Dias 11 a 14: intensidade crescente da deriva (0 = sem deriva).
RAMPA = {11: 0.45, 12: 1.00, 13: 1.25, 14: 1.40}


def gerar_medidas(dia: int, rng: np.random.Generator) -> dict:
    """Medidas de um dia. Ruído normal em torno do perfil, mais a deriva."""
    medidas: dict[str, float] = {}
    intensidade = RAMPA.get(dia, 0.0)

    for chave, (media, desvio) in PERFIL.items():
        valor = float(rng.normal(media, desvio))
        if intensidade and chave in DERIVA:
            valor += media * DERIVA[chave] * intensidade
        medidas[chave] = max(valor, 1e-6)

    medidas["bichos_diferentes"] = float(round(medidas["bichos_diferentes"]))

    # Campos descritivos, para o painel não ficar com buracos.
    medidas["n_turnos"] = int(rng.integers(14, 22))
    medidas["n_palavras"] = int(
        medidas["n_turnos"] * medidas["palavras_por_turno"]
    )
    medidas["duracao_total_s"] = float(round(rng.normal(300, 35), 1))
    medidas["memoria_total"] = 3
    # A memória cai só nos dias de deriva mais forte.
    medidas["memoria_acertos"] = 3 if intensidade < 1.0 else int(
        rng.integers(1, 3)
    )
    medidas["orientacao_acertou"] = bool(intensidade < 1.25)

    return medidas


def main() -> None:
    db.criar_esquema()

    rng = np.random.default_rng(20261121)

    pessoa_id = db.criar_pessoa(
        "Dona Cida (SIMULADA)",
        78,
        simulado=True,
        consentimento=True,
    )

    inicio = datetime.now(timezone.utc) - timedelta(days=DIAS)
    anterior_alterada = False

    print(f"pessoa_id = {pessoa_id}  (14 dias simulados)\n")
    print(f"{'dia':>4}  {'status':<12} mudanças")
    print("-" * 72)

    for dia in range(1, DIAS + 1):
        quando = (inicio + timedelta(days=dia)).isoformat(timespec="seconds")

        sessao_id = db.criar_sessao(
            pessoa_id,
            canal=f"simulado-dia-{dia:02d}",
            simulado=True,
            iniciada_em=quando,
        )

        medidas = gerar_medidas(dia, rng)

        # Linha de base com as conversas ANTERIORES, igual ao fluxo real.
        anteriores = [
            s
            for s in db.listar_sessoes(pessoa_id)
            if int(s["id"]) != sessao_id and s.get("medidas")
        ]
        historico = [s["medidas"] for s in anteriores]

        resultado = avaliar(
            medidas,
            calcular_linha_base(historico),
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

        anterior_alterada = resultado.status in ("amarelo", "vermelho")

        resumo = ", ".join(m.descrever() for m in resultado.mudancas[:3]) or "—"
        print(f"{dia:>4}  {resultado.cor} {resultado.status:<10} {resumo}")

    print("-" * 72)
    print(f"\nPainel:  http://127.0.0.1:8000/painel?pessoa={pessoa_id}")


if __name__ == "__main__":
    main()
