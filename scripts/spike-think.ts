/**
 * P0 spike: does AgentSession.think() make the running agent respond, and how fast?
 * Starts the real agent (managed Deepgram + gpt-4.1-mini + Fish TTS) in a throwaway channel
 * with no human, injects [APP] messages and polls getHistory() for the assistant reply.
 *
 *   node --env-file=.env.local --import tsx scripts/spike-think.ts
 */
import { AgoraClient, Area, ExpiresIn } from 'agora-agents';
import { buildAgent } from '@/lib/voice-agent/config';
import { HELENA_PK_PROFILE } from '@/data/patients';
import { DEFAULT_PROTOCOL } from '@/lib/contracts';
import { mockAttemptStrong, mockAttemptWeak } from '@/lib/mocks';
import { coachMessage } from '@/lib/hub/coach-messages';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Msg = { role?: string; content?: unknown };
async function history(session: { getHistory(): Promise<unknown> }): Promise<Msg[]> {
  const h = (await session.getHistory()) as { contents?: Msg[] };
  return h.contents ?? [];
}

async function waitForAssistant(session: Parameters<typeof history>[0], afterCount: number, timeoutMs = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const msgs = await history(session);
    const newer = msgs.slice(afterCount);
    const reply = newer.find((m) => m.role === 'assistant');
    if (reply) return { ms: Date.now() - t0, msgs: newer, total: msgs.length };
    await sleep(150);
  }
  return { ms: null, msgs: (await history(session)).slice(afterCount), total: (await history(session)).length };
}

async function main() {
  const client = new AgoraClient({
    area: Area.US,
    appId: process.env.NEXT_PUBLIC_AGORA_APP_ID!,
    appCertificate: process.env.NEXT_AGORA_APP_CERTIFICATE!,
  });
  const agent = buildAgent(client, 'practice', HELENA_PK_PROFILE, {
    PROSA_FISH_API_KEY: process.env.PROSA_FISH_API_KEY,
    PROSA_FISH_VOICE_ID: process.env.PROSA_FISH_VOICE_ID,
  });
  const session = agent.createSession({
    channel: `spike-think-${Date.now()}`,
    agentUid: '9999',
    remoteUids: ['424242'],
    idleTimeout: 60,
    expiresIn: ExpiresIn.hours(1),
  });

  const t0 = Date.now();
  const agentId = await session.start();
  console.log(`start ok in ${Date.now() - t0} ms, agent ${agentId}`);

  try {
    await sleep(6000); // let the greeting play
    let msgs = await history(session);
    console.log('history after greeting:', JSON.stringify(msgs));

    const A = 'Dona Helena';
    const probes = [
      coachMessage({ kind: 'start', protocol: DEFAULT_PROTOCOL }, A).text,
      coachMessage({ kind: 'result', result: mockAttemptWeak, next: { kind: 'sustain', attempt: 2, targetDurationMs: 8000 } }, A).text,
      coachMessage({ kind: 'result', result: mockAttemptStrong, next: { kind: 'phrase', index: 0, phrase: DEFAULT_PROTOCOL.phrases[0], retry: false } }, A).text,
    ];
    for (const text of probes) {
      const before = (await history(session)).length;
      const tc = Date.now();
      const res = await session.think(text, {
        on_listening_action: 'interrupt',
        on_thinking_action: 'interrupt',
        on_speaking_action: 'interrupt',
        interruptable: true,
      });
      console.log(`\nthink API ${Date.now() - tc} ms →`, JSON.stringify(res));
      const r = await waitForAssistant(session, before);
      console.log(`assistant reply visible in history after ${r.ms} ms (+API):`, JSON.stringify(r.msgs));
      await sleep(7000); // let TTS play
    }

    for (const m of await history(session)) console.log(`${m.role}: ${String(m.content)}`);
  } finally {
    await session.stop();
    console.log('stopped');
  }
}

main().catch((e) => {
  console.error('SPIKE FAILED', e?.statusCode ?? '', e?.body ?? e);
  process.exit(1);
});
