'use client';
/**
 * Starts/stops one voice-agent session for the hub (token → agent invite + RTM login).
 * Mirrors the starter's LandingPage bootstrap, with UNMUTE's mode and patient.
 */
import type { RTMClient } from 'agora-rtm';
import type { AgentResponse, AgoraTokenData, ClientStartRequest } from '@/types/conversation';
import type { AgentMode } from '@/lib/voice-agent/prompts';
import type { PracticeProtocol } from '@/lib/contracts';

export interface AgentSession {
  agoraData: AgoraTokenData;
  rtm: RTMClient;
  agentId: string;
}

export async function startAgentSession(mode: AgentMode, patientId: string, protocol?: PracticeProtocol): Promise<AgentSession> {
  const tokenRes = await fetch('/api/generate-agora-token');
  const token = (await tokenRes.json()) as { token: string; uid: string; channel: string; error?: string };
  if (!tokenRes.ok) throw new Error(`token: ${token.error ?? tokenRes.status}`);

  const [agent, rtm] = await Promise.all([
    fetch('/api/invite-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requester_id: token.uid,
        channel_name: token.channel,
        mode,
        patient_id: patientId,
        ...(protocol ? { protocol } : {}),
      } satisfies ClientStartRequest),
    }).then(async (res) => {
      const body = (await res.json()) as AgentResponse & { error?: string };
      if (!res.ok) throw new Error(`agent: ${body.error ?? res.status}`);
      return body;
    }),
    (async () => {
      const { default: AgoraRTM } = await import('agora-rtm');
      const client: RTMClient = new AgoraRTM.RTM(process.env.NEXT_PUBLIC_AGORA_APP_ID!, token.uid);
      await client.login({ token: token.token });
      await client.subscribe(token.channel);
      return client;
    })(),
  ]);

  return {
    agoraData: { token: token.token, uid: token.uid, channel: token.channel, agentId: agent.agent_id },
    rtm,
    agentId: agent.agent_id,
  };
}

export async function stopAgentSession(session: AgentSession): Promise<void> {
  await fetch('/api/stop-conversation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: session.agentId }),
  }).catch((e) => console.error('[hub] stop agent failed', e));
  await session.rtm.logout().catch(() => {});
}
