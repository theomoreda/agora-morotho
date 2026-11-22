/**
 * Practice session state machine (pure). The hub orchestrates; the agent verbalises (SPEC decision 4).
 *
 *   calibrating ──calibrated──▶ intro ──agentDone──▶ instructing ──agentDone──▶ measuring
 *        (patient answers the greeting)   (agent's own reply)  (think: next step)   (uplink muted)
 *                                                    ▲                                  │ attemptMeasured
 *                                                    └──────── more exercises ──────────┤
 *                                                                                       ▼
 *                                                         done ◀──agentDone── closing (think: summary)
 *
 * The hub feeds events and executes the returned effects, in order:
 *   coach   → POST /api/agent/coach (think, say fallback)
 *   mute    → localMicrophoneTrack.setMuted(muted)
 *   measure → start the attempt detector at `openedAt`
 *   publish → send practiceTelemetry(...) over Signaling
 *   stop    → stop the agent session
 *
 * `agentDone` must only be sent when the agent FINISHES an utterance (speaking → listening/silent),
 * never for an idle "listening" — otherwise the machine would open a window before the instruction.
 */
import {
  DEFAULT_PROTOCOL,
  type AttemptResult,
  type PracticeProtocol,
  type PracticeTelemetryEvent,
  type PracticeTrigger,
} from '@/lib/contracts';
import { detectSymptoms } from '@/lib/vocal-biomarkers/extraction';
import { buildAttemptResult, type AttemptMeasurement } from '@/lib/vocal-metrics/level';
import { exerciseSummary, sessionStatus, type StatusContext } from '@/lib/vocal-metrics/status';
import { coachMessage, type CoachMessage, type NextStep } from './coach-messages';

/** Phrases get one retry when below target (or not attempted). */
export const PHRASE_MAX_TRIES = 2;
/** Ignore mic frames this long after the agent stops, to drop the TTS echo tail. */
export const ECHO_GUARD_MS = 250;

export type Exercise =
  | { kind: 'sustain'; attempt: number }
  | { kind: 'phrase'; index: number; attempt: number };

export type Phase = 'calibrating' | 'intro' | 'instructing' | 'measuring' | 'closing' | 'done';

export interface PracticeState {
  phase: Phase;
  protocol: PracticeProtocol;
  /** Measured from the greeting answer, else the profile's seeded value */
  habitualDb: number | null;
  /** The exercise being instructed/measured; null before the first and after the last */
  current: Exercise | null;
  attempts: AttemptResult[];
  symptoms: string[];
  history: Omit<StatusContext, 'reportedSymptoms'>;
  fallbackHabitualDb: number;
  address: string;
}

export type PracticeEvent =
  /** Habitual level from the greeting answer; null → profile fallback */
  | { type: 'calibrated'; habitualDb: number | null }
  /** Agent finished an utterance (speaking → listening). `at` = Unix ms */
  | { type: 'agentDone'; at: number }
  /** Attempt detector finished; null measurement = no attempt. `at` = ISO */
  | { type: 'attemptMeasured'; measurement: AttemptMeasurement | null; at: string }
  /** Final patient transcript line (symptom extraction) */
  | { type: 'patientSaid'; text: string }
  /** New protocol from the therapist — applied only before the first exercise */
  | { type: 'protocolUpdated'; protocol: PracticeProtocol }
  /** Agent reconnected mid-session */
  | { type: 'resume' };

export type Effect =
  | { type: 'coach'; message: CoachMessage }
  | { type: 'mute'; muted: boolean }
  | { type: 'measure'; openedAt: number; exercise: Exercise }
  | { type: 'publish'; final: boolean }
  | { type: 'stop' };

export interface Transition {
  state: PracticeState;
  effects: Effect[];
}

export interface PracticeInit {
  address: string;
  /** Seeded habitual level for this patient, used if calibration fails */
  fallbackHabitualDb: number;
  protocol?: PracticeProtocol;
  history?: Omit<StatusContext, 'reportedSymptoms'>;
}

export function startPractice(init: PracticeInit): PracticeState {
  return {
    phase: 'calibrating',
    protocol: init.protocol ?? DEFAULT_PROTOCOL,
    habitualDb: null,
    current: null,
    attempts: [],
    symptoms: [],
    history: init.history ?? { recentAvgEffortDb: null, missedDaysBefore: 0 },
    fallbackHabitualDb: init.fallbackHabitualDb,
    address: init.address,
  };
}

/** What the agent should ask for next, after `last` was measured (or at the start). */
export function nextExercise(protocol: PracticeProtocol, last: Exercise | null, lastResult: AttemptResult | null): Exercise | null {
  if (last === null) return { kind: 'sustain', attempt: 1 };
  const retry = lastResult !== null && !lastResult.met_target;
  if (last.kind === 'sustain') {
    if (retry && last.attempt < protocol.sustain.attempts) return { kind: 'sustain', attempt: last.attempt + 1 };
    return { kind: 'phrase', index: 0, attempt: 1 };
  }
  if (retry && last.attempt < PHRASE_MAX_TRIES) return { ...last, attempt: last.attempt + 1 };
  if (last.index + 1 < protocol.phrases.length) return { kind: 'phrase', index: last.index + 1, attempt: 1 };
  return null;
}

