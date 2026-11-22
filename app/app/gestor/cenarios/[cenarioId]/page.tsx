'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader, SectionHeader } from '@/components/shared/PageHeader';
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

      <div className="page-sections">
        <Card className="space-y-5">
          <Field
            label="Perfil do cliente"
            value={PERFIL_CLIENTE_LABEL[cenario.perfilCliente]}
          />
          <Field label="Objetivo" value={cenario.objetivo} />
          <Field label="Comportamento esperado" value={cenario.comportamento} />
        </Card>

        <section>
          <SectionHeader title="Objeções" />
          <ul className="space-y-3">
            {cenario.objecoes.map((o, i) => (
              <li
                key={i}
                className="rounded-lg border border-highlight/30 border-l-2 border-l-highlight bg-background px-4 py-3 text-sm leading-relaxed text-muted-foreground"
              >
                {o}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionHeader title="Critérios de avaliação" />
          <RubricEditor criterios={cenario.criterios} readOnly />
        </section>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="type-label">{label}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground">{value}</p>
    </div>
  );
}
