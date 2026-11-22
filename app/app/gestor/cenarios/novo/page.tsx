'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ScenarioBuilderForm } from '@/components/gestor/ScenarioBuilderForm';
import { listarProdutos } from '@/lib/data-provider';
import type { Produto } from '@/lib/types';

export default function NovoCenarioPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listarProdutos().then((p) => {
      setProdutos(p);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Novo cenário"
        description="Defina a persona, as objeções e o objetivo da simulação."
      />
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <ScenarioBuilderForm produtos={produtos} />
      )}
    </div>
  );
}
