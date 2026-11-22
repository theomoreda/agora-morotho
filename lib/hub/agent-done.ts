/**
 * Decides when the agent has REALLY finished an utterance (pure, clock-injected).
 *
 * The RTM state event (speaking → silent/listening/idle) can arrive before the last TTS audio has
 * played locally. Opening the measuring window then would capture the agent's own tail. So:
 *   1. arm only on a transition FROM speaking (an idle "listening" never counts — see practice-machine);
 *   2. fire once the agent's remote audio level stays below `threshold` for `quietMs`;
 *   3. never wait more than `maxWaitMs` after the state event.
 * The reported time is the last moment the agent was audible (or the state time if it never was).
 */
export const AGENT_DONE_STATES: ReadonlySet<string> = new Set(['listening', 'silent', 'idle']);

export interface AgentDoneOptions {
  /** Remote audio level (0..1, getVolumeLevel) that counts as the agent speaking */
  threshold: number;
  quietMs: number;
  maxWaitMs: number;
}

export const DEFAULT_AGENT_DONE: AgentDoneOptions = { threshold: 0.05, quietMs: 300, maxWaitMs: 2000 };

export interface AgentDoneGate {
  /** Feed every agent state change. */
  state(state: string, t: number): void;
  /** Feed the agent audio level periodically; returns the "done at" time when the utterance ends. */
  level(level: number, t: number): number | null;
  /** True while the agent is speaking or its utterance end is pending. */
  busy(): boolean;
}

export function createAgentDoneGate(opts: AgentDoneOptions = DEFAULT_AGENT_DONE): AgentDoneGate {
  let speaking = false;
  let armedAt: number | null = null;
  let lastVoiceAt: number | null = null;

  return {
    state(state, t) {
      if (state === 'speaking') {
        speaking = true;
        armedAt = null;
      } else if (AGENT_DONE_STATES.has(state) && speaking) {
        speaking = false;
        armedAt = t;
      } else if (state === 'thinking') {
        armedAt = null;
      }
    },
    level(level, t) {
      if (level >= opts.threshold) lastVoiceAt = t;
      if (armedAt === null) return null;
      // The utterance ends at the later of: the state event, the last audible agent frame.
      const endAt = Math.max(armedAt, lastVoiceAt ?? -Infinity);
      const quietLongEnough = t - endAt >= opts.quietMs;
      const waitedTooLong = t - armedAt >= opts.maxWaitMs;
      if (!quietLongEnough && !waitedTooLong) return null;
      armedAt = null;
      return waitedTooLong && !quietLongEnough ? t : endAt;
    },
    busy() {
      return speaking || armedAt !== null;
    },
  };
}
