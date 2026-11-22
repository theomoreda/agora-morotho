/**
 * Ponto único de acesso a dados.
 *
 * Lê e escreve no store em memória (`lib/mock/store.ts`), que é semeado com os
 * fixtures. Quando o back-end existir, basta trocar o corpo destas funções por
 * chamadas HTTP — a assinatura (Promise) já está pronta. Nenhuma página fala
 * com o store diretamente.
 */
import { store, salvarAvaliacao } from '@/lib/mock/store';
import type {
  Atribuicao,
  Avaliacao,
  Cenario,
  Criterio,
  Material,
  Produto,
  Vendedor,
} from '@/lib/types';

// Pequeno atraso para simular latência de rede e exercitar estados de loading.
function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// ── Biblioteca ──────────────────────────────────────────────────────────────

export function listarProdutos(): Promise<Produto[]> {
  return delay(store.produtos);
}

export function listarMateriais(): Promise<Material[]> {
  return delay(store.materiais);
}

export function obterProduto(id: string): Promise<Produto | null> {
  return delay(store.produtos.find((p) => p.id === id) ?? null);
}

// ── Critérios (rubrica) ─────────────────────────────────────────────────────

export function obterRubricaPadrao(): Promise<Criterio[]> {
  return delay(store.criterios);
}

// ── Cenários ────────────────────────────────────────────────────────────────

export function listarCenarios(): Promise<Cenario[]> {
  return delay(store.cenarios);
}

export function obterCenario(id: string): Promise<Cenario | null> {
  return delay(store.cenarios.find((c) => c.id === id) ?? null);
}

// ── Vendedores ──────────────────────────────────────────────────────────────

export function listarVendedores(): Promise<Vendedor[]> {
  return delay(store.vendedores);
}

export function obterVendedor(id: string): Promise<Vendedor | null> {
  return delay(store.vendedores.find((v) => v.id === id) ?? null);
}

// ── Atribuições ─────────────────────────────────────────────────────────────

export function listarAtribuicoes(): Promise<Atribuicao[]> {
  return delay(store.atribuicoes);
}

export function listarAtribuicoesDoVendedor(
  vendedorId: string,
): Promise<Atribuicao[]> {
  return delay(store.atribuicoes.filter((a) => a.vendedorId === vendedorId));
}

export function obterAtribuicao(id: string): Promise<Atribuicao | null> {
  return delay(store.atribuicoes.find((a) => a.id === id) ?? null);
}

// ── Avaliações ──────────────────────────────────────────────────────────────

export function listarAvaliacoes(): Promise<Avaliacao[]> {
  return delay(store.avaliacoes);
}

export function obterAvaliacao(id: string): Promise<Avaliacao | null> {
  return delay(store.avaliacoes.find((a) => a.id === id) ?? null);
}

export function listarAvaliacoesDoVendedor(
  vendedorId: string,
): Promise<Avaliacao[]> {
  return delay(store.avaliacoes.filter((a) => a.vendedorId === vendedorId));
}

/**
 * Persiste uma avaliação e liga-a à atribuição (marcando como concluída).
 * É o que fecha o loop ao fim de uma simulação.
 */
export function registrarAvaliacao(
  avaliacao: Avaliacao,
  atribuicaoId: string | null,
): Promise<Avaliacao> {
  salvarAvaliacao(avaliacao, atribuicaoId);
  return delay(avaliacao, 0);
}
