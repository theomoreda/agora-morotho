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
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="type-section-title">Desempenho da equipe</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Média geral
          <ScoreBadge nota={mediaEquipe} />
        </div>
      </div>
      <Card className="space-y-1 p-3">
        {vendedores.map((v) => (
          <Link
            key={v.id}
            href={`/gestor/vendedores/${v.id}`}
            className="flex items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-card"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{v.nome}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{v.email}</p>
            </div>
            <ScoreBadge nota={v.mediaGeral} />
          </Link>
        ))}
      </Card>
    </section>
  );
}
