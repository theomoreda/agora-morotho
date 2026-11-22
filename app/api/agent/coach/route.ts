import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/voice-agent/sessions';

/**
 * Injects an app measurement/instruction into the running agent (SPEC §platform).
 * mode "think": the LLM turns the [APP] text into natural speech (default).
 * mode "say": the TTS speaks `text` verbatim. If think fails, `fallback` is spoken via say.
 */
interface CoachRequest {
  agent_id?: string;
  text?: string;
  mode?: 'think' | 'say';
  fallback?: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CoachRequest;
  if (!body.agent_id || !body.text) {
    return NextResponse.json({ error: 'agent_id and text are required' }, { status: 400 });
  }
  const session = getSession(body.agent_id);
  if (!session) return NextResponse.json({ error: 'unknown agent_id' }, { status: 404 });

  const started = Date.now();
  if (body.mode === 'say') {
    await session.say(body.text, { priority: 'INTERRUPT', interruptable: false });
    return NextResponse.json({ ok: true, via: 'say', ms: Date.now() - started });
  }

  try {
    await session.think(body.text, {
      on_listening_action: 'interrupt',
      on_thinking_action: 'interrupt',
      on_speaking_action: 'interrupt',
      // Short coaching turns must not be cancelled by a leftover "Aaa" tail or room noise.
      interruptable: false,
    });
    return NextResponse.json({ ok: true, via: 'think', ms: Date.now() - started });
  } catch (error) {
    console.error('[coach] think failed, falling back to say', error);
    if (!body.fallback) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'think failed' }, { status: 502 });
    }
    await session.say(body.fallback, { priority: 'INTERRUPT', interruptable: false });
    return NextResponse.json({ ok: true, via: 'say-fallback', ms: Date.now() - started });
  }
}
