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
  Habilitacao,
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
  habilitacoes: Habilitacao[];
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
    habilitacoes: [],
  };
}

/**
 * Sobrevive ao hot-reload do dev guardando o store no globalThis — senão cada
 * recompilação de módulo zeraria o que foi gravado durante a sessão.
 */
const globalForStore = globalThis as unknown as { __unmuteStore?: Store };

export const store: Store =
  globalForStore.__unmuteStore ?? (globalForStore.__unmuteStore = seed());

/**
 * Fixtures criados no código depois que o store já existia entram sem apagar
 * o que foi gravado na sessão.
 */
function incluirFixturesNovos(): void {
  const novo = seed();
  if (!store.habilitacoes) store.habilitacoes = novo.habilitacoes;
  for (const chave of Object.keys(novo) as (keyof Store)[]) {
    if (chave === 'habilitacoes') continue;
    const atual = store[chave] as { id: string }[];
    const ids = new Set(atual.map((item) => item.id));
    for (const item of novo[chave] as { id: string }[]) {
      if (!ids.has(item.id)) atual.push(item);
    }
  }
  for (const fixture of novo.produtos) {
    const produto = store.produtos.find((p) => p.id === fixture.id);
    if (produto && !produto.politica && fixture.politica) {
      produto.politica = fixture.politica;
    }
  }
}

incluirFixturesNovos();

/** Substitui a rubrica padrão inteira (nomes, descrições e pesos). */
export function salvarCriterios(criterios: Criterio[]): void {
  store.criterios.splice(0, store.criterios.length, ...criterios);
}

/** Insere um material e o vincula aos produtos indicados. */
export function salvarMaterial(material: Material, produtoIds: string[]): void {
  store.materiais.push(material);
  for (const produto of store.produtos) {
    if (produtoIds.includes(produto.id) && !produto.materiais.includes(material.id)) {
      produto.materiais = [...produto.materiais, material.id];
    }
  }
}

/** Remove um material e desfaz os vínculos com produtos. */
export function removerMaterial(id: string): boolean {
  const indice = store.materiais.findIndex((m) => m.id === id);
  if (indice < 0) return false;
  store.materiais.splice(indice, 1);
  for (const produto of store.produtos) {
    if (produto.materiais.includes(id)) {
      produto.materiais = produto.materiais.filter((m) => m !== id);
    }
  }
  return true;
}

/** Insere um produto novo. */
export function salvarProduto(produto: Produto): void {
  store.produtos.push(produto);
}

/** Grava o que o vendedor pode simular, substituindo a configuração anterior. */
export function salvarHabilitacao(habilitacao: Habilitacao): void {
  const indice = store.habilitacoes.findIndex(
    (h) => h.vendedorId === habilitacao.vendedorId,
  );
  if (indice >= 0) store.habilitacoes[indice] = habilitacao;
  else store.habilitacoes.push(habilitacao);
}

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
