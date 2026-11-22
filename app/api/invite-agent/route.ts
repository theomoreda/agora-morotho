import { NextRequest, NextResponse } from 'next/server';
import { AgoraClient, Area, ExpiresIn } from 'agora-agents';
import { ClientStartRequest, AgentResponse } from '@/types/conversation';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
import { buildAgent } from '@/lib/voice-agent/config';
import { findPatient } from '@/data/patients';
import { registerSession } from '@/lib/voice-agent/sessions';
import { DEFAULT_PROTOCOL, protocolErrors } from '@/lib/contracts';

// Agent persona, prompts, models and turn detection live in lib/voice-agent/.

// agentUid identifies the AI in the RTC channel and shares its default with the client.
const agentUid = String(DEFAULT_AGENT_UID);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function POST(request: NextRequest) {
  try {
    // --- 1. Parse request ---

    const body: ClientStartRequest = await request.json();
    const { requester_id, channel_name } = body;
    const mode = body.mode === 'checkin' || body.mode === 'emergency' ? body.mode : 'practice';
    const patient = findPatient(body.patient_id);
    if (body.protocol !== undefined) {
      const errors = protocolErrors(body.protocol);
      if (errors.length > 0) {
        return NextResponse.json({ error: `invalid protocol: ${errors.join('; ')}` }, { status: 400 });
      }
    }
    const protocol = body.protocol ?? DEFAULT_PROTOCOL;

    // Validate required env vars on first request so misconfiguration surfaces
    // with a clear error message rather than a silent failure.
    const appId = requireEnv('NEXT_PUBLIC_AGORA_APP_ID');
    const appCertificate = requireEnv('NEXT_AGORA_APP_CERTIFICATE');

    if (!channel_name || !requester_id) {
      return NextResponse.json(
        { error: 'channel_name and requester_id are required' },
        { status: 400 },
      );
    }

    // --- 2. Build and start the agent ---

    // AgoraClient authenticates API calls to the Agora Conversational AI service.
    // area: change to Area.EU or Area.AP for European or Asia-Pacific deployments.
    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });

    const agent = buildAgent(
      client,
      mode,
      patient,
      {
        PROSA_FISH_API_KEY: process.env.PROSA_FISH_API_KEY,
        PROSA_FISH_VOICE_ID: process.env.PROSA_FISH_VOICE_ID,
        PROSA_FISH_BACKEND: process.env.PROSA_FISH_BACKEND,
      },
      protocol,
    );

    // remoteUids restricts the agent to only process audio from this user
    const session = agent.createSession({
      channel: channel_name,
      agentUid,
      remoteUids: [requester_id],
      idleTimeout: 30,
      expiresIn: ExpiresIn.hours(1),
      debug: false, // enable debug to show restful API calls in the console
    });

    const agentId = await session.start();
    registerSession(agentId, session);

    return NextResponse.json({
      agent_id: agentId,
      create_ts: Math.floor(Date.now() / 1000),
      state: 'RUNNING',
    } as AgentResponse);
  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to start conversation',
      },
      { status: 500 },
    );
  }
}
