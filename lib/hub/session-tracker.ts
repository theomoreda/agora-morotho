/**
 * Hub session tracker (pure, clock-injected): turns agent state + audio levels +
 * transcripts into per-question TurnMeasurements and a TelemetryEvent.
 *
 * Timing model: agentEndAt = end of the last agent audio frame heard locally (same
 * clock as the mic frames), falling back to the receipt time of the "listening" event.
 * Mic frames within `guardMs` of agentEndAt are ignored to drop TTS echo tails.
 */
import type { PatientProfile } from '@/data/patients';
import type { QuestionId, TelemetryEvent, TriggerSource, TurnMeasurement } from '@/lib/contracts';
import {
  deviationPercent,
  pausesOver,
  segmentSpeech,
  turnLatencyMs,
  type EnergyFrame,
  type SegmentOptions,
} from '@/lib/vocal-biomarkers/biomarkers';
import {
  detectSymptoms,
  isEmergencyDismissal,
  medicationConfirmed,
  normalize,
  temporalOrientation,
} from '@/lib/vocal-biomarkers/extraction';
import { triage } from '@/lib/vocal-biomarkers/triage';
import type { AgentMode } from '@/lib/voice-agent/prompts';

export interface TrackerOptions {
  mode: AgentMode;
  patient: PatientProfile;
  baselineMs: number | null;
  sessionId: string;
  triggerSource: TriggerSource;
  vad: SegmentOptions;
  guardMs?: number;
  /** Remote (agent) audio level that counts as the agent speaking */
  agentVoiceThreshold?: number;
  now?: () => Date;
  timeZone?: string;
}

export interface MeasuredAnswer extends TurnMeasurement {
  answerText: string;
}

interface OpenMeasurement {
  questionId: QuestionId;
  agentEndAt: number;
  listenFrom: number;
  frames: EnergyFrame[];
  texts: string[];
}

/** Agora ConvoAI emits silent/speaking (and sometimes idle/listening/thinking) — normalise. */
const AGENT_DONE = new Set(['listening', 'silent', 'idle']);
const AGENT_BUSY = new Set(['thinking', 'speaking']);

const MIN_LISTEN_MS = 1500;
const CHECKIN_ORDER: QuestionId[] = ['Q1_DISPOSITION', 'Q2_MEDICATION', 'Q3_ORIENTATION'];

const FAREWELL = /\b(ate mais tarde|qualquer coisa e so chamar)\b/;
const REMINDER = /\bestou aqui pode falar com calma\b/;

export function questionFor(mode: AgentMode, agentText: string): QuestionId | null {
  const t = normalize(agentText);
  if (mode === 'emergency') return /\bouvi um chamado\b|\besta tudo bem\b/.test(t) ? 'EMERGENCY_CHECK' : null;
  if (/\bmanha\b.*\btarde\b|\btarde\b.*\bnoite\b/.test(t)) return 'Q3_ORIENTATION';
  if (/\b(tomou|remedio|losartana)\b/.test(t)) return 'Q2_MEDICATION';
  if (/\bsentindo\b/.test(t)) return 'Q1_DISPOSITION';
  return null;
}

