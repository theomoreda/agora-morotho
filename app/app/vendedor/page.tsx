'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { AssignmentCard } from '@/components/vendedor/AssignmentCard';
import {
  listarAtribuicoesDoVendedor,
  listarCenarios,
  listarMateriais,
  listarProdutos,
} from '@/lib/data-provider';
import { VENDEDOR_ATUAL_ID } from '@/lib/sessao-demo';
import type { Atribuicao, Cenario, Material, Produto } from '@/lib/types';

export default function VendedorHome() {
  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([]);
  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listarAtribuicoesDoVendedor(VENDEDOR_ATUAL_ID),
      listarCenarios(),
      listarProdutos(),
      listarMateriais(),
    ]).then(([at, c, p, m]) => {
      setAtribuicoes(at);
      setCenarios(c);
      setProdutos(p);
      setMateriais(m);
      setLoading(false);
    });
  }, []);

  const pendentes = atribuicoes.filter((a) => a.status !== 'concluida');
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
        <div className="space-y-8">
          <section>
            <h3 className="mb-3 text-sm font-semibold text-white">A fazer</h3>
            {pendentes.length === 0 ? (
              <EmptyState title="Tudo em dia!" description="Nenhuma simulação pendente." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
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
              <h3 className="mb-3 text-sm font-semibold text-white">
                Concluídas
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
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
