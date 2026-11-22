/**
 * Store em memória do processo.
 *
 * Inicializado com os fixtures de `data.ts`, mas mutável: quando uma simulação
 * termina, o veredito vira uma `Avaliacao` persistida aqui e a atribuição é
 * marcada como concluída. Isso fecha o loop conversa → avaliação → dashboard
 * sem back-end.
 *
 * Limitação declarada: vive na memória de UMA instância do Next e some num
 * restart. É suficiente para a demo; em produção vira banco (o `data-provider`
 * já isola isto para a troca ser indolor).
 */
import {
  ATRIBUICOES,
  AVALIACOES,
  CENARIOS,
  CRITERIOS_PADRAO,
  MATERIAIS,
  PRODUTOS,
  VENDEDORES,
} from '@/lib/mock/data';
import type {
  Atribuicao,
  Avaliacao,
  Cenario,
  Criterio,
  Material,
  Produto,
  Vendedor,
} from '@/lib/types';

interface Store {
  produtos: Produto[];
  materiais: Material[];
  criterios: Criterio[];
  cenarios: Cenario[];
  vendedores: Vendedor[];
  atribuicoes: Atribuicao[];
  avaliacoes: Avaliacao[];
}

// Cópias rasas dos fixtures: mutamos os arrays do store, não os fixtures.
function seed(): Store {
  return {
    produtos: [...PRODUTOS],
    materiais: [...MATERIAIS],
    criterios: [...CRITERIOS_PADRAO],
    cenarios: [...CENARIOS],
    vendedores: VENDEDORES.map((v) => ({ ...v })),
    atribuicoes: ATRIBUICOES.map((a) => ({ ...a })),
    avaliacoes: AVALIACOES.map((a) => ({ ...a })),
  };
}

/**
 * Sobrevive ao hot-reload do dev guardando o store no globalThis — senão cada
 * recompilação de módulo zeraria o que foi gravado durante a sessão.
 */
const globalForStore = globalThis as unknown as { __unmuteStore?: Store };

export const store: Store =
  globalForStore.__unmuteStore ?? (globalForStore.__unmuteStore = seed());

/** Insere uma avaliação e liga-a à atribuição (marcando como concluída). */
export function salvarAvaliacao(
  avaliacao: Avaliacao,
  atribuicaoId: string | null,
): void {
  const existente = store.avaliacoes.findIndex((a) => a.id === avaliacao.id);
  if (existente >= 0) {
    store.avaliacoes[existente] = avaliacao;
  } else {
    store.avaliacoes.push(avaliacao);
  }

  if (atribuicaoId) {
    const at = store.atribuicoes.find((a) => a.id === atribuicaoId);
    if (at) {
      at.status = 'concluida';
      at.avaliacaoId = avaliacao.id;
    }
  }

  recalcularMediaVendedor(avaliacao.vendedorId);
}

/** Recalcula a média geral do vendedor a partir das avaliações concluídas. */
function recalcularMediaVendedor(vendedorId: string): void {
  const notas = store.avaliacoes
    .filter((a) => a.vendedorId === vendedorId)
    .map((a) => a.notaFinal);
  const vendedor = store.vendedores.find((v) => v.id === vendedorId);
  if (!vendedor) return;
  vendedor.mediaGeral =
    notas.length === 0
      ? null
      : Math.round(notas.reduce((s, n) => s + n, 0) / notas.length);
}
