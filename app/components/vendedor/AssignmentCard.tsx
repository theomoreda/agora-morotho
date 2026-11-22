import Link from 'next/link';
import { Phone, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DifficultyTag } from '@/components/shared/DifficultyTag';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PERFIL_CLIENTE_LABEL } from '@/lib/types';
import type { Atribuicao, Cenario } from '@/lib/types';

type AssignmentCardProps = {
  atribuicao: Atribuicao;
  cenario: Cenario;
};

export function AssignmentCard({ atribuicao, cenario }: AssignmentCardProps) {
  const concluida = atribuicao.status === 'concluida';

  return (
    <Card className="flex h-full flex-col">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">{cenario.titulo}</h3>
        <DifficultyTag dificuldade={cenario.dificuldade} />
      </div>
      <p className="text-xs text-muted-foreground">
        {PERFIL_CLIENTE_LABEL[cenario.perfilCliente]}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <StatusBadge status={atribuicao.status} />
        <span className="text-xs text-muted-foreground">
          Prazo: {new Date(atribuicao.prazo).toLocaleDateString('pt-BR')}
        </span>
      </div>

      <div className="mt-4 flex-1" />

      {concluida && atribuicao.avaliacaoId ? (
        <Button asChild variant="outline" className="w-full gap-2">
          <Link href={`/vendedor/resultado/${atribuicao.avaliacaoId}`}>
            <FileText className="h-4 w-4" />
            Ver resultado
          </Link>
        </Button>
      ) : (
        <Button asChild className="w-full gap-2">
          <Link
            href={`/vendedor/simulacao/${cenario.id}?atribuicao=${atribuicao.id}`}
          >
            <Phone className="h-4 w-4" />
            Iniciar simulação
          </Link>
        </Button>
      )}
    </Card>
  );
}
