'use client';

import { Suspense, use, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { obterCenario, registrarAvaliacao } from '@/lib/data-provider';
import { avaliacaoDoVeredito } from '@/lib/avaliacao-from-veredito';
import { VENDEDOR_ATUAL_ID } from '@/lib/sessao-demo';
import type { Cenario, Veredito } from '@/lib/types';

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
  const [cenario, setCenario] = useState<Cenario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    obterCenario(cenarioId).then((c) => {
      setCenario(c);
      setLoading(false);
    });
  }, [cenarioId]);

  // Fecha o loop: transforma o veredito em avaliação, persiste (marcando a
  // atribuição como concluída) e leva para a tela de resultado.
  const handleFinish = async (veredito: Veredito | null) => {
    if (!veredito) {
      router.push('/vendedor');
      return;
    }
    const avaliacao = avaliacaoDoVeredito({
      veredito,
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

  return (
    <div className="-m-6 md:-m-8">
      <VoiceSimulation cenario={cenario} onFinish={handleFinish} />
    </div>
  );
}
