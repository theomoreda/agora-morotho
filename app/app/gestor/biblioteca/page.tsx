'use client';

import { useEffect, useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KnowledgeUploader } from '@/components/gestor/KnowledgeUploader';
import { listarMateriais, listarProdutos } from '@/lib/data-provider';
import type { Material, Produto, TipoMaterial } from '@/lib/types';

const TIPO_LABEL: Record<TipoMaterial, string> = {
  catalogo: 'Catálogo',
  apresentacao: 'Apresentação',
  manual: 'Manual',
  politica: 'Política',
  processo: 'Processo',
};

export default function BibliotecaPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listarProdutos(), listarMateriais()]).then(([p, m]) => {
      setProdutos(p);
      setMateriais(m);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <PageHeader
        title="Biblioteca de conhecimento"
        description="Produtos, materiais e políticas que servem de fonte de verdade para o cliente virtual."
        action={
          <Button className="gap-2" disabled>
            <Plus className="h-4 w-4" />
            Novo material
          </Button>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-6">
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
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-white">
                        {m.titulo}
                      </h3>
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                        {TIPO_LABEL[m.tipo]}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {m.conteudo}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <KnowledgeUploader />
        </div>
      )}
    </div>
  );
}
