'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { FeedbackReport } from '@/components/vendedor/FeedbackReport';
import {
  obterAvaliacao,
  obterCenario,
  obterVendedor,
} from '@/lib/data-provider';
import type { Avaliacao, Cenario, Vendedor } from '@/lib/types';

export default function AvaliacaoDetalhePage({
  params,
}: {
  params: Promise<{ avaliacaoId: string }>;
}) {
  const { avaliacaoId } = use(params);
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
  const [cenario, setCenario] = useState<Cenario | null>(null);
  const [vendedor, setVendedor] = useState<Vendedor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    obterAvaliacao(avaliacaoId).then(async (a) => {
      setAvaliacao(a);
      if (a) {
        const [c, v] = await Promise.all([
          obterCenario(a.cenarioId),
          obterVendedor(a.vendedorId),
        ]);
        setCenario(c);
        setVendedor(v);
      }
      setLoading(false);
    });
  }, [avaliacaoId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  if (!avaliacao) {
    return (
      <EmptyState
        title="Avaliação não encontrada"
        action={
          <Button asChild variant="outline">
            <Link href="/gestor">Voltar ao dashboard</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Resultado da avaliação"
        description={vendedor ? `Vendedor: ${vendedor.nome}` : undefined}
      />
      <FeedbackReport
        avaliacao={avaliacao}
        cenarioTitulo={cenario?.titulo ?? 'Cenário'}
      />
    </div>
  );
}
