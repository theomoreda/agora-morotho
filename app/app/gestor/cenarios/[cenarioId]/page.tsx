'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DifficultyTag } from '@/components/shared/DifficultyTag';
import { RubricEditor } from '@/components/gestor/RubricEditor';
import { EmptyState } from '@/components/shared/EmptyState';
import { obterCenario, obterProduto } from '@/lib/data-provider';
import { PERFIL_CLIENTE_LABEL, type Cenario, type Produto } from '@/lib/types';

export default function CenarioDetalhePage({
  params,
}: {
  params: Promise<{ cenarioId: string }>;
}) {
  const { cenarioId } = use(params);
  const [cenario, setCenario] = useState<Cenario | null>(null);
  const [produto, setProduto] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    obterCenario(cenarioId).then(async (c) => {
      setCenario(c);
      if (c) setProduto(await obterProduto(c.produtoId));
      setLoading(false);
    });
  }, [cenarioId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  if (!cenario) {
    return (
      <EmptyState
        title="Cenário não encontrado"
        description="Ele pode ter sido removido."
        action={
          <Button asChild variant="outline">
            <Link href="/gestor/cenarios">Voltar aos cenários</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={cenario.titulo}
        description={produto ? `Produto: ${produto.nome}` : undefined}
        action={<DifficultyTag dificuldade={cenario.dificuldade} />}
      />

      <div className="space-y-6">
        <Card className="space-y-3">
          <Field
            label="Perfil do cliente"
            value={PERFIL_CLIENTE_LABEL[cenario.perfilCliente]}
          />
          <Field label="Objetivo" value={cenario.objetivo} />
          <Field label="Comportamento esperado" value={cenario.comportamento} />
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-white">Objeções</h3>
          <ul className="space-y-2">
            {cenario.objecoes.map((o, i) => (
              <li
                key={i}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground"
              >
                {o}
              </li>
            ))}
          </ul>
        </Card>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">
            Critérios de avaliação
          </h3>
          <RubricEditor criterios={cenario.criterios} readOnly />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-white">{value}</p>
    </div>
  );
}
