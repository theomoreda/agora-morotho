import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { DifficultyTag } from '@/components/shared/DifficultyTag';
import { PERFIL_CLIENTE_LABEL } from '@/lib/types';
import type { Cenario } from '@/lib/types';

export function ScenarioCard({ cenario }: { cenario: Cenario }) {
  return (
    <Link href={`/gestor/cenarios/${cenario.id}`}>
      <Card className="h-full transition-colors hover:border-primary">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h3 className="type-card-title">{cenario.titulo}</h3>
          <DifficultyTag dificuldade={cenario.dificuldade} />
        </div>
        <p className="text-sm text-muted-foreground">
          {PERFIL_CLIENTE_LABEL[cenario.perfilCliente]}
        </p>
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {cenario.objetivo}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          {cenario.objecoes.length} objeções · {cenario.criterios.length}{' '}
          critérios
        </p>
      </Card>
    </Link>
  );
}
