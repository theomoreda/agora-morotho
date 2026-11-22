'use client';

import { use, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { obterCenario } from '@/lib/data-provider';
import type { Cenario } from '@/lib/types';

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
  const router = useRouter();
  const [cenario, setCenario] = useState<Cenario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    obterCenario(cenarioId).then((c) => {
      setCenario(c);
      setLoading(false);
    });
  }, [cenarioId]);

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
      <VoiceSimulation
        cenario={cenario}
        onFinish={() => router.push('/vendedor')}
      />
    </div>
  );
}
