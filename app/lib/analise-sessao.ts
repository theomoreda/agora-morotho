/**
 * Desempenho da simulação de voz, calculado da transcrição.
 *
 * Função pura e determinística: mesma conversa, mesmo resultado. Cada critério
 * vem com justificativa e, quando houver, a fala que o sustenta. Critério sem
 * base na conversa fica `null` e não entra na nota; métrica sem base não aparece.
 */
import type {
  AnaliseSessao,
  CriterioSessao,
  Desfecho,
  MetricaSessao,
  PoliticaComercial,
  Turno,
} from '@/lib/types';

/** Fechar em até este tempo conta como fechamento rápido. */
export const TEMPO_CURTO_SEG = 5 * 60;

const RE_PERCENTUAL = /(\d{1,3}(?:[.,]\d+)?)\s*(?:%|por\s*cento)/gi;
const RE_RECUSOU =
  /(não vou (fechar|contratar|trocar|querer)|não tenho interesse|não vai dar|não quero (fechar|contratar|mais)|não (aceito|topo|fecho)|vou ficar com (o|a|meu|minha)|deixa pra lá|vou passar)/i;
const RE_ADIOU =
  /(vou pensar|preciso pensar|te retorno|depois (eu )?te (ligo|retorno|falo|chamo)|semana que vem|mais tarde|outro dia|conversar (com|internamente)|me manda (por|no|um))/i;
const RE_FECHOU =
  /(fechado|fechamos|vamos fechar|pode fechar|bora fechar|eu fecho|vou fechar|então fecho|topo|aceito|pode mandar o contrato|manda o contrato|negócio fechado|combinado|vamos nessa|pode seguir)/i;
// "Eu fecho se você me der 20%" é contraproposta, não fechamento.
const RE_CONDICIONAL = /\bse (você|vc|o senhor|a senhora|me|der|fizer|conseguir|tirar)(?![\p{L}\d])/iu;

// Percentual só é desconto quando a frase fala de desconto ou de dar/fazer condição.
const RE_CONTEXTO_DESCONTO =
  /(desconto|\boff\b|abat|reduz|redução|baix|tir(o|ar|amos)|consig|posso|faço|fazer|dou|dar|te passo|oferec|condição)/i;
// Percentuais que falam de outra coisa ("100% fibra", "multa de 30%").
const RE_PERCENTUAL_NAO_DESCONTO =
  /(fibra|cobertura|disponib|estabilidade|digital|garantid|satisfa|dos clientes|uptime|sinal|reajuste|juros|multa|imposto)/i;
const RE_NEGACAO = /(?<![\p{L}])(não|nao|nunca|impossível|jamais)(?![\p{L}])/iu;
// "Pode ser" logo depois de o cliente pedir 20% é aceitar os 20%.
const RE_ACEITE_CURTO =
  /^(tudo bem|pode ser|combinado|fechado|ok|beleza|feito|aceito|tá bom|ta bom|certo|sim)(?![\p{L}])/iu;
const RE_SEPARA_ORACAO = /[,;]\s*|\s+(?:mas|porém|só que|entretanto)\s+/i;

const RE_VALOR =
  /(inclu[ií]|benef[ií]cio|vantage|econom|resolv|velocidade|mega|giga|\bgb\b|canais|netflix|globoplay|5g|wi-?fi|suporte|integra|automat|praticidade|fatura (única|só)|uma fatura|custo-benef|garant|qualidade|estabilidade|instala)/i;
const RE_CONCORRENCIA =
  /(concorr|outra operadora|operadora atual|sua operadora|o que você (usa|paga|tem) hoje|vivo|\btim\b|claro|\boi\b|\bnet\b|\bsky\b|compar|separad|sistema atual|paga hoje)/i;
const RE_ABRE_MAO_FIDELIDADE =
  /(sem fidelidade|tir(o|ar|amos) a fidelidade|isen\w* (de |da )?(multa|fidelidade)|sem multa|fidelidade (menor|de [1-9] mes))/i;
const RE_PERGUNTA_INICIO =
  /^(qual|quais|quanto|quantos|quantas|como|o que|por que|porque|quem|quando|onde)(?![\p{L}\d])/iu;

function frases(texto: string): string[] {
  return texto
    .split(/(?<=[.!?])\s+|\n+/)
    .map((f) => f.trim())
    .filter(Boolean);
}

function oracoes(frase: string): string[] {
  return frase.split(RE_SEPARA_ORACAO).map((o) => o.trim()).filter(Boolean);
}

function percentuais(texto: string): number[] {
  const achados: number[] = [];
  for (const m of texto.matchAll(RE_PERCENTUAL)) {
    const n = Number(m[1].replace(',', '.'));
    if (Number.isFinite(n) && n > 0 && n <= 100) achados.push(n);
  }
  return achados;
}

