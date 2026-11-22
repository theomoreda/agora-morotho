import { describe, expect, it } from 'vitest';
import { DEFAULT_PROTOCOL, type AttemptResult } from '@/lib/contracts';
import { mockAttemptNone, mockAttemptPhrase, mockAttemptStrong, mockAttemptWeak } from '@/lib/mocks';
import { coachMessage, verdict, type NextStep } from './coach-messages';

const phrase2: NextStep = { kind: 'phrase', index: 1, phrase: 'Eu quero um copo de água.', retry: false };
const summary: NextStep = { kind: 'summary', metCount: 3, total: 4, status: 'ON_TARGET' };

describe('verdict', () => {
  it('classifies the golden case: +8 dB/9 s met, +3 dB/6 s below', () => {
    expect(verdict(mockAttemptStrong)).toBe('met');
    expect(verdict(mockAttemptWeak)).toBe('below');
  });

  it('is "almost" within 2 dB of target and ≥75% of the duration target', () => {
    const almost: AttemptResult = { ...mockAttemptWeak, effort_db: 4.5, duration_ms: 7000 };
    expect(verdict(almost)).toBe('almost');
    expect(verdict({ ...almost, duration_ms: 5000 })).toBe('below');
    expect(verdict({ ...almost, effort_db: 3.9 })).toBe('below');
  });

  it('phrases ignore duration', () => {
    expect(verdict({ ...mockAttemptPhrase, effort_db: 5, met_target: false })).toBe('almost');
  });

  it('no attempt → none', () => {
    expect(verdict(mockAttemptNone)).toBe('none');
  });
});

describe('coachMessage', () => {
  it('start: tags [APP] and asks for the first "Aaa" with the therapist target', () => {
    const m = coachMessage({ kind: 'start', protocol: DEFAULT_PROTOCOL }, 'Dona Helena');
    expect(m.text.startsWith('[APP] ')).toBe(true);
    expect(m.text).toMatch(/Aaa.*meta 8 segundos/);
    expect(m.fallback).toMatch(/respire fundo/i);
    expect(m.fallback).not.toContain('[APP]');
  });

  it('weak "Aaa": verdict and numbers for the LLM, next step = another attempt', () => {
    const m = coachMessage(
      { kind: 'result', result: mockAttemptWeak, next: { kind: 'sustain', attempt: 2, targetDurationMs: 8000 } },
      'Dona Helena',
    );
    expect(m.text).toContain('tentativa 1');
    expect(m.text).toContain('+3,0 dB');
    expect(m.text).toContain('segurou 6 segundos (meta 8 segundos)');
    expect(m.text).toContain('ABAIXO DA META');
    expect(m.text).toMatch(/Próximo passo: peça mais um "Aaa"/);
    expect(m.fallback).toMatch(/mais forte/i);
  });

  it('strong "Aaa" → met, then the next phrase quoted verbatim', () => {
    const m = coachMessage({ kind: 'result', result: mockAttemptStrong, next: phrase2 }, 'Dona Helena');
    expect(m.text).toContain('META ATINGIDA');
    expect(m.text).toContain('frase 2 de 3: "Eu quero um copo de água."');
    expect(m.fallback).toBe('Isso! Voz forte, e a senhora segurou 9 segundos! Agora diga bem forte: "Eu quero um copo de água."');
  });

  it('phrase retry asks to repeat the same phrase louder', () => {
    const below = { ...mockAttemptPhrase, effort_db: 1, met_target: false };
    const m = coachMessage(
      { kind: 'result', result: below, next: { kind: 'phrase', index: 2, phrase: below.phrase!, retry: true } },
      'Dona Helena',
    );
    expect(m.text).toContain('repetir, mais forte, a frase "Quero um café com leite."');
    expect(m.fallback).toContain('Mais forte agora: "Quero um café com leite."');
  });

  it('no attempt is reported without numbers and reassures in the fallback', () => {
    const m = coachMessage(
      { kind: 'result', result: mockAttemptNone, next: { kind: 'sustain', attempt: 1, targetDurationMs: 8000 } },
      'Dona Helena',
    );
    expect(m.text).toContain('não vocalizou');
    expect(m.text).not.toMatch(/dB/);
    expect(m.fallback.startsWith('Sem pressa, estou aqui.')).toBe(true);
  });

  it('summary closes the session with the score and the farewell', () => {
    const m = coachMessage({ kind: 'result', result: mockAttemptPhrase, next: summary }, 'Dona Helena');
    expect(m.text).toContain('atingiu a meta em 3 de 4 exercícios');
    expect(m.fallback).toMatch(/Até amanhã, Dona Helena\.$/);
  });

  it('resume continues from the pending step', () => {
    const m = coachMessage({ kind: 'resume', next: phrase2 }, 'Dona Helena');
    expect(m.text).toMatch(/conexão voltou/);
    expect(m.fallback).toMatch(/^Pronto, voltei!/);
  });
});
