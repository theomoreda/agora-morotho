'use client';

import { Suspense, use, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  obterCenario,
  obterHabilitacao,
  obterProduto,
  registrarAvaliacao,
} from '@/lib/data-provider';
import { avaliacaoDaAnalise } from '@/lib/avaliacao-from-analise';
import { VENDEDOR_ATUAL_ID } from '@/lib/sessao-demo';
import type { AnaliseSessao, Cenario, Produto } from '@/lib/types';

// VoiceSimulation é browser-only (RTC/RTM da Agora).
const VoiceSimulation = dynamic(
  () => import('@/components/simulacao/VoiceSimulation'),
  { ssr: false },
);

export default function SimulacaoPage({
  params,
}: {
  params: Promise<{ cenarioId: string }>;
}) {
  const { cenarioId } = use(params);
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}
    >
      <SimulacaoInner cenarioId={cenarioId} />
    </Suspense>
  );
}

function SimulacaoInner({ cenarioId }: { cenarioId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const atribuicaoId = searchParams.get('atribuicao');
  const produtoId = searchParams.get('produto');
  const [cenario, setCenario] = useState<Cenario | null>(null);
  const [produto, setProduto] = useState<Produto | null>(null);
  const [habilitado, setHabilitado] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      obterCenario(cenarioId),
      produtoId ? obterProduto(produtoId) : Promise.resolve(null),
      obterHabilitacao(VENDEDOR_ATUAL_ID),
    ]).then(([c, p, h]) => {
      setCenario(c);
      setProduto(p);
      setHabilitado(
        h.cenarioIds.includes(cenarioId) && (!p || h.produtoIds.includes(p.id)),
      );
      setLoading(false);
    });
  }, [cenarioId, produtoId]);

  // Fecha o loop: transforma o desempenho em avaliação, persiste (marcando a
  // atribuição como concluída) e leva para a tela de resultado.
  const handleFinish = async (analise: AnaliseSessao | null) => {
    if (!analise) {
      router.push('/vendedor');
      return;
    }
    const avaliacao = avaliacaoDaAnalise({
      analise,
      cenarioId,
      vendedorId: VENDEDOR_ATUAL_ID,
      atribuicaoId,
    });
    await registrarAvaliacao(avaliacao, atribuicaoId);
    router.push(`/vendedor/resultado/${avaliacao.id}`);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  if (!cenario) {
    return (
      <EmptyState
        title="Cenário não encontrado"
        action={
          <Button variant="outline" onClick={() => router.push('/vendedor')}>
            Voltar
          </Button>
        }
      />
    );
  }

  if (!habilitado) {
    return (
      <EmptyState
        title="Simulação não habilitada"
        description="O gestor não liberou este cenário ou este produto para você."
        action={
          <Button variant="outline" onClick={() => router.push('/vendedor')}>
            Voltar
          </Button>
        }
      />
    );
  }

  if (!produto) {
    return (
      <EmptyState
        title="Escolha o produto antes de simular"
        description="Volte para Minhas simulações e clique em Iniciar simulação."
        action={
          <Button variant="outline" onClick={() => router.push('/vendedor')}>
            Voltar
          </Button>
        }
      />
    );
  }

  return (
    <div className="-m-6 md:-m-8">
      <VoiceSimulation
        cenario={cenario}
        produto={produto}
        onFinish={handleFinish}
      />
    </div>
  );
}
