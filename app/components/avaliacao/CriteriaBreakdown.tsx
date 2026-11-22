import { Card } from '@/components/ui/card';
import { EvidenceQuote } from './EvidenceQuote';
import { scoreColor } from '@/components/shared/ScoreBadge';
import { cn } from '@/lib/utils';
import type { NotaCriterio } from '@/lib/types';

export function CriteriaBreakdown({ notas }: { notas: NotaCriterio[] }) {
  return (
    <div className="space-y-4">
      {notas.map((n) => (
        <Card key={n.criterioId}>
          <div className="mb-2 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-medium text-white">
                {n.criterioNome}
              </h4>
              <p className="text-xs text-muted-foreground">Peso {n.peso}%</p>
            </div>
            <span className={cn('text-lg font-semibold', scoreColor(n.nota))}>
              {Math.round(n.nota)}
            </span>
          </div>

          {/* Barra de progresso */}
          <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className={cn(
                'h-full rounded-full',
                n.nota >= 80
                  ? 'bg-emerald-400'
                  : n.nota >= 60
                    ? 'bg-amber-400'
                    : 'bg-rose-400',
              )}
              style={{ width: `${Math.max(0, Math.min(100, n.nota))}%` }}
            />
          </div>

          {n.comentario && (
            <p className="mb-2 text-sm text-muted-foreground">{n.comentario}</p>
          )}

          {n.evidencias.length > 0 && (
            <div className="space-y-2">
              {n.evidencias.map((e, i) => (
                <EvidenceQuote key={i} texto={e} />
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
