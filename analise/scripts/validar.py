"""
Validação do Prosa.

FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).

Responde três perguntas, nessa ordem de honestidade:

  1. **Taxa de falso alarme.** Se nada mudou na pessoa, com que frequência o
     semáforo acende? Medido por simulação: milhares de conversas estáveis
     geradas a partir de um perfil, passando pela MESMA regra de decisão que
     roda em produção. É o número que mais importa — falso alarme em saúde
     gera ansiedade na família.

  2. **Sensibilidade à deriva.** Com uma piora de X%, em quantas conversas o
     semáforo acende? Diz quanto tempo levaria para a família ser avisada.

  3. **Teste-reteste (ICC).** As medidas são estáveis quando a MESMA pessoa
     fala em dias diferentes? Precisa de gravações reais do time — roda sobre
     o que estiver no banco.

Uso:
    python -m scripts.validar
    python -m scripts.validar --simulacoes 5000
"""

from __future__ import annotations

import argparse
import statistics
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from prosa_analise import db  # noqa: E402
from prosa_analise.linha_base import (  # noqa: E402
    LIMIAR_Z,
    MEDIDAS,
    MEDIDAS_PARA_AMARELO,
    SESSOES_LINHA_BASE,
    avaliar,
    calcular_linha_base,
)
from scripts.seed_simulado import DERIVA, PERFIL  # noqa: E402


def _sortear_sessao(
    rng: np.random.Generator,
    intensidade_deriva: float = 0.0,
) -> dict:
    """Uma conversa sorteada do perfil, opcionalmente com deriva aplicada."""
    medidas: dict[str, float] = {}
    for chave, (media, desvio) in PERFIL.items():
        valor = float(rng.normal(media, desvio))
        if intensidade_deriva and chave in DERIVA:
            valor += media * DERIVA[chave] * intensidade_deriva
        medidas[chave] = max(valor, 1e-6)
    return medidas


def taxa_de_falso_alarme(n_simulacoes: int, rng: np.random.Generator) -> dict:
    """
    Pessoa totalmente estável. Quantas vezes o semáforo sai do verde?

    Cada simulação monta uma linha de base nova e avalia UMA conversa seguinte,
    toda ela sorteada do mesmo perfil. Qualquer amarelo aqui é falso positivo
    por definição: não existe deriva nenhuma nos dados.
    """
    amarelos = 0
    for _ in range(n_simulacoes):
        historico = [_sortear_sessao(rng) for _ in range(SESSOES_LINHA_BASE)]
        atual = _sortear_sessao(rng)

        resultado = avaliar(
            atual,
            calcular_linha_base(historico),
            sessao_anterior_alterada=False,
            n_sessoes_base=len(historico),
        )
        if resultado.status in ("amarelo", "vermelho"):
            amarelos += 1

    taxa = amarelos / n_simulacoes
    # Com uma conversa por dia, é assim que a família sente o falso alarme.
    return {
        "simulacoes": n_simulacoes,
        "falsos_amarelos": amarelos,
        "taxa_por_conversa": taxa,
        "dias_entre_falsos_alarmes": (1 / taxa) if taxa else float("inf"),
    }


def sensibilidade(
    intensidades: list[float],
    n_simulacoes: int,
    rng: np.random.Generator,
) -> list[dict]:
    """Com deriva de dada intensidade, com que frequência o semáforo acende?"""
    saida = []
    for intensidade in intensidades:
        detectados = 0
        for _ in range(n_simulacoes):
            historico = [_sortear_sessao(rng) for _ in range(SESSOES_LINHA_BASE)]
            atual = _sortear_sessao(rng, intensidade_deriva=intensidade)

            resultado = avaliar(
                atual,
                calcular_linha_base(historico),
                sessao_anterior_alterada=False,
                n_sessoes_base=len(historico),
            )
            if resultado.status in ("amarelo", "vermelho"):
                detectados += 1

        saida.append(
            {
                "intensidade": intensidade,
                "deteccao_por_conversa": detectados / n_simulacoes,
            }
        )
    return saida


