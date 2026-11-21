"""
Medidas de texto e das brincadeiras, a partir da transcrição.

FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).

Entra: o que a pessoa falou (transcrito pelo ASR da Agora, Deepgram pt-BR).
Sai: números descritivos. Nenhuma classificação de doença.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import asdict, dataclass
from datetime import date
from typing import Iterable, Optional

# Janela do MATTR. 50 palavras é o valor usual na literatura de análise de fala;
# abaixo disso a medida fica instável.
JANELA_MATTR = 50

DIAS_SEMANA = {
    0: {"segunda", "segunda-feira", "segundafeira"},
    1: {"terca", "terca-feira", "tercafeira"},
    2: {"quarta", "quarta-feira", "quartafeira"},
    3: {"quinta", "quinta-feira", "quintafeira"},
    4: {"sexta", "sexta-feira", "sextafeira"},
    5: {"sabado"},
    6: {"domingo"},
}

MESES = {
    1: "janeiro", 2: "fevereiro", 3: "marco", 4: "abril",
    5: "maio", 6: "junho", 7: "julho", 8: "agosto",
    9: "setembro", 10: "outubro", 11: "novembro", 12: "dezembro",
}

# Léxico de bichos para a fluência verbal semântica.
# Limitação declarada: bicho fora desta lista não é contado. Preferimos
# subcontar a inflar o número com palavra que não é animal.
BICHOS = {
    "cachorro", "cao", "cadela", "gato", "gata", "passaro", "passarinho",
    "galinha", "galo", "pinto", "pato", "marreco", "ganso", "peru",
    "vaca", "boi", "bezerro", "touro", "cavalo", "egua", "potro", "burro",
    "jumento", "mula", "porco", "porca", "leitao", "ovelha", "carneiro",
    "cabra", "cabrito", "bode", "coelho", "rato", "ratazana", "camundongo",
    "peixe", "sardinha", "bagre", "tilapia", "dourado", "pintado", "lambari",
    "tubarao", "baleia", "golfinho", "boto", "foca", "leao marinho",
    "cobra", "jararaca", "cascavel", "sucuri", "jiboia", "lagarto", "lagartixa",
    "camaleao", "jacare", "crocodilo", "tartaruga", "jabuti", "cagado",
    "sapo", "ra", "perereca", "aranha", "escorpiao", "formiga", "cupim",
    "abelha", "vespa", "marimbondo", "mosca", "mosquito", "pernilongo",
    "barata", "grilo", "gafanhoto", "borboleta", "mariposa", "besouro",
    "joaninha", "minhoca", "lesma", "caracol", "caranguejo", "camarao",
    "lagosta", "siri", "polvo", "lula", "agua viva", "estrela do mar",
    "leao", "leoa", "tigre", "onca", "jaguatirica", "puma", "pantera",
    "lobo", "raposa", "urso", "panda", "elefante", "girafa", "zebra",
    "rinoceronte", "hipopotamo", "camelo", "dromedario", "lhama", "alpaca",
    "macaco", "mico", "sagui", "bugio", "gorila", "chimpanze", "orangotango",
    "preguica", "tamandua", "tatu", "capivara", "paca", "cutia", "gamba",
    "quati", "furao", "lontra", "veado", "cervo", "alce", "antilope",
    "bufalo", "bisao", "canguru", "coala", "morcego", "ourico", "esquilo",
    "castor", "hamster", "porquinho da india", "chinchila",
    "aguia", "gaviao", "falcao", "coruja", "urubu", "condor",
    "papagaio", "arara", "periquito", "calopsita", "canario", "bem te vi",
    "sabia", "joao de barro", "beija flor", "colibri", "tucano", "pica pau",
    "pomba", "pombo", "rolinha", "andorinha", "pardal", "curio", "sanhaco",
    "gralha", "corvo", "cegonha", "garca", "flamingo", "pelicano", "gaivota",
    "pinguim", "avestruz", "ema", "seriema", "galinha d angola", "codorna",
    "faisao", "pavao", "cisne", "mergulhao", "quero quero",
    "dinossauro", "unicornio", "dragao",
}

# Palavras que não contam como palavra de conteúdo ao medir variedade de
# vocabulário. Lista curta de propósito: só o que é muito frequente em fala.
_STOPWORDS_LEVES = {
    "a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "do", "da",
    "dos", "das", "em", "no", "na", "nos", "nas", "e", "ou", "que", "se",
    "ao", "aos", "pra", "para", "por", "com", "sem", "ne", "ai", "ah", "eh",
}

# Marcadores de hesitação em fala espontânea do português brasileiro.
# Aumento da taxa de hesitação é um dos achados mais consistentes em
# comprometimento cognitivo leve (ver o estudo de Miami citado no README:
# a pessoa demora mais para retomar a fala depois de pausas).
_HESITACOES = {
    "eh", "ehh", "e", "ah", "ahh", "ahn", "ahm", "hum", "hmm", "uhm", "um",
    "ne", "tipo", "assim", "sabe", "entao", "quer", "dizer", "como",
}

# Só as inequívocas. "e", "um", "como" e "quer" também são palavras normais,
# então ficam fora da contagem para não inflar o número.
_HESITACOES_SEGURAS = {
    "eh", "ehh", "ah", "ahh", "ahn", "ahm", "hum", "hmm", "uhm",
}


@dataclass
class MedidasTexto:
    n_turnos: int
    n_palavras: int
    palavras_por_turno: Optional[float]
    mattr: Optional[float]
    # Hesitações a cada 100 palavras ("eh", "ahn", "hum").
    hesitacoes_por_100: Optional[float]
    # Repetição imediata da mesma palavra ("o o carro", "eu eu fui").
    repeticao_imediata_por_100: Optional[float]
    # Proporção de palavras de conteúdo — proxy grosseira de densidade de ideia.
    proporcao_conteudo: Optional[float]
    bichos_diferentes: Optional[int]
    memoria_acertos: Optional[int]
    memoria_total: Optional[int]
    orientacao_acertou: Optional[bool]

    def to_dict(self) -> dict:
        return asdict(self)


def normalizar(texto: str) -> str:
    """Minúsculas, sem acento, sem pontuação. 'Coração!' -> 'coracao'."""
    t = unicodedata.normalize("NFKD", texto.lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r"[^a-z0-9\s-]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def palavras(texto: str) -> list[str]:
    return [p for p in normalizar(texto).split() if p]


def mattr(tokens: list[str], janela: int = JANELA_MATTR) -> Optional[float]:
    """
    Moving-Average Type-Token Ratio: variedade de vocabulário.

    Por que MATTR e não TTR simples: o TTR cai conforme o texto cresce, então
    comparar conversas de tamanhos diferentes com TTR mede o tamanho, não o
    vocabulário. O MATTR usa janela fixa e não tem esse viés.
    """
    conteudo = [t for t in tokens if t not in _STOPWORDS_LEVES]
    if len(conteudo) < 10:
        return None
    if len(conteudo) <= janela:
        return len(set(conteudo)) / len(conteudo)

    razoes = [
        len(set(conteudo[i : i + janela])) / janela
        for i in range(len(conteudo) - janela + 1)
    ]
    return sum(razoes) / len(razoes)


def contar_hesitacoes(tokens: list[str]) -> int:
    """Conta marcadores de hesitação inequívocos."""
    return sum(1 for t in tokens if t in _HESITACOES_SEGURAS)


def contar_repeticao_imediata(tokens: list[str]) -> int:
    """
    Conta repetição imediata da mesma palavra.

    Em fala espontânea, "o o carro" é disfluência. Ignoramos palavras de uma
    letra e stopwords muito curtas para não contar gaguejo de transcrição.
    """
    return sum(
        1
        for anterior, atual in zip(tokens, tokens[1:])
        if anterior == atual and len(atual) > 2
    )


def proporcao_conteudo(tokens: list[str]) -> Optional[float]:
    """
    Fração de palavras que não são stopword.

    Proxy grosseira de densidade de ideia: fala que vira muito conectivo e
    pouca palavra de conteúdo tende a carregar menos informação por frase.
    Grosseira mesmo — não substitui análise de densidade proposicional.
    """
    if len(tokens) < 10:
        return None
    conteudo = sum(1 for t in tokens if t not in _STOPWORDS_LEVES)
    return conteudo / len(tokens)


def contar_bichos(texto: str) -> int:
    """
    Conta bichos diferentes citados. Casa nomes de duas palavras
    ("beija flor") antes dos de uma, para não contar duas vezes.
    """
    t = normalizar(texto)
    achados: set[str] = set()

    compostos = sorted((b for b in BICHOS if " " in b), key=len, reverse=True)
    for bicho in compostos:
        if bicho in t:
            achados.add(bicho)
            t = t.replace(bicho, " ")

    for palavra in t.split():
        singular = _tentar_singular(palavra)
        if palavra in BICHOS:
            achados.add(palavra)
        elif singular in BICHOS:
            achados.add(singular)

    return len(achados)


def _tentar_singular(p: str) -> str:
    """Plural simples do português. 'cachorros' -> 'cachorro', 'aves' -> 'ave'."""
    if p.endswith("oes"):
        return p[:-3] + "ao"
    if p.endswith("aes"):
        return p[:-3] + "ao"
    if p.endswith("ns"):
        return p[:-2] + "m"
    if p.endswith("is"):
        return p[:-2] + "l"
    if p.endswith("res") or p.endswith("ses") or p.endswith("zes"):
        return p[:-2]
    if p.endswith("s") and len(p) > 3:
        return p[:-1]
    return p


def checar_memoria(texto: str, palavras_alvo: Iterable[str]) -> tuple[int, int]:
    """Quantas das palavras guardadas no começo a pessoa lembrou no fim."""
    t = normalizar(texto)
    alvos = [normalizar(p) for p in palavras_alvo]
    acertos = sum(1 for a in alvos if a and re.search(rf"\b{re.escape(a)}\w*", t))
    return acertos, len(alvos)


def checar_orientacao(texto: str, hoje: Optional[date] = None) -> Optional[bool]:
    """
    A pessoa disse corretamente o dia da semana (ou o mês) de hoje?

    Devolve None quando ela não falou nem dia nem mês — não dá para dizer que
    errou algo que não foi perguntado ou não foi respondido.
    """
    hoje = hoje or date.today()
    t = normalizar(texto)

    disse_algum_dia = False
    for dia, nomes in DIAS_SEMANA.items():
        for nome in nomes:
            if re.search(rf"\b{re.escape(nome)}\b", t):
                disse_algum_dia = True
                if dia == hoje.weekday():
                    return True

    disse_algum_mes = False
    for mes, nome in MESES.items():
        if re.search(rf"\b{re.escape(nome)}\b", t):
            disse_algum_mes = True
            if mes == hoje.month:
                return True

    if disse_algum_dia or disse_algum_mes:
        return False
    return None


def medir(
    falas_usuario: list[str],
    *,
    texto_fluencia: Optional[str] = None,
    texto_memoria: Optional[str] = None,
    palavras_memoria: Optional[Iterable[str]] = None,
    texto_orientacao: Optional[str] = None,
    hoje: Optional[date] = None,
) -> MedidasTexto:
    """
    Agrega as medidas de texto de uma conversa.

    falas_usuario: uma string por turno de fala da pessoa (não do Gabriel).
    Os campos texto_* são os trechos das brincadeiras, quando houve.
    """
    turnos = [f for f in falas_usuario if f and f.strip()]
    tokens: list[str] = []
    for f in turnos:
        tokens.extend(palavras(f))

    ppt = (len(tokens) / len(turnos)) if turnos else None

    por_100 = (100.0 / len(tokens)) if tokens else None
    hesitacoes = (
        contar_hesitacoes(tokens) * por_100 if por_100 and len(tokens) >= 20 else None
    )
    repeticoes = (
        contar_repeticao_imediata(tokens) * por_100
        if por_100 and len(tokens) >= 20
        else None
    )

    bichos = contar_bichos(texto_fluencia) if texto_fluencia else None

    acertos = total = None
    if texto_memoria and palavras_memoria:
        acertos, total = checar_memoria(texto_memoria, palavras_memoria)

    orientacao = (
        checar_orientacao(texto_orientacao, hoje) if texto_orientacao else None
    )

    return MedidasTexto(
        n_turnos=len(turnos),
        n_palavras=len(tokens),
        palavras_por_turno=ppt,
        mattr=mattr(tokens),
        hesitacoes_por_100=hesitacoes,
        repeticao_imediata_por_100=repeticoes,
        proporcao_conteudo=proporcao_conteudo(tokens),
        bichos_diferentes=bichos,
        memoria_acertos=acertos,
        memoria_total=total,
        orientacao_acertou=orientacao,
    )
