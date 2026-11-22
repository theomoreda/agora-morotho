import { describe, expect, it } from 'vitest';
import { HELENA_PROFILE } from '@/data/patients';
import { parseClinicEvent } from '@/lib/contracts';
import { createSessionTracker, questionFor, type TrackerOptions } from './session-tracker';

const NOW = new Date('2026-11-22T08:02:00-03:00');
const base: TrackerOptions = {
  mode: 'checkin',
  patient: HELENA_PROFILE,
  baselineMs: 1240,
  sessionId: 'sess-test',
  triggerSource: 'SCHEDULED_MEDICATION_CHECK',
  vad: { threshold: 0.05, minSpeechMs: 150, minGapMs: 200 },
  guardMs: 250,
  now: () => NOW,
  timeZone: 'America/Sao_Paulo',
};

type Tracker = ReturnType<typeof createSessionTracker>;

/** Simulates one agent question → patient answer exchange on a 50 ms tick. */
function exchange(
  tr: Tracker,
  t0: number,
  agentText: string,
  answer: { text: string; latencyMs: number | null; speech?: Array<[startOffset: number, endOffset: number]> },
): number {
  tr.agentState('speaking', t0);
  tr.agentText(agentText);
  let t = t0;
  for (; t < t0 + 2000; t += 50) {
    tr.agentAudio(t, 0.3);
    tr.micLevel(t, 0.01);
  }
  const agentEnd = t; // first silent agent frame
  tr.agentState('listening', agentEnd + 120); // RTM state event arrives a bit later
  const speech = answer.latencyMs === null ? [] : (answer.speech ?? [[0, 1200]]).map(([a, b]) => [agentEnd + answer.latencyMs! + a, agentEnd + answer.latencyMs! + b]);
  const end = answer.latencyMs === null ? agentEnd + 9000 : speech[speech.length - 1][1] + 1800;
  for (t = agentEnd; t < end; t += 50) {
    tr.agentAudio(t, 0.001);
    tr.micLevel(t, speech.some(([a, b]) => t >= a && t < b) ? 0.2 : 0.01);
  }
  if (answer.text) tr.userText(answer.text);
  tr.agentState('thinking', end);
  return end + 500;
}

describe('questionFor', () => {
  it.each([
    ['Bom dia, Dona Helena! Aqui é o Gabriel, da clínica. Como a senhora está se sentindo hoje?', 'Q1_DISPOSITION'],
    ['Que bom! Dona Helena, a senhora já tomou a Losartana das oito horas?', 'Q2_MEDICATION'],
    ['E me conta, agora é de manhã, de tarde ou de noite?', 'Q3_ORIENTATION'],
    ['Obrigado, Dona Helena. Até mais tarde, Dona Helena.', null],
  ])('%s → %s', (text, q) => {
    expect(questionFor('checkin', text)).toBe(q);
  });

  it('maps the emergency greeting', () => {
    expect(questionFor('emergency', 'Dona Helena, aqui é o Gabriel. Ouvi um chamado. Está tudo bem com a senhora?')).toBe('EMERGENCY_CHECK');
  });
});

