import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import type { Atribuicao, Cenario, Vendedor } from '@/lib/types';

type VendedorRowProps = {
  vendedor: Vendedor;
  atribuicoes: Atribuicao[];
  cenarios: Cenario[];
};

export function VendedorRow({ vendedor, atribuicoes }: VendedorRowProps) {
  const concluidas = atribuicoes.filter((a) => a.status === 'concluida').length;
  const pendentes = atribuicoes.length - concluidas;

  return (
    <Link
      href={`/gestor/vendedores/${vendedor.id}`}
      className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-card"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {vendedor.nome}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {concluidas} concluídas · {pendentes} pendentes
        </p>
      </div>
      <div className="flex items-center gap-3">
        <ScoreBadge nota={vendedor.mediaGeral} />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
