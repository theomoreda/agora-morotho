/**
 * Shared contracts between the UNMUTE modules — v2 (Parkinson voice coach, frozen at P1).
 * Changing this file after the freeze requires agreement from all four tracks.
 *
 * Wire events travel over the Agora Signaling channel `clinic-central`, both ways:
 *   clinic → hub: PROTOCOL_UPDATE          hub → clinic: PROTOCOL_ACK, PRACTICE_TELEMETRY_UPDATE, TRANSCRIPT_LINE
 * Wire events use snake_case; in-process types use camelCase.
 *
 * The V1 (Home Care triage) types at the bottom are @deprecated and kept only so the
 * existing hub/dashboard compile while P7/P9 migrate; delete them when nothing imports them.
 */

export const CLINIC_CHANNEL = 'clinic-central';

// =====================================================================
// v2 — enums
// =====================================================================

/** Session outcome shown to the speech therapist (thresholds not clinically validated). */
export const SESSION_STATUSES = ['ON_TARGET', 'BELOW_TARGET', 'REVIEW'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

/** sustain = "Aaa" held as long and loud as possible; phrase = functional phrase said loudly. */
export const EXERCISE_KINDS = ['sustain', 'phrase'] as const;
export type ExerciseKind = (typeof EXERCISE_KINDS)[number];

export const PRACTICE_TRIGGERS = ['VOICE_COMMAND', 'BUTTON'] as const;
export type PracticeTrigger = (typeof PRACTICE_TRIGGERS)[number];

export const SPEAKERS = ['AGENT', 'PATIENT'] as const;
export type Speaker = (typeof SPEAKERS)[number];

// =====================================================================
// v2 — protocol (owned by the speech therapist)
// =====================================================================

export const PHRASE_COUNT = 3;
export const PROTOCOL_LIMITS = {
  phraseMaxChars: 80,
  targetEffortDb: { min: 1, max: 20 },
  targetDurationMs: { min: 2000, max: 30000 },
  attempts: { min: 1, max: 3 },
} as const;

export interface PracticeProtocol {
  sustain: { target_duration_ms: number; attempts: number };
  /** Exactly PHRASE_COUNT functional phrases */
  phrases: string[];
  /** Target loudness above the patient's habitual voice of the day (relative dB, not SPL) */
  target_effort_db: number;
}

export const DEFAULT_PROTOCOL: PracticeProtocol = {
  sustain: { target_duration_ms: 8000, attempts: 2 },
  phrases: ['Bom dia, tudo bem?', 'Eu quero um copo de água.', 'Me passa o controle da televisão.'],
  target_effort_db: 6,
};

/** Human-readable problems with a protocol (empty = valid). Used by the editor and the parser. */
export function protocolErrors(p: unknown): string[] {
  if (!isObj(p)) return ['protocolo ausente'];
  const errors: string[] = [];
  const L = PROTOCOL_LIMITS;
  const phrases = p.phrases;
  if (!Array.isArray(phrases) || phrases.length !== PHRASE_COUNT) {
    errors.push(`são necessárias exatamente ${PHRASE_COUNT} frases`);
  } else {
    phrases.forEach((ph, i) => {
      if (typeof ph !== 'string' || ph.trim() === '') errors.push(`frase ${i + 1} vazia`);
      else if (ph.length > L.phraseMaxChars) errors.push(`frase ${i + 1} passa de ${L.phraseMaxChars} caracteres`);
    });
  }
  const effort = p.target_effort_db;
  if (!inRange(effort, L.targetEffortDb)) {
    errors.push(`meta de esforço deve ficar entre ${L.targetEffortDb.min} e ${L.targetEffortDb.max} dB`);
  }
  const sustain = p.sustain;
  if (!isObj(sustain)) {
    errors.push('configuração do "Aaa" ausente');
  } else {
    if (!inRange(sustain.target_duration_ms, L.targetDurationMs)) {
      errors.push(`meta do "Aaa" deve ficar entre ${L.targetDurationMs.min / 1000} e ${L.targetDurationMs.max / 1000} s`);
    }
    if (!Number.isInteger(sustain.attempts) || !inRange(sustain.attempts, L.attempts)) {
      errors.push(`tentativas do "Aaa" devem ser entre ${L.attempts.min} e ${L.attempts.max}`);
    }
  }
  return errors;
}

// =====================================================================
// v2 — measurements
// =====================================================================

/** One measured attempt (hub → clinic, inside PRACTICE_TELEMETRY_UPDATE). */
export interface AttemptResult {
  /** "sustain" or "phrase-1".."phrase-3" */
  exercise_id: string;
  kind: ExerciseKind;
  /** 1-based attempt number within the exercise */
  attempt: number;
  /** Phrase text for kind "phrase" */
  phrase?: string;
  /** Loudness above the habitual voice (relative dB); null when no attempt */
  effort_db: number | null;
  /** Longest continuous voicing (sustain) or utterance length (phrase); null when no attempt */
  duration_ms: number | null;
  target_effort_db: number;
  /** Only for kind "sustain" */
  target_duration_ms: number | null;
  met_target: boolean;
  /** Patient did not vocalise within the attempt window */
  no_attempt: boolean;
  /** ISO 8601 with offset */
  at: string;
}

// =====================================================================
// v2 — wire events
// =====================================================================

/** Clinic → hub: the therapist publishes a new protocol for one patient. */
export interface ProtocolUpdate {
  event_type: 'PROTOCOL_UPDATE';
  timestamp: string;
  patient_id: string;
  /** Monotonic per patient; the ACK echoes it */
  protocol_version: number;
  protocol: PracticeProtocol;
  /** Display name of the therapist */
  updated_by: string;
}

/** Hub → clinic: the patient's hub applied the protocol. */
export interface ProtocolAck {
  event_type: 'PROTOCOL_ACK';
  timestamp: string;
  patient_id: string;
  protocol_version: number;
}

/** Hub → clinic: published after every attempt and once more with final=true. */
export interface PracticeTelemetryEvent {
  event_type: 'PRACTICE_TELEMETRY_UPDATE';
  timestamp: string;
  patient_id: string;
  patient_name: string;
  session_id: string;
  trigger: PracticeTrigger;
  final: boolean;
  protocol_version: number;
  /** Median dBFS of the answer to the greeting; null until calibrated */
  habitual_level_db: number | null;
  /** All attempts so far in this session, in order */
  attempts: AttemptResult[];
  status: SessionStatus;
  /** Human-readable reasons behind the status, shown in the dashboard */
  reasons: string[];
  /** e.g. "engasgo", "dificuldade para engolir" — rule-based, from the conversation */
  reported_symptoms: string[];
}

export interface TranscriptLine {
  event_type: 'TRANSCRIPT_LINE';
  timestamp: string;
  patient_id: string;
  session_id: string;
  speaker: Speaker;
  text: string;
  turn_id: number;
  final: boolean;
}

export type ClinicEventV2 = ProtocolUpdate | ProtocolAck | PracticeTelemetryEvent | TranscriptLine;

/** Every event the parser accepts (v2 + deprecated V1 until the migration ends). */
export type ClinicEvent = ClinicEventV2 | TelemetryEvent | EmergencyEvent;

export type ParseResult = { ok: true; event: ClinicEvent } | { ok: false; error: string };

// =====================================================================
// In-process types shared across modules
// =====================================================================

/** Emitted by edge-listener. Audio never leaves the device. v2 uses kind "keyword", keyword "treinar". */
export interface EdgeTrigger {
  kind: 'keyword' | 'impact';
  keyword?: string;
  /** Unix ms */
  at: number;
}

// =====================================================================
// Validation (hand-written; no extra dependency)
// =====================================================================

type Obj = Record<string, unknown>;
type Check = (v: unknown) => boolean;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function inRange(v: unknown, r: { min: number; max: number }): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= r.min && v <= r.max;
}
const str: Check = (v) => typeof v === 'string';
const num: Check = (v) => typeof v === 'number' && Number.isFinite(v);
const int: Check = (v) => Number.isInteger(v);
const bool: Check = (v) => typeof v === 'boolean';
const nullable = (c: Check): Check => (v) => v === null || c(v);
const optional = (c: Check): Check => (v) => v === undefined || c(v);
const oneOf = (values: readonly string[]): Check => (v) => typeof v === 'string' && values.includes(v);
const strArray: Check = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string');
const arrayOf = (c: Check): Check => (v) => Array.isArray(v) && v.every(c);
const shape = (fields: Record<string, Check>): Check => (v) =>
  isObj(v) && Object.entries(fields).every(([k, c]) => c(v[k]));

