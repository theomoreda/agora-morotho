'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { VendedorRow } from '@/components/gestor/VendedorRow';
import {
  listarAtribuicoes,
  listarCenarios,
  listarVendedores,
} from '@/lib/data-provider';
import type { Atribuicao, Cenario, Vendedor } from '@/lib/types';

export default function VendedoresPage() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([]);
  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listarVendedores(),
      listarAtribuicoes(),
      listarCenarios(),
    ]).then(([v, at, c]) => {
      setVendedores(v);
      setAtribuicoes(at);
      setCenarios(c);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <PageHeader
        title="Vendedores"
        description="Equipe, atribuições e evolução individual."
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <Card className="divide-y divide-border p-0">
          {vendedores.map((v) => (
            <VendedorRow
              key={v.id}
              vendedor={v}
              atribuicoes={atribuicoes.filter((a) => a.vendedorId === v.id)}
              cenarios={cenarios}
            />
          ))}
        </Card>
      )}
    </div>
  );
}