describe('session tracker — scheduled check-in', () => {
  it('Moment 1: measures ~1.2 s latency on Q1 and stays GREEN', () => {
    const tr = createSessionTracker(base);
    exchange(tr, 0, 'Bom dia, Dona Helena! Como a senhora está se sentindo hoje?', { text: 'Estou bem, obrigada', latencyMs: 1200 });
    const [m] = tr.measurements();
    expect(m.questionId).toBe('Q1_DISPOSITION');
    expect(m.latencyMs).toBeGreaterThanOrEqual(1150);
    expect(m.latencyMs).toBeLessThanOrEqual(1300);
    expect(tr.telemetry(false).triage_status).toBe('GREEN_STABLE');
  });

  it('Moment 2: long hesitation on Q2 + "não lembro" → RED with ~200% deviation', () => {
    const tr = createSessionTracker(base);
    const t = exchange(tr, 0, 'Como a senhora está se sentindo hoje?', { text: 'Estou bem', latencyMs: 1200 });
    exchange(tr, t, 'A senhora já tomou a Losartana das oito horas?', {
      text: 'Hum... acho que... não lembro',
      latencyMs: 3900,
      speech: [
        [0, 400],
        [1300, 1800],
        [2800, 3400],
      ],
    });
    const ev = tr.telemetry(false);
    expect(ev.vocal_biomarkers.current_latency_ms).toBeGreaterThanOrEqual(3850);
    expect(ev.vocal_biomarkers.deviation_percent).toBeGreaterThan(200);
    expect(ev.vocal_biomarkers.intra_utterance_pauses_count).toBe(2);
    expect(ev.clinical_extraction.medication_confirmed).toBe(false);
    expect(ev.triage_status).toBe('RED_ALERT');
    expect(ev.recommended_action).toBe('IMMEDIATE_NURSE_CALLBACK');
    expect(parseClinicEvent(ev).ok).toBe(true);
  });

  it('ignores TTS echo picked up within the guard window after the agent stops', () => {
    const tr = createSessionTracker(base);
    tr.agentState('speaking', 0);
    tr.agentText('Como a senhora está se sentindo hoje?');
    for (let t = 0; t < 1000; t += 50) tr.agentAudio(t, 0.3);
    tr.agentState('listening', 1100);
    for (let t = 1000; t < 1200; t += 50) tr.micLevel(t, 0.3); // echo tail
    for (let t = 1200; t < 2000; t += 50) tr.micLevel(t, 0.01);
    for (let t = 2000; t < 3000; t += 50) tr.micLevel(t, 0.2); // real answer at +1000 ms
    tr.agentState('thinking', 4500);
    expect(tr.measurements()[0].latencyMs).toBe(1000);
  });

  it('extracts orientation from Q3 and completes after the farewell', () => {
    const tr = createSessionTracker(base);
    let t = exchange(tr, 0, 'Como a senhora está se sentindo hoje?', { text: 'Bem', latencyMs: 1100 });
    t = exchange(tr, t, 'A senhora já tomou a Losartana das oito horas?', { text: 'Já tomei sim', latencyMs: 1200 });
    t = exchange(tr, t, 'E me conta, agora é de manhã, de tarde ou de noite?', { text: 'De manhã', latencyMs: 1300 });
    expect(tr.isComplete()).toBe(false);
    tr.agentState('speaking', t);
    tr.agentText('Obrigado, Dona Helena. Até mais tarde, Dona Helena.');
    tr.agentState('listening', t + 3000);
    expect(tr.isComplete()).toBe(true);
    const ev = tr.telemetry(true);
    expect(ev.final).toBe(true);
    expect(ev.clinical_extraction).toMatchObject({ medication_confirmed: true, temporal_orientation: 'OK', reported_symptoms: [] });
    expect(ev.triage_status).toBe('GREEN_STABLE');
  });

  it('no answer → RED "Sem resposta"', () => {
    const tr = createSessionTracker(base);
    exchange(tr, 0, 'Como a senhora está se sentindo hoje?', { text: '', latencyMs: null });
    const ev = tr.telemetry(false);
    expect(ev.vocal_biomarkers.current_latency_ms).toBeNull();
    expect(ev.triage_status).toBe('RED_ALERT');
    expect(ev.triage_reasons).toContain('Sem resposta do paciente');
  });

  it('the silence reminder keeps the same question open (latency counts from the original question)', () => {
    const tr = createSessionTracker(base);
    tr.agentState('speaking', 0);
    tr.agentText('Como a senhora está se sentindo hoje?');
    for (let t = 0; t < 1000; t += 50) tr.agentAudio(t, 0.3);
    tr.agentState('listening', 1000);
    for (let t = 1000; t < 9000; t += 50) tr.micLevel(t, 0.01);
    tr.agentState('speaking', 9000); // silence_config reminder
    tr.agentText('Estou aqui, pode falar com calma.');
    for (let t = 9000; t < 10000; t += 50) tr.agentAudio(t, 0.3);
    tr.agentState('listening', 10000);
    for (let t = 10000; t < 11000; t += 50) tr.micLevel(t, 0.01);
    for (let t = 11000; t < 12000; t += 50) tr.micLevel(t, 0.2);
    tr.userText('Estou bem');
    tr.agentState('thinking', 13800);
    const ms = tr.measurements();
    expect(ms).toHaveLength(1);
    expect(ms[0].questionId).toBe('Q1_DISPOSITION');
    expect(ms[0].latencyMs).toBe(10000);
  });

  it('opens the measurement when the agent text arrives just after the listening event', () => {
    const tr = createSessionTracker(base);
    tr.agentState('speaking', 0);
    for (let t = 0; t < 1000; t += 50) tr.agentAudio(t, 0.3);
    tr.agentState('listening', 1050);
    tr.agentText('Como a senhora está se sentindo hoje?'); // late transcript
    for (let t = 1000; t < 2000; t += 50) tr.micLevel(t, 0.01);
    for (let t = 2000; t < 3000; t += 50) tr.micLevel(t, 0.2);
    tr.agentState('thinking', 4800);
    expect(tr.measurements()[0]).toMatchObject({ questionId: 'Q1_DISPOSITION', latencyMs: 1000 });
  });

  it('reports symptoms mentioned in any answer', () => {
    const tr = createSessionTracker(base);
    exchange(tr, 0, 'Como a senhora está se sentindo hoje?', { text: 'Tô com uma tontura quando levanto', latencyMs: 1200 });
    const ev = tr.telemetry(false);
    expect(ev.clinical_extraction.reported_symptoms).toEqual(['tontura']);
    expect(ev.triage_status).toBe('RED_ALERT');
  });
});

