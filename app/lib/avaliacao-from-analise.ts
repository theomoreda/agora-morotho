/**
 * Converte o desempenho da ligação em uma `Avaliacao` que as telas de resultado
 * e dashboard já sabem exibir. Cada critério avaliado vira 100 ou 0, com peso
 * igual; critérios sem base na conversa ficam de fora. A análise completa segue
 * junto em `analise`.
 */
import type { AnaliseSessao, Avaliacao, NotaCriterio } from '@/lib/types';

let contador = 0;
function novoId(): string {
  contador += 1;
  return `aval-${Date.now().toString(36)}-${contador}`;
}

export function avaliacaoDaAnalise(args: {
  analise: AnaliseSessao;
  cenarioId: string;
  vendedorId: string;
  atribuicaoId: string | null;
}): Avaliacao {
  const { analise, cenarioId, vendedorId, atribuicaoId } = args;
  const avaliados = analise.criterios.filter((c) => c.atendido !== null);
  const peso = avaliados.length ? Math.round(100 / avaliados.length) : 0;

  const notasPorCriterio: NotaCriterio[] = avaliados.map((c) => ({
    criterioId: `sess-${c.id}`,
    criterioNome: c.nome,
    peso,
    nota: c.atendido ? 100 : 0,
    evidencias: c.evidencia ? [c.evidencia] : [],
    comentario: c.justificativa,
  }));

  const falhos = avaliados.filter((c) => c.atendido === false);

  return {
    id: novoId(),
    atribuicaoId: atribuicaoId ?? '',
    cenarioId,
    vendedorId,
    realizadaEm: new Date().toISOString(),
    notaFinal: analise.nota,
    notasPorCriterio,
    errosIdentificados: falhos
      .filter((c) => c.id === 'politica')
      .map((c) => c.justificativa),
    pontosDeMelhoria: falhos.map((c) => `${c.nome}: ${c.justificativa}`),
    analise,
  };
}
