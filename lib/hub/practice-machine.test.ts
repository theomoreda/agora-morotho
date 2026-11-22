import { describe, expect, it } from 'vitest';
import { DEFAULT_PROTOCOL, parseClinicEvent, type PracticeProtocol } from '@/lib/contracts';
import { GOLDEN } from '@/lib/mocks';
import type { AttemptMeasurement } from '@/lib/vocal-metrics/level';
import {
  ECHO_GUARD_MS,
  nextExercise,
  practiceStep,
  practiceTelemetry,
  practiceView,
  startPractice,
  type Effect,
  type PracticeEvent,
  type PracticeState,
} from './practice-machine';

const init = () => startPractice({ address: 'Dona Helena', fallbackHabitualDb: -40 });
const at = '2026-11-22T08:00:41-03:00';
const m = (levelDb: number, ms: number): AttemptMeasurement => ({ levelDb, longestMs: ms, spanMs: ms });
const strongPhrase = m(-30, 1800);
const weakPhrase = m(-36, 1800);

/** Feeds events in order; returns the final state and every effect emitted. */
function play(events: PracticeEvent[], s: PracticeState = init()) {
  const effects: Effect[] = [];
  for (const e of events) {
    const t = practiceStep(s, e);
    s = t.state;
    effects.push(...t.effects);
  }
  return { s, effects };
}
const kinds = (effects: Effect[]) => effects.map((e) => e.type);
const coachTexts = (effects: Effect[]) =>
  effects.flatMap((e) => (e.type === 'coach' ? [e.message.text] : []));

/** agentDone (instruction finished) + measured attempt */
const attempt = (measurement: AttemptMeasurement | null, t = 1000): PracticeEvent[] => [
  { type: 'agentDone', at: t },
  { type: 'attemptMeasured', measurement, at },
];

describe('practice machine — golden demo session', () => {
  const { s, effects } = play([
    { type: 'calibrated', habitualDb: GOLDEN.habitualDb },
    { type: 'agentDone', at: 500 }, // agent's own reply to "how are you" → start
    ...attempt(m(GOLDEN.attempt1Db, 6000)), // Aaa #1 weak
    ...attempt(m(GOLDEN.attempt2Db, 9000)), // Aaa #2 strong
    ...attempt(strongPhrase), // phrase 1
    ...attempt(weakPhrase), // phrase 2 weak → retry
    ...attempt(strongPhrase), // phrase 2 retry ok
    ...attempt(strongPhrase), // phrase 3
    { type: 'agentDone', at: 9999 }, // summary spoken
  ]);

  it('ends done, with 6 attempts over 4 exercises, ON_TARGET', () => {
    expect(s.phase).toBe('done');
    expect(s.attempts.map((a) => `${a.exercise_id}#${a.attempt}:${a.met_target ? '✓' : '✗'}`)).toEqual([
      'sustain#1:✗',
      'sustain#2:✓',
      'phrase-1#1:✓',
      'phrase-2#1:✗',
      'phrase-2#2:✓',
      'phrase-3#1:✓',
    ]);
    expect(practiceView(s).summary).toEqual({ total: 4, metCount: 4, meanEffortDb: 8 });
  });

  it('asks for exactly the right things, in order', () => {
    const texts = coachTexts(effects);
    expect(texts).toHaveLength(7);
    expect(texts[0]).toMatch(/Voz habitual calibrada.*"Aaa"/);
    expect(texts[1]).toMatch(/tentativa 1.*ABAIXO DA META.*peça mais um "Aaa"/);
    expect(texts[2]).toMatch(/META ATINGIDA.*frase 1 de 3: "Bom dia, tudo bem\?"/);
    expect(texts[3]).toMatch(/frase 2 de 3: "Eu quero um copo de água\."/);
    expect(texts[4]).toMatch(/ABAIXO DA META.*repetir, mais forte, a frase "Eu quero um copo de água\."/);
    expect(texts[5]).toMatch(/frase 3 de 3/);
    expect(texts[6]).toMatch(/atingiu a meta em 4 de 4 exercícios/);
  });

  it('mutes only while measuring, publishes every attempt and the final one, then stops', () => {
    const seq = kinds(effects).filter((k) => k !== 'coach');
    const perAttempt = ['mute', 'measure', 'mute', 'publish'];
    expect(seq).toEqual([...Array(6).fill(perAttempt).flat(), 'stop']);
    const publishes = effects.filter((e) => e.type === 'publish');
    expect(publishes.map((p) => p.type === 'publish' && p.final)).toEqual([false, false, false, false, false, true]);
    const mutes = effects.flatMap((e) => (e.type === 'mute' ? [e.muted] : []));
    expect(mutes).toEqual(Array(6).fill([true, false]).flat());
  });

  it('builds a valid telemetry event for the dashboard', () => {
    const ev = practiceTelemetry(s, true, {
      patientId: 'PK-2026-031',
      patientName: 'Helena Costa (72 anos)',
      sessionId: 'sess-1',
      trigger: 'VOICE_COMMAND',
      protocolVersion: 1,
      now: new Date('2026-11-22T11:01:52Z'),
    });
    expect(parseClinicEvent(ev).ok).toBe(true);
    expect(ev).toMatchObject({ status: 'ON_TARGET', habitual_level_db: -38, final: true });
    expect(ev.attempts).toHaveLength(6);
  });
});