describe('session tracker — real Agora state sequence (silent/speaking only, no listening/thinking)', () => {
  it('measures answers and completes using only silent/speaking states', () => {
    const tr = createSessionTracker(base);
    const turn = (t0: number, agentText: string, answerLatency: number, answer: string) => {
      tr.agentState('speaking', t0);
      tr.agentText(agentText);
      tr.agentState('speaking', t0 + 1500); // duplicate speaking event mid-turn (seen in real logs)
      let t = t0;
      for (; t < t0 + 2000; t += 50) tr.agentAudio(t, 0.8);
      const end = t;
      tr.agentState('silent', end + 60);
      for (t = end; t < end + answerLatency + 1500 + 1800; t += 50) {
        tr.agentAudio(t, 0);
        tr.micLevel(t, t >= end + answerLatency && t < end + answerLatency + 1500 ? 0.4 : 0.01);
      }
      tr.userText(answer);
      return t;
    };
    let t = turn(0, 'Bom dia, Dona Helena! Como a senhora está se sentindo hoje?', 1200, 'Estou bem');
    t = turn(t + 300, 'A senhora já tomou a Losartana das oito horas?', 3900, 'acho que não lembro');
    tr.agentState('speaking', t + 300); // agent replies → closes Q2
    expect(tr.measurements().map((m) => [m.questionId, m.latencyMs])).toEqual([
      ['Q1_DISPOSITION', 1200],
      ['Q2_MEDICATION', 3900],
    ]);
    expect(tr.telemetry(false).triage_status).toBe('RED_ALERT');
    tr.agentText('Tudo bem, a enfermeira vai ligar. Até mais tarde, Dona Helena.');
    tr.agentState('silent', t + 3000);
    expect(tr.isComplete()).toBe(true);
  });
});

describe('session tracker — robustness', () => {
  it('discards a measurement opened by early transcript when the agent starts speaking right away', () => {
    const tr = createSessionTracker(base);
    tr.agentText('Bom dia, Dona Helena! Como a senhora está se sentindo hoje?'); // text before audio
    tr.agentState('silent', 1000);
    tr.agentState('speaking', 1010);
    for (let t = 1000; t < 3000; t += 50) tr.agentAudio(t, 0.8);
    tr.agentState('silent', 3050);
    for (let t = 3000; t < 4200; t += 50) tr.micLevel(t, 0.01);
    for (let t = 4200; t < 5200; t += 50) tr.micLevel(t, 0.4);
    tr.agentState('speaking', 7000);
    expect(tr.measurements().map((m) => [m.questionId, m.latencyMs])).toEqual([['Q1_DISPOSITION', 1200]]);
  });

  it('an unmatched agent question counts as the next question not asked yet', () => {
    const tr = createSessionTracker(base);
    exchange(tr, 0, 'Como a senhora está se sentindo hoje?', { text: 'Bem', latencyMs: 1000 });
    exchange(tr, 10_000, 'E aquele comprimido de pressão da manhã, a senhora já pegou?', { text: 'Não sei', latencyMs: 1000 });
    expect(tr.measurements().map((m) => m.questionId)).toEqual(['Q1_DISPOSITION', 'Q2_MEDICATION']);
  });

  it('a non-question agent turn (acknowledgement) opens no measurement', () => {
    expect(questionFor('checkin', 'Que bom ouvir isso.')).toBeNull();
  });
});

describe('session tracker — emergency verification', () => {
  const emergency: TrackerOptions = { ...base, mode: 'emergency', triggerSource: 'EDGE_KEYWORD' };
  const greeting = 'Dona Helena, aqui é o Gabriel. Ouvi um chamado. Está tudo bem com a senhora?';

  it('Moment 3: clear dismissal → GREEN false alarm, completes after farewell', () => {
    const tr = createSessionTracker(emergency);
    const t = exchange(tr, 0, greeting, { text: 'Foi só um barulho, estou bem', latencyMs: 1100 });
    tr.agentState('speaking', t);
    tr.agentText('Que bom! Fica tudo registrado. Qualquer coisa é só chamar, Dona Helena.');
    tr.agentState('listening', t + 3000);
    const ev = tr.telemetry(true);
    expect(ev.trigger_source).toBe('EDGE_KEYWORD');
    expect(ev.triage_status).toBe('GREEN_STABLE');
    expect(ev.triage_reasons).toContain('Falso alarme descartado por verificação ativa');
    expect(tr.isComplete()).toBe(true);
  });

  it('fall reported → RED', () => {
    const tr = createSessionTracker(emergency);
    exchange(tr, 0, greeting, { text: 'Eu caí, tô com dor', latencyMs: 1500 });
    expect(tr.telemetry(false).triage_status).toBe('RED_ALERT');
  });

  it('before any answer the emergency counts as not dismissed', () => {
    expect(createSessionTracker(emergency).telemetry(false).triage_status).toBe('RED_ALERT');
  });
});
