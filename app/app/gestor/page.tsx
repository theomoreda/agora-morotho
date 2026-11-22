'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { TeamOverviewCard } from '@/components/gestor/TeamOverviewCard';
import {
  listarAtribuicoes,
  listarAvaliacoes,
  listarCenarios,
  listarVendedores,
} from '@/lib/data-provider';
import type { Atribuicao, Avaliacao, Cenario, Vendedor } from '@/lib/types';

export default function GestorDashboard() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([]);
  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listarVendedores(),
      listarAvaliacoes(),
      listarAtribuicoes(),
      listarCenarios(),
    ]).then(([v, av, at, cn]) => {
      setVendedores(v);
      setAvaliacoes(av);
      setAtribuicoes(at);
      setCenarios(cn);
      setLoading(false);
    });
  }, []);

  const cenarioNome = (id: string) =>
    cenarios.find((c) => c.id === id)?.titulo ?? id;
  const vendedorNome = (id: string) =>
    vendedores.find((v) => v.id === id)?.nome ?? id;

  const concluidas = atribuicoes.filter((a) => a.status === 'concluida').length;
  const pendentes = atribuicoes.filter(
    (a) => a.status === 'pendente' || a.status === 'em_andamento',
  ).length;
  const mediaEquipe = (() => {
    const notas = vendedores
      .map((v) => v.mediaGeral)
      .filter((n): n is number => n !== null);
    if (notas.length === 0) return null;
    return notas.reduce((s, n) => s + n, 0) / notas.length;
  })();

  return (
    <div>
      <PageHeader
        title="Dashboard da equipe"
        description="Visão geral do desempenho e das avaliações em vendas."
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Vendedores" value={String(vendedores.length)} />
            <StatCard
              label="Simulações concluídas"
              value={String(concluidas)}
            />
            <StatCard label="Pendentes" value={String(pendentes)} />
          </div>

          <TeamOverviewCard
            vendedores={vendedores}
            mediaEquipe={mediaEquipe}
          />

          <Card>
            <h3 className="mb-4 text-sm font-semibold text-white">
              Avaliações recentes
            </h3>
            <div className="divide-y divide-border">
              {avaliacoes.map((a) => (
                <Link
                  key={a.id}
                  href={`/gestor/avaliacoes/${a.id}`}
                  className="flex items-center justify-between gap-4 py-3 transition-colors hover:text-white"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {vendedorNome(a.vendedorId)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {cenarioNome(a.cenarioId)} ·{' '}
                      {new Date(a.realizadaEm).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <ScoreBadge nota={a.notaFinal} />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </Card>
  );
}