describe('practice machine — transitions', () => {
  it('opens the measuring window after the echo guard', () => {
    const { effects } = play([{ type: 'calibrated', habitualDb: -38 }, { type: 'agentDone', at: 0 }, { type: 'agentDone', at: 5000 }]);
    expect(effects).toContainEqual({ type: 'measure', openedAt: 5000 + ECHO_GUARD_MS, exercise: { kind: 'sustain', attempt: 1 } });
  });

  it('falls back to the profile habitual level when calibration fails', () => {
    const { s } = play([{ type: 'calibrated', habitualDb: null }]);
    expect(s.habitualDb).toBe(-40);
  });

  it('ignores agentDone while calibrating and attempts outside a window', () => {
    const s0 = init();
    expect(practiceStep(s0, { type: 'agentDone', at: 1 })).toEqual({ state: s0, effects: [] });
    expect(practiceStep(s0, { type: 'attemptMeasured', measurement: null, at })).toEqual({ state: s0, effects: [] });
  });

  it('a no-attempt is reassured and retried (counts as an attempt)', () => {
    const { s, effects } = play([{ type: 'calibrated', habitualDb: -38 }, { type: 'agentDone', at: 0 }, ...attempt(null)]);
    expect(s.attempts[0]).toMatchObject({ no_attempt: true });
    expect(s.current).toEqual({ kind: 'sustain', attempt: 2 });
    expect(coachTexts(effects)[1]).toMatch(/não vocalizou.*peça mais um "Aaa"/);
  });

  it('moves on after the last allowed try even if below target', () => {
    const one: PracticeProtocol = { ...DEFAULT_PROTOCOL, sustain: { ...DEFAULT_PROTOCOL.sustain, attempts: 1 } };
    expect(nextExercise(one, { kind: 'sustain', attempt: 1 }, { met_target: false } as never)).toEqual({ kind: 'phrase', index: 0, attempt: 1 });
    expect(nextExercise(one, { kind: 'phrase', index: 2, attempt: 2 }, { met_target: false } as never)).toBeNull();
  });

  it('applies a protocol update before the first exercise, not after', () => {
    const custom = { ...DEFAULT_PROTOCOL, phrases: ['A', 'B', 'Quero um café com leite.'] };
    const before = play([{ type: 'protocolUpdated', protocol: custom }]).s;
    expect(before.protocol.phrases[2]).toBe('Quero um café com leite.');
    const after = play(
      [{ type: 'calibrated', habitualDb: -38 }, { type: 'agentDone', at: 0 }, ...attempt(m(-30, 9000)), { type: 'protocolUpdated', protocol: custom }],
    ).s;
    expect(after.protocol).toEqual(DEFAULT_PROTOCOL);
  });

  it('records dysphagia reports and publishes them live mid-session', () => {
    const { s, effects } = play([
      { type: 'calibrated', habitualDb: -38 },
      { type: 'agentDone', at: 0 },
      ...attempt(m(-30, 9000)),
      { type: 'patientSaid', text: 'Ontem eu engasguei no almoço' },
      { type: 'patientSaid', text: 'engasguei de novo' },
    ]);
    expect(s.symptoms).toEqual(['engasgo']);
    expect(kinds(effects).slice(-1)).toEqual(['publish']);
    const ev = practiceTelemetry(s, false, {
      patientId: 'p',
      patientName: 'n',
      sessionId: 's',
      trigger: 'BUTTON',
      protocolVersion: 1,
      now: new Date(0),
    });
    expect(ev.status).toBe('REVIEW');
  });

  it('resume mid-measurement unmutes and re-asks the same exercise', () => {
    const mid = play([{ type: 'calibrated', habitualDb: -38 }, { type: 'agentDone', at: 0 }, { type: 'agentDone', at: 1000 }]).s;
    expect(mid.phase).toBe('measuring');
    const { state, effects } = practiceStep(mid, { type: 'resume' });
    expect(state.phase).toBe('instructing');
    expect(state.current).toEqual({ kind: 'sustain', attempt: 1 });
    expect(kinds(effects)).toEqual(['mute', 'coach']);
    expect(coachTexts(effects)[0]).toMatch(/conexão voltou.*"Aaa"/);
  });

  it('resume while closing re-sends the summary', () => {
    const one: PracticeProtocol = { ...DEFAULT_PROTOCOL, sustain: { target_duration_ms: 8000, attempts: 1 } };
    const s0 = startPractice({ address: 'Dona Helena', fallbackHabitualDb: -40, protocol: one });
    const closing = play(
      [{ type: 'calibrated', habitualDb: -38 }, { type: 'agentDone', at: 0 }, ...attempt(m(-30, 9000)), ...attempt(strongPhrase), ...attempt(strongPhrase), ...attempt(strongPhrase)],
      s0,
    ).s;
    expect(closing.phase).toBe('closing');
    const { effects } = practiceStep(closing, { type: 'resume' });
    expect(coachTexts(effects)[0]).toMatch(/atingiu a meta em 4 de 4/);
  });

  it('view exposes the phrase in large type and the targets', () => {
    const s = play([{ type: 'calibrated', habitualDb: -38 }, { type: 'agentDone', at: 0 }, ...attempt(m(-30, 9000))]).s;
    expect(practiceView(s)).toMatchObject({
      phase: 'instructing',
      phrase: 'Bom dia, tudo bem?',
      targetEffortDb: 6,
      targetDurationMs: null,
      lastAttempt: { exercise_id: 'sustain', met_target: true },
    });
  });
});
