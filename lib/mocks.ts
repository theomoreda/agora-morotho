/**
 * Example events for building against the contracts in parallel.
 * Fictional patient data only — labelled as simulated wherever shown.
 */
import {
  DEFAULT_PROTOCOL,
  type AttemptResult,
  type EdgeTrigger,
  type EmergencyEvent,
  type PracticeTelemetryEvent,
  type ProtocolAck,
  type ProtocolUpdate,
  type TelemetryEvent,
  type TranscriptLine,
  type TurnMeasurement,
} from './contracts';

export const HELENA = { id: 'HC-2026-084', name: 'Helena Costa (78 anos)' } as const;

// =====================================================================
// v2 — Parkinson voice coach
// Golden case: habitual voice −38 dBFS; target +6 dB and 8 s of "Aaa".
//   Aaa #1: −35 dBFS (+3 dB), 6 s  → below target
//   Aaa #2: −30 dBFS (+8 dB), 9 s  → on target
// =====================================================================

export const HELENA_V2 = { id: 'PK-2026-031', name: 'Helena Costa (72 anos)' } as const;
export const GOLDEN = { habitualDb: -38, attempt1Db: -35, attempt2Db: -30 } as const;

export const mockProtocolUpdate: ProtocolUpdate = {
  event_type: 'PROTOCOL_UPDATE',
  timestamp: '2026-11-22T07:58:00-03:00',
  patient_id: HELENA_V2.id,
  protocol_version: 2,
  protocol: {
    ...DEFAULT_PROTOCOL,
    phrases: [DEFAULT_PROTOCOL.phrases[0], DEFAULT_PROTOCOL.phrases[1], 'Quero um café com leite.'],
  },
  updated_by: 'Fga. Marina Alves',
};

export const mockProtocolAck: ProtocolAck = {
  event_type: 'PROTOCOL_ACK',
  timestamp: '2026-11-22T07:58:00-03:00',
  patient_id: HELENA_V2.id,
  protocol_version: 2,
};

const sustainTarget = {
  kind: 'sustain' as const,
  exercise_id: 'sustain',
  target_effort_db: DEFAULT_PROTOCOL.target_effort_db,
  target_duration_ms: DEFAULT_PROTOCOL.sustain.target_duration_ms,
};

export const mockAttemptWeak: AttemptResult = {
  ...sustainTarget,
  attempt: 1,
  effort_db: GOLDEN.attempt1Db - GOLDEN.habitualDb, // +3
  duration_ms: 6000,
  met_target: false,
  no_attempt: false,
  at: '2026-11-22T08:00:41-03:00',
};

export const mockAttemptStrong: AttemptResult = {
  ...sustainTarget,
  attempt: 2,
  effort_db: GOLDEN.attempt2Db - GOLDEN.habitualDb, // +8
  duration_ms: 9000,
  met_target: true,
  no_attempt: false,
  at: '2026-11-22T08:00:58-03:00',
};

export const mockAttemptPhrase: AttemptResult = {
  exercise_id: 'phrase-3',
  kind: 'phrase',
  attempt: 1,
  phrase: 'Quero um café com leite.',
  effort_db: 7.2,
  duration_ms: 1900,
  target_effort_db: DEFAULT_PROTOCOL.target_effort_db,
  target_duration_ms: null,
  met_target: true,
  no_attempt: false,
  at: '2026-11-22T08:01:40-03:00',
};

export const mockAttemptNone: AttemptResult = {
  ...sustainTarget,
  attempt: 1,
  effort_db: null,
  duration_ms: null,
  met_target: false,
  no_attempt: true,
  at: '2026-11-22T08:00:41-03:00',
};

export const mockPracticeInProgress: PracticeTelemetryEvent = {
  event_type: 'PRACTICE_TELEMETRY_UPDATE',
  timestamp: '2026-11-22T08:00:41-03:00',
  patient_id: HELENA_V2.id,
  patient_name: HELENA_V2.name,
  session_id: 'sess-pk-001',
  trigger: 'VOICE_COMMAND',
  final: false,
  protocol_version: 2,
  habitual_level_db: GOLDEN.habitualDb,
  attempts: [mockAttemptWeak],
  status: 'BELOW_TARGET',
  reasons: ['"Aaa": +3 dB (meta +6 dB), 6 s (meta 8 s)'],
  reported_symptoms: [],
};

