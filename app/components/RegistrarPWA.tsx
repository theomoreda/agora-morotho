'use client';

/**
 * Registra o service worker e oferece a instalação na tela inicial.
 *
 * FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).
 *
 * Decisão de produto: o convite para instalar **não** aparece para a pessoa
 * idosa. Quem instala é a família, uma vez, no celular dela. Por isso o botão
 * só surge com `?instalar=1` na URL — o link que a família recebe.
 *
 * Mostrar "Adicionar à tela inicial" para quem mexe pouco em celular é pedir
 * uma decisão que ela não tem contexto para tomar, e o risco é ela tocar em
 * algo e se perder. A tela dela tem UM botão, e esse botão é conversar.
 */

import { useEffect, useState } from 'react';

/** O evento de instalação não está no lib.dom padrão. */
type EventoInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function RegistrarPWA() {
  const [convite, setConvite] = useState<EventoInstalacao | null>(null);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Em desenvolvimento o service worker atrapalha o hot reload.
    if (
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker.register('/sw.js').catch((erro) => {
        // Falhar aqui não pode derrubar o app: sem service worker ele só
        // deixa de ser instalável, e a conversa continua funcionando.
        console.warn('[prosa] service worker não registrou:', erro);
      });
    }

    setMostrar(new URLSearchParams(window.location.search).has('instalar'));

    const aoPoderInstalar = (evento: Event) => {
      evento.preventDefault();
      setConvite(evento as EventoInstalacao);
    };

    window.addEventListener('beforeinstallprompt', aoPoderInstalar);
    return () =>
      window.removeEventListener('beforeinstallprompt', aoPoderInstalar);
  }, []);

  if (!mostrar || !convite) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 p-5 backdrop-blur">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
        <p className="text-lg font-medium text-foreground">
          Instalar o Prosa na tela inicial deste celular
        </p>
        <p className="text-sm text-muted-foreground">
          Depois disso, ela abre o Prosa tocando num ícone — sem navegador,
          sem endereço para digitar.
        </p>
        <button
          type="button"
          onClick={async () => {
            await convite.prompt();
            await convite.userChoice;
            setConvite(null);
          }}
          className="mt-1 min-h-14 w-full rounded-2xl bg-primary px-6 text-lg font-semibold text-black"
        >
          Instalar agora
        </button>
      </div>
    </div>
  );
}
