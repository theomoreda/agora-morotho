/**
 * clinic-sync: hub → clinic events over Agora Signaling (RTM) channel `clinic-central`.
 * Transport-agnostic core (testable with a fake RTM); see ./connect.ts for the browser client.
 */
import type { RTMClient } from 'agora-rtm';
import { CLINIC_CHANNEL, parseClinicEvent, type ClinicEvent } from '@/lib/contracts';

export type RtmLike = Pick<RTMClient, 'publish' | 'subscribe' | 'addEventListener' | 'removeEventListener'>;

export interface EventMeta {
  publisher?: string;
  /** Receive time − RTM publish time, when the SDK provides publishTime */
  transitMs: number | null;
}

export type ClinicEventHandler = (event: ClinicEvent, meta: EventMeta) => void;

export interface ClinicSync {
  publish(event: ClinicEvent): Promise<void>;
  /** Resolves once subscribed; returns an unsubscribe function for this handler. */
  subscribe(handler: ClinicEventHandler, opts?: { onInvalid?: (error: string) => void }): Promise<() => void>;
}

export function createClinicSync(rtm: RtmLike, channel = CLINIC_CHANNEL): ClinicSync {
  let subscribed: Promise<unknown> | null = null;

  return {
    async publish(event) {
      const check = parseClinicEvent(event);
      if (!check.ok) throw new Error(`clinic-sync: refusing to publish ${check.error}`);
      await rtm.publish(channel, JSON.stringify(event));
    },

    async subscribe(handler, opts = {}) {
      const listener = (e: { channelName: string; message: string | Uint8Array; publisher?: string; publishTime?: number }) => {
        if (e.channelName !== channel) return;
        const text = typeof e.message === 'string' ? e.message : new TextDecoder().decode(e.message);
        const parsed = parseClinicEvent(text);
        if (!parsed.ok) {
          opts.onInvalid?.(parsed.error);
          return;
        }
        const transitMs = e.publishTime ? Math.max(0, Date.now() - e.publishTime) : null;
        handler(parsed.event, { publisher: e.publisher, transitMs });
      };
      rtm.addEventListener('message', listener as never);
      subscribed ??= rtm.subscribe(channel);
      await subscribed;
      return () => rtm.removeEventListener('message', listener as never);
    },
  };
}
