import { CheckCircle2, Clock3, Handshake, MinusCircle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { cn } from '@/lib/utils';
import { DESFECHO_LABEL, type AnaliseSessao, type Desfecho } from '@/lib/types';

const COR_DESFECHO: Record<Desfecho, string> = {
  fechou: 'border-success/30 bg-success/5 text-success',
  adiou: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
  recusou: 'border-rose-500/30 bg-rose-500/5 text-rose-400',
  sem_decisao: 'border-border bg-card/60 text-muted-foreground',
};

/** Desempenho da ligação: desfecho, critérios justificados, métricas e a transcrição de origem. */
export function SessionReport({ analise }: { analise: AnaliseSessao }) {
  const avaliados = analise.criterios.filter((c) => c.atendido !== null);
  const atendidos = avaliados.filter((c) => c.atendido).length;
  const IconeDesfecho = analise.desfecho === 'fechou' ? Handshake : Clock3;

  return (
    <div className="space-y-6 text-left">
      {!analise.avaliavel ? (
        <Card className="border-amber-500/30 bg-amber-500/5 text-sm text-amber-300">
          A transcrição não tem falas suas e do cliente, então não há o que avaliar.
          Nada será registrado.
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
          <Card className="flex items-center gap-5">
            <ScoreBadge nota={analise.nota} size="lg" />
            <div>
              <p className="type-label">Critérios atendidos</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                {atendidos} de {avaliados.length}
              </p>
              {avaliados.length < analise.criterios.length && (
                <p className="text-xs text-muted-foreground">
                  {analise.criterios.length - avaliados.length} sem base na conversa
                </p>
              )}
            </div>
          </Card>
          <Card className={cn('flex items-start gap-3', COR_DESFECHO[analise.desfecho])}>
            <IconeDesfecho className="mt-0.5 h-6 w-6 shrink-0" />
            <div className="min-w-0">
              <p className="font-display text-2xl font-semibold">{DESFECHO_LABEL[analise.desfecho]}</p>
              {analise.fraseDesfecho && (
                <p className="mt-2 text-sm italic leading-relaxed text-foreground/80">“{analise.fraseDesfecho}”</p>
              )}
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {analise.metricas.map((m) => (
          <Card key={m.nome} className="p-5">
            <p className="type-label">{m.nome}</p>
            <p className="mt-2 font-display text-3xl font-semibold leading-none text-foreground">{m.valor}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{m.detalhe}</p>
          </Card>
        ))}
      </div>

      <Card className="p-0">
        <ul className="divide-y divide-border">
          {analise.criterios.map((c) => (
            <li key={c.id} className="flex items-start gap-4 px-6 py-5">
              {c.atendido === null ? (
                <MinusCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              ) : c.atendido ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              )}
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-base font-semibold leading-snug',
                    c.atendido === null ? 'text-muted-foreground' : 'text-foreground',
                  )}
                >
                  {c.nome}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.justificativa}</p>
                {c.evidencia && (
                  <blockquote className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-xs italic text-foreground/80">
                    “{c.evidencia}”
                  </blockquote>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-0">
        <details>
          <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-foreground">
            Transcrição usada na análise ({analise.transcricao.length} falas)
          </summary>
          {analise.transcricao.length === 0 ? (
            <p className="px-6 pb-5 text-sm text-muted-foreground">Nenhuma fala foi transcrita.</p>
          ) : (
            <ol className="space-y-3 px-6 pb-5 text-sm leading-relaxed">
              {analise.transcricao.map((t, i) => (
                <li key={i}>
                  <span
                    className={cn(
                      'font-medium',
                      t.falante === 'vendedor' ? 'text-muted-foreground' : 'text-highlight',
                    )}
                  >
                    {t.falante === 'vendedor' ? 'Você' : 'Cliente'}:
                  </span>{' '}
                  <span className="text-foreground/80">{t.texto}</span>
                </li>
              ))}
            </ol>
          )}
        </details>
      </Card>
    </div>
  );
}
