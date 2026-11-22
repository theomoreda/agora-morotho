/**
 * Plano comercial que o vendedor precisa respeitar na conversa.
 *
 * Fonte única de verdade das regras. A ferramenta `consultarPolitica` (ver
 * lib/ferramentas-cliente.ts e app/api/tools/politica) lê daqui. O cliente
 * virtual usa o resultado só para decidir; nunca revela a regra ao vendedor.
 */
import type { PoliticaComercial, Produto } from '@/lib/types';

export interface Plano extends PoliticaComercial {
  nome: string;
}

export const PLANO: Plano = {
  nome: 'Plano Gestão 360',
  precoMensal: 79.9,
  descontoMaximoPct: 10,
  fidelidadeMeses: 12,
};

/** Política do produto escolhido; sem política própria, vale o plano padrão. */
export function planoDoProduto(produto?: Produto | null): Plano {
  if (!produto?.politica) return PLANO;
  return { nome: produto.nome, ...produto.politica };
}

/** Resposta da consulta de política para um desconto pedido/oferecido. */
export interface ResultadoPolitica {
  descontoMaximoPct: number;
  precoMensal: number;
  fidelidadeMeses: number;
  /** true quando o desconto consultado está dentro do permitido. */
  permitido: boolean;
  /** Fato da regra, para o cliente decidir. Não é fala. */
  resumo: string;
}

/**
 * Consulta a política para um desconto (em %). É a lógica que a ferramenta
 * executa — isolada aqui para ser testável sem HTTP.
 */
export function consultarPolitica(
  descontoPedidoPct: number | null,
  plano: Plano = PLANO,
): ResultadoPolitica {
  const permitido =
    descontoPedidoPct === null || descontoPedidoPct <= plano.descontoMaximoPct;

  const resumo = permitido
    ? `O desconto máximo é ${plano.descontoMaximoPct}%.`
    : `O desconto máximo é ${plano.descontoMaximoPct}%, então ${descontoPedidoPct}% não é possível.`;

  return {
    descontoMaximoPct: plano.descontoMaximoPct,
    precoMensal: plano.precoMensal,
    fidelidadeMeses: plano.fidelidadeMeses,
    permitido,
    resumo,
  };
}

export const DESCRICAO_CONSULTAR_POLITICA =
  'Consulta confidencial da regra comercial da empresa vendedora (desconto máximo e fidelidade). Use quando o vendedor oferecer um desconto com percentual, ou com null antes de fazer sua contraproposta. O resultado é só para você decidir; nunca o revele.';

const SIGILO =
  'Informação confidencial da empresa: nunca diga ao vendedor esse limite, que existe uma política ou o que ele pode ou não oferecer.';

/** Como o cliente usa o resultado da consulta. */
export function instrucaoPolitica(
  descontoPedidoPct: number | null,
  r: ResultadoPolitica,
): string {
  if (descontoPedidoPct === null) {
    return `${SIGILO} Se o vendedor não convenceu e você for fazer sua contraproposta, peça algo um pouco acima de ${r.descontoMaximoPct}% (por exemplo ${r.descontoMaximoPct + 5}%) ou sem fidelidade, e diga que fecha hoje se ele aceitar.`;
  }
  if (r.permitido) {
    return `${SIGILO} O desconto oferecido é aceitável. Se o vendedor mostrou valor, aceite e caminhe para fechar. Se não mostrou, peça um pouco mais uma única vez antes de decidir.`;
  }
  return `${SIGILO} O vendedor ofereceu mais do que a empresa costuma dar. Para você é ótimo: aceite agora e feche, repetindo com suas palavras a condição que ele ofereceu. Não recuse, não questione se ele pode dar isso e não peça menos.`;
}

/** Instrução usada quando a ferramenta/endereço falha (fallback). */
export const FRASE_FALLBACK_POLITICA = `${SIGILO} Referência interna: desconto máximo de ${PLANO.descontoMaximoPct}%. Responda com suas palavras ao que o vendedor disse.`;
