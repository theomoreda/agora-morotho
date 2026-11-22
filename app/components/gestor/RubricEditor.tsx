'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Criterio } from '@/lib/types';

type RubricEditorProps = {
  criterios: Criterio[];
  readOnly?: boolean;
  onSalvar?: (criterios: Criterio[]) => Promise<unknown>;
};

const inputClass =
  'w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-white outline-none focus:border-primary';

/**
 * Lista de critérios com pesos. No modo editável, permite renomear, descrever,
 * adicionar e remover critérios, além de ajustar os pesos (a soma precisa
 * fechar em 100 para salvar).
 */
export function RubricEditor({ criterios, readOnly, onSalvar }: RubricEditorProps) {
  const [itens, setItens] = useState<Criterio[]>(() => criterios.map((c) => ({ ...c })));
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const soma = useMemo(
    () => itens.reduce((s, c) => s + (Number(c.peso) || 0), 0),
    [itens],
  );
  const nomesValidos = itens.every((c) => c.nome.trim() !== '');
  const podeSalvar = itens.length > 0 && soma === 100 && nomesValidos && !salvando;

  function atualizar(id: string, campo: keyof Omit<Criterio, 'id'>, valor: string | number) {
    setSalvo(false);
    setItens((prev) => prev.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)));
  }

  function adicionar() {
    setSalvo(false);
    setItens((prev) => [
      ...prev,
      { id: `crit-${crypto.randomUUID()}`, nome: '', descricao: '', peso: 0 },
    ]);
  }

  function remover(id: string) {
    setSalvo(false);
    setItens((prev) => prev.filter((c) => c.id !== id));
  }

  async function salvar() {
    if (!onSalvar) return;
    setSalvando(true);
    const limpos = itens.map((c) => ({
      ...c,
      nome: c.nome.trim(),
      descricao: c.descricao.trim(),
    }));
    await onSalvar(limpos);
    setItens(limpos);
    setSalvando(false);
    setSalvo(true);
  }

  if (readOnly) {
    return (
      <Card className="space-y-3">
        {criterios.map((c) => (
          <div
            key={c.id}
            className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{c.nome}</p>
              <p className="text-xs text-muted-foreground">{c.descricao}</p>
            </div>
            <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
              {c.peso}%
            </span>
          </div>
        ))}
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      {itens.map((c) => (
        <div
          key={c.id}
          className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <input
              value={c.nome}
              onChange={(e) => atualizar(c.id, 'nome', e.target.value)}
              placeholder="Nome do critério"
              className={cn(inputClass, 'font-medium', !c.nome.trim() && 'border-rose-400/60')}
            />
            <textarea
              value={c.descricao}
              onChange={(e) => atualizar(c.id, 'descricao', e.target.value)}
              placeholder="O que é avaliado neste critério"
              rows={2}
              className={cn(inputClass, 'resize-y text-xs text-muted-foreground')}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1 pt-0.5">
            <input
              type="number"
              min={0}
              max={100}
              value={c.peso}
              onChange={(e) => atualizar(c.id, 'peso', Number(e.target.value))}
              className={cn(inputClass, 'w-16 text-right')}
            />
            <span className="text-xs text-muted-foreground">%</span>
            <button
              type="button"
              onClick={() => remover(c.id)}
              aria-label={`Remover ${c.nome || 'critério'}`}
              className="ml-1 rounded-md p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={adicionar}>
        <Plus /> Adicionar critério
      </Button>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">Soma dos pesos</span>
        <span
          className={cn(
            'text-sm font-semibold',
            soma === 100 ? 'text-emerald-400' : 'text-rose-400',
          )}
        >
          {soma}%
        </span>
      </div>

      {onSalvar && (
        <div className="flex items-center justify-end gap-3 pt-1">
          {salvo && <span className="text-xs text-emerald-400">Rubrica salva</span>}
          {!nomesValidos && (
            <span className="text-xs text-rose-400">Todo critério precisa de nome</span>
          )}
          <Button type="button" size="sm" onClick={salvar} disabled={!podeSalvar}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      )}
    </Card>
  );
}
