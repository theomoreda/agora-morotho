/**
 * Converte o veredito pós-chamada em uma `Avaliacao` que as telas de resultado
 * e dashboard já sabem exibir.
 *
 * O veredito é binário (apto / não apto) sobre dois critérios. Aqui ele vira:
 *   - notaFinal: 100 se apto, 0 se não apto (é um gate, não uma rubrica);
 *   - uma linha por critério do veredito, com a evidência (a frase);
 *   - erros/pontos de melhoria derivados do critério que falhou.
 */
import {
  CRITERIO_VEREDITO_LABEL,
  type Avaliacao,
  type CriterioVeredito,
  type NotaCriterio,
  type Veredito,
} from '@/lib/types';

const CRITERIOS: CriterioVeredito[] = [
  'condicao_comercial',
  'segurou_objecao',
];

const MELHORIA: Record<CriterioVeredito, string> = {
  condicao_comercial:
    'Respeitar o teto de desconto do plano; não prometer condições fora da política.',
  segurou_objecao:
    'Sustentar o valor diante da objeção em vez de ceder desconto.',
};

let contador = 0;
function novoId(): string {
  contador += 1;
  return `aval-${Date.now().toString(36)}-${contador}`;
}

export function avaliacaoDoVeredito(args: {
  veredito: Veredito;
  cenarioId: string;
  vendedorId: string;
  atribuicaoId: string | null;
}): Avaliacao {
  const { veredito, cenarioId, vendedorId, atribuicaoId } = args;

  const notasPorCriterio: NotaCriterio[] = CRITERIOS.map((c) => {
    const falhou = !veredito.apto && veredito.criterioFalho === c;
    return {
      criterioId: `vrd-${c}`,
      criterioNome: CRITERIO_VEREDITO_LABEL[c],
      peso: 50,
      nota: falhou ? 0 : 100,
      evidencias:
        falhou && veredito.frase ? [veredito.frase] : [],
      comentario: falhou
        ? 'Critério violado nesta conversa.'
        : 'Sem violação detectada.',
    };
  });

  return {
    id: novoId(),
    atribuicaoId: atribuicaoId ?? '',
    cenarioId,
    vendedorId,
    realizadaEm: new Date().toISOString(),
    notaFinal: veredito.apto ? 100 : 0,
    notasPorCriterio,
    errosIdentificados:
      !veredito.apto && veredito.frase
        ? [`Frase do vendedor: "${veredito.frase}"`]
        : [],
    pontosDeMelhoria:
      !veredito.apto && veredito.criterioFalho
        ? [MELHORIA[veredito.criterioFalho]]
        : [],
  };
}
