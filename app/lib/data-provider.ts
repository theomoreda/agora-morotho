/**
 * Ponto único de acesso a dados.
 *
 * Hoje lê dos mocks em `lib/mock`. Quando o back-end existir, basta trocar o
 * corpo destas funções por chamadas HTTP — a assinatura (Promise) já está
 * pronta para isso. Nenhuma página fala com os mocks diretamente.
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

// Pequeno atraso para simular latência de rede e exercitar estados de loading.
function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// ── Biblioteca ──────────────────────────────────────────────────────────────

export function listarProdutos(): Promise<Produto[]> {
  return delay(PRODUTOS);
}

export function listarMateriais(): Promise<Material[]> {
  return delay(MATERIAIS);
}

export function obterProduto(id: string): Promise<Produto | null> {
  return delay(PRODUTOS.find((p) => p.id === id) ?? null);
}

// ── Critérios (rubrica) ─────────────────────────────────────────────────────

export function obterRubricaPadrao(): Promise<Criterio[]> {
  return delay(CRITERIOS_PADRAO);
}

// ── Cenários ────────────────────────────────────────────────────────────────

export function listarCenarios(): Promise<Cenario[]> {
  return delay(CENARIOS);
}

export function obterCenario(id: string): Promise<Cenario | null> {
  return delay(CENARIOS.find((c) => c.id === id) ?? null);
}

// ── Vendedores ──────────────────────────────────────────────────────────────

export function listarVendedores(): Promise<Vendedor[]> {
  return delay(VENDEDORES);
}

export function obterVendedor(id: string): Promise<Vendedor | null> {
  return delay(VENDEDORES.find((v) => v.id === id) ?? null);
}

// ── Atribuições ─────────────────────────────────────────────────────────────

export function listarAtribuicoes(): Promise<Atribuicao[]> {
  return delay(ATRIBUICOES);
}

export function listarAtribuicoesDoVendedor(
  vendedorId: string,
): Promise<Atribuicao[]> {
  return delay(ATRIBUICOES.filter((a) => a.vendedorId === vendedorId));
}

// ── Avaliações ──────────────────────────────────────────────────────────────

export function listarAvaliacoes(): Promise<Avaliacao[]> {
  return delay(AVALIACOES);
}

export function obterAvaliacao(id: string): Promise<Avaliacao | null> {
  return delay(AVALIACOES.find((a) => a.id === id) ?? null);
}

export function listarAvaliacoesDoVendedor(
  vendedorId: string,
): Promise<Avaliacao[]> {
  return delay(AVALIACOES.filter((a) => a.vendedorId === vendedorId));
}
