import { describe, expect, it } from 'vitest';
import { triage, type TriageInput } from './triage';

const calm: TriageInput = {
  answered: true,
  latencyMs: 1200,
  baselineMs: 1240,
  pausesOver800: 0,
  medicationConfirmed: true,
  reportedSymptoms: [],
  emergency: null,
};

describe('triage', () => {
  it('GREEN when everything is within baseline', () => {
    expect(triage(calm)).toEqual({ status: 'GREEN_STABLE', action: 'NONE', reasons: [] });
  });

  it('RED for the PDF golden case (213.7% deviation + medication not confirmed)', () => {
    const r = triage({ ...calm, latencyMs: 3890, medicationConfirmed: false, pausesOver800: 3 });
    expect(r.status).toBe('RED_ALERT');
    expect(r.action).toBe('IMMEDIATE_NURSE_CALLBACK');
    expect(r.reasons).toEqual(
      expect.arrayContaining(['Medicação não confirmada', 'Latência 213,7% acima da linha de base pessoal']),
    );
  });

  it('RED when the patient does not answer', () => {
    expect(triage({ ...calm, answered: false, latencyMs: null }).status).toBe('RED_ALERT');
  });

  it('RED when an acute symptom is reported', () => {
    const r = triage({ ...calm, reportedSymptoms: ['tontura'] });
    expect(r.status).toBe('RED_ALERT');
    expect(r.reasons).toContain('Sintoma relatado: tontura');
  });

  it('RED above the 5000 ms absolute limit, even without a baseline (calibration phase)', () => {
    expect(triage({ ...calm, baselineMs: null, latencyMs: 5200 }).status).toBe('RED_ALERT');
  });

  it('does not use relative deviation during calibration (no baseline yet)', () => {
    expect(triage({ ...calm, baselineMs: null, latencyMs: 3000 }).status).toBe('GREEN_STABLE');
  });

  it('RED at ≥150% deviation from personal baseline', () => {
    expect(triage({ ...calm, latencyMs: 3100 }).status).toBe('RED_ALERT'); // 150%
  });

  it('YELLOW at ≥50% deviation', () => {
    const r = triage({ ...calm, latencyMs: 1860 }); // 50%
    expect(r).toMatchObject({ status: 'YELLOW_WATCH', action: 'NURSE_REVIEW_TODAY' });
  });

  it('YELLOW with 3+ long pauses', () => {
    expect(triage({ ...calm, pausesOver800: 3 }).status).toBe('YELLOW_WATCH');
  });

  it('medication unknown (not asked yet) does not alert', () => {
    expect(triage({ ...calm, medicationConfirmed: null }).status).toBe('GREEN_STABLE');
  });

  describe('emergency verification', () => {
    it('GREEN when the patient clearly dismisses the alarm', () => {
      const r = triage({ ...calm, emergency: { dismissed: true } });
      expect(r.status).toBe('GREEN_STABLE');
      expect(r.reasons).toContain('Falso alarme descartado por verificação ativa');
    });
    it('RED when the trigger is not clearly dismissed', () => {
      expect(triage({ ...calm, emergency: { dismissed: false } }).status).toBe('RED_ALERT');
    });
    it('RED when dismissed but with an acute symptom', () => {
      expect(triage({ ...calm, emergency: { dismissed: true }, reportedSymptoms: ['dor'] }).status).toBe('RED_ALERT');
    });
  });
});
