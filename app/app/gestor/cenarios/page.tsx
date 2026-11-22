'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { ScenarioCard } from '@/components/gestor/ScenarioCard';
import { listarCenarios } from '@/lib/data-provider';
import type { Cenario } from '@/lib/types';

export default function CenariosPage() {
  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listarCenarios().then((c) => {
      setCenarios(c);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <PageHeader
        title="Cenários"
        description="Simulações de conversa que os vendedores vão praticar."
        action={
          <Button asChild className="gap-2">
            <Link href="/gestor/cenarios/novo">
              <Plus className="h-4 w-4" />
              Novo cenário
            </Link>
          </Button>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : cenarios.length === 0 ? (
        <EmptyState
          title="Nenhum cenário ainda"
          description="Crie o primeiro cenário para começar a treinar a equipe."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {cenarios.map((c) => (
            <ScenarioCard key={c.id} cenario={c} />
          ))}
        </div>
      )}
    </div>
  );
}
