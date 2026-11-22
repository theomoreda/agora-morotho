import { ScoreCard } from '@/components/avaliacao/ScoreCard';
import { CriteriaBreakdown } from '@/components/avaliacao/CriteriaBreakdown';
import { SessionReport } from '@/components/simulacao/SessionReport';
import { SectionHeader } from '@/components/shared/PageHeader';
import type { Avaliacao } from '@/lib/types';

type FeedbackReportProps = {
  avaliacao: Avaliacao;
  cenarioTitulo: string;
};

/**
 * Relatório de avaliação: nota final, erros, pontos de melhoria e detalhamento
 * por critério com as evidências citadas. Usado tanto na visão do gestor quanto
 * na do vendedor. Avaliações vindas de ligação mostram o desempenho da sessão.
 */
export function FeedbackReport({
  avaliacao,
  cenarioTitulo,
}: FeedbackReportProps) {
  if (avaliacao.analise) {
    return (
      <div className="space-y-5">
        <p className="type-label">
          {cenarioTitulo} ·{' '}
          {new Date(avaliacao.realizadaEm).toLocaleDateString('pt-BR')}
        </p>
        <SessionReport analise={avaliacao.analise} />
      </div>
    );
  }

  return (
    <div className="page-sections">
      <ScoreCard avaliacao={avaliacao} titulo={cenarioTitulo} />
      <section>
        <SectionHeader title="Detalhamento por critério" />
        <CriteriaBreakdown notas={avaliacao.notasPorCriterio} />
      </section>
    </div>
  );
}
