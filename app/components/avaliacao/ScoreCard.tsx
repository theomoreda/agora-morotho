import { AlertTriangle, Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import type { Avaliacao } from '@/lib/types';

type ScoreCardProps = {
  avaliacao: Avaliacao;
  titulo: string;
};

/** Cabeçalho do resultado: nota final + erros e pontos de melhoria. */
export function ScoreCard({ avaliacao, titulo }: ScoreCardProps) {
  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-5">
        <ScoreBadge nota={avaliacao.notaFinal} size="lg" />
        <div>
          <p className="text-xs text-muted-foreground">Nota final</p>
          <h2 className="text-lg font-semibold text-white">{titulo}</h2>
          <p className="text-xs text-muted-foreground">
            Realizada em{' '}
            {new Date(avaliacao.realizadaEm).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </Card>

      {avaliacao.errosIdentificados.length > 0 && (
        <Card className="border-rose-500/30 bg-rose-500/5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-400">
            <AlertTriangle className="h-4 w-4" />
            Erros identificados
          </h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {avaliacao.errosIdentificados.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Card>
      )}

      {avaliacao.pontosDeMelhoria.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-400">
            <Lightbulb className="h-4 w-4" />
            O que melhorar
          </h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {avaliacao.pontosDeMelhoria.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
