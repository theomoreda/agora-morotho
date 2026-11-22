import { describe, expect, it } from 'vitest';
import { createAgentDoneGate } from './agent-done';

/** Feeds levels every 50 ms from `from` to `to`; returns the first non-null result. */
function feed(gate: ReturnType<typeof createAgentDoneGate>, from: number, to: number, level: (t: number) => number) {
  for (let t = from; t <= to; t += 50) {
    const done = gate.level(level(t), t);
    if (done !== null) return { done, firedAt: t };
  }
  return null;
}

describe('agent done gate', () => {
  it('state arrives after the audio stopped → done at the state time, after 300 ms of quiet', () => {
    const g = createAgentDoneGate();
    g.state('speaking', 0);
    feed(g, 0, 2000, () => 0.3);
    g.state('silent', 2100);
    expect(feed(g, 2100, 4000, () => 0)).toEqual({ done: 2100, firedAt: 2400 });
  });

  it('TTS tail still playing after the state event → waits for the audio to stop', () => {
    const g = createAgentDoneGate();
    g.state('speaking', 0);
    g.state('listening', 1000);
    expect(feed(g, 1000, 4000, (t) => (t < 1600 ? 0.4 : 0.01))).toEqual({ done: 1550, firedAt: 1850 });
  });

  it('never fires for an idle "listening" that was not preceded by speaking', () => {
    const g = createAgentDoneGate();
    g.state('listening', 0);
    expect(feed(g, 0, 3000, () => 0)).toBeNull();
    expect(g.busy()).toBe(false);
  });

  it('gives up waiting after 2 s of continuous agent audio (e.g. background noise on the track)', () => {
    const g = createAgentDoneGate();
    g.state('speaking', 0);
    g.state('silent', 1000);
    expect(feed(g, 1000, 5000, () => 0.5)).toEqual({ done: 3000, firedAt: 3000 });
  });

  it('a new "speaking" or "thinking" before the end cancels the pending end', () => {
    const g = createAgentDoneGate();
    g.state('speaking', 0);
    g.state('silent', 1000);
    g.state('speaking', 1100);
    expect(g.busy()).toBe(true);
    expect(feed(g, 1100, 2000, () => 0)).toBeNull();
    g.state('silent', 2000);
    expect(feed(g, 2000, 3000, () => 0)?.done).toBe(2000);
  });

  it('fires only once per utterance', () => {
    const g = createAgentDoneGate();
    g.state('speaking', 0);
    g.state('silent', 100);
    expect(feed(g, 100, 1000, () => 0)).not.toBeNull();
    expect(feed(g, 1000, 3000, () => 0)).toBeNull();
  });
});
