/**
 * Verificação do loop conversa → avaliação → dashboard.
 *
 * Garante que o veredito vira uma Avaliacao coerente, que o store persiste e
 * marca a atribuição como concluída, e que a média do vendedor é recalculada.
 *
 * Rodar: node --import tsx scripts/verify-loop.ts
 */
import { avaliacaoDoVeredito } from '../lib/avaliacao-from-veredito';
import { store, salvarAvaliacao } from '../lib/mock/store';
import type { Veredito } from '../lib/types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function verifyMapeamentoNaoApto() {
  const veredito: Veredito = {
    apto: false,
    criterioFalho: 'condicao_comercial',
    frase: 'Fechado, eu te dou 30% de desconto então.',
  };
  const aval = avaliacaoDoVeredito({
    veredito,
    cenarioId: 'cen-caro',
    vendedorId: 'vend-ana',
    atribuicaoId: 'atr-2',
  });

  assert(aval.notaFinal === 0, 'Não apto deveria resultar em nota 0');
  const linha = aval.notasPorCriterio.find(
    (n) => n.criterioId === 'vrd-condicao_comercial',
  );
  assert(linha?.nota === 0, 'A linha do critério violado deveria ter nota 0');
  assert(
    linha?.evidencias.includes(veredito.frase!) ?? false,
    'A evidência deveria conter a frase do vendedor',
  );
  assert(
    aval.pontosDeMelhoria.length > 0,
    'Não apto deveria sugerir ponto de melhoria',
  );
}

function verifyMapeamentoApto() {
  const aval = avaliacaoDoVeredito({
    veredito: { apto: true, criterioFalho: null, frase: null },
    cenarioId: 'cen-caro',
    vendedorId: 'vend-ana',
    atribuicaoId: null,
  });
  assert(aval.notaFinal === 100, 'Apto deveria resultar em nota 100');
  assert(
    aval.notasPorCriterio.every((n) => n.nota === 100),
    'Apto não deveria ter critério com nota 0',
  );
}

function verifyPersistencia() {
  const atribuicaoId = 'atr-2'; // pendente no seed
  const antes = store.atribuicoes.find((a) => a.id === atribuicaoId);
  assert(antes?.status === 'pendente', 'Pré-condição: atr-2 começa pendente');

  const aval = avaliacaoDoVeredito({
    veredito: {
      apto: false,
      criterioFalho: 'segurou_objecao',
      frase: 'Posso fazer uma condição especial.',
    },
    cenarioId: 'cen-caro',
    vendedorId: 'vend-ana',
    atribuicaoId,
  });

  salvarAvaliacao(aval, atribuicaoId);

  const depois = store.atribuicoes.find((a) => a.id === atribuicaoId);
  assert(depois?.status === 'concluida', 'Atribuição deveria virar concluída');
  assert(
    depois?.avaliacaoId === aval.id,
    'Atribuição deveria apontar para a nova avaliação',
  );
  assert(
    store.avaliacoes.some((a) => a.id === aval.id),
    'A avaliação deveria estar no store',
  );

  const vendedor = store.vendedores.find((v) => v.id === 'vend-ana');
  assert(
    typeof vendedor?.mediaGeral === 'number',
    'A média do vendedor deveria ser recalculada',
  );
}

function main() {
  verifyMapeamentoNaoApto();
  verifyMapeamentoApto();
  verifyPersistencia();
  console.log('Loop (conversa → avaliação → dashboard) checks passed');
}

main();
