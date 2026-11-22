import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import type { Vendedor } from '@/lib/types';

type TeamOverviewCardProps = {
  vendedores: Vendedor[];
  mediaEquipe: number | null;
};

export function TeamOverviewCard({
  vendedores,
  mediaEquipe,
}: TeamOverviewCardProps) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Desempenho da equipe</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Média geral
          <ScoreBadge nota={mediaEquipe} />
        </div>
      </div>
      <div className="space-y-2">
        {vendedores.map((v) => (
          <Link
            key={v.id}
            href={`/gestor/vendedores/${v.id}`}
            className="flex items-center justify-between gap-4 rounded-lg px-2 py-2 transition-colors hover:bg-card"
          >
            <div>
              <p className="text-sm font-medium text-white">{v.nome}</p>
              <p className="text-xs text-muted-foreground">{v.email}</p>
            </div>
            <ScoreBadge nota={v.mediaGeral} />
          </Link>
        ))}
      </div>
    </Card>
  );
}
