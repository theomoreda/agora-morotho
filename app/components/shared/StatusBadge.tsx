import { cn } from '@/lib/utils';
import { STATUS_ATRIBUICAO_LABEL } from '@/lib/types';
import type { StatusAtribuicao } from '@/lib/types';

const CLASSES: Record<StatusAtribuicao, string> = {
  pendente: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  em_andamento: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  concluida: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  atrasada: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

export function StatusBadge({ status }: { status: StatusAtribuicao }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        CLASSES[status],
      )}
    >
      {STATUS_ATRIBUICAO_LABEL[status]}
    </span>
  );
}