export const mockPracticeFinal: PracticeTelemetryEvent = {
  ...mockPracticeInProgress,
  timestamp: '2026-11-22T08:01:52-03:00',
  final: true,
  attempts: [mockAttemptWeak, mockAttemptStrong, mockAttemptPhrase],
  status: 'ON_TARGET',
  reasons: ['Meta atingida na maioria dos exercícios'],
};

export const mockTranscriptLineV2: TranscriptLine = {
  event_type: 'TRANSCRIPT_LINE',
  timestamp: '2026-11-22T08:00:20-03:00',
  patient_id: HELENA_V2.id,
  session_id: 'sess-pk-001',
  speaker: 'AGENT',
  text: 'Isso, Dona Helena! Agora respire fundo e faça um "Aaa" bem forte.',
  turn_id: 2,
  final: true,
};

export const mockEdgeTriggerV2: EdgeTrigger = { kind: 'keyword', keyword: 'treinar', at: 1795334400000 };

// =====================================================================
// @deprecated V1 mocks (Home Care triage) — remove with the V1 contracts
// =====================================================================

/** PDF §4.4 golden case: hesitation on the 8h medication question. */
export const mockTelemetryRed: TelemetryEvent = {
  event_type: 'CHECKIN_TELEMETRY_UPDATE',
  timestamp: '2026-11-22T08:02:14-03:00',
  patient_id: HELENA.id,
  patient_name: HELENA.name,
  session_id: 'sess-demo-001',
  trigger_source: 'SCHEDULED_MEDICATION_CHECK',
  final: true,
  clinical_extraction: {
    medication_name: 'Losartana 50mg',
    medication_confirmed: false,
    reported_symptoms: ['tontura leve ao levantar'],
    temporal_orientation: 'HESITANT',
  },
  vocal_biomarkers: {
    baseline_latency_ms: 1240,
    current_latency_ms: 3890,
    deviation_percent: 213.7,
    intra_utterance_pauses_count: 3,
  },
  triage_status: 'RED_ALERT',
  recommended_action: 'IMMEDIATE_NURSE_CALLBACK',
  triage_reasons: ['Medicação não confirmada', 'Latência 213,7% acima da linha de base pessoal'],
};

/** Moment 1: normal fluency, within baseline. */
export const mockTelemetryGreen: TelemetryEvent = {
  ...mockTelemetryRed,
  timestamp: '2026-11-22T08:01:02-03:00',
  final: false,
  clinical_extraction: {
    medication_name: 'Losartana 50mg',
    medication_confirmed: null,
    reported_symptoms: [],
    temporal_orientation: 'UNKNOWN',
  },
  vocal_biomarkers: {
    baseline_latency_ms: 1240,
    current_latency_ms: 1180,
    deviation_percent: -4.8,
    intra_utterance_pauses_count: 0,
  },
  triage_status: 'GREEN_STABLE',
  recommended_action: 'NONE',
  triage_reasons: [],
};

export const mockTranscriptLine: TranscriptLine = {
  event_type: 'TRANSCRIPT_LINE',
  timestamp: '2026-11-22T08:01:40-03:00',
  patient_id: HELENA.id,
  session_id: 'sess-demo-001',
  speaker: 'PATIENT',
  text: 'Hum... acho que... não lembro se tomei.',
  turn_id: 4,
  final: true,
};

export const mockEmergency: EmergencyEvent = {
  event_type: 'EMERGENCY_TRIGGER',
  timestamp: '2026-11-22T14:30:05-03:00',
  patient_id: HELENA.id,
  session_id: 'sess-demo-002',
  trigger_source: 'EDGE_KEYWORD',
  keyword: 'socorro',
};

export const mockEdgeTrigger: EdgeTrigger = { kind: 'keyword', keyword: 'socorro', at: 1795359005000 };

export const mockTurnMeasurement: TurnMeasurement = {
  questionId: 'Q2_MEDICATION',
  agentEndAt: 1795334496000,
  userOnsetAt: 1795334499890,
  latencyMs: 3890,
  pausesOver800: 3,
};
