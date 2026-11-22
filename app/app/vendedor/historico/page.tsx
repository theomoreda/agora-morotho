'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import {
  listarAvaliacoesDoVendedor,
  listarCenarios,
} from '@/lib/data-provider';
import { VENDEDOR_ATUAL_ID } from '@/lib/sessao-demo';
import type { Avaliacao, Cenario } from '@/lib/types';

export default function HistoricoPage() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listarAvaliacoesDoVendedor(VENDEDOR_ATUAL_ID),
      listarCenarios(),
    ]).then(([av, c]) => {
      setAvaliacoes(av);
      setCenarios(c);
      setLoading(false);
    });
  }, []);

  const cenarioNome = (id: string) =>
    cenarios.find((c) => c.id === id)?.titulo ?? id;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Histórico"
        description="Todas as suas avaliações concluídas."
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : avaliacoes.length === 0 ? (
        <EmptyState
          title="Nenhuma avaliação ainda"
          description="Conclua uma simulação para ver seu histórico aqui."
        />
      ) : (
        <Card className="divide-y divide-border p-0">
          {avaliacoes.map((a) => (
            <Link
              key={a.id}
              href={`/vendedor/resultado/${a.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-card"
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
    </div>
  );
}
