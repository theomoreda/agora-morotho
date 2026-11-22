/**
 * Ponto único de acesso a dados.
 *
 * Lê e escreve no store em memória (`lib/mock/store.ts`), que é semeado com os
 * fixtures. Quando o back-end existir, basta trocar o corpo destas funções por
 * chamadas HTTP — a assinatura (Promise) já está pronta. Nenhuma página fala
 * com o store diretamente.
 */
import { store, salvarAvaliacao, salvarCriterios } from '@/lib/mock/store';
import type {
  Atribuicao,
  Avaliacao,
  Cenario,
  Criterio,
  Material,
  Produto,
  TipoMaterial,
  Vendedor,
} from '@/lib/types';

// Pequeno atraso para simular latência de rede e exercitar estados de loading.
function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// ── Biblioteca ──────────────────────────────────────────────────────────────
// No navegador a biblioteca passa pela rota `/api/biblioteca`: o que o gestor
// cadastra precisa estar no store do servidor, que é o que o `invite-agent` lê.

const noNavegador = typeof window !== 'undefined';

interface Biblioteca {
  produtos: Produto[];
  materiais: Material[];
}

async function buscarBiblioteca(): Promise<Biblioteca> {
  const resposta = await fetch('/api/biblioteca', { cache: 'no-store' });
  if (!resposta.ok) throw new Error('Falha ao carregar a biblioteca');
  return resposta.json();
}

async function enviarBiblioteca<T>(corpo: Record<string, unknown>): Promise<T> {
  const resposta = await fetch('/api/biblioteca', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.error ?? 'Falha ao salvar');
  return dados;
}

export async function listarProdutos(): Promise<Produto[]> {
  if (noNavegador) return (await buscarBiblioteca()).produtos;
  return delay(store.produtos);
}

export async function listarMateriais(): Promise<Material[]> {
  if (noNavegador) return (await buscarBiblioteca()).materiais;
  return delay(store.materiais);
}

export async function obterProduto(id: string): Promise<Produto | null> {
  const produtos = await listarProdutos();
  return produtos.find((p) => p.id === id) ?? null;
}

export interface NovoMaterial {
  titulo: string;
  tipo: TipoMaterial;
  conteudo: string;
  arquivo?: string;
  produtoIds: string[];
}

export function adicionarMaterial(novo: NovoMaterial): Promise<Material> {
  return enviarBiblioteca({ entidade: 'material', ...novo });
}

export async function excluirMaterial(id: string): Promise<void> {
  const resposta = await fetch(`/api/biblioteca?materialId=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!resposta.ok) throw new Error('Falha ao remover o material');
}

export interface NovoProduto {
  nome: string;
  descricao: string;
  materialIds: string[];
}

export function adicionarProduto(novo: NovoProduto): Promise<Produto> {
  return enviarBiblioteca({ entidade: 'produto', ...novo });
}

// ── Critérios (rubrica) ─────────────────────────────────────────────────────

export function obterRubricaPadrao(): Promise<Criterio[]> {
  return delay(store.criterios);
}

export function salvarRubricaPadrao(criterios: Criterio[]): Promise<Criterio[]> {
  salvarCriterios(criterios);
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
