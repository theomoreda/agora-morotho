'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Criterio } from '@/lib/types';

type RubricEditorProps = {
  criterios: Criterio[];
  readOnly?: boolean;
};

/**
 * Lista de critérios com pesos. No modo editável, permite ajustar os pesos e
 * mostra se a soma fecha em 100 (a persistência virá do back-end).
 */
export function RubricEditor({ criterios, readOnly }: RubricEditorProps) {
  const [pesos, setPesos] = useState<Record<string, number>>(() =>
    Object.fromEntries(criterios.map((c) => [c.id, c.peso])),
  );

  const soma = useMemo(
    () => Object.values(pesos).reduce((s, p) => s + (Number(p) || 0), 0),
    [pesos],
  );

  return (
    <Card className="space-y-3">
      {criterios.map((c) => (
        <div
          key={c.id}
          className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">{c.nome}</p>
            <p className="text-xs text-muted-foreground">{c.descricao}</p>
          </div>
          {readOnly ? (
            <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
              {c.peso}%
            </span>
          ) : (
            <div className="flex shrink-0 items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                value={pesos[c.id]}
                onChange={(e) =>
                  setPesos((prev) => ({
                    ...prev,
                    [c.id]: Number(e.target.value),
                  }))
                }
                className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-right text-sm text-white outline-none focus:border-primary"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          )}
        </div>
      ))}

      {!readOnly && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">Soma dos pesos</span>
          <span
            className={cn(
              'text-sm font-semibold',
              soma === 100 ? 'text-emerald-400' : 'text-rose-400',
            )}
          >
            {soma}%
          </span>
        </div>
      )}
    </Card>
  );
}