const attemptCheck = shape({
  exercise_id: str,
  kind: oneOf(EXERCISE_KINDS),
  attempt: int,
  phrase: optional(str),
  effort_db: nullable(num),
  duration_ms: nullable(num),
  target_effort_db: num,
  target_duration_ms: nullable(num),
  met_target: bool,
  no_attempt: bool,
  at: str,
});

const base = { timestamp: str, patient_id: str, session_id: str };

const SCHEMAS: Record<ClinicEvent['event_type'], Record<string, Check>> = {
  PROTOCOL_UPDATE: {
    timestamp: str,
    patient_id: str,
    protocol_version: int,
    protocol: (v) => protocolErrors(v).length === 0,
    updated_by: str,
  },
  PROTOCOL_ACK: { timestamp: str, patient_id: str, protocol_version: int },
  PRACTICE_TELEMETRY_UPDATE: {
    ...base,
    patient_name: str,
    trigger: oneOf(PRACTICE_TRIGGERS),
    final: bool,
    protocol_version: int,
    habitual_level_db: nullable(num),
    attempts: arrayOf(attemptCheck),
    status: oneOf(SESSION_STATUSES),
    reasons: strArray,
    reported_symptoms: strArray,
  },
  TRANSCRIPT_LINE: { ...base, speaker: oneOf(SPEAKERS), text: str, turn_id: num, final: bool },

  // ----- @deprecated V1 -----
  CHECKIN_TELEMETRY_UPDATE: {
    ...base,
    patient_name: str,
    trigger_source: oneOf(TRIGGER_SOURCES()),
    final: bool,
    clinical_extraction: shape({
      medication_name: str,
      medication_confirmed: nullable(bool),
      reported_symptoms: strArray,
      temporal_orientation: oneOf(TEMPORAL_ORIENTATIONS()),
    }),
    vocal_biomarkers: shape({
      baseline_latency_ms: nullable(num),
      current_latency_ms: nullable(num),
      deviation_percent: nullable(num),
      intra_utterance_pauses_count: num,
    }),
    triage_status: oneOf(TRIAGE_STATUSES()),
    recommended_action: oneOf(RECOMMENDED_ACTIONS()),
    triage_reasons: strArray,
  },
  EMERGENCY_TRIGGER: { ...base, trigger_source: oneOf(EDGE_TRIGGER_SOURCES()), keyword: optional(str) },
};

