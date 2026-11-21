"""
Linha de base individual e semáforo.

FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).

Esta é a decisão central do Prosa: cada pessoa é comparada **com ela mesma**,
nunca com uma população.

Por quê:
  1. Não existe modelo de voz validado para idosos brasileiros. Modelo treinado
     em inglês generaliza mal para outra língua (ver fontes no README).
  2. O que a família precisa saber não é "em que percentil ela está", é
     "mudou alguma coisa?".
  3. É a lógica do HearO (Cordio), o produto de voz com validação clínica mais
     madura: um modelo de voz específico para cada paciente.

Nada aqui produz diagnóstico. O resultado é um semáforo de "mudou / não mudou"
e um texto que descreve a mudança em linguagem comum, sem nome de doença.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass, field
from typing import Literal, Optional

# Sessões usadas para formar a linha de base da pessoa.
SESSOES_LINHA_BASE = 5

# Abaixo disso não há linha de base: o status é "calibrando".
# Usamos a janela inteira (5) e não 3: o desvio-padrão estimado com 3 pontos é
# ruidoso e enviesado para baixo, o que fazia o semáforo acender sozinho.
# Medido no nosso próprio seed — ver seção de validação no README.
MINIMO_PARA_AVALIAR = 5

# Quantos desvios-padrão contam como piora relevante numa medida.
# Escolhido por varredura empírica — ver scripts/calibrar.py.
LIMIAR_Z = 2.5

# Guarda contra falso alarme: além dos 2 desvios, a mudança tem que ser de pelo
# menos 10% em valor relativo. Sem isso, uma pessoa muito constante (desvio
# quase zero na linha de base) dispararia alerta com variação irrelevante.
LIMIAR_RELATIVO = 0.10

# Quantas medidas precisam piorar junto para acender o amarelo.
#
# 4, e isto NÃO foi chutado. Ao passar de 10 para 19 medidas, o falso alarme
# saltou de 0,30% para 1,37% por conversa (comparações múltiplas). A varredura
# em scripts/calibrar.py testou 18 combinações e esta foi a mais sensível
# entre as que mantêm o falso alarme <= 0,30%:
#
#   z=2.5 · 3 medidas · 2 domínios -> falso alarme 1,20%  sensibilidade 60,9%
#   z=2.5 · 4 medidas · 2 domínios -> falso alarme 0,17%  sensibilidade 37,4%  <-- escolhida
#   z=3.0 · 3 medidas · 2 domínios -> falso alarme 0,20%  sensibilidade 31,7%
#
# Trocar sensibilidade por especificidade é a decisão certa AQUI porque a
# conversa é diária: deriva real reaparece amanhã e depois de amanhã, e o
# vermelho já exige persistência. Alarme falso, não — ele só queima a
# confiança da família, que é o que faz o produto funcionar.
MEDIDAS_PARA_AMARELO = 4

# ...e precisam vir de pelo menos 2 DOMÍNIOS diferentes.
#
# Esta regra resolve o problema que a contagem simples de medidas tem: as
# medidas não são independentes entre si. "tempo em pausas", "duração das
# pausas" e "pausas longas" medem quase a mesma coisa e andam juntas — então
# três delas piorando é UM sinal, não três. Exigindo domínios distintos, o
# alerta só acende quando a mudança aparece em aspectos diferentes da fala.
DOMINIOS_PARA_AMARELO = 2

Status = Literal["calibrando", "verde", "amarelo", "vermelho"]

# Domínios. Medidas do mesmo domínio são correlacionadas entre si, então
# contam como um único sinal para a regra de domínios.
DOMINIO_RITMO = "ritmo"
DOMINIO_TOM = "tom"
DOMINIO_INTENSIDADE = "intensidade"
DOMINIO_VOZ = "qualidade vocal"
DOMINIO_TEXTO = "texto"
DOMINIO_TAREFA = "brincadeira"

# Para cada medida: (rótulo em português, direção que significa piora, domínio).
# direcao = -1 -> cair é piora;  +1 -> subir é piora.
MEDIDAS: dict[str, tuple[str, int, str]] = {
    # ── ritmo ──
    "taxa_articulacao_sil_s": ("velocidade da fala", -1, DOMINIO_RITMO),
    "taxa_fala_sil_s": ("ritmo geral da conversa", -1, DOMINIO_RITMO),
    "razao_fala_articulacao": ("fluidez (fala vs. pausa)", -1, DOMINIO_RITMO),
    "proporcao_pausas": ("tempo em pausas", +1, DOMINIO_RITMO),
    "duracao_media_pausa_s": ("duração das pausas", +1, DOMINIO_RITMO),
    "pausas_longas_por_min": ("pausas longas por minuto", +1, DOMINIO_RITMO),
    # ── tom ──
    "variacao_tom_st": ("variação do tom de voz", -1, DOMINIO_TOM),
    "amplitude_tom_st": ("alcance do tom de voz", -1, DOMINIO_TOM),
    # ── intensidade ──
    "variacao_intensidade_db": ("variação do volume", -1, DOMINIO_INTENSIDADE),
    # ── qualidade vocal ──
    "jitter_local": ("irregularidade da voz", +1, DOMINIO_VOZ),
    "shimmer_local": ("irregularidade do volume", +1, DOMINIO_VOZ),
    "hnr_db": ("clareza da voz", -1, DOMINIO_VOZ),
    "fracao_vozeada": ("firmeza da voz", -1, DOMINIO_VOZ),
    # ── texto ──
    "palavras_por_turno": ("tamanho das respostas", -1, DOMINIO_TEXTO),
    "mattr": ("variedade de palavras", -1, DOMINIO_TEXTO),
    "hesitacoes_por_100": ("hesitações na fala", +1, DOMINIO_TEXTO),
    "repeticao_imediata_por_100": ("repetição de palavras", +1, DOMINIO_TEXTO),
    "proporcao_conteudo": ("densidade do que é dito", -1, DOMINIO_TEXTO),
    # ── brincadeiras ──
    "bichos_diferentes": ("bichos lembrados no minuto", -1, DOMINIO_TAREFA),
}


@dataclass
class MudancaMedida:
    """Uma medida que piorou em relação à linha de base da pessoa."""

    chave: str
    rotulo: str
    dominio: str
    valor_atual: float
    media_base: float
    z: float
    variacao_relativa: float  # +0.36 = subiu 36% em relação à base

    def descrever(self) -> str:
        sinal = "+" if self.variacao_relativa >= 0 else "−"
        pct = abs(self.variacao_relativa) * 100
        return f"{self.rotulo} {sinal}{pct:.0f}%"


@dataclass
class Avaliacao:
    status: Status
    n_sessoes_base: int
    mudancas: list[MudancaMedida] = field(default_factory=list)
    mensagem: str = ""

    @property
    def cor(self) -> str:
        return {
            "calibrando": "⚪",
            "verde": "🟢",
            "amarelo": "🟡",
            "vermelho": "🔴",
        }[self.status]


def calcular_linha_base(
    historico: list[dict],
    *,
    n_sessoes: int = SESSOES_LINHA_BASE,
) -> dict[str, tuple[float, float]]:
    """
    Monta a linha de base a partir das primeiras conversas da pessoa.

    historico: lista de dicts de medidas, da mais antiga para a mais recente.
    Devolve {medida: (média, desvio_padrao)} só para as medidas com dados
    suficientes.
    """
    base = historico[:n_sessoes]
    resultado: dict[str, tuple[float, float]] = {}

    for chave in MEDIDAS:
        valores = [
            float(s[chave])
            for s in base
            if s.get(chave) is not None
        ]
        if len(valores) < MINIMO_PARA_AVALIAR:
            continue
        media = statistics.fmean(valores)
        desvio = statistics.stdev(valores) if len(valores) > 1 else 0.0
        resultado[chave] = (media, desvio)

    return resultado


def _z_de_piora(valor: float, media: float, desvio: float, direcao: int) -> float:
    """
    Z-score orientado: positivo = piorou, negativo = melhorou.

    Quando o desvio da linha de base é muito pequeno, usamos um piso de 5% da
    média para não explodir o z. Pessoa constante não deve virar alarme fácil.
    """
    piso = abs(media) * 0.05
    d = max(desvio, piso) if piso > 0 else desvio
    if d == 0:
        return 0.0
    return ((valor - media) / d) * direcao


def avaliar(
    medidas_atuais: dict,
    linha_base: dict[str, tuple[float, float]],
    *,
    sessao_anterior_alterada: bool = False,
    n_sessoes_base: int = 0,
) -> Avaliacao:
    """
    Compara a conversa de hoje com a linha de base da própria pessoa.

    sessao_anterior_alterada: a conversa anterior já tinha acendido amarelo.
    É o que transforma amarelo em vermelho — exigimos **persistência**, para
    que um dia de resfriado ou de cansaço não vire alerta para a família.
    """
    if n_sessoes_base < MINIMO_PARA_AVALIAR or not linha_base:
        return Avaliacao(
            status="calibrando",
            n_sessoes_base=n_sessoes_base,
            mensagem=(
                f"Ainda conhecendo o jeito de falar dela. "
                f"Faltam {max(0, MINIMO_PARA_AVALIAR - n_sessoes_base)} "
                f"conversa(s) para começar o acompanhamento."
            ),
        )

    mudancas: list[MudancaMedida] = []

    for chave, (rotulo, direcao, dominio) in MEDIDAS.items():
        if chave not in linha_base:
            continue
        atual = medidas_atuais.get(chave)
        if atual is None:
            continue

        atual = float(atual)
        media, desvio = linha_base[chave]
        z = _z_de_piora(atual, media, desvio, direcao)

        if media == 0:
            continue
        variacao = (atual - media) / abs(media)

        # Precisa dos dois: 2 desvios E 10% de mudança relativa.
        #
        # `variacao * direcao` converte a variação crua em "quanto piorou":
        # com direcao = -1 (cair é piora), uma queda de 16% vira +0.16.
        piora_relativa = variacao * direcao
        piorou_em_desvios = z >= LIMIAR_Z
        piorou_em_percentual = piora_relativa >= LIMIAR_RELATIVO

        if piorou_em_desvios and piorou_em_percentual:
            mudancas.append(
                MudancaMedida(
                    chave=chave,
                    rotulo=rotulo,
                    dominio=dominio,
                    valor_atual=atual,
                    media_base=media,
                    z=z,
                    variacao_relativa=variacao,
                )
            )

    mudancas.sort(key=lambda m: m.z, reverse=True)

    dominios_afetados = {m.dominio for m in mudancas}

    if (
        len(mudancas) < MEDIDAS_PARA_AMARELO
        or len(dominios_afetados) < DOMINIOS_PARA_AMARELO
    ):
        return Avaliacao(
            status="verde",
            n_sessoes_base=n_sessoes_base,
            mudancas=mudancas,
            mensagem="A conversa de hoje está dentro do normal dela.",
        )

    descricao = ", ".join(m.descrever() for m in mudancas[:4])

    if sessao_anterior_alterada:
        return Avaliacao(
            status="vermelho",
            n_sessoes_base=n_sessoes_base,
            mudancas=mudancas,
            mensagem=(
                f"Mudança que se manteve por mais de uma conversa: {descricao}. "
                "Vale procurar um profissional de saúde para avaliar. "
                "O Prosa não faz diagnóstico — só percebeu que algo mudou."
            ),
        )

    return Avaliacao(
        status="amarelo",
        n_sessoes_base=n_sessoes_base,
        mudancas=mudancas,
        mensagem=(
            f"Hoje a conversa saiu do padrão dela: {descricao}. "
            "Pode ser só um dia ruim, cansaço ou um resfriado. "
            "Vamos acompanhar a próxima conversa."
        ),
    )
