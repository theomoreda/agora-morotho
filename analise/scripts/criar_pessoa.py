"""
Cria uma pessoa real no serviço de análise do Prosa.

FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).

O id devolvido vai em NEXT_PUBLIC_PROSA_PESSOA_ID, no app/.env.local. É ele
que amarra as conversas à MESMA pessoa — e sem isso não existe linha de base.

Uso:
    python -m scripts.criar_pessoa "Dona Maria" 78
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from prosa_analise import db  # noqa: E402


def main() -> None:
    if len(sys.argv) < 2:
        print('uso: python -m scripts.criar_pessoa "Nome" [idade]')
        raise SystemExit(2)

    nome = sys.argv[1]
    idade = int(sys.argv[2]) if len(sys.argv) > 2 else None

    db.criar_esquema()

    # consentimento=True registra a data. A coleta de verdade acontece na tela
    # antes da conversa (components/TelaUmBotao.tsx); aqui só gravamos que ela
    # ocorreu, como exige a LGPD (art. 11) para dado de saúde e biométrico.
    pessoa_id = db.criar_pessoa(nome, idade, simulado=False, consentimento=True)

    print(f"pessoa criada: id = {pessoa_id}  ({nome})")
    print("\nColoque no app/.env.local:")
    print(f"  NEXT_PUBLIC_PROSA_PESSOA_ID={pessoa_id}")


if __name__ == "__main__":
    main()
