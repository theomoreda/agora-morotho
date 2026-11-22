import { cn } from '@/lib/utils';

/** Faixa de cor por nota: >=80 verde, >=60 âmbar, <60 vermelho. */
export function scoreColor(nota: number): string {
  if (nota >= 80) return 'text-success';
  if (nota >= 60) return 'text-amber-400';
  return 'text-rose-400';
}

export function scoreBg(nota: number): string {
  if (nota >= 80) return 'bg-success/15 border-success/30';
  if (nota >= 60) return 'bg-amber-500/15 border-amber-500/30';
  return 'bg-rose-500/15 border-rose-500/30';
}

type ScoreBadgeProps = {
  nota: number | null;
  size?: 'sm' | 'lg';
};

export function ScoreBadge({ nota, size = 'sm' }: ScoreBadgeProps) {
  if (nota === null) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-500/30 bg-slate-500/15 px-2.5 py-0.5 text-xs font-medium text-slate-300">
        Sem avaliação
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full border font-semibold',
        scoreBg(nota),
        scoreColor(nota),
        size === 'lg' ? 'h-16 w-16 font-display text-3xl' : 'px-2.5 py-0.5 text-xs',
      )}
    >
      {Math.round(nota)}
    </span>
  );
}
