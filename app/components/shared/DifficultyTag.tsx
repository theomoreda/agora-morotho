import { cn } from '@/lib/utils';
import { DIFICULDADE_LABEL } from '@/lib/types';
import type { Dificuldade } from '@/lib/types';

const CLASSES: Record<Dificuldade, string> = {
  facil: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  medio: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  dificil: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

export function DifficultyTag({ dificuldade }: { dificuldade: Dificuldade }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        CLASSES[dificuldade],
      )}
    >
      {DIFICULDADE_LABEL[dificuldade]}
    </span>
  );
}
