'use client';

/**
 * Tela inicial do Prosa — um botão só.
 *
 * FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).
 * Substitui o QuickstartPreCallCard (que segue intacto no repositório).
 *
 * Decisões de acessibilidade, todas pensadas para quem tem 78 anos:
 *   - UM alvo de toque, enorme. Nada de menu, aba, login ou campo de texto.
 *   - Fonte grande e contraste alto; nada de cinza-claro sobre branco.
 *   - Texto curto e concreto: "Conversar com o Gabriel", não "Iniciar sessão".
 *   - O consentimento aparece ANTES de gravar qualquer coisa, em linguagem
 *     simples — exigência da LGPD (art. 11) e decisão ética do projeto.
 *   - `prefers-reduced-motion` respeitado: sem animação para quem pediu menos.
 *
 * Isto é a "embalagem" possível hoje. O destino é a pessoa receber uma
 * ligação no telefone dela, sem tela nenhuma — ver o README, seção Roadmap.
 */

import { Loader2, Phone } from 'lucide-react';

type TelaUmBotaoProps = {
  isLoading: boolean;
  error: string | null;
  onStartConversation: () => void;
};

export function TelaUmBotao({
  isLoading,
  error,
  onStartConversation,
}: TelaUmBotaoProps) {
  return (
    <div className="mx-auto flex w-[min(94vw,34rem)] flex-col items-center text-center">
      <p className="text-base font-semibold uppercase tracking-[0.2em] text-primary">
        Prosa
      </p>

      <h1 className="mt-3 text-[2.6rem] font-semibold leading-[1.15] text-white sm:text-[3rem]">
        Vamos conversar?
      </h1>

      <p className="mt-4 text-xl leading-relaxed text-zinc-300">
        O Gabriel está aqui para bater um papo com você.
      </p>

      <button
        type="button"
        onClick={onStartConversation}
        disabled={isLoading}
        aria-label={
          isLoading
            ? 'Chamando o Gabriel, aguarde'
            : 'Conversar com o Gabriel agora'
        }
        className="mt-12 flex min-h-[6.5rem] w-full items-center justify-center gap-4
                   rounded-3xl bg-primary px-8 text-[1.75rem] font-semibold text-black
                   shadow-[0_8px_28px_rgba(0,0,0,0.35)] transition
                   hover:bg-white focus-visible:outline focus-visible:outline-4
                   focus-visible:outline-offset-4 focus-visible:outline-white
                   active:scale-[0.99] disabled:opacity-70"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-9 w-9 animate-spin motion-reduce:animate-none" />
            Chamando…
          </>
        ) : (
          <>
            <Phone className="h-9 w-9" aria-hidden="true" />
            Conversar com o Gabriel
          </>
        )}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-6 text-lg font-medium leading-relaxed text-destructive"
        >
          Não conseguimos chamar o Gabriel agora. Tente de novo em um minutinho.
        </p>
      )}

      {/* Consentimento em linguagem simples, antes de qualquer gravação. */}
      <p className="mt-10 max-w-[30rem] text-base leading-relaxed text-zinc-400">
        Ao conversar, você concorda que o Gabriel acompanhe seu bem-estar e avise
        sua família se algo mudar.{' '}
        <strong className="text-zinc-200">
          A conversa não fica gravada
        </strong>{' '}
        e o Gabriel não faz diagnóstico de saúde.
      </p>
    </div>
  );
}
