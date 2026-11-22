import { describe, expect, it } from 'vitest';
import { DEFAULT_PROTOCOL, type AttemptResult } from '@/lib/contracts';
import { GOLDEN, mockAttemptStrong, mockAttemptWeak } from '@/lib/mocks';
import { detectSymptoms } from '@/lib/vocal-biomarkers/extraction';
import { DEFAULT_DETECTOR, framesOf, startDetector, stepDetector, type DetectorState } from './attempt-detector';
import {
  buildAttemptResult,
  dbToRms,
  habitualLevelDb,
  levelDb,
  measureAttempt,
  median,
  SILENCE_DB,
  type EnergyFrame,
} from './level';
import { bestAttempts, exerciseSummary, sessionStatus, type StatusContext } from './status';

const STEP = 20; // 50 Hz

/** Frames from `from` (inclusive) to `to` (exclusive) at a constant dBFS level. */
function run(from: number, to: number, db: number): EnergyFrame[] {
  const out: EnergyFrame[] = [];
  for (let t = from; t < to; t += STEP) out.push({ t, rms: db === SILENCE_DB ? 0 : dbToRms(db) });
  return out;
}
const silence = (from: number, to: number) => run(from, to, -70);

describe('level', () => {
  it('converts RMS to dBFS and back', () => {
    expect(levelDb(1)).toBe(0);
    expect(levelDb(0.1)).toBeCloseTo(-20, 6);
    expect(levelDb(0)).toBe(SILENCE_DB);
    expect(levelDb(dbToRms(-38))).toBeCloseTo(-38, 6);
  });

  it('median handles odd, even and empty inputs', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe('habitualLevelDb', () => {
  it('is the median voiced level of the greeting answer, ignoring silence', () => {
    const frames = [...silence(0, 500), ...run(500, 1500, -38), ...silence(1500, 2000), ...run(2000, 2600, -40)];
    expect(habitualLevelDb(frames)).toBe(-38);
  });

  it('returns null with less than 400 ms of voice', () => {
    expect(habitualLevelDb([...silence(0, 500), ...run(500, 800, -38), ...silence(800, 1200)])).toBeNull();
  });
});

describe('measureAttempt + buildAttemptResult (golden case)', () => {
  const at = '2026-11-22T08:00:41-03:00';
  const habitualDb = GOLDEN.habitualDb;

  it('Aaa #1: −35 dBFS for 6 s → +3 dB, 6 s, below target', () => {
    const m = measureAttempt([...silence(0, 300), ...run(300, 6300, GOLDEN.attempt1Db), ...silence(6300, 7300)]);
    expect(m).toEqual({ levelDb: -35, longestMs: 6000, spanMs: 6000 });
    const r = buildAttemptResult({ kind: 'sustain', attempt: 1, measurement: m, habitualDb, protocol: DEFAULT_PROTOCOL, at });
    expect(r).toEqual(mockAttemptWeak);
  });

  it('Aaa #2: −30 dBFS for 9 s → +8 dB, 9 s, on target', () => {
    const m = measureAttempt(run(0, 9000, GOLDEN.attempt2Db));
    const r = buildAttemptResult({
      kind: 'sustain',
      attempt: 2,
      measurement: m,
      habitualDb,
      protocol: DEFAULT_PROTOCOL,
      at: mockAttemptStrong.at,
    });
    expect(r).toEqual(mockAttemptStrong);
  });

  it('a loud but short "Aaa" misses the duration target', () => {
    const m = measureAttempt(run(0, 4000, -28));
    const r = buildAttemptResult({ kind: 'sustain', attempt: 1, measurement: m, habitualDb, protocol: DEFAULT_PROTOCOL, at });
    expect(r).toMatchObject({ effort_db: 10, duration_ms: 4000, met_target: false });
  });

  it('phonation time is the longest continuous run; tremor dips under 250 ms are bridged', () => {
    const frames = [...run(0, 3000, -30), ...silence(3000, 3200), ...run(3200, 6000, -30), ...silence(6000, 7000), ...run(7000, 8000, -30)];
    expect(measureAttempt(frames)).toMatchObject({ longestMs: 6000, spanMs: 8000 });
  });

  it('a phrase only needs effort, uses the span and carries the phrase text', () => {
    const frames = [...run(0, 700, -31), ...silence(700, 1100), ...run(1100, 1900, -31)];
    const r = buildAttemptResult({
      kind: 'phrase',
      attempt: 1,
      phraseIndex: 2,
      measurement: measureAttempt(frames),
      habitualDb,
      protocol: DEFAULT_PROTOCOL,
      at,
    });
    expect(r).toMatchObject({
      exercise_id: 'phrase-3',
      phrase: DEFAULT_PROTOCOL.phrases[2],
      effort_db: 7,
      duration_ms: 1900,
      target_duration_ms: null,
      met_target: true,
    });
  });

  it('nothing voiced → no attempt with null measurements', () => {
    expect(measureAttempt(silence(0, 8000))).toBeNull();
    const r = buildAttemptResult({ kind: 'sustain', attempt: 1, measurement: null, habitualDb, protocol: DEFAULT_PROTOCOL, at });
    expect(r).toMatchObject({ no_attempt: true, met_target: false, effort_db: null, duration_ms: null });
  });
});

describe('attempt detector', () => {
  const feed = (frames: EnergyFrame[], openedAt = 0) =>
    frames.reduce<DetectorState>((s, f) => stepDetector(s, f), startDetector(openedAt));

  it('ends 1 s after the voice stops and returns only the attempt frames', () => {
    const s = feed([...silence(0, 1000), ...run(1000, 7000, -35), ...silence(7000, 9000)]);
    expect(s).toMatchObject({ phase: 'done', outcome: 'ended', onsetAt: 1000, endedAt: 6980 });
    const frames = framesOf(s);
    expect(frames[0].t).toBe(1000);
    expect(frames[frames.length - 1].t).toBe(6980);
    expect(measureAttempt(frames)?.longestMs).toBe(6000);
  });

  it('stops consuming frames once done', () => {
    const s = feed([...run(0, 2000, -35), ...silence(2000, 3100)]);
    expect(stepDetector(s, { t: 5000, rms: 1 })).toBe(s);
  });

  it('does not end on short pauses inside a phrase', () => {
    const s = feed([...run(0, 700, -31), ...silence(700, 1500), ...run(1500, 2500, -31)]);
    expect(s.phase).toBe('speaking');
  });

  it('ignores clicks shorter than 150 ms', () => {
    const s = feed([...silence(0, 500), ...run(500, 600, -20), ...silence(600, 2000)]);
    expect(s).toMatchObject({ phase: 'waiting', onsetAt: null });
  });

  it('declares no attempt after 8 s without voice', () => {
    const s = feed(silence(0, 8100));
    expect(s).toMatchObject({ phase: 'done', outcome: 'no_attempt', onsetAt: null });
    expect(framesOf(s)).toEqual([]);
  });

  it('discards a short burst (tail of earlier speech, cough) and waits for the real attempt', () => {
    const s = feed([...run(0, 200, -28), ...silence(200, 1500), ...run(1500, 4500, -30), ...silence(4500, 6000)]);
    expect(s).toMatchObject({ phase: 'done', outcome: 'ended', onsetAt: 1500 });
    expect(measureAttempt(framesOf(s))?.longestMs).toBe(3000);
  });

  it('only short bursts until the deadline → no attempt', () => {
    const s = feed([...run(0, 200, -28), ...silence(200, 4000), ...run(4000, 4200, -28), ...silence(4200, 8100)]);
    expect(s).toMatchObject({ phase: 'done', outcome: 'no_attempt' });
  });

  it('cuts very long attempts at 15 s', () => {
    const s = feed(run(0, 20000, -30));
    expect(s).toMatchObject({ outcome: 'max', endedAt: DEFAULT_DETECTOR.maxAttemptMs });
  });

  it('drops frames from before the window opened (TTS echo tail)', () => {
    const s = feed([...run(0, 400, -20), ...silence(400, 1400)], 500);
    expect(s.frames.every((f) => f.t >= 500)).toBe(true);
    expect(s.phase).toBe('waiting');
  });
});

describe('sessionStatus', () => {
  const ctx: StatusContext = { recentAvgEffortDb: 6.5, missedDaysBefore: 0, reportedSymptoms: [] };
  const phrase = (i: number, effort: number, met: boolean): AttemptResult => ({
    ...mockAttemptStrong,
    exercise_id: `phrase-${i}`,
    kind: 'phrase',
    attempt: 1,
    phrase: DEFAULT_PROTOCOL.phrases[i - 1],
    effort_db: effort,
    target_duration_ms: null,
    met_target: met,
  });

  it('uses the best attempt per exercise (weak then strong "Aaa" counts as met)', () => {
    expect(bestAttempts([mockAttemptWeak, mockAttemptStrong])).toEqual([mockAttemptStrong]);
    expect(exerciseSummary([mockAttemptWeak, mockAttemptStrong, phrase(1, 7, true)])).toEqual({
      total: 2,
      metCount: 2,
      meanEffortDb: 7.5,
    });
  });

  it('ON_TARGET when most exercises met the target', () => {
    const r = sessionStatus([mockAttemptWeak, mockAttemptStrong, phrase(1, 7, true), phrase(2, 4, false), phrase(3, 6.5, true)], ctx);
    expect(r).toEqual({ status: 'ON_TARGET', reasons: ['Meta atingida em 3 de 4 exercícios'] });
  });

  it('BELOW_TARGET when half or fewer met, or effort dropped ≥3 dB vs the 7-day average', () => {
    expect(sessionStatus([mockAttemptWeak, phrase(1, 7, true)], ctx).status).toBe('BELOW_TARGET');
    const dropped = sessionStatus([mockAttemptStrong, phrase(1, 6, true)], { ...ctx, recentAvgEffortDb: 10 });
    expect(dropped).toEqual({ status: 'BELOW_TARGET', reasons: ['Esforço 3,0 dB abaixo da média dos últimos 7 dias'] });
  });

  it('REVIEW on dysphagia, 2+ missed days or a ≥6 dB drop — with every reason listed', () => {
    const r = sessionStatus([mockAttemptWeak], {
      recentAvgEffortDb: 9.5,
      missedDaysBefore: 2,
      reportedSymptoms: ['engasgo', 'dor'],
    });
    expect(r.status).toBe('REVIEW');
    expect(r.reasons).toEqual([
      'Relato de engasgo — risco de aspiração, avaliar com a fono',
      '2 dias sem treinar antes de hoje',
      'Esforço 6,5 dB abaixo da média dos últimos 7 dias',
    ]);
  });

  it('handles an empty session and sessions with only no-attempts', () => {
    expect(sessionStatus([], ctx)).toEqual({ status: 'BELOW_TARGET', reasons: ['Nenhum exercício realizado ainda'] });
    const none = { ...mockAttemptWeak, effort_db: null, duration_ms: null, no_attempt: true };
    expect(sessionStatus([none], ctx).reasons).toEqual(['Nenhuma tentativa com voz registrada']);
  });

  it('no history → no drop rule', () => {
    expect(sessionStatus([mockAttemptStrong], { ...ctx, recentAvgEffortDb: null }).status).toBe('ON_TARGET');
  });
});

describe('dysphagia lexicon (detectSymptoms)', () => {
  it.each([
    ['Ontem eu engasguei no almoço', ['engasgo']],
    ['A comida entalou na garganta', ['engasgo']],
    ['Eu tusso quando bebo água, quando estou bebendo', ['tosse ao comer']],
    ['Tenho tido dificuldade para engolir', ['dificuldade para engolir']],
    ['Não tenho dificuldade para engolir', []],
    ['Estou bem, só um pouco cansada', []],
  ])('%s → %j', (text, expected) => {
    expect(detectSymptoms(text)).toEqual(expected);
  });
});
