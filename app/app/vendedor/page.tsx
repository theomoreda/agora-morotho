'use client';

import { useEffect, useState } from 'react';
import { PageHeader, SectionHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { AssignmentCard } from '@/components/vendedor/AssignmentCard';
import {
  listarAtribuicoesDoVendedor,
  listarCenarios,
  listarMateriais,
  listarProdutos,
  obterHabilitacao,
} from '@/lib/data-provider';
import { VENDEDOR_ATUAL_ID } from '@/lib/sessao-demo';
import type { Atribuicao, Cenario, Material, Produto } from '@/lib/types';

export default function VendedorHome() {
  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([]);
  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [cenariosHabilitados, setCenariosHabilitados] = useState<string[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listarAtribuicoesDoVendedor(VENDEDOR_ATUAL_ID),
      listarCenarios(),
      listarProdutos(),
      listarMateriais(),
      obterHabilitacao(VENDEDOR_ATUAL_ID),
    ]).then(([at, c, p, m, h]) => {
      setAtribuicoes(at);
      setCenarios(c);
      setCenariosHabilitados(h.cenarioIds);
      setProdutos(p.filter((prod) => h.produtoIds.includes(prod.id)));
      setMateriais(m);
      setLoading(false);
    });
  }, []);

  const pendentes =
    produtos.length === 0
      ? []
      : atribuicoes.filter(
          (a) => a.status !== 'concluida' && cenariosHabilitados.includes(a.cenarioId),
        );
  const concluidas = atribuicoes.filter((a) => a.status === 'concluida');

  const cenarioDe = (id: string) => cenarios.find((c) => c.id === id);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Minhas simulações"
        description="Pratique conversas por voz com clientes virtuais."
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="page-sections">
          <section>
            <SectionHeader title="A fazer" />
            {pendentes.length === 0 ? (
              <EmptyState
                title="Tudo em dia!"
                description={
                  produtos.length === 0
                    ? 'Nenhum produto habilitado pelo gestor.'
                    : 'Nenhuma simulação pendente.'
                }
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {pendentes.map((at) => {
                  const cenario = cenarioDe(at.cenarioId);
                  if (!cenario) return null;
                  return (
                    <AssignmentCard
                      key={at.id}
                      atribuicao={at}
                      cenario={cenario}
                      produtos={produtos}
                      materiais={materiais}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {concluidas.length > 0 && (
            <section>
              <SectionHeader title="Concluídas" />
              <div className="grid gap-5 sm:grid-cols-2">
                {concluidas.map((at) => {
                  const cenario = cenarioDe(at.cenarioId);
                  if (!cenario) return null;
                  return (
                    <AssignmentCard
                      key={at.id}
                      atribuicao={at}
                      cenario={cenario}
                      produtos={produtos}
                      materiais={materiais}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
