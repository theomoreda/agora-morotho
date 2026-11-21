"""
Calibração dos limiares do semáforo.

FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).

Este script existe para que os limiares do Prosa sejam uma ESCOLHA MEDIDA, e
não um chute. Ele varre combinações de (limiar em desvios, nº de medidas,
nº de domínios) e mostra, para cada uma, o par que importa:

  · falso alarme  — com que frequência o semáforo acende sem deriva nenhuma
  · sensibilidade — com que frequência ele acende quando há deriva real

Por que isso foi necessário: ao passar de 10 para 19 medidas, o falso alarme
saltou de 0,30% para 1,37% por conversa — problema clássico de comparações
múltiplas. Mais medida dá mais sensibilidade e mais alarme falso junto. O
script escolhe o ponto de operação.

Critério de escolha adotado:
  falso alarme <= 0,30% por conversa (cerca de 1 por ano, no uso diário),
  e, entre as que passam, a de maior sensibilidade.

Por que 0,30%: o alerta vai para a FAMÍLIA de uma pessoa idosa. Alarme falso
frequente gera ansiedade e, pior, faz a família parar de acreditar no alerta
verdadeiro quando ele vier.

Uso:
    python -m scripts.calibrar
    python -m scripts.calibrar --simulacoes 6000
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from prosa_analise import linha_base  # noqa: E402
from prosa_analise.linha_base import (  # noqa: E402
    SESSOES_LINHA_BASE,
    avaliar,
    calcular_linha_base,
)
from scripts.seed_simulado import DERIVA, PERFIL  # noqa: E402

# Teto de falso alarme aceitável, por conversa.
TETO_FALSO_ALARME = 0.003

# Intensidade de deriva usada como referência de sensibilidade. 0.5 é metade
# do cenário de demonstração — ou seja, uma mudança sutil, que é justamente
# o caso difícil e o que interessa detectar cedo.
DERIVA_DE_REFERENCIA = 0.5


def _sessao(rng: np.random.Generator, intensidade: float = 0.0) -> dict:
    medidas: dict[str, float] = {}
    for chave, (media, desvio) in PERFIL.items():
        valor = float(rng.normal(media, desvio))
        if intensidade and chave in DERIVA:
            valor += media * DERIVA[chave] * intensidade
        medidas[chave] = max(valor, 1e-6)
    return medidas


def _taxa_de_acendimento(
    n: int,
    intensidade: float,
    rng: np.random.Generator,
) -> float:
    acendeu = 0
    for _ in range(n):
        historico = [_sessao(rng) for _ in range(SESSOES_LINHA_BASE)]
        atual = _sessao(rng, intensidade)
        resultado = avaliar(
            atual,
            calcular_linha_base(historico),
            sessao_anterior_alterada=False,
            n_sessoes_base=SESSOES_LINHA_BASE,
        )
        if resultado.status in ("amarelo", "vermelho"):
            acendeu += 1
    return acendeu / n


def main() -> None:
    parser = argparse.ArgumentParser(description="Calibração do semáforo")
    parser.add_argument("--simulacoes", type=int, default=4000)
    parser.add_argument("--semente", type=int, default=7)
    args = parser.parse_args()

    # Guarda os valores atuais para restaurar no fim: este script NÃO deve
    # deixar o módulo alterado para quem importar depois.
    original = (
        linha_base.LIMIAR_Z,
        linha_base.MEDIDAS_PARA_AMARELO,
        linha_base.DOMINIOS_PARA_AMARELO,
    )

    print("=" * 78)
    print("CALIBRAÇÃO DO SEMÁFORO")
    print("=" * 78)
    print(
        f"\n{len(linha_base.MEDIDAS)} medidas · "
        f"{len({d for _, _, d in linha_base.MEDIDAS.values()})} domínios · "
        f"{args.simulacoes} simulações por combinação"
    )
    print(
        f"Teto de falso alarme: {TETO_FALSO_ALARME:.2%} por conversa · "
        f"sensibilidade medida com deriva {DERIVA_DE_REFERENCIA}"
    )

    print(
        f"\n{'z':>5} {'med':>4} {'dom':>4} "
        f"{'falso alarme':>14} {'1 a cada':>10} {'sensib.':>9}  "
    )
    print("-" * 78)

    resultados = []

    for z in (2.5, 3.0, 3.5):
        for n_medidas in (3, 4, 5):
            for n_dominios in (2, 3):
                if n_dominios > n_medidas:
                    continue

                linha_base.LIMIAR_Z = z
                linha_base.MEDIDAS_PARA_AMARELO = n_medidas
                linha_base.DOMINIOS_PARA_AMARELO = n_dominios

                rng = np.random.default_rng(args.semente)
                fa = _taxa_de_acendimento(args.simulacoes, 0.0, rng)

                rng = np.random.default_rng(args.semente + 1)
                sens = _taxa_de_acendimento(
                    args.simulacoes // 2, DERIVA_DE_REFERENCIA, rng
                )

                passa = fa <= TETO_FALSO_ALARME
                resultados.append((z, n_medidas, n_dominios, fa, sens, passa))

                cada = f"{1 / fa:.0f}" if fa > 0 else "—"
                marca = "✓" if passa else " "
                print(
                    f"{z:>5.1f} {n_medidas:>4} {n_dominios:>4} "
                    f"{fa:>13.2%} {cada:>10} {sens:>8.1%}  {marca}"
                )

    linha_base.LIMIAR_Z, linha_base.MEDIDAS_PARA_AMARELO, linha_base.DOMINIOS_PARA_AMARELO = original

    print("-" * 78)

    aprovadas = [r for r in resultados if r[5]]
    if not aprovadas:
        print(
            "\nNenhuma combinação ficou dentro do teto de falso alarme.\n"
            "Aperte mais os limiares ou reduza o número de medidas."
        )
        return

    # Entre as que respeitam o teto, a mais sensível.
    melhor = max(aprovadas, key=lambda r: r[4])
    z, n_medidas, n_dominios, fa, sens, _ = melhor

    print("\nESCOLHA RECOMENDADA")
    print(
        f"  LIMIAR_Z = {z}\n"
        f"  MEDIDAS_PARA_AMARELO = {n_medidas}\n"
        f"  DOMINIOS_PARA_AMARELO = {n_dominios}\n"
        f"\n  falso alarme  {fa:.2%} por conversa "
        f"(1 a cada {1 / fa:.0f} conversas)\n"
        f"  sensibilidade {sens:.1%} com deriva {DERIVA_DE_REFERENCIA}"
    )

    print(
        "\nRESSALVA QUE NÃO PODE SAIR DO PITCH:\n"
        "  A simulação assume ruído normal e INDEPENDENTE entre as medidas.\n"
        "  Na vida real elas são correlacionadas (as três de pausa andam\n"
        "  juntas), então o falso alarme verdadeiro é MAIOR que o medido aqui.\n"
        "  A regra de domínios existe justamente para mitigar isso, mas não\n"
        "  elimina. O número honesto só sai de dados reais, com mais pessoas."
    )


if __name__ == "__main__":
    main()