export function createSessionTracker(opts: TrackerOptions) {
  const guardMs = opts.guardMs ?? 250;
  const voiceThreshold = opts.agentVoiceThreshold ?? 0.05;
  const now = opts.now ?? (() => new Date());
  const timeZone = opts.timeZone ?? 'America/Sao_Paulo';

  let state = 'idle';
  let latestAgentText = '';
  let lastListeningText = '';
  let lastAgentVoiceAt: number | null = null;
  let lastAgentFrameAt: number | null = null;
  let agentStep = 0;
  let open: OpenMeasurement | null = null;
  let listeningEndAt: number | null = null; // agentEndAt of the current listening phase, if no question opened yet
  let pending: OpenMeasurement | null = null; // closed without speech by an agent turn (maybe a reminder)
  const closed: MeasuredAnswer[] = [];

  const finish = (m: OpenMeasurement): MeasuredAnswer => {
    const segments = segmentSpeech(m.frames, opts.vad);
    const onset = segments[0]?.start ?? null;
    return {
      questionId: m.questionId,
      agentEndAt: m.agentEndAt,
      userOnsetAt: onset,
      latencyMs: turnLatencyMs(m.agentEndAt, onset),
      pausesOver800: pausesOver(segments, 800),
      answerText: m.texts.join(' ').trim(),
    };
  };

  /** Keyword match first; otherwise an agent question ("?") is the next one not asked yet. */
  const resolveQuestion = (text: string): QuestionId | null => {
    const q = questionFor(opts.mode, text);
    if (q || !text.trim().endsWith('?')) return q;
    const asked = new Set<QuestionId>([...closed.map((m) => m.questionId), ...(open ? [open.questionId] : []), ...(pending ? [pending.questionId] : [])]);
    const order: QuestionId[] = opts.mode === 'checkin' ? CHECKIN_ORDER : ['EMERGENCY_CHECK'];
    return order.find((id) => !asked.has(id)) ?? null;
  };

  const flushPending = () => {
    if (pending) closed.push(finish(pending));
    pending = null;
  };

  const closeOpen = (reason: 'thinking' | 'speaking', t: number) => {
    if (!open) return;
    const hasSpeech = segmentSpeech(open.frames, opts.vad).length > 0;
    if (!hasSpeech && reason === 'speaking' && t - open.agentEndAt < MIN_LISTEN_MS) {
      open = null; // opened by an early transcript; the agent was still about to speak
      return;
    }
    if (!hasSpeech && reason === 'speaking') pending = open;
    else closed.push(finish(open));
    open = null;
  };

  return {
    agentAudio(t: number, level: number) {
      if (lastAgentFrameAt !== null) agentStep = t - lastAgentFrameAt;
      lastAgentFrameAt = t;
      if (level >= voiceThreshold) lastAgentVoiceAt = t;
    },

    micLevel(t: number, level: number) {
      if (open && t >= open.listenFrom) open.frames.push({ t, rms: level });
    },

    agentText(text: string) {
      latestAgentText = text;
      // transcript arrived after the listening event: open the question retroactively
      if (AGENT_DONE.has(state) && !open && listeningEndAt !== null) {
        const questionId = resolveQuestion(text);
        if (questionId) {
          open = { questionId, agentEndAt: listeningEndAt, listenFrom: listeningEndAt + guardMs, frames: [], texts: [] };
          listeningEndAt = null;
        }
        lastListeningText = text;
      }
    },

    userText(text: string) {
      const target = open ?? pending;
      if (target) target.texts.push(text);
      else if (closed.length > 0) {
        const last = closed[closed.length - 1];
        last.answerText = `${last.answerText} ${text}`.trim();
      }
    },

    agentState(next: string, t: number) {
      state = next;
      if (AGENT_BUSY.has(next)) {
        listeningEndAt = null;
        closeOpen(next === 'thinking' ? 'thinking' : 'speaking', t);
        return;
      }
      if (!AGENT_DONE.has(next)) return;
      if (open) return; // repeated silent/listening event: keep the measurement already open

      lastListeningText = latestAgentText;
      const agentEndAt = lastAgentVoiceAt !== null && lastAgentVoiceAt <= t ? lastAgentVoiceAt + agentStep : t;

      if (pending && REMINDER.test(normalize(latestAgentText))) {
        open = { ...pending, listenFrom: agentEndAt + guardMs, frames: [] };
        pending = null;
        return;
      }
      flushPending();
      const questionId = resolveQuestion(latestAgentText);
      if (questionId) open = { questionId, agentEndAt, listenFrom: agentEndAt + guardMs, frames: [], texts: [] };
      listeningEndAt = questionId ? null : agentEndAt;
    },

    measurements(): MeasuredAnswer[] {
      return [...closed];
    },

    isComplete(): boolean {
      return AGENT_DONE.has(state) && FAREWELL.test(normalize(lastListeningText));
    },

    telemetry(final: boolean): TelemetryEvent {
      const answers = [...closed];
      const byQ = (q: QuestionId) => answers.find((a) => a.questionId === q);
      const q2 = byQ('Q2_MEDICATION');
      const q3 = byQ('Q3_ORIENTATION');
      const check = byQ('EMERGENCY_CHECK');
      const allText = answers.map((a) => a.answerText).join('. ');

      const latencies = answers.map((a) => a.latencyMs).filter((v): v is number => v !== null);
      const worst = latencies.length ? Math.max(...latencies) : null;
      const pauses = answers.reduce((n, a) => n + a.pausesOver800, 0);
      const medConfirmed = q2 ? medicationConfirmed(q2.answerText) : null;
      const symptoms = detectSymptoms(allText);

      const result = triage({
        answered: answers.every((a) => a.userOnsetAt !== null),
        latencyMs: worst,
        baselineMs: opts.baselineMs,
        pausesOver800: pauses,
        medicationConfirmed: opts.mode === 'checkin' ? medConfirmed : null,
        reportedSymptoms: symptoms,
        emergency: opts.mode === 'emergency' ? { dismissed: !!check && isEmergencyDismissal(check.answerText) } : null,
      });

      const p = opts.patient;
      return {
        event_type: 'CHECKIN_TELEMETRY_UPDATE',
        timestamp: now().toISOString(),
        patient_id: p.id,
        patient_name: `${p.name} (${p.age} anos)`,
        session_id: opts.sessionId,
        trigger_source: opts.triggerSource,
        final,
        clinical_extraction: {
          medication_name: p.medication.name,
          medication_confirmed: opts.mode === 'checkin' ? medConfirmed : null,
          reported_symptoms: symptoms,
          temporal_orientation: q3 ? temporalOrientation(q3.answerText, now(), timeZone, { latencyMs: q3.latencyMs }) : 'UNKNOWN',
        },
        vocal_biomarkers: {
          baseline_latency_ms: opts.baselineMs,
          current_latency_ms: worst,
          deviation_percent: worst !== null && opts.baselineMs ? deviationPercent(worst, opts.baselineMs) : null,
          intra_utterance_pauses_count: pauses,
        },
        triage_status: result.status,
        recommended_action: result.action,
        triage_reasons: result.reasons,
      };
    },
  };
}

export type SessionTracker = ReturnType<typeof createSessionTracker>;
