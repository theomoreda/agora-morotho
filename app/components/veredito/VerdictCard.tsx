import { CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CRITERIO_VEREDITO_LABEL, type Veredito } from '@/lib/types';

/**
 * Mostra as três coisas que o veredito entrega: apto/não apto, o critério que
 * falhou e a frase do vendedor que causou a reprovação.
 */
export function VerdictCard({ veredito }: { veredito: Veredito }) {
  if (veredito.apto) {
    return (
      <Card className="border-success/30 bg-success/5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-success" />
          <div>
            <p className="font-display text-xl font-semibold text-success">Apto</p>
            <p className="text-sm text-muted-foreground">
              Nenhum dos dois critérios foi violado.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-rose-500/30 bg-rose-500/5">
      <div className="flex items-start gap-3">
        <XCircle className="mt-0.5 h-8 w-8 shrink-0 text-rose-400" />
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold text-rose-400">Não apto</p>

          {veredito.criterioFalho && (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Critério que falhou
              </p>
              <p className="text-sm font-medium text-foreground">
                {CRITERIO_VEREDITO_LABEL[veredito.criterioFalho]}
              </p>
            </div>
          )}

          {veredito.frase && (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Frase do vendedor
              </p>
              <blockquote
                className={cn(
                  'mt-1 rounded-lg border border-rose-500/30 bg-background px-3 py-2',
                  'text-sm italic text-foreground',
                )}
              >
                “{veredito.frase}”
              </blockquote>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
