import { describe, expect, it } from 'vitest';
import { PRACTICE_PATIENTS } from '@/data/seed-practice';
import type { PracticeTelemetryEvent } from '@/lib/contracts';
import {
  HELENA_V2,
  mockAttemptWeak,
  mockPracticeFinal,
  mockPracticeInProgress,
  mockProtocolAck,
  mockProtocolUpdate,
  mockTelemetryRed,
  mockTranscriptLineV2,
} from '@/lib/mocks';
import { adherence, dayFromAttempts, missedDaysBefore, recentAvgEffortDb, type PracticeDay } from '@/lib/vocal-metrics/history';
import { applyEvent, historyStatus, initialDashboardState, type DashboardState } from './state';

const reduce = (events: Parameters<typeof applyEvent>[1][], s: DashboardState = initialDashboardState()) => events.reduce(applyEvent, s);

describe('seed (simulated history)', () => {
  it('has 5 fictional patients with 14 days each, Helena first; deterministic', async () => {
    expect(PRACTICE_PATIENTS).toHaveLength(5);
    expect(PRACTICE_PATIENTS[0].id).toBe(HELENA_V2.id);
    expect(PRACTICE_PATIENTS.every((p) => p.history.length === 14)).toBe(true);
    const again = (await import('@/data/seed-practice')).PRACTICE_PATIENTS;
    expect(again[0].history).toEqual(PRACTICE_PATIENTS[0].history);
  });

  it('tells the intended stories through the status', () => {
    const s = initialDashboardState().patients;
    expect(s['PK-2026-018'].status).toBe('REVIEW'); // Antônio: 2 days without practice
    expect(s['PK-2026-018'].reasons).toEqual(['2 dias seguidos sem treinar']);
    expect(s['PK-2026-024'].status).toBe('ON_TARGET'); // Maria: steady above target
    expect(s['PK-2026-027'].status).toBe('BELOW_TARGET'); // José: fading effort
    expect(s['AV-2026-005'].expansion).toBe(true); // Lourdes: post-stroke expansion
  });
});

describe('history helpers', () => {
  const day = (practiced: boolean, effortDb: number | null = null): PracticeDay => ({
    date: '2026-11-01',
    practiced,
    effortDb,
    sustainMs: null,
    metCount: 0,
    total: 0,
  });

  it('recent average uses the last 7 practiced days', () => {
    const days = [day(true, 100), ...Array.from({ length: 7 }, (_, i) => day(true, i + 1)), day(false)];
    expect(recentAvgEffortDb(days)).toBe(4);
    expect(recentAvgEffortDb([day(false)])).toBeNull();
  });

  it('counts missed days at the end and adherence', () => {
    expect(missedDaysBefore([day(true, 1), day(false), day(false)])).toBe(2);
    expect(missedDaysBefore([day(false), day(true, 1)])).toBe(0);
    expect(adherence([day(true, 1), day(false), day(true, 2)])).toEqual({ practiced: 2, total: 3 });
  });

  it("builds today's point from the session attempts", () => {
    expect(dayFromAttempts('2026-11-22', mockPracticeFinal.attempts)).toEqual({
      date: '2026-11-22',
      practiced: true,
      effortDb: 7.6,
      sustainMs: 9000,
      metCount: 2,
      total: 2,
    });
  });

  it('historyStatus flags a ≥6 dB drop as REVIEW', () => {
    const days = [...Array.from({ length: 7 }, () => day(true, 8)), day(true, 1.5)];
    expect(historyStatus({ history: days, protocol: PRACTICE_PATIENTS[0].protocol }).status).toBe('REVIEW');
  });
});

describe('applyEvent', () => {
  it('protocol: sent → pending, ACK → confirmed (ACK before echo also works)', () => {
    const sent = reduce([mockProtocolUpdate]).patients[HELENA_V2.id];
    expect(sent).toMatchObject({ protocolVersion: 2, protocolPending: 2, protocolAck: null });
    expect(sent.protocol.phrases[2]).toBe('Quero um café com leite.');

    const acked = reduce([mockProtocolUpdate, mockProtocolAck]).patients[HELENA_V2.id];
    expect(acked).toMatchObject({ protocolPending: null, protocolAck: { version: 2 } });

    const echoAfterAck = reduce([mockProtocolUpdate, mockProtocolAck, mockProtocolUpdate]).patients[HELENA_V2.id];
    expect(echoAfterAck.protocolPending).toBeNull();
  });

  it('ignores stale protocol versions', () => {
    const s = reduce([mockProtocolUpdate]);
    const stale = applyEvent(s, { ...mockProtocolUpdate, protocol_version: 1 });
    expect(stale).toBe(s);
  });

  it('live telemetry updates the session, then final sets today and the status', () => {
    const mid = reduce([mockPracticeInProgress]).patients[HELENA_V2.id];
    expect(mid.live).toMatchObject({ sessionId: 'sess-pk-001', final: false, habitualDb: -38 });
    expect(mid.live?.attempts).toEqual([mockAttemptWeak]);
    expect(mid.status).toBe('BELOW_TARGET');
    expect(mid.today).toBeNull();

    const done = reduce([mockPracticeInProgress, mockPracticeFinal]).patients[HELENA_V2.id];
    expect(done.status).toBe('ON_TARGET');
    expect(done.today).toMatchObject({ practiced: true, effortDb: 7.6, sustainMs: 9000 });
  });

  it('raises an alert when a session turns REVIEW (dysphagia), once', () => {
    const review: PracticeTelemetryEvent = {
      ...mockPracticeInProgress,
      status: 'REVIEW',
      reasons: ['Relato de engasgo — risco de aspiração, avaliar com a fono'],
      reported_symptoms: ['engasgo'],
    };
    const s = reduce([review, { ...review, attempts: [...review.attempts, mockAttemptWeak] }]);
    expect(s.alerts).toHaveLength(1);
    expect(s.alerts[0]).toMatchObject({ patientName: 'Helena Costa', message: expect.stringContaining('engasgo') });
    expect(s.patients[HELENA_V2.id].symptoms).toEqual(['engasgo']);
  });

  it('keeps the live transcript per session and upserts partial lines', () => {
    const partial = { ...mockTranscriptLineV2, final: false, text: 'Isso, Dona' };
    const s = reduce([partial, mockTranscriptLineV2]);
    expect(s.transcripts[HELENA_V2.id]).toEqual([mockTranscriptLineV2]);
  });

  it('ignores unknown patients and deprecated V1 events', () => {
    const s0 = initialDashboardState();
    expect(applyEvent(s0, { ...mockPracticeFinal, patient_id: 'nobody' })).toBe(s0);
    expect(applyEvent(s0, { ...mockTelemetryRed, patient_id: HELENA_V2.id })).toBe(s0);
  });
});
