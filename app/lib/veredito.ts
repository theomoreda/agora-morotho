/**
 * Motor do veredito pós-chamada.
 *
 * Função pura e determinística: recebe a conversa e devolve apto/não apto, qual
 * dos DOIS critérios falhou e a frase do vendedor que reprovou. Não depende de
 * LLM — o que torna o resultado reproduzível (requisito do critério de pronto:
 * uma conversa em que o vendedor promete 30% precisa sair como "não apto").
 *
 * Os dois critérios, e só eles:
 *   1. condicao_comercial — o vendedor prometeu algo fora do plano (ex.: desconto
 *      acima do teto da política comercial).
 *   2. segurou_objecao   — diante da pressão do cliente, o vendedor cedeu em vez
 *      de sustentar a posição.
 */
import type {
  CriterioVeredito,
  Falante,
  Turno,
  Veredito,
} from '@/lib/types';

/** Regras configuráveis do veredito. */
export interface RegrasVeredito {
  /** Desconto máximo permitido pela política comercial, em %. */
  descontoMaximoPct: number;
}

/** Política comercial do mock: desconto máximo de 15%. */
export const REGRAS_PADRAO: RegrasVeredito = {
  descontoMaximoPct: 15,
};

// ── Parsing de texto colado ─────────────────────────────────────────────────

// Prefixos que indicam quem está falando numa linha ("Vendedor: ...").
const PREFIXO_VENDEDOR = /^\s*(vendedor|seller|eu|você|voce|v)\s*[:\-]/i;
const PREFIXO_CLIENTE =
  /^\s*(cliente|comprador|customer|client|lead|c)\s*[:\-]/i;

/**
 * Converte texto colado em turnos atribuídos.
 *
 * Aceita o formato comum "Vendedor: ...\nCliente: ...". Linhas sem prefixo são
 * atribuídas ao mesmo falante da linha anterior (continuação). Se nenhuma linha
 * tiver prefixo, tudo é tratado como fala do vendedor — é o pior caso para o
 * veredito (avalia tudo como se fosse dito por ele).
 */
export function parseConversa(texto: string): Turno[] {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const turnos: Turno[] = [];
  let atual: Falante = 'vendedor';

  for (const linha of linhas) {
    if (PREFIXO_VENDEDOR.test(linha)) {
      atual = 'vendedor';
      turnos.push({ falante: 'vendedor', texto: removerPrefixo(linha) });
    } else if (PREFIXO_CLIENTE.test(linha)) {
      atual = 'cliente';
      turnos.push({ falante: 'cliente', texto: removerPrefixo(linha) });
    } else {
      turnos.push({ falante: atual, texto: linha });
    }
  }

  return turnos;
}

function removerPrefixo(linha: string): string {
  return linha.replace(/^\s*[^:\-]+\s*[:\-]\s*/, '').trim();
}

// ── Detecção por critério ───────────────────────────────────────────────────

// Percentuais ditos na fala, ex.: "30%", "30 %", "30 por cento".
const RE_PERCENTUAL = /(\d{1,3})\s*(?:%|por\s*cento)/gi;

// Sinais de que o vendedor cedeu diante da objeção.
const RE_CEDENCIA = [
  /\b(te|lhe)?\s*d(ou|ô)\b.*\bdesconto\b/i,
  /\bposso\s+(fazer|dar|oferecer)\b.*\b(desconto|condi(ç|c)(ã|a)o|exce(ç|c)(ã|a)o|pre(ç|c)o)\b/i,
  /\babr(o|ir)\b.*\bexce(ç|c)(ã|a)o\b/i,
  /\bfecho\s+por\s+menos\b/i,
  /\bfa(ç|c)o\b.*\b(um|uma)\s+(desconto|condi(ç|c)(ã|a)o especial|pre(ç|c)o melhor)\b/i,
  /\b(condi(ç|c)(ã|a)o|pre(ç|c)o)\s+especial\b/i,
];

function fraseComDesconto(
  texto: string,
  tetoPct: number,
): { frase: string; pct: number } | null {
  // Avalia frase a frase para devolver o trecho exato que reprovou.
  const frases = dividirEmFrases(texto);
  for (const frase of frases) {
    RE_PERCENTUAL.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = RE_PERCENTUAL.exec(frase)) !== null) {
      const pct = Number(m[1]);
      if (Number.isFinite(pct) && pct > tetoPct) {
        return { frase: frase.trim(), pct };
      }
    }
  }
  return null;
}

function fraseComCedencia(texto: string): string | null {
  const frases = dividirEmFrases(texto);
  for (const frase of frases) {
    if (RE_CEDENCIA.some((re) => re.test(frase))) {
      return frase.trim();
    }
  }
  return null;
}

function dividirEmFrases(texto: string): string[] {
  return texto
    .split(/(?<=[.!?])\s+|\n+/)
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
}

// ── Veredito ────────────────────────────────────────────────────────────────

/** Avalia os turnos já estruturados. */
export function avaliarTurnos(
  turnos: Turno[],
  regras: RegrasVeredito = REGRAS_PADRAO,
): Veredito {
  const falasVendedor = turnos.filter((t) => t.falante === 'vendedor');

  // Critério 1 (prioridade): condição comercial fora do plano.
  for (const t of falasVendedor) {
    const achado = fraseComDesconto(t.texto, regras.descontoMaximoPct);
    if (achado) {
      return reprovado('condicao_comercial', achado.frase);
    }
  }

  // Critério 2: cedeu diante da objeção.
  for (const t of falasVendedor) {
    const frase = fraseComCedencia(t.texto);
    if (frase) {
      return reprovado('segurou_objecao', frase);
    }
  }

  return { apto: true, criterioFalho: null, frase: null };
}

/** Avalia a partir de texto colado (modo de teste, sem microfone). */
export function avaliarTexto(
  texto: string,
  regras: RegrasVeredito = REGRAS_PADRAO,
): Veredito {
  return avaliarTurnos(parseConversa(texto), regras);
}

function reprovado(
  criterioFalho: CriterioVeredito,
  frase: string,
): Veredito {
  return { apto: false, criterioFalho, frase };
}
