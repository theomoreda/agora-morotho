'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Phone, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DifficultyTag } from '@/components/shared/DifficultyTag';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ProductPickerDialog } from '@/components/vendedor/ProductPickerDialog';
import { PERFIL_CLIENTE_LABEL } from '@/lib/types';
import type { Atribuicao, Cenario, Material, Produto } from '@/lib/types';

type AssignmentCardProps = {
  atribuicao: Atribuicao;
  cenario: Cenario;
  produtos: Produto[];
  materiais: Material[];
};

export function AssignmentCard({
  atribuicao,
  cenario,
  produtos,
  materiais,
}: AssignmentCardProps) {
  const router = useRouter();
  const [escolhendoProduto, setEscolhendoProduto] = useState(false);
  const concluida = atribuicao.status === 'concluida';

  const iniciar = (produtoId: string) => {
    const query = new URLSearchParams({
      atribuicao: atribuicao.id,
      produto: produtoId,
    });
    router.push(`/vendedor/simulacao/${cenario.id}?${query}`);
  };

  return (
    <Card className="flex h-full flex-col">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="type-card-title">{cenario.titulo}</h3>
        <DifficultyTag dificuldade={cenario.dificuldade} />
      </div>
      <p className="text-sm text-muted-foreground">
        {PERFIL_CLIENTE_LABEL[cenario.perfilCliente]}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <StatusBadge status={atribuicao.status} />
        <span className="text-xs text-muted-foreground">
          Prazo: {new Date(atribuicao.prazo).toLocaleDateString('pt-BR')}
        </span>
      </div>

      <div className="mt-6 flex-1" />

      {concluida && atribuicao.avaliacaoId ? (
        <Button asChild variant="outline" className="w-full gap-2">
          <Link href={`/vendedor/resultado/${atribuicao.avaliacaoId}`}>
            <FileText className="h-4 w-4" />
            Ver resultado
          </Link>
        </Button>
      ) : (
        <Button
          className="w-full gap-2"
          onClick={() => setEscolhendoProduto(true)}
        >
          <Phone className="h-4 w-4" />
          Iniciar simulação
        </Button>
      )}

      {escolhendoProduto && (
        <ProductPickerDialog
          produtos={produtos}
          materiais={materiais}
          onConfirm={iniciar}
          onClose={() => setEscolhendoProduto(false)}
        />
      )}
    </Card>
  );
}
