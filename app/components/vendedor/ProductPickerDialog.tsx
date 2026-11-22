'use client';

import { useEffect, useState } from 'react';
import { Phone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Material, Produto } from '@/lib/types';

type ProductPickerDialogProps = {
  produtos: Produto[];
  materiais: Material[];
  onConfirm: (produtoId: string) => void;
  onClose: () => void;
};

const labelCls = 'mb-1.5 block text-xs font-medium text-muted-foreground';
const fieldCls =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-primary';

/** Detalhes mostrados ao vendedor: o catálogo e a política vinculados ao produto. */
const TIPOS_DETALHE: Material['tipo'][] = ['catalogo', 'politica'];

export function ProductPickerDialog({
  produtos,
  materiais,
  onConfirm,
  onClose,
}: ProductPickerDialogProps) {
  const [produtoId, setProdutoId] = useState('');
  const produto = produtos.find((p) => p.id === produtoId) ?? null;
  const detalhes = produto
    ? materiais.filter(
        (m) => produto.materiais.includes(m.id) && TIPOS_DETALHE.includes(m.tipo),
      )
    : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="escolher-produto-titulo"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="escolher-produto-titulo"
              className="text-base font-semibold text-white"
            >
              Escolha o produto
            </h2>
            <p className="text-xs text-muted-foreground">
              A simulação só começa depois de escolher o produto que você vai vender.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-muted-foreground hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className={labelCls} htmlFor="produto-simulacao">
          Produto
        </label>
        <select
          id="produto-simulacao"
          className={fieldCls}
          value={produtoId}
          onChange={(e) => setProdutoId(e.target.value)}
          required
        >
          <option value="" disabled>
            Selecione um produto
          </option>
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>

        {produto && (
          <div className="mt-4 space-y-3 rounded-lg border border-border bg-background/60 p-4">
            <div>
              <h3 className="text-sm font-semibold text-white">{produto.nome}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {produto.descricao}
              </p>
            </div>
            {detalhes.map((m) => (
              <div key={m.id}>
                <h4 className="text-xs font-medium text-muted-foreground">
                  {m.titulo}
                </h4>
                <p className="mt-1 whitespace-pre-line text-sm text-white">
                  {m.conteudo}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="flex-1 gap-2"
            disabled={!produto}
            onClick={() => produto && onConfirm(produto.id)}
          >
            <Phone className="h-4 w-4" />
            Iniciar simulação
          </Button>
        </div>
      </Card>
    </div>
  );
}