def dias_ate_avisar(
    intensidade: float,
    n_simulacoes: int,
    rng: np.random.Generator,
    max_dias: int = 21,
) -> dict:
    """
    Em quantos DIAS a família é avisada, se a deriva começou e não parou?

    Esta é a métrica que importa de verdade, e não a sensibilidade por
    conversa. O Prosa fala com a pessoa todos os dias: uma deriva real
    reaparece amanhã. Sensibilidade de 37% por conversa não significa que 63%
    das derivas passam — significa que, em média, levam alguns dias.

    Simula a linha de base, depois dias consecutivos com deriva, e registra
    em que dia saiu o primeiro amarelo e o primeiro vermelho (que exige
    persistência: amarelo repetido na conversa seguinte).
    """
    dias_amarelo: list[int] = []
    dias_vermelho: list[int] = []
    nunca = 0

    for _ in range(n_simulacoes):
        historico = [_sortear_sessao(rng) for _ in range(SESSOES_LINHA_BASE)]
        linha_base = calcular_linha_base(historico)

        anterior_alterada = False
        primeiro_amarelo = None
        primeiro_vermelho = None

        for dia in range(1, max_dias + 1):
            atual = _sortear_sessao(rng, intensidade_deriva=intensidade)
            r = avaliar(
                atual,
                linha_base,
                sessao_anterior_alterada=anterior_alterada,
                n_sessoes_base=SESSOES_LINHA_BASE,
            )

            if r.status in ("amarelo", "vermelho") and primeiro_amarelo is None:
                primeiro_amarelo = dia
            if r.status == "vermelho" and primeiro_vermelho is None:
                primeiro_vermelho = dia
                break

            anterior_alterada = r.status in ("amarelo", "vermelho")

        if primeiro_amarelo is None:
            nunca += 1
        else:
            dias_amarelo.append(primeiro_amarelo)
        if primeiro_vermelho is not None:
            dias_vermelho.append(primeiro_vermelho)

    return {
        "intensidade": intensidade,
        "avisou_em_ate_21_dias": 1 - (nunca / n_simulacoes),
        "mediana_dias_amarelo": (
            statistics.median(dias_amarelo) if dias_amarelo else None
        ),
        "mediana_dias_vermelho": (
            statistics.median(dias_vermelho) if dias_vermelho else None
        ),
        "fracao_chegou_vermelho": len(dias_vermelho) / n_simulacoes,
    }


def icc_um(grupos: list[list[float]]) -> float | None:
    """
    ICC(1), modelo de efeitos aleatórios de uma via.

    Mede quanto da variação total vem de diferenças ENTRE pessoas (sinal) e
    quanto vem da variação da mesma pessoa entre dias (ruído). Perto de 1 = a
    medida é uma característica estável da pessoa; perto de 0 = é ruído.

    Precisa de pelo menos 2 pessoas com 2 medidas cada.
    """
    grupos = [g for g in grupos if len(g) >= 2]
    if len(grupos) < 2:
        return None

    todos = [v for g in grupos for v in g]
    n_total = len(todos)
    media_geral = statistics.fmean(todos)
    k = n_total / len(grupos)  # medidas por pessoa (média, se desbalanceado)

    # Soma dos quadrados entre grupos e dentro dos grupos.
    sq_entre = sum(
        len(g) * (statistics.fmean(g) - media_geral) ** 2 for g in grupos
    )
    sq_dentro = sum(
        (v - statistics.fmean(g)) ** 2 for g in grupos for v in g
    )

    gl_entre = len(grupos) - 1
    gl_dentro = n_total - len(grupos)
    if gl_entre <= 0 or gl_dentro <= 0:
        return None

    mq_entre = sq_entre / gl_entre
    mq_dentro = sq_dentro / gl_dentro

    denominador = mq_entre + (k - 1) * mq_dentro
    if denominador == 0:
        return None

    return (mq_entre - mq_dentro) / denominador


