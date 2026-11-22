'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DIFICULDADE_LABEL,
  PERFIL_CLIENTE_LABEL,
  type Cenario,
  type Dificuldade,
  type PerfilCliente,
  type Produto,
} from '@/lib/types';

type ScenarioBuilderFormProps = {
  produtos: Produto[];
  cenario?: Cenario;
  /** Mock: apenas devolve os dados montados; a persistência virá do back-end. */
  onSubmit?: (dados: Partial<Cenario>) => void;
};

const labelCls = 'mb-1.5 block text-xs font-medium text-muted-foreground';
const fieldCls =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary';

export function ScenarioBuilderForm({
  produtos,
  cenario,
  onSubmit,
}: ScenarioBuilderFormProps) {
  const [titulo, setTitulo] = useState(cenario?.titulo ?? '');
  const [produtoId, setProdutoId] = useState(
    cenario?.produtoId ?? produtos[0]?.id ?? '',
  );
  const [perfilCliente, setPerfilCliente] = useState<PerfilCliente>(
    cenario?.perfilCliente ?? 'interessado_desconfiado',
  );
  const [dificuldade, setDificuldade] = useState<Dificuldade>(
    cenario?.dificuldade ?? 'medio',
  );
  const [objetivo, setObjetivo] = useState(cenario?.objetivo ?? '');
  const [comportamento, setComportamento] = useState(
    cenario?.comportamento ?? '',
  );
  const [objecoes, setObjecoes] = useState<string[]>(cenario?.objecoes ?? ['']);
  const [salvo, setSalvo] = useState(false);

  const updateObjecao = (i: number, value: string) => {
    setObjecoes((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  };
  const addObjecao = () => setObjecoes((prev) => [...prev, '']);
  const removeObjecao = (i: number) =>
    setObjecoes((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dados: Partial<Cenario> = {
      titulo,
      produtoId,
      perfilCliente,
      dificuldade,
      objetivo,
      comportamento,
      objecoes: objecoes.filter((o) => o.trim() !== ''),
    };
    onSubmit?.(dados);
    setSalvo(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="space-y-5">
        <div>
          <label className={labelCls} htmlFor="titulo">
            Título do cenário
          </label>
          <input
            id="titulo"
            className={fieldCls}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Cliente que acha o produto caro"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="produto">
              Produto
            </label>
            <select
              id="produto"
              className={fieldCls}
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
            >
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls} htmlFor="dificuldade">
              Dificuldade
            </label>
            <select
              id="dificuldade"
              className={fieldCls}
              value={dificuldade}
              onChange={(e) => setDificuldade(e.target.value as Dificuldade)}
            >
              {(Object.keys(DIFICULDADE_LABEL) as Dificuldade[]).map((d) => (
                <option key={d} value={d}>
                  {DIFICULDADE_LABEL[d]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="perfil">
            Perfil do cliente
          </label>
          <select
            id="perfil"
            className={fieldCls}
            value={perfilCliente}
            onChange={(e) => setPerfilCliente(e.target.value as PerfilCliente)}
          >
            {(Object.keys(PERFIL_CLIENTE_LABEL) as PerfilCliente[]).map((p) => (
              <option key={p} value={p}>
                {PERFIL_CLIENTE_LABEL[p]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="objetivo">
            Objetivo da conversa
          </label>
          <textarea
            id="objetivo"
            className={fieldCls}
            rows={2}
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            placeholder="O que o vendedor precisa alcançar nesta conversa."
            required
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="comportamento">
            Comportamento esperado do cliente
          </label>
          <textarea
            id="comportamento"
            className={fieldCls}
            rows={2}
            value={comportamento}
            onChange={(e) => setComportamento(e.target.value)}
            placeholder="Como o cliente virtual deve reagir."
          />
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="type-card-title">Objeções</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={addObjecao}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </Button>
        </div>
        {objecoes.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className={fieldCls}
              value={o}
              onChange={(e) => updateObjecao(i, e.target.value)}
              placeholder="Ex.: Está acima do meu orçamento."
            />
            {objecoes.length > 1 && (
              <button
                type="button"
                onClick={() => removeObjecao(i)}
                className="text-muted-foreground hover:text-rose-400"
                aria-label="Remover objeção"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit">Salvar cenário</Button>
        {salvo && (
          <span className="text-xs text-success">
            Cenário montado (demo — sem persistência).
          </span>
        )}
      </div>
    </form>
  );
}
