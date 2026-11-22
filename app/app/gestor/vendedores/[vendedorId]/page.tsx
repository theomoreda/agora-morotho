'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader, SectionHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { HabilitacoesCard } from '@/components/gestor/HabilitacoesCard';
import {
  listarAtribuicoesDoVendedor,
  listarAvaliacoesDoVendedor,
  listarCenarios,
  listarProdutos,
  obterHabilitacao,
  obterVendedor,
} from '@/lib/data-provider';
import type {
  Atribuicao,
  Avaliacao,
  Cenario,
  Habilitacao,
  Produto,
  Vendedor,
} from '@/lib/types';

export default function VendedorDetalhePage({
  params,
}: {
  params: Promise<{ vendedorId: string }>;
}) {
  const { vendedorId } = use(params);
  const [vendedor, setVendedor] = useState<Vendedor | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([]);
  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [habilitacao, setHabilitacao] = useState<Habilitacao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      obterVendedor(vendedorId),
      listarAvaliacoesDoVendedor(vendedorId),
      listarAtribuicoesDoVendedor(vendedorId),
      listarCenarios(),
      listarProdutos(),
      obterHabilitacao(vendedorId),
    ]).then(([v, av, at, c, p, h]) => {
      setVendedor(v);
      setAvaliacoes(av);
      setAtribuicoes(at);
      setCenarios(c);
      setProdutos(p);
      setHabilitacao(h);
      setLoading(false);
    });
  }, [vendedorId]);

  const cenarioNome = (id: string) =>
    cenarios.find((c) => c.id === id)?.titulo ?? id;

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  if (!vendedor) {
    return (
      <EmptyState
        title="Vendedor não encontrado"
        action={
          <Button asChild variant="outline">
            <Link href="/gestor/vendedores">Voltar</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={vendedor.nome}
        description={vendedor.email}
        action={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Média geral
            <ScoreBadge nota={vendedor.mediaGeral} />
          </div>
        }
      />

      <div className="page-sections">
        {habilitacao && (
          <section>
            <SectionHeader
              title="Simulações e produtos habilitados"
              description="Só o que estiver marcado aparece em Minhas simulações do vendedor."
            />
            <HabilitacoesCard
              habilitacao={habilitacao}
              cenarios={cenarios}
              produtos={produtos}
              cenariosAtribuidos={atribuicoes.map((at) => at.cenarioId)}
            />
          </section>
        )}

        <section>
          <SectionHeader title="Avaliações concluídas" />
          {avaliacoes.length === 0 ? (
            <EmptyState title="Nenhuma avaliação ainda" />
          ) : (
            <Card className="divide-y divide-border p-0">
              {avaliacoes.map((a) => (
                <Link
                  key={a.id}
                  href={`/gestor/avaliacoes/${a.id}`}
                  className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-card"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {cenarioNome(a.cenarioId)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.realizadaEm).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <ScoreBadge nota={a.notaFinal} />
                </Link>
              ))}
            </Card>
          )}
        </section>

        <section>
          <SectionHeader title="Atribuições" />
          <Card className="divide-y divide-border p-0">
            {atribuicoes.map((at) => (
              <div
                key={at.id}
                className="flex items-center justify-between gap-4 px-6 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {cenarioNome(at.cenarioId)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Prazo: {new Date(at.prazo).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <StatusBadge status={at.status} />
              </div>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}
