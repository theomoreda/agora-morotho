/**
 * Speech-therapy dashboard state (v2): pure reducer over clinic-sync events (testable, immutable).
 * PROTOCOL_UPDATE is dispatched locally right after the therapist publishes it (and is idempotent
 * if Signaling echoes it back); PROTOCOL_ACK from the hub confirms delivery.
 */
import type {
  AttemptResult,
  ClinicEvent,
  PracticeProtocol,
  PracticeTrigger,
  SessionStatus,
  TranscriptLine,
} from '@/lib/contracts';
import { PRACTICE_PATIENTS, type PracticePatient } from '@/data/seed-practice';
import { dayFromAttempts, missedDaysBefore, recentAvgEffortDb, type PracticeDay } from '@/lib/vocal-metrics/history';
import { DEFAULT_THRESHOLDS } from '@/lib/vocal-metrics/status';

export interface LiveSession {
  sessionId: string;
  trigger: PracticeTrigger;
  habitualDb: number | null;
  attempts: AttemptResult[];
  final: boolean;
}

export interface PatientCard {
  id: string;
  name: string;
  age: number;
  condition: string;
  expansion: boolean;
  therapist: string;
  history: PracticeDay[];
  protocol: PracticeProtocol;
  protocolVersion: number;
  /** Version sent and not yet acknowledged by the hub */
  protocolPending: number | null;
  protocolAck: { version: number; at: string } | null;
  status: SessionStatus;
  reasons: string[];
  live: LiveSession | null;
  /** Today's point, once a session closed (final telemetry) */
  today: PracticeDay | null;
  symptoms: string[];
  updatedAt: string | null;
}

export interface Alert {
  patientId: string;
  patientName: string;
  message: string;
  at: string;
}

export interface DashboardState {
  patients: Record<string, PatientCard>;
  transcripts: Record<string, TranscriptLine[]>;
  alerts: Alert[];
}

const MAX_TRANSCRIPT = 60;
const MAX_ALERTS = 20;
const fmt = (db: number) => `${db >= 0 ? '+' : ''}${db.toFixed(1).replace('.', ',')} dB`;

/** Status of a patient from the seeded history alone (before any live session). */
export function historyStatus(p: Pick<PracticePatient, 'history' | 'protocol'>): { status: SessionStatus; reasons: string[] } {
  const t = DEFAULT_THRESHOLDS;
  const missed = missedDaysBefore(p.history);
  if (missed >= t.reviewMissedDays) return { status: 'REVIEW', reasons: [`${missed} dias seguidos sem treinar`] };

  const practiced = p.history.filter((d) => d.practiced && d.effortDb !== null);
  const last = practiced[practiced.length - 1];
  if (!last) return { status: 'BELOW_TARGET', reasons: ['Nenhum treino registrado'] };

  const prevAvg = recentAvgEffortDb(practiced.slice(0, -1));
  const drop = prevAvg !== null ? Math.round((prevAvg - last.effortDb!) * 10) / 10 : null;
  const lastLine = `Último treino: ${fmt(last.effortDb!)} (meta ${fmt(p.protocol.target_effort_db)})`;
  if (drop !== null && drop >= t.reviewDropDb) {
    return { status: 'REVIEW', reasons: [`Esforço ${fmt(drop).slice(1)} abaixo da média dos 7 treinos anteriores`] };
  }
  if ((drop !== null && drop >= t.watchDropDb) || last.effortDb! < p.protocol.target_effort_db) {
    const reasons = [lastLine];
    if (drop !== null && drop >= t.watchDropDb) reasons.push(`Queda de ${fmt(drop).slice(1)} em relação à média`);
    return { status: 'BELOW_TARGET', reasons };
  }
  return { status: 'ON_TARGET', reasons: [lastLine] };
}

export function initialDashboardState(): DashboardState {
  const patients: Record<string, PatientCard> = {};
  for (const p of PRACTICE_PATIENTS) {
    patients[p.id] = {
      id: p.id,
      name: p.name,
      age: p.age,
      condition: p.condition,
      expansion: !!p.expansion,
      therapist: p.therapist,
      history: p.history,
      protocol: p.protocol,
      protocolVersion: p.protocolVersion,
      protocolPending: null,
      protocolAck: null,
      ...historyStatus(p),
      live: null,
      today: null,
      symptoms: [],
      updatedAt: null,
    };
  }
  return { patients, transcripts: {}, alerts: [] };
}

function pushAlert(alerts: Alert[], alert: Alert): Alert[] {
  return [alert, ...alerts].slice(0, MAX_ALERTS);
}

function upsertLine(lines: TranscriptLine[], line: TranscriptLine): TranscriptLine[] {
  const same = (l: TranscriptLine) => l.turn_id === line.turn_id && l.speaker === line.speaker;
  const base = lines.length > 0 && lines[0].session_id !== line.session_id ? [] : lines;
  const i = base.findIndex(same);
  const next = i >= 0 ? base.map((l, j) => (j === i ? line : l)) : [...base, line];
  return next.slice(-MAX_TRANSCRIPT);
}

export function applyEvent(state: DashboardState, event: ClinicEvent): DashboardState {
  const prev = state.patients[event.patient_id];
  if (!prev) return state;
  const put = (card: PatientCard, extra: Partial<DashboardState> = {}): DashboardState => ({
    ...state,
    ...extra,
    patients: { ...state.patients, [card.id]: card },
  });

  switch (event.event_type) {
    case 'TRANSCRIPT_LINE':
      return {
        ...state,
        transcripts: { ...state.transcripts, [prev.id]: upsertLine(state.transcripts[prev.id] ?? [], event) },
      };

    case 'PROTOCOL_UPDATE': {
      if (event.protocol_version < prev.protocolVersion) return state;
      const acked = prev.protocolAck?.version === event.protocol_version;
      return put({
        ...prev,
        protocol: event.protocol,
        protocolVersion: event.protocol_version,
        protocolPending: acked ? null : event.protocol_version,
      });
    }

    case 'PROTOCOL_ACK': {
      if (event.protocol_version < prev.protocolVersion) return state;
      return put({
        ...prev,
        protocolAck: { version: event.protocol_version, at: event.timestamp },
        protocolPending: prev.protocolPending === event.protocol_version ? null : prev.protocolPending,
      });
    }

    case 'PRACTICE_TELEMETRY_UPDATE': {
      const newSession = prev.live?.sessionId !== event.session_id;
      const card: PatientCard = {
        ...prev,
        status: event.status,
        reasons: event.reasons,
        symptoms: event.reported_symptoms,
        live: {
          sessionId: event.session_id,
          trigger: event.trigger,
          habitualDb: event.habitual_level_db,
          attempts: event.attempts,
          final: event.final,
        },
        today: event.final ? dayFromAttempts(event.timestamp.slice(0, 10), event.attempts) : newSession ? null : prev.today,
        updatedAt: event.timestamp,
      };
      const turnedReview = event.status === 'REVIEW' && (prev.status !== 'REVIEW' || newSession);
      return put(card, {
        alerts: turnedReview
          ? pushAlert(state.alerts, {
              patientId: prev.id,
              patientName: prev.name,
              message: event.reasons.join(' · ') || 'Revisar com a fono',
              at: event.timestamp,
            })
          : state.alerts,
      });
    }

    default:
      // Deprecated V1 events (CHECKIN_TELEMETRY_UPDATE, EMERGENCY_TRIGGER) are ignored.
      return state;
  }
}