function toNextStep(s: PracticeState, e: Exercise | null): NextStep {
  if (e === null) {
    const sum = exerciseSummary(s.attempts);
    return { kind: 'summary', metCount: sum.metCount, total: sum.total, status: status(s).status };
  }
  if (e.kind === 'sustain') {
    return { kind: 'sustain', attempt: e.attempt, targetDurationMs: s.protocol.sustain.target_duration_ms };
  }
  return { kind: 'phrase', index: e.index, phrase: s.protocol.phrases[e.index], retry: e.attempt > 1 };
}

function status(s: PracticeState) {
  return sessionStatus(s.attempts, { ...s.history, reportedSymptoms: s.symptoms });
}

export function practiceStep(state: PracticeState, event: PracticeEvent): Transition {
  const none: Transition = { state, effects: [] };

  switch (event.type) {
    case 'calibrated': {
      if (state.phase !== 'calibrating') return none;
      return { state: { ...state, phase: 'intro', habitualDb: event.habitualDb ?? state.fallbackHabitualDb }, effects: [] };
    }

    case 'agentDone': {
      if (state.phase === 'intro') {
        const first = nextExercise(state.protocol, null, null)!;
        const message = coachMessage({ kind: 'start', protocol: state.protocol }, state.address);
        return { state: { ...state, phase: 'instructing', current: first }, effects: [{ type: 'coach', message }] };
      }
      if (state.phase === 'instructing' && state.current) {
        return {
          state: { ...state, phase: 'measuring' },
          effects: [
            { type: 'mute', muted: true },
            { type: 'measure', openedAt: event.at + ECHO_GUARD_MS, exercise: state.current },
          ],
        };
      }
      if (state.phase === 'closing') {
        return { state: { ...state, phase: 'done' }, effects: [{ type: 'stop' }] };
      }
      return none;
    }

    case 'attemptMeasured': {
      if (state.phase !== 'measuring' || !state.current) return none;
      const cur = state.current;
      const result = buildAttemptResult({
        kind: cur.kind,
        attempt: cur.attempt,
        phraseIndex: cur.kind === 'phrase' ? cur.index : undefined,
        measurement: event.measurement,
        habitualDb: state.habitualDb ?? state.fallbackHabitualDb,
        protocol: state.protocol,
        at: event.at,
      });
      const measured: PracticeState = { ...state, attempts: [...state.attempts, result] };
      const next = nextExercise(state.protocol, cur, result);
      const message = coachMessage({ kind: 'result', result, next: toNextStep(measured, next) }, state.address);
      return {
        state: { ...measured, phase: next ? 'instructing' : 'closing', current: next },
        effects: [
          { type: 'mute', muted: false },
          { type: 'publish', final: next === null },
          { type: 'coach', message },
        ],
      };
    }

    case 'patientSaid': {
      const found = detectSymptoms(event.text).filter((s) => !state.symptoms.includes(s));
      if (found.length === 0) return none;
      const next = { ...state, symptoms: [...state.symptoms, ...found] };
      // Publish right away when a session is under way so the therapist sees the report live.
      const live = state.phase !== 'done' && state.attempts.length > 0;
      return { state: next, effects: live ? [{ type: 'publish', final: false }] : [] };
    }

    case 'protocolUpdated': {
      if (state.attempts.length > 0 || state.phase === 'measuring' || state.phase === 'done') return none;
      return { state: { ...state, protocol: event.protocol }, effects: [] };
    }

    case 'resume': {
      if (state.phase === 'done' || state.phase === 'calibrating') return none;
      if (state.phase === 'intro') return practiceStep(state, { type: 'agentDone', at: 0 });
      const pending = state.phase === 'closing' ? null : state.current;
      const message = coachMessage({ kind: 'resume', next: toNextStep(state, pending) }, state.address);
      const effects: Effect[] = state.phase === 'measuring' ? [{ type: 'mute', muted: false }] : [];
      return {
        state: { ...state, phase: pending ? 'instructing' : 'closing' },
        effects: [...effects, { type: 'coach', message }],
      };
    }
  }
}

/** UI view of the hub: what to show right now. */
export function practiceView(s: PracticeState) {
  const e = s.current;
  return {
    phase: s.phase,
    exercise: e,
    phrase: e?.kind === 'phrase' ? s.protocol.phrases[e.index] : null,
    targetEffortDb: s.protocol.target_effort_db,
    targetDurationMs: e?.kind === 'sustain' ? s.protocol.sustain.target_duration_ms : null,
    habitualDb: s.habitualDb,
    lastAttempt: s.attempts[s.attempts.length - 1] ?? null,
    summary: exerciseSummary(s.attempts),
  };
}

export interface TelemetryMeta {
  patientId: string;
  patientName: string;
  sessionId: string;
  trigger: PracticeTrigger;
  protocolVersion: number;
  now: Date;
}

export function practiceTelemetry(s: PracticeState, final: boolean, meta: TelemetryMeta): PracticeTelemetryEvent {
  const st = status(s);
  return {
    event_type: 'PRACTICE_TELEMETRY_UPDATE',
    timestamp: meta.now.toISOString(),
    patient_id: meta.patientId,
    patient_name: meta.patientName,
    session_id: meta.sessionId,
    trigger: meta.trigger,
    final,
    protocol_version: meta.protocolVersion,
    habitual_level_db: s.habitualDb,
    attempts: s.attempts,
    status: st.status,
    reasons: st.reasons,
    reported_symptoms: s.symptoms,
  };
}
