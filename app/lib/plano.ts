/**
 * Plano comercial que o cliente virtual defende na conversa.
 *
 * Fonte única de verdade das regras. A ferramenta `consultarPolitica` (ver
 * lib/ferramentas-cliente.ts) lê daqui para responder quando o vendedor
 * oferece algo fora do plano.
 */
export interface Plano {
  nome: string;
  precoMensal: number; // R$
  descontoMaximoPct: number; // %
  fidelidadeMeses: number;
}

export const PLANO: Plano = {
  nome: 'Plano Gestão 360',
  precoMensal: 79.9,
  descontoMaximoPct: 10,
  fidelidadeMeses: 12,
};

/** Resposta da consulta de política para um desconto pedido/oferecido. */
export interface ResultadoPolitica {
  descontoMaximoPct: number;
  precoMensal: number;
  fidelidadeMeses: number;
  /** true quando o desconto consultado está dentro do permitido. */
  permitido: boolean;
  /** Frase curta que o cliente usa para contestar. */
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

/** Frase pronta usada quando a ferramenta/endereço falha (fallback). */
export const FRASE_FALLBACK_POLITICA =
  'Pelo que me passaram, o desconto máximo é de 10%. Acima disso eu não consigo fechar.';
