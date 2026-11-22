'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { salvarHabilitacaoDoVendedor } from '@/lib/data-provider';
import type { Cenario, Habilitacao, Produto } from '@/lib/types';

type HabilitacoesCardProps = {
  habilitacao: Habilitacao;
  cenarios: Cenario[];
  produtos: Produto[];
  /** Cenários com atribuição para este vendedor; só eles aparecem na tela dele. */
  cenariosAtribuidos: string[];
};

function alternar(lista: string[], id: string): string[] {
  return lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];
}

export function HabilitacoesCard({
  habilitacao,
  cenarios,
  produtos,
  cenariosAtribuidos,
}: HabilitacoesCardProps) {
  const [cenarioIds, setCenarioIds] = useState(habilitacao.cenarioIds);
  const [produtoIds, setProdutoIds] = useState(habilitacao.produtoIds);
  const [estado, setEstado] = useState<'idle' | 'salvando' | 'salvo' | 'erro'>('idle');

  const salvar = async () => {
    setEstado('salvando');
    try {
      await salvarHabilitacaoDoVendedor({
        vendedorId: habilitacao.vendedorId,
        cenarioIds,
        produtoIds,
      });
      setEstado('salvo');
    } catch {
      setEstado('erro');
    }
  };

  const opcao = (id: string, marcado: boolean, onChange: () => void, texto: ReactNode) => (
    <label
      key={id}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground',
        marcado && 'border-primary text-foreground',
      )}
    >
      <input type="checkbox" checked={marcado} onChange={onChange} className="accent-primary" />
      {texto}
    </label>
  );

  return (
    <Card className="space-y-6">
      <div>
        <h3 className="type-label mb-3 font-sans">Simulações</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {cenarios.map((c) =>
            opcao(
              c.id,
              cenarioIds.includes(c.id),
              () => {
                setCenarioIds((atual) => alternar(atual, c.id));
                setEstado('idle');
              },
              <span className="min-w-0">
                <span className="block truncate">{c.titulo}</span>
                {!cenariosAtribuidos.includes(c.id) && (
                  <span className="block text-xs text-muted-foreground">Sem atribuição</span>
                )}
              </span>,
            ),
          )}
        </div>
      </div>

      <div>
        <h3 className="type-label mb-3 font-sans">Produtos</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {produtos.map((p) =>
            opcao(
              p.id,
              produtoIds.includes(p.id),
              () => {
                setProdutoIds((atual) => alternar(atual, p.id));
                setEstado('idle');
              },
              p.nome,
            ),
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {estado === 'salvo' && <span className="text-xs text-muted-foreground">Salvo</span>}
        {estado === 'erro' && <span className="text-xs text-red-400">Falha ao salvar</span>}
        <Button onClick={salvar} disabled={estado === 'salvando'}>
          {estado === 'salvando' ? 'Salvando...' : 'Salvar habilitações'}
        </Button>
      </div>
    </Card>
  );
}
