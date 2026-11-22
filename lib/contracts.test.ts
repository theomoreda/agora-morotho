import { describe, expect, it } from 'vitest';
import { DEFAULT_PROTOCOL, parseClinicEvent, protocolErrors, type ClinicEvent } from './contracts';
import {
  mockAttemptNone,
  mockAttemptStrong,
  mockAttemptWeak,
  mockEmergency,
  mockPracticeFinal,
  mockPracticeInProgress,
  mockProtocolAck,
  mockProtocolUpdate,
  mockTelemetryGreen,
  mockTelemetryRed,
  mockTranscriptLine,
  mockTranscriptLineV2,
} from './mocks';

describe('parseClinicEvent (deprecated V1 events)', () => {
  it('accepts every mock event, as object or JSON string', () => {
    for (const ev of [mockTelemetryRed, mockTelemetryGreen, mockTranscriptLine, mockEmergency]) {
      expect(parseClinicEvent(ev)).toEqual({ ok: true, event: ev });
      expect(parseClinicEvent(JSON.stringify(ev))).toEqual({ ok: true, event: ev });
    }
  });

  it('keeps the PDF §4.4 golden case (1240 → 3890 ms = 213.7%, RED)', () => {
    const r = parseClinicEvent(mockTelemetryRed);
    expect(r.ok && r.event.event_type === 'CHECKIN_TELEMETRY_UPDATE' && r.event.vocal_biomarkers).toMatchObject({
      baseline_latency_ms: 1240,
      current_latency_ms: 3890,
      deviation_percent: 213.7,
    });
    expect(r.ok && r.event.event_type === 'CHECKIN_TELEMETRY_UPDATE' && r.event.triage_status).toBe('RED_ALERT');
  });

  it('rejects malformed JSON', () => {
    expect(parseClinicEvent('{not json').ok).toBe(false);
  });

  it('rejects unknown event types', () => {
    expect(parseClinicEvent({ ...mockEmergency, event_type: 'HELLO' }).ok).toBe(false);
  });

  it('rejects events missing required fields', () => {
    const { patient_id: _omit, ...noPatient } = mockTranscriptLine;
    expect(parseClinicEvent(noPatient).ok).toBe(false);
  });

  it('rejects invalid enum values', () => {
    expect(parseClinicEvent({ ...mockTelemetryRed, triage_status: 'PURPLE' }).ok).toBe(false);
    expect(parseClinicEvent({ ...mockTranscriptLine, speaker: 'ROBOT' }).ok).toBe(false);
    expect(parseClinicEvent({ ...mockEmergency, trigger_source: 'SCHEDULED_MEDICATION_CHECK' }).ok).toBe(false);
  });

  it('rejects wrong field types in nested objects', () => {
    const bad = {
      ...mockTelemetryRed,
      vocal_biomarkers: { ...mockTelemetryRed.vocal_biomarkers, current_latency_ms: '3890' },
    };
    expect(parseClinicEvent(bad).ok).toBe(false);
  });

  it('allows null latencies (no answer / calibration phase)', () => {
    const noAnswer = {
      ...mockTelemetryRed,
      vocal_biomarkers: { baseline_latency_ms: null, current_latency_ms: null, deviation_percent: null, intra_utterance_pauses_count: 0 },
    };
    expect(parseClinicEvent(noAnswer).ok).toBe(true);
  });
});

// =====================================================================
// v2 — Parkinson voice coach
// =====================================================================

describe('parseClinicEvent v2', () => {
  const v2Events: ClinicEvent[] = [
    mockProtocolUpdate,
    mockProtocolAck,
    mockPracticeInProgress,
    mockPracticeFinal,
    mockTranscriptLineV2,
  ];

  it('accepts every v2 mock, as object or JSON string', () => {
    for (const ev of v2Events) {
      expect(parseClinicEvent(ev)).toEqual({ ok: true, event: ev });
      expect(parseClinicEvent(JSON.stringify(ev))).toEqual({ ok: true, event: ev });
    }
  });

  it('keeps the golden case: habitual −38 dBFS → +3 dB below, +8 dB on the +6 dB target', () => {
    expect(mockAttemptWeak).toMatchObject({ effort_db: 3, met_target: false });
    expect(mockAttemptStrong).toMatchObject({ effort_db: 8, met_target: true });
    const r = parseClinicEvent(mockPracticeFinal);
    expect(r.ok && r.event.event_type === 'PRACTICE_TELEMETRY_UPDATE' && r.event.status).toBe('ON_TARGET');
  });

  it('accepts a no-attempt result with null measurements', () => {
    const ev = { ...mockPracticeInProgress, attempts: [mockAttemptNone] };
    expect(parseClinicEvent(ev).ok).toBe(true);
  });

  it('rejects malformed attempts inside telemetry', () => {
    const badKind = { ...mockPracticeInProgress, attempts: [{ ...mockAttemptWeak, kind: 'scream' }] };
    const badEffort = { ...mockPracticeInProgress, attempts: [{ ...mockAttemptWeak, effort_db: '3' }] };
    const notArray = { ...mockPracticeInProgress, attempts: mockAttemptWeak };
    expect(parseClinicEvent(badKind).ok).toBe(false);
    expect(parseClinicEvent(badEffort).ok).toBe(false);
    expect(parseClinicEvent(notArray).ok).toBe(false);
  });

  it('rejects invalid status, trigger and non-integer versions', () => {
    expect(parseClinicEvent({ ...mockPracticeFinal, status: 'GREEN_STABLE' }).ok).toBe(false);
    expect(parseClinicEvent({ ...mockPracticeFinal, trigger: 'EDGE_KEYWORD' }).ok).toBe(false);
    expect(parseClinicEvent({ ...mockProtocolAck, protocol_version: 1.5 }).ok).toBe(false);
  });

  it('rejects a PROTOCOL_UPDATE carrying an invalid protocol', () => {
    const twoPhrases = { ...mockProtocolUpdate, protocol: { ...mockProtocolUpdate.protocol, phrases: ['a', 'b'] } };
    expect(parseClinicEvent(twoPhrases).ok).toBe(false);
  });

  it('does not treat inherited object keys as event types', () => {
    expect(parseClinicEvent({ ...mockProtocolAck, event_type: 'toString' }).ok).toBe(false);
  });
});

describe('protocolErrors', () => {
  it('accepts the default protocol', () => {
    expect(protocolErrors(DEFAULT_PROTOCOL)).toEqual([]);
  });

  it('reports every problem in pt-BR', () => {
    const errors = protocolErrors({
      phrases: ['Bom dia', '   ', 'x'.repeat(81)],
      target_effort_db: 40,
      sustain: { target_duration_ms: 500, attempts: 0 },
    });
    expect(errors).toEqual([
      'frase 2 vazia',
      'frase 3 passa de 80 caracteres',
      'meta de esforço deve ficar entre 1 e 20 dB',
      'meta do "Aaa" deve ficar entre 2 e 30 s',
      'tentativas do "Aaa" devem ser entre 1 e 3',
    ]);
  });

  it('requires exactly three phrases and the sustain block', () => {
    expect(protocolErrors({ ...DEFAULT_PROTOCOL, phrases: ['a', 'b', 'c', 'd'] })).toContain(
      'são necessárias exatamente 3 frases',
    );
    expect(protocolErrors({ phrases: DEFAULT_PROTOCOL.phrases, target_effort_db: 6 })).toEqual([
      'configuração do "Aaa" ausente',
    ]);
    expect(protocolErrors(null)).toEqual(['protocolo ausente']);
  });
});