/** Validates an incoming Signaling message. Never throws. */
export function parseClinicEvent(input: unknown): ParseResult {
  let value = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input);
    } catch {
      return { ok: false, error: 'invalid JSON' };
    }
  }
  if (!isObj(value)) return { ok: false, error: 'not an object' };

  const type = value.event_type;
  if (typeof type !== 'string' || !Object.hasOwn(SCHEMAS, type)) {
    return { ok: false, error: `unknown event_type: ${String(type)}` };
  }
  const fields = SCHEMAS[type as ClinicEvent['event_type']];
  const bad = Object.keys(fields).filter((k) => !fields[k](value[k]));
  if (bad.length > 0) return { ok: false, error: `invalid fields for ${type}: ${bad.join(', ')}` };

  return { ok: true, event: value as unknown as ClinicEvent };
}

// =====================================================================
// @deprecated V1 (Home Care triage) — remove once hub/dashboard migrate (P7, P9)
// Declared as functions/hoisted types so the schema table above can reference them.
// =====================================================================

/** @deprecated V1 */
function TRIAGE_STATUSES() {
  return ['GREEN_STABLE', 'YELLOW_WATCH', 'RED_ALERT'] as const;
}
/** @deprecated V1 */
function RECOMMENDED_ACTIONS() {
  return ['NONE', 'NURSE_REVIEW_TODAY', 'IMMEDIATE_NURSE_CALLBACK'] as const;
}
/** @deprecated V1 */
function EDGE_TRIGGER_SOURCES() {
  return ['EDGE_KEYWORD', 'EDGE_IMPACT'] as const;
}
/** @deprecated V1 */
function TRIGGER_SOURCES() {
  return ['SCHEDULED_MEDICATION_CHECK', ...EDGE_TRIGGER_SOURCES()] as const;
}
/** @deprecated V1 */
function TEMPORAL_ORIENTATIONS() {
  return ['OK', 'HESITANT', 'DISORIENTED', 'UNKNOWN'] as const;
}

