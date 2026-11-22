'use client';

import { Loader2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DifficultyTag } from '@/components/shared/DifficultyTag';
import { PERFIL_CLIENTE_LABEL } from '@/lib/types';
import type { Cenario } from '@/lib/types';

type PreCallScenarioCardProps = {
  cenario: Cenario;
  isLoading: boolean;
  error: string | null;
  onStartConversation: () => void;
};

/**
 * Tela anterior à chamada: mostra o contexto do cenário (perfil, objetivo,
 * dificuldade) e o botão que inicia a conversa por voz.
 */
export function PreCallScenarioCard({
  cenario,
  isLoading,
  error,
  onStartConversation,
}: PreCallScenarioCardProps) {
  return (
    <div
      className="mx-auto flex w-[min(92vw,30rem)] flex-col rounded-[20px] border border-[#2b2b2b] px-8 py-8 text-left shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
      style={{
        backgroundImage:
          'linear-gradient(164.988deg, rgba(54,54,54,0.2) 1.0596%, rgba(0,0,0,0) 96.089%), linear-gradient(90deg, rgb(16,16,16) 0%, rgb(16,16,16) 100%)',
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Simulação por voz
        </span>
        <DifficultyTag dificuldade={cenario.dificuldade} />
      </div>

      <h1 className="text-[24px] font-medium leading-[1.2] text-white">
        {cenario.titulo}
      </h1>

      <dl className="mt-5 space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Perfil do cliente</dt>
          <dd className="text-white">
            {PERFIL_CLIENTE_LABEL[cenario.perfilCliente]}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Seu objetivo</dt>
          <dd className="text-white">{cenario.objetivo}</dd>
        </div>
      </dl>

      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        Use fone de ouvido para evitar eco. O cliente virtual reage ao que você
        diz — conduza a conversa como em uma ligação real.
      </p>

      <Button
        onClick={onStartConversation}
        disabled={isLoading}
        className="mt-6 h-11 w-full gap-2 rounded-lg border border-primary bg-primary text-sm font-medium text-black hover:border-white hover:bg-white hover:text-black disabled:hover:border-primary disabled:hover:bg-primary disabled:hover:text-black"
        aria-label={
          isLoading ? 'Iniciando simulação' : 'Iniciar simulação por voz'
        }
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Conectando...
          </>
        ) : (
          <>
            <Phone className="h-4 w-4" />
            Iniciar conversa
          </>
        )}
      </Button>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </div>
  );
}
