'use client';

import { useEffect, useState } from 'react';
import { FileText, Paperclip, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KnowledgeUploader, TIPO_LABEL } from '@/components/gestor/KnowledgeUploader';
import { ProdutoForm } from '@/components/gestor/ProdutoForm';
import { excluirMaterial, listarMateriais, listarProdutos } from '@/lib/data-provider';
import type { Material, Produto } from '@/lib/types';

type Formulario = 'material' | 'produto' | null;

export default function BibliotecaPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [formulario, setFormulario] = useState<Formulario>(null);

  function recarregar() {
    return Promise.all([listarProdutos(), listarMateriais()]).then(([p, m]) => {
      setProdutos(p);
      setMateriais(m);
      setLoading(false);
    });
  }

  useEffect(() => {
    void recarregar();
  }, []);

  async function aoSalvar() {
    await recarregar();
    setFormulario(null);
  }

  async function remover(material: Material) {
    if (!window.confirm(`Remover "${material.titulo}" da biblioteca?`)) return;
    await excluirMaterial(material.id);
    await recarregar();
  }

  return (
    <div>
      <PageHeader
        title="Biblioteca de conhecimento"
        description="Produtos, materiais e políticas que servem de fonte de verdade para o cliente virtual."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setFormulario('produto')}
              disabled={loading}
            >
              <Plus className="h-4 w-4" />
              Novo produto
            </Button>
            <Button
              className="gap-2"
              onClick={() => setFormulario('material')}
              disabled={loading}
            >
              <Plus className="h-4 w-4" />
              Novo material
            </Button>
          </div>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-6">
          {formulario === 'material' && (
            <KnowledgeUploader
              produtos={produtos}
              onSalvo={aoSalvar}
              onCancelar={() => setFormulario(null)}
            />
          )}
          {formulario === 'produto' && (
            <ProdutoForm
              materiais={materiais}
              onSalvo={aoSalvar}
              onCancelar={() => setFormulario(null)}
            />
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold text-white">Produtos</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {produtos.map((p) => (
                <Card key={p.id}>
                  <h3 className="text-sm font-semibold text-white">{p.nome}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.descricao}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {p.materiais.length} materiais vinculados
                  </p>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-white">Materiais</h2>
            <div className="space-y-3">
              {materiais.map((m) => (
                <Card key={m.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium text-white">
                        {m.titulo}
                      </h3>
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                        {TIPO_LABEL[m.tipo]}
                      </span>
                      {m.arquivo && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Paperclip className="h-3 w-3" />
                          {m.arquivo}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {m.conteudo}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remover(m)}
                    aria-label={`Remover ${m.titulo}`}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </Card>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
