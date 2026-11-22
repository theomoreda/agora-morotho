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
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <h3 className="type-card-title">{n.criterioNome}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Peso {n.peso}%</p>
            </div>
            <span className={cn('font-display text-2xl font-semibold', scoreColor(n.nota))}>
              {Math.round(n.nota)}
            </span>
          </div>

          {/* Barra de progresso */}
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className={cn(
                'h-full rounded-full',
                n.nota >= 80
                  ? 'bg-success'
                  : n.nota >= 60
                    ? 'bg-amber-400'
                    : 'bg-rose-400',
              )}
              style={{ width: `${Math.max(0, Math.min(100, n.nota))}%` }}
            />
          </div>

          {n.comentario && (
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{n.comentario}</p>
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
