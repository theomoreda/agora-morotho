'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { FeedbackReport } from '@/components/vendedor/FeedbackReport';
import { obterAvaliacao, obterCenario } from '@/lib/data-provider';
import type { Avaliacao, Cenario } from '@/lib/types';

export default function ResultadoPage({
  params,
}: {
  params: Promise<{ avaliacaoId: string }>;
}) {
  const { avaliacaoId } = use(params);
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
  const [cenario, setCenario] = useState<Cenario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    obterAvaliacao(avaliacaoId).then(async (a) => {
      setAvaliacao(a);
      if (a) setCenario(await obterCenario(a.cenarioId));
      setLoading(false);
    });
  }, [avaliacaoId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  if (!avaliacao) {
    return (
      <EmptyState
        title="Resultado não encontrado"
        action={
          <Button asChild variant="outline">
            <Link href="/vendedor">Voltar</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Seu resultado"
        description="Veja sua nota e o que praticar em seguida."
      />
      <FeedbackReport
        avaliacao={avaliacao}
        cenarioTitulo={cenario?.titulo ?? 'Cenário'}
      />
    </div>
  );
}
