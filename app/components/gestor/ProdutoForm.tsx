'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { inputClass } from '@/components/gestor/KnowledgeUploader';
import { cn } from '@/lib/utils';
import { adicionarProduto } from '@/lib/data-provider';
import type { Material, Produto } from '@/lib/types';

type ProdutoFormProps = {
  materiais: Material[];
  onSalvo: (produto: Produto) => void;
  onCancelar: () => void;
};

export function ProdutoForm({ materiais, onSalvo, onCancelar }: ProdutoFormProps) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [materialIds, setMaterialIds] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function alternarMaterial(id: string) {
    setMaterialIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const produto = await adicionarProduto({
        nome: nome.trim(),
        descricao: descricao.trim(),
        materialIds,
      });
      onSalvo(produto);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar');
      setSalvando(false);
    }
  }

  return (
    <Card className="space-y-4">
      <h2 className="text-sm font-semibold text-white">Novo produto</h2>

      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome do produto"
        className={inputClass}
      />
      <textarea
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder="Descrição curta do produto"
        rows={3}
        className={cn(inputClass, 'resize-y')}
      />

      {materiais.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-muted-foreground">Materiais vinculados</p>
          <div className="space-y-1.5">
            {materiais.map((m) => (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"
              >
                <input
                  type="checkbox"
                  checked={materialIds.includes(m.id)}
                  onChange={() => alternarMaterial(m.id)}
                  className="accent-primary"
                />
                <span className={cn(materialIds.includes(m.id) && 'text-white')}>{m.titulo}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {erro && <span className="mr-auto text-xs text-rose-400">{erro}</span>}
        <Button type="button" variant="ghost" size="sm" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={salvar}
          disabled={nome.trim() === '' || salvando}
        >
          {salvando ? 'Salvando...' : 'Salvar produto'}
        </Button>
      </div>
    </Card>
  );
}
