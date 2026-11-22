import { describe, expect, it, vi } from 'vitest';
import { CLINIC_CHANNEL, type ClinicEvent } from '@/lib/contracts';
import { mockEmergency, mockTelemetryRed } from '@/lib/mocks';
import { createClinicSync, type RtmLike } from './sync';

type Listener = (e: { channelName: string; message: string | Uint8Array; publishTime?: number }) => void;

/** In-memory RTM: publishes are delivered to every listener, like a shared channel. */
function fakeRtm() {
  const listeners = new Set<Listener>();
  const rtm = {
    published: [] as Array<[string, string]>,
    subscribed: [] as string[],
    publish: vi.fn(async (channel: string, message: string) => {
      rtm.published.push([channel, message]);
      listeners.forEach((l) => l({ channelName: channel, message, publishTime: Date.now() }));
      return {};
    }),
    subscribe: vi.fn(async (channel: string) => {
      rtm.subscribed.push(channel);
      return {};
    }),
    unsubscribe: vi.fn(async () => ({})),
    addEventListener: vi.fn((_: 'message', l: Listener) => listeners.add(l)),
    removeEventListener: vi.fn((_: 'message', l: Listener) => listeners.delete(l)),
    emit: (channelName: string, message: string) => listeners.forEach((l) => l({ channelName, message })),
  };
  return rtm;
}

const asRtm = (f: ReturnType<typeof fakeRtm>) => f as unknown as RtmLike;

describe('createClinicSync', () => {
  it('publishes events as JSON on the clinic channel', async () => {
    const rtm = fakeRtm();
    await createClinicSync(asRtm(rtm)).publish(mockEmergency);
    expect(rtm.published).toEqual([[CLINIC_CHANNEL, JSON.stringify(mockEmergency)]]);
  });

  it('refuses to publish an invalid event', async () => {
    const rtm = fakeRtm();
    const bad = { ...mockEmergency, trigger_source: 'NOPE' } as unknown as ClinicEvent;
    await expect(createClinicSync(asRtm(rtm)).publish(bad)).rejects.toThrow(/invalid/);
    expect(rtm.published).toEqual([]);
  });

  it('subscribes once and delivers parsed events with transit latency', async () => {
    const rtm = fakeRtm();
    const sync = createClinicSync(asRtm(rtm));
    const received: Array<[ClinicEvent, number | null]> = [];
    await sync.subscribe((ev, meta) => received.push([ev, meta.transitMs]));
    await sync.subscribe(() => {});
    await createClinicSync(asRtm(rtm)).publish(mockTelemetryRed);

    expect(rtm.subscribed).toEqual([CLINIC_CHANNEL]);
    expect(received).toHaveLength(1);
    expect(received[0][0]).toEqual(mockTelemetryRed);
    expect(received[0][1]).toBeGreaterThanOrEqual(0);
  });

  it('ignores messages from other channels and invalid payloads', async () => {
    const rtm = fakeRtm();
    const sync = createClinicSync(asRtm(rtm));
    const handler = vi.fn();
    const onInvalid = vi.fn();
    await sync.subscribe(handler, { onInvalid });
    rtm.emit('ai-conversation-123', JSON.stringify(mockEmergency));
    rtm.emit(CLINIC_CHANNEL, '{oops');
    expect(handler).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledOnce();
  });

  it('stops delivering after unsubscribe', async () => {
    const rtm = fakeRtm();
    const sync = createClinicSync(asRtm(rtm));
    const handler = vi.fn();
    const off = await sync.subscribe(handler);
    off();
    rtm.emit(CLINIC_CHANNEL, JSON.stringify(mockEmergency));
    expect(handler).not.toHaveBeenCalled();
  });
});