def teste_reteste() -> dict:
    """
    Teste-reteste sobre as gravações REAIS que estiverem no banco.

    Ignora as pessoas marcadas como simuladas: não faria sentido validar
    estabilidade de medida em cima de números gerados por nós.
    """
    pessoas = [p for p in db.listar_pessoas() if not p["simulado"]]

    por_medida: dict[str, list[list[float]]] = defaultdict(list)
    total_sessoes = 0

    for pessoa in pessoas:
        sessoes = db.listar_sessoes(int(pessoa["id"]))
        total_sessoes += len(sessoes)
        for chave in MEDIDAS:
            valores = [
                float(s["medidas"][chave])
                for s in sessoes
                if s["medidas"].get(chave) is not None
            ]
            if len(valores) >= 2:
                por_medida[chave].append(valores)

    resultados = {
        chave: icc_um(grupos) for chave, grupos in por_medida.items()
    }

    return {
        "pessoas_reais": len(pessoas),
        "sessoes_reais": total_sessoes,
        "icc": {k: v for k, v in resultados.items() if v is not None},
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Validação do Prosa")
    parser.add_argument("--simulacoes", type=int, default=4000)
    parser.add_argument("--semente", type=int, default=20261122)
    args = parser.parse_args()

    rng = np.random.default_rng(args.semente)

    print("=" * 74)
    print("VALIDAÇÃO DO PROSA")
    print("=" * 74)
    print(
        f"\nRegra em vigor: linha de base com {SESSOES_LINHA_BASE} conversas · "
        f"limiar {LIMIAR_Z} desvios · {MEDIDAS_PARA_AMARELO} medidas para amarelo"
    )

    print("\n" + "-" * 74)
    print("1. FALSO ALARME (pessoa estável, nenhuma deriva nos dados)")
    print("-" * 74)
    fa = taxa_de_falso_alarme(args.simulacoes, rng)
    print(f"  conversas simuladas       {fa['simulacoes']}")
    print(f"  falsos amarelos           {fa['falsos_amarelos']}")
    print(f"  taxa por conversa         {fa['taxa_por_conversa'] * 100:.2f}%")
    dias = fa["dias_entre_falsos_alarmes"]
    if dias == float("inf"):
        print("  1 falso alarme a cada     — (nenhum nesta amostra)")
    else:
        print(f"  1 falso alarme a cada     {dias:.0f} conversas")

    print("\n" + "-" * 74)
    print("2. SENSIBILIDADE (deriva aplicada; 1.0 = o cenário do seed)")
    print("-" * 74)
    print(f"  {'intensidade':>12}  {'detecção':>10}")
    for linha in sensibilidade([0.25, 0.5, 0.75, 1.0, 1.25], args.simulacoes // 2, rng):
        print(
            f"  {linha['intensidade']:>12.2f}  "
            f"{linha['deteccao_por_conversa'] * 100:>9.1f}%"
        )

    print("\n" + "-" * 74)
    print("3. DIAS ATÉ AVISAR A FAMÍLIA (deriva que começou e não parou)")
    print("-" * 74)
    print(
        f"  {'deriva':>8} {'avisou em 21d':>14} {'mediana amarelo':>17} "
        f"{'mediana vermelho':>18}"
    )
    for intensidade in (0.5, 0.75, 1.0):
        d = dias_ate_avisar(intensidade, max(400, args.simulacoes // 8), rng)
        am = d["mediana_dias_amarelo"]
        ve = d["mediana_dias_vermelho"]
        print(
            f"  {intensidade:>8.2f} {d['avisou_em_ate_21_dias']:>13.1%} "
            f"{(f'{am:.0f} dias' if am else '-'):>17} "
            f"{(f'{ve:.0f} dias' if ve else '-'):>18}"
        )
    print()
    print("  É esta a métrica que a família sente, e não a")
    print("  sensibilidade por conversa: a Clara fala todo dia, então")
    print("  deriva real volta amanhã. Sensibilidade de 37% por conversa")
    print("  NÃO quer dizer que 63% das derivas passam batido — quer")
    print("  dizer que levam alguns dias.")

    print()
    print("-" * 74)

    print("4. TESTE-RETESTE — ICC(1) sobre gravações reais")
    print("-" * 74)
    tr = teste_reteste()
    print(f"  pessoas reais no banco    {tr['pessoas_reais']}")
    print(f"  sessões reais             {tr['sessoes_reais']}")

    if not tr["icc"]:
        print(
            "\n  Sem dados suficientes. Precisa de pelo menos 2 pessoas reais\n"
            "  com 2 conversas cada. Grave as sessões do time e rode de novo."
        )
    else:
        print(f"\n  {'medida':<30} {'ICC(1)':>8}  interpretação")
        for chave, valor in sorted(
            tr["icc"].items(), key=lambda kv: kv[1], reverse=True
        ):
            if valor >= 0.75:
                leitura = "boa estabilidade"
            elif valor >= 0.5:
                leitura = "moderada"
            elif valor >= 0.4:
                leitura = "fraca"
            else:
                leitura = "instável — não usar"
            rotulo = MEDIDAS[chave][0]
            print(f"  {rotulo:<30} {valor:>8.3f}  {leitura}")

    print("\n" + "=" * 74)
    print("LIMITAÇÕES — dizer isto no pitch, não esconder")
    print("=" * 74)
    print(
        "  · Os itens 1 e 2 são SIMULAÇÃO. Validam a regra de decisão, não a\n"
        "    capacidade clínica de detectar doença.\n"
        "  · A simulação assume ruído normal e independente entre medidas. Na\n"
        "    vida real as medidas são correlacionadas, então o falso alarme\n"
        "    verdadeiro deve ser MAIOR que o número acima.\n"
        "  · Amostra real: time de hackathon, pessoas jovens, poucos dias.\n"
        "    Não há validação clínica, nem em idosos, nem em português.\n"
        "  · Medida depende de microfone, ambiente, resfriado, cansaço e humor.\n"
        "  · Próximo passo honesto: piloto com parceiro clínico e coorte de\n"
        "    idosos brasileiros, com desfecho acompanhado."
    )


if __name__ == "__main__":
    main()
