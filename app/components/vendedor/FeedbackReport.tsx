import { ScoreCard } from '@/components/avaliacao/ScoreCard';
import { CriteriaBreakdown } from '@/components/avaliacao/CriteriaBreakdown';
import type { Avaliacao } from '@/lib/types';

type FeedbackReportProps = {
  avaliacao: Avaliacao;
  cenarioTitulo: string;
};

/**
 * Relatório de avaliação: nota final, erros, pontos de melhoria e detalhamento
 * por critério com as evidências citadas. Usado tanto na visão do gestor quanto
 * na do vendedor.
 */
export function FeedbackReport({
  avaliacao,
  cenarioTitulo,
}: FeedbackReportProps) {
  return (
    <div className="space-y-6">
      <ScoreCard avaliacao={avaliacao} titulo={cenarioTitulo} />
      <div>
        <h3 className="mb-3 text-sm font-semibold text-white">
          Detalhamento por critério
        </h3>
        <CriteriaBreakdown notas={avaliacao.notasPorCriterio} />
      </div>
    </div>
  );
}
