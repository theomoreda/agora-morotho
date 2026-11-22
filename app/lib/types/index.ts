/**
 * Tipos de domínio da plataforma de treino de vendedores.
 *
 * Fonte da verdade do front-end. Enquanto não há back-end, os mocks em
 * `lib/mock` produzem valores com estes tipos e o `data-provider` os entrega.
 */

// ── Dificuldade e perfil ────────────────────────────────────────────────────

export type Dificuldade = 'facil' | 'medio' | 'dificil';

export const DIFICULDADE_LABEL: Record<Dificuldade, string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
};

/** Perfil do cliente virtual que o vendedor vai enfrentar. */
export type PerfilCliente =
  | 'interessado_desconfiado'
  | 'conhece_concorrente'
  | 'acha_caro'
  | 'nao_entende_tecnico'
  | 'exige_condicoes'
  | 'quase_fechando';

export const PERFIL_CLIENTE_LABEL: Record<PerfilCliente, string> = {
  interessado_desconfiado: 'Interessado, mas desconfiado',
  conhece_concorrente: 'Conhece o concorrente',
  acha_caro: 'Acha o produto caro',
  nao_entende_tecnico: 'Não entende as características técnicas',
  exige_condicoes: 'Exige condições especiais',
  quase_fechando: 'Quase fechando, com uma última objeção',
};

// ── Biblioteca de conhecimento ──────────────────────────────────────────────

export type TipoMaterial =
  | 'catalogo'
  | 'apresentacao'
  | 'manual'
  | 'politica'
  | 'processo';

export interface Material {
  id: string;
  titulo: string;
  tipo: TipoMaterial;
  /** Resumo/trecho do conteúdo usado como fonte de verdade pelo agente. */
  conteudo: string;
  atualizadoEm: string; // ISO date
}

export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  materiais: string[]; // ids de Material
}

// ── Critérios de avaliação (rubrica) ────────────────────────────────────────

export interface Criterio {
  id: string;
  nome: string;
  descricao: string;
  /** Peso de 0 a 100. A soma dos pesos da rubrica deve dar 100. */
  peso: number;
}

// ── Cenário de simulação ────────────────────────────────────────────────────

export interface Cenario {
  id: string;
  titulo: string;
  produtoId: string;
  perfilCliente: PerfilCliente;
  dificuldade: Dificuldade;
  objetivo: string;
  /** Objeções que o cliente virtual deve levantar. */
  objecoes: string[];
  /** Comportamento esperado do cliente, em linguagem livre. */
  comportamento: string;
  criterios: Criterio[];
  criadoEm: string; // ISO date
}

// ── Vendedores e atribuições ────────────────────────────────────────────────

export interface Vendedor {
  id: string;
  nome: string;
  email: string;
  /** Média geral das avaliações concluídas (0-100), ou null se nenhuma. */
  mediaGeral: number | null;
}

export type StatusAtribuicao =
  | 'pendente'
  | 'em_andamento'
  | 'concluida'
  | 'atrasada';

export const STATUS_ATRIBUICAO_LABEL: Record<StatusAtribuicao, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  atrasada: 'Atrasada',
};

export interface Atribuicao {
  id: string;
  cenarioId: string;
  vendedorId: string;
  prazo: string; // ISO date
  status: StatusAtribuicao;
  /** Preenchido quando a simulação é concluída e avaliada. */
  avaliacaoId: string | null;
}

// ── Avaliação (resultado da conversa) ───────────────────────────────────────

export interface NotaCriterio {
  criterioId: string;
  criterioNome: string;
  peso: number;
  nota: number; // 0-100
  /** Trechos da conversa que justificam a nota. */
  evidencias: string[];
  comentario: string;
}

export interface Avaliacao {
  id: string;
  atribuicaoId: string;
  cenarioId: string;
  vendedorId: string;
  realizadaEm: string; // ISO date
  notaFinal: number; // 0-100, média ponderada das notas por critério
  notasPorCriterio: NotaCriterio[];
  /** Informações incorretas ditas pelo vendedor, detectadas pela avaliação. */
  errosIdentificados: string[];
  /** Pontos de melhoria priorizados. */
  pontosDeMelhoria: string[];
}

// ── Perfil de usuário (seleção mockada) ─────────────────────────────────────

export type Perfil = 'gestor' | 'vendedor';