/** @deprecated V1 */
export type TriageStatus = ReturnType<typeof TRIAGE_STATUSES>[number];
/** @deprecated V1 */
export type RecommendedAction = ReturnType<typeof RECOMMENDED_ACTIONS>[number];
/** @deprecated V1 */
export type TriggerSource = ReturnType<typeof TRIGGER_SOURCES>[number];
/** @deprecated V1 */
export type EdgeTriggerSource = ReturnType<typeof EDGE_TRIGGER_SOURCES>[number];
/** @deprecated V1 */
export type TemporalOrientation = ReturnType<typeof TEMPORAL_ORIENTATIONS>[number];

/** @deprecated V1 */
export const QUESTION_IDS = ['Q1_DISPOSITION', 'Q2_MEDICATION', 'Q3_ORIENTATION', 'EMERGENCY_CHECK'] as const;
/** @deprecated V1 */
export type QuestionId = (typeof QUESTION_IDS)[number];

/** @deprecated V1 — one agent question → patient answer measurement */
export interface TurnMeasurement {
  questionId: QuestionId;
  agentEndAt: number;
  userOnsetAt: number | null;
  latencyMs: number | null;
  pausesOver800: number;
}

/** @deprecated V1 */
export interface ClinicalExtraction {
  medication_name: string;
  medication_confirmed: boolean | null;
  reported_symptoms: string[];
  temporal_orientation: TemporalOrientation;
}

/** @deprecated V1 */
export interface VocalBiomarkers {
  baseline_latency_ms: number | null;
  current_latency_ms: number | null;
  deviation_percent: number | null;
  intra_utterance_pauses_count: number;
}

/** @deprecated V1 — replaced by PracticeTelemetryEvent */
export interface TelemetryEvent {
  event_type: 'CHECKIN_TELEMETRY_UPDATE';
  timestamp: string;
  patient_id: string;
  patient_name: string;
  session_id: string;
  trigger_source: TriggerSource;
  final: boolean;
  clinical_extraction: ClinicalExtraction;
  vocal_biomarkers: VocalBiomarkers;
  triage_status: TriageStatus;
  recommended_action: RecommendedAction;
  triage_reasons: string[];
}

/** @deprecated V1 — emergency mode removed in v2 */
export interface EmergencyEvent {
  event_type: 'EMERGENCY_TRIGGER';
  timestamp: string;
  patient_id: string;
  session_id: string;
  trigger_source: EdgeTriggerSource;
  keyword?: string;
}
