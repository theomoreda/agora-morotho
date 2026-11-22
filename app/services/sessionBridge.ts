/**
 * sessionBridge — barramento de eventos em tempo real entre /clinica e
 * /paciente.
 *
 * Transporte atual: BroadcastChannel (sincronização instantânea entre abas da
 * mesma origem) + localStorage (persistência do último protocolo/estado, para
 * que uma aba aberta depois recupere o estado corrente).
 *
 * Contrato de substituição (Etapa 2): a interface `SessionBridge` é agnóstica
 * de transporte. Para migrar para Agora Signaling (RTM) basta implementar uma
 * `RtmSessionBridge` que publique/assine `SessionEvent` num canal RTM e
 * reexportar `getSessionBridge` apontando para ela. Nenhum componente de UI
 * precisa mudar.
 */

import type {
  ProtocolConfig,
  SessionEvent,
  SessionState,
} from '@/types/vozativa';

const CHANNEL_NAME = 'vozativa-session';
const PROTOCOL_KEY = 'vozativa:protocol';
const STATE_KEY = 'vozativa:session-state';

export type SessionEventHandler = (event: SessionEvent) => void;
export type Unsubscribe = () => void;

export interface SessionBridge {
  /** Publica um evento para todas as abas/assinantes. */
  publish(event: SessionEvent): void;
  /** Assina eventos. Retorna função para cancelar a assinatura. */
  subscribe(handler: SessionEventHandler): Unsubscribe;
  /** Último protocolo persistido, se houver. */
  getPersistedProtocol(): ProtocolConfig | null;
  /** Último estado de sessão persistido, se houver. */
  getPersistedState(): SessionState | null;
  /** Encerra o transporte e libera recursos. */
  close(): void;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Implementação baseada em BroadcastChannel + localStorage.
 *
 * No-op seguro durante SSR: se `window` não existir, publish/subscribe não
 * fazem nada e os getters retornam null, evitando erros de hidratação.
 */
class BroadcastSessionBridge implements SessionBridge {
  private channel: BroadcastChannel | null = null;
  private handlers = new Set<SessionEventHandler>();
  private onMessage: ((e: MessageEvent<SessionEvent>) => void) | null = null;

  constructor() {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      return;
    }
    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.onMessage = (e: MessageEvent<SessionEvent>) => {
      for (const handler of this.handlers) handler(e.data);
    };
    this.channel.addEventListener('message', this.onMessage as EventListener);
  }

  publish(event: SessionEvent): void {
    // Persiste o que faz sentido recuperar depois.
    if (typeof window !== 'undefined') {
      try {
        if (event.type === 'protocol/update') {
          window.localStorage.setItem(PROTOCOL_KEY, JSON.stringify(event.payload));
        } else if (event.type === 'session/state') {
          window.localStorage.setItem(STATE_KEY, JSON.stringify(event.payload));
        } else if (event.type === 'session/reset') {
          window.localStorage.removeItem(STATE_KEY);
        }
      } catch {
        // Armazenamento indisponível (modo privado etc.) — segue só com o canal.
      }
    }
    this.channel?.postMessage(event);
  }

  subscribe(handler: SessionEventHandler): Unsubscribe {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  getPersistedProtocol(): ProtocolConfig | null {
    if (typeof window === 'undefined') return null;
    return safeParse<ProtocolConfig>(window.localStorage.getItem(PROTOCOL_KEY));
  }

  getPersistedState(): SessionState | null {
    if (typeof window === 'undefined') return null;
    return safeParse<SessionState>(window.localStorage.getItem(STATE_KEY));
  }

  close(): void {
    if (this.channel && this.onMessage) {
      this.channel.removeEventListener('message', this.onMessage as EventListener);
      this.channel.close();
    }
    this.channel = null;
    this.handlers.clear();
  }
}

let singleton: SessionBridge | null = null;

/**
 * Retorna o barramento compartilhado do processo (uma instância por aba).
 * Trocar o transporte na Etapa 2 significa apenas retornar outra
 * implementação aqui.
 */
export function getSessionBridge(): SessionBridge {
  if (!singleton) {
    singleton = new BroadcastSessionBridge();
  }
  return singleton;
}
