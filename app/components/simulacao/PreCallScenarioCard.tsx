'use client';

import { Loader2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DifficultyTag } from '@/components/shared/DifficultyTag';
import { PERFIL_CLIENTE_LABEL } from '@/lib/types';
import type { Cenario, Produto } from '@/lib/types';

type PreCallScenarioCardProps = {
  cenario: Cenario;
  produto: Produto;
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
  produto,
  isLoading,
  error,
  onStartConversation,
}: PreCallScenarioCardProps) {
  return (
    <div
      className="mx-auto flex w-[min(92vw,30rem)] flex-col rounded-[20px] border border-border bg-card px-8 py-8 text-left shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="type-label">Simulação por voz</span>
        <DifficultyTag dificuldade={cenario.dificuldade} />
      </div>

      <h1 className="font-display text-3xl font-semibold leading-tight">
        {cenario.titulo}
      </h1>

      <dl className="mt-8 space-y-5 text-sm">
        <div>
          <dt className="type-label">Produto</dt>
          <dd className="mt-1 leading-relaxed text-foreground">{produto.nome}</dd>
        </div>
        <div>
          <dt className="type-label">Perfil do cliente</dt>
          <dd className="mt-1 leading-relaxed text-foreground">
            {PERFIL_CLIENTE_LABEL[cenario.perfilCliente]}
          </dd>
        </div>
        <div>
          <dt className="type-label">Seu objetivo</dt>
          <dd className="mt-1 leading-relaxed text-foreground">{cenario.objetivo}</dd>
        </div>
      </dl>

      <p className="mt-8 text-xs leading-5 text-muted-foreground">
        Use fone de ouvido para evitar eco. O cliente virtual reage ao que você
        diz — conduza a conversa como em uma ligação real.
      </p>

      <Button
        onClick={onStartConversation}
        disabled={isLoading}
        className="mt-6 h-11 w-full gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:hover:bg-primary"
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