function fraseQue(texto: string, re: RegExp): string | null {
  return frases(texto).find((f) => re.test(f)) ?? null;
}

function ehPergunta(texto: string): boolean {
  return frases(texto).some((f) => f.endsWith('?') || RE_PERGUNTA_INICIO.test(f));
}

function palavras(texto: string): number {
  return texto.split(/\s+/).filter(Boolean).length;
}

function brl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function mmss(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Lê o desfecho nas últimas falas do cliente, da mais recente para trás. */
export function detectarDesfecho(turnos: Turno[]): {
  desfecho: Desfecho;
  frase: string | null;
} {
  const doCliente = turnos.filter((t) => t.falante === 'cliente').slice(-3).reverse();
  for (const t of doCliente) {
    for (const f of frases(t.texto).reverse()) {
      if (RE_RECUSOU.test(f)) return { desfecho: 'recusou', frase: f };
      if (RE_ADIOU.test(f)) return { desfecho: 'adiou', frase: f };
      if (RE_FECHOU.test(f) && !RE_CONDICIONAL.test(f)) {
        return { desfecho: 'fechou', frase: f };
      }
    }
  }
  return { desfecho: 'sem_decisao', frase: null };
}

interface Oferta {
  pct: number;
  /** Índice do turno em `turnos`. */
  i: number;
  frase: string;
}

/** Descontos que o vendedor ofereceu, na ordem em que aparecem na conversa. */
export function extrairOfertas(turnos: Turno[]): Oferta[] {
  const ofertas: Oferta[] = [];
  turnos.forEach((t, i) => {
    if (t.falante !== 'vendedor') return;
    const anterior = turnos[i - 1];
    const pedido =
      anterior?.falante === 'cliente' && !RE_PERCENTUAL_NAO_DESCONTO.test(anterior.texto)
        ? percentuais(anterior.texto)
        : [];

    let achou = false;
    for (const frase of frases(t.texto)) {
      if (!RE_CONTEXTO_DESCONTO.test(frase) && !pedido.length) continue;
      for (const oracao of oracoes(frase)) {
        const pcts = percentuais(oracao);
        if (!pcts.length) continue;
        if (RE_PERCENTUAL_NAO_DESCONTO.test(oracao) || RE_NEGACAO.test(oracao)) continue;
        for (const pct of pcts) ofertas.push({ pct, i, frase });
        achou = true;
      }
    }

    // Aceitou o percentual que o cliente pediu sem repetir o número.
    if (!achou && pedido.length) {
      const primeira = frases(t.texto)[0] ?? '';
      if (RE_ACEITE_CURTO.test(primeira) && !RE_NEGACAO.test(primeira)) {
        ofertas.push({ pct: pedido[pedido.length - 1], i, frase: primeira });
      }
    }
  });
  return ofertas;
}

/** Primeira fala do vendedor que dispensa a fidelidade, sem negação. */
function dispensaFidelidade(turnos: Turno[]): { i: number; frase: string } | null {
  for (let i = 0; i < turnos.length; i++) {
    if (turnos[i].falante !== 'vendedor') continue;
    for (const frase of frases(turnos[i].texto)) {
      for (const oracao of oracoes(frase)) {
        if (RE_ABRE_MAO_FIDELIDADE.test(oracao) && !RE_NEGACAO.test(oracao)) {
          return { i, frase };
        }
      }
    }
  }
  return null;
}

export interface AnalisarSessaoArgs {
  turnos: Turno[];
  /** Tempo de conversa medido do primeiro turno até o encerramento. */
  duracaoSeg: number;
  politica: PoliticaComercial;
}

export function analisarSessao({
  turnos,
  duracaoSeg,
  politica,
}: AnalisarSessaoArgs): AnaliseSessao {
  const vendedor = turnos.filter((t) => t.falante === 'vendedor');
  const cliente = turnos.filter((t) => t.falante === 'cliente');
  const avaliavel = vendedor.length > 0 && cliente.length > 0;
  const { desfecho, frase: fraseDesfecho } = detectarDesfecho(turnos);
  const fechou = desfecho === 'fechou';

  const ofertas = extrairOfertas(turnos);
  const fidelidade = dispensaFidelidade(turnos);

  // Condição da venda: o que o cliente repetiu ao fechar; senão, a última oferta.
  const pctNoFechamento =
    fechou && fraseDesfecho && !RE_PERCENTUAL_NAO_DESCONTO.test(fraseDesfecho)
      ? percentuais(fraseDesfecho)
      : [];
  const descontoFechado = !fechou
    ? null
    : pctNoFechamento.length
      ? pctNoFechamento[pctNoFechamento.length - 1]
      : ofertas.length
        ? ofertas[ofertas.length - 1].pct
        : 0;
  const fechouSemFidelidade =
    fechou &&
    !!fraseDesfecho &&
    RE_ABRE_MAO_FIDELIDADE.test(fraseDesfecho) &&
    !RE_NEGACAO.test(fraseDesfecho);

  const ofertaAcimaDoTeto = ofertas.find((o) => o.pct > politica.descontoMaximoPct);
  const fechadoAcimaDoTeto =
    descontoFechado !== null && descontoFechado > politica.descontoMaximoPct;
  const maiorOferta = ofertas.reduce<Oferta | null>(
    (m, o) => (!m || o.pct > m.pct ? o : m),
    null,
  );

  const turnosValor = turnos
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.falante === 'vendedor')
    .map(({ t, i }) => ({ i, frase: fraseQue(t.texto, RE_VALOR) }))
    .filter((x): x is { i: number; frase: string } => x.frase !== null);
  const concorrencia =
    vendedor.map((t) => fraseQue(t.texto, RE_CONCORRENCIA)).find((f) => f !== null) ?? null;
  const perguntas = vendedor.filter((t) => ehPergunta(t.texto));
  const primeiraOferta = ofertas[0];
  const primeiroValor = turnosValor[0];

  const criterioPolitica = ((): CriterioSessao => {
    const base = { id: 'politica', nome: 'Ficou dentro da política comercial' };
    const max = politica.descontoMaximoPct;
    if (ofertaAcimaDoTeto) {
      return {
        ...base,
        atendido: false,
        justificativa: `Ofereceu ${ofertaAcimaDoTeto.pct}% de desconto; o máximo permitido é ${max}%.`,
        evidencia: ofertaAcimaDoTeto.frase,
      };
    }
    if (fechadoAcimaDoTeto) {
      return {
        ...base,
        atendido: false,
        justificativa: `A venda fechou com ${descontoFechado}% de desconto; o máximo permitido é ${max}%.`,
        evidencia: fraseDesfecho,
      };
    }
    if (fidelidade) {
      return {
        ...base,
        atendido: false,
        justificativa: `Abriu mão da fidelidade de ${politica.fidelidadeMeses} meses, que é obrigatória.`,
        evidencia: fidelidade.frase,
      };
    }
    if (fechouSemFidelidade) {
      return {
        ...base,
        atendido: false,
        justificativa: `A venda fechou sem a fidelidade de ${politica.fidelidadeMeses} meses, que é obrigatória.`,
        evidencia: fraseDesfecho,
      };
    }
    if (fechou) {
      return {
        ...base,
        atendido: true,
        justificativa: descontoFechado
          ? `Fechou com ${descontoFechado}% de desconto, dentro do máximo de ${max}%, sem dispensar a fidelidade.`
          : 'Fechou sem conceder desconto nem dispensar a fidelidade.',
        evidencia: pctNoFechamento.length
          ? fraseDesfecho
          : (ofertas[ofertas.length - 1]?.frase ?? fraseDesfecho),
      };
    }
    if (maiorOferta) {
      return {
        ...base,
        atendido: true,
        justificativa: `O maior desconto oferecido foi ${maiorOferta.pct}%, dentro do máximo de ${max}%.`,
        evidencia: maiorOferta.frase,
      };
    }
    return {
      ...base,
      atendido: null,
      justificativa: 'Nenhum desconto foi oferecido e a venda não fechou; não há condição comercial para conferir.',
      evidencia: null,
    };
  })();

  const criterios: CriterioSessao[] = [
    {
      id: 'fechou',
      nome: 'Fechou a venda',
      atendido: fechou,
      justificativa: fechou
        ? 'O cliente aceitou fechar.'
        : desfecho === 'adiou'
          ? 'O cliente adiou a decisão; a venda não saiu nesta ligação.'
          : desfecho === 'recusou'
            ? 'O cliente recusou a proposta.'
            : 'Nas últimas falas do cliente não há aceite, recusa nem adiamento.',
      evidencia: fraseDesfecho,
    },
    criterioPolitica,
    {
      id: 'valor',
      nome: 'Mostrou o valor do produto',
      atendido: turnosValor.length >= 2,
      justificativa:
        turnosValor.length >= 2
          ? `Falou de benefícios concretos em ${turnosValor.length} falas (mínimo: 2).`
          : turnosValor.length === 1
            ? 'Citou benefício em uma fala só (mínimo: 2).'
            : 'Nenhuma fala sua cita benefício concreto do produto.',
      evidencia: primeiroValor?.frase ?? null,
    },
    {
      id: 'concorrencia',
      nome: 'Comparou com a concorrência ou a solução atual',
      atendido: concorrencia !== null,
      justificativa: concorrencia
        ? 'Comparou o produto com a alternativa do cliente.'
        : 'Nenhuma fala sua compara o produto com o que o cliente usa hoje ou com concorrentes.',
      evidencia: concorrencia,
    },
    {
      id: 'descoberta',
      nome: 'Fez perguntas para entender o cliente',
      atendido: perguntas.length >= 2,
      justificativa: `Fez ${perguntas.length} pergunta${perguntas.length === 1 ? '' : 's'} ao cliente (mínimo: 2).`,
      evidencia: perguntas[0]
        ? (frases(perguntas[0].texto).find((f) => f.endsWith('?') || RE_PERGUNTA_INICIO.test(f)) ??
          perguntas[0].texto)
        : null,
    },
    {
      id: 'sustentou',
      nome: 'Defendeu o valor antes de dar desconto',
      atendido: !primeiraOferta ? null : !!primeiroValor && primeiroValor.i < primeiraOferta.i,
      justificativa: !primeiraOferta
        ? 'Não houve oferta de desconto na conversa.'
        : primeiroValor && primeiroValor.i < primeiraOferta.i
          ? `Mostrou valor antes de oferecer ${primeiraOferta.pct}%.`
          : `Ofereceu ${primeiraOferta.pct}% antes de mostrar o valor do produto.`,
      evidencia: primeiraOferta?.frase ?? null,
    },
    {
      id: 'tempo',
      nome: `Fechou em tempo curto (até ${TEMPO_CURTO_SEG / 60} min)`,
      atendido: fechou ? duracaoSeg <= TEMPO_CURTO_SEG : null,
      justificativa: fechou
        ? `Fechou em ${mmss(duracaoSeg)} de conversa.`
        : 'Sem venda fechada, não há tempo de fechamento.',
      evidencia: null,
    },
  ];

  const criteriosFinais = avaliavel
    ? criterios
    : criterios.map((c) => ({
        ...c,
        atendido: null,
        justificativa: 'A transcrição não tem falas suas e do cliente para avaliar.',
        evidencia: null,
      }));

  const palavrasVendedor = vendedor.reduce((s, t) => s + palavras(t.texto), 0);
  const palavrasTotal = turnos.reduce((s, t) => s + palavras(t.texto), 0);

  const metricas: MetricaSessao[] = [
    {
      nome: 'Duração da conversa',
      valor: mmss(duracaoSeg),
      detalhe: `Do primeiro turno ao encerramento. ${vendedor.length} falas suas, ${cliente.length} do cliente.`,
    },
  ];

  if (descontoFechado !== null) {
    const precoFinal = politica.precoMensal * (1 - descontoFechado / 100);
    metricas.push(
      {
        nome: 'Desconto na venda',
        valor: `${descontoFechado}%`,
        detalhe: pctNoFechamento.length
          ? 'Percentual repetido pelo cliente ao fechar.'
          : ofertas.length
            ? 'Última oferta sua antes do fechamento.'
            : 'Nenhum desconto foi dito na conversa.',
      },
      {
        nome: 'Mensalidade fechada',
        valor: brl(precoFinal),
        detalhe: `Tabela de ${brl(politica.precoMensal)} menos o desconto da venda.`,
      },
      {
        nome: `Receita cedida em ${politica.fidelidadeMeses} meses`,
        valor: brl((politica.precoMensal - precoFinal) * politica.fidelidadeMeses),
        detalhe: 'Diferença entre a tabela e a mensalidade fechada, no período de fidelidade.',
      },
    );
  } else if (maiorOferta) {
    metricas.push({
      nome: 'Maior desconto oferecido',
      valor: `${maiorOferta.pct}%`,
      detalhe: `Sem venda fechada. Máximo permitido ${politica.descontoMaximoPct}%.`,
    });
  }

  if (palavrasTotal > 0) {
    metricas.push(
      {
        nome: 'Perguntas ao cliente',
        valor: String(perguntas.length),
        detalhe: 'Falas suas com pergunta.',
      },
      {
        nome: 'Sua parte da conversa',
        valor: `${Math.round((palavrasVendedor / palavrasTotal) * 100)}%`,
        detalhe: `${palavrasVendedor} de ${palavrasTotal} palavras transcritas foram ditas por você.`,
      },
    );
  }

  const avaliados = criteriosFinais.filter((c) => c.atendido !== null);
  const nota = avaliados.length
    ? Math.round((avaliados.filter((c) => c.atendido).length / avaliados.length) * 100)
    : 0;

  return {
    desfecho,
    fraseDesfecho,
    nota,
    avaliavel,
    criterios: criteriosFinais,
    metricas,
    duracaoSeg,
    transcricao: turnos,
  };
}
