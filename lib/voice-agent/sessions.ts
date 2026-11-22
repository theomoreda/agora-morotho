import type { AgentSession } from 'agora-agents';

/**
 * In-memory registry of running agent sessions, so /api/agent/coach can call
 * think()/say() by agent_id. One `next dev` process serves the whole demo (localhost),
 * so a module-level Map is enough. Kept on globalThis to survive dev hot reloads.
 */
const g = globalThis as typeof globalThis & { __unmuteSessions?: Map<string, AgentSession> };
const sessions: Map<string, AgentSession> = (g.__unmuteSessions ??= new Map());

export function registerSession(agentId: string, session: AgentSession): void {
  sessions.set(agentId, session);
}

export function getSession(agentId: string): AgentSession | undefined {
  return sessions.get(agentId);
}

export function unregisterSession(agentId: string): AgentSession | undefined {
  const s = sessions.get(agentId);
  sessions.delete(agentId);
  return s;
}
