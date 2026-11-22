'use client';

/**
 * useVozativaBridge — liga um componente React ao sessionBridge.
 *
 * Mantém o `ProtocolConfig` e o `SessionState` em estado local, sincronizados
 * em tempo real entre /clinica e /paciente. Expõe publicadores já tipados.
 *
 * Padrão anti-hidratação: inicia com os valores-semente determinísticos e só
 * lê localStorage / assina o canal dentro de um useEffect (lado cliente).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { getSessionBridge } from '@/services/sessionBridge';
import {
  createDefaultProtocol,
  createInitialSessionState,
} from '@/lib/vozativa-data';
import type {
  ProtocolConfig,
  SessionEvent,
  SessionState,
} from '@/types/vozativa';

export function useVozativaBridge() {
  const [protocol, setProtocol] = useState<ProtocolConfig>(
    createDefaultProtocol,
  );
  const [sessionState, setSessionState] = useState<SessionState>(
    createInitialSessionState,
  );
  const [ready, setReady] = useState(false);

  // Evita eco: quando esta aba publica, ignora o evento que volta pra ela.
  const lastPublishedRef = useRef<string>('');

  useEffect(() => {
    const bridge = getSessionBridge();

    // Recupera estado persistido ao montar (aba aberta depois).
    const persistedProtocol = bridge.getPersistedProtocol();
    if (persistedProtocol) setProtocol(persistedProtocol);
    const persistedState = bridge.getPersistedState();
    if (persistedState) setSessionState(persistedState);
    setReady(true);

    const unsubscribe = bridge.subscribe((event: SessionEvent) => {
      switch (event.type) {
        case 'protocol/update':
          setProtocol(event.payload);
          break;
        case 'session/state':
          setSessionState(event.payload);
          break;
        case 'session/reset':
          setSessionState(createInitialSessionState());
          break;
        case 'bridge/request-sync':
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const publishProtocol = useCallback((next: ProtocolConfig) => {
    setProtocol(next);
    const stamp = JSON.stringify(next);
    lastPublishedRef.current = stamp;
    getSessionBridge().publish({ type: 'protocol/update', payload: next });
  }, []);

  const publishSessionState = useCallback((next: SessionState) => {
    setSessionState(next);
    getSessionBridge().publish({ type: 'session/state', payload: next });
  }, []);

  const resetSession = useCallback(() => {
    const fresh = createInitialSessionState();
    setSessionState(fresh);
    getSessionBridge().publish({ type: 'session/reset' });
  }, []);

  return {
    ready,
    protocol,
    sessionState,
    publishProtocol,
    publishSessionState,
    resetSession,
  };
}
