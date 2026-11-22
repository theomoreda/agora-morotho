import { describe, expect, it } from 'vitest';
import { detectSymptoms, isEmergencyDismissal, medicationConfirmed, temporalOrientation } from './extraction';

describe('medicationConfirmed', () => {
  it.each([
    ['Já tomei sim', true],
    ['tomei, tomei agorinha com o café', true],
    ['Sim, já.', true],
    ['Não, ainda não tomei', false],
    ['esqueci de tomar', false],
    ['Hum... acho que... não lembro se tomei.', false],
    ['não sei', false],
    ['acho que sim, não tenho certeza', false],
  ])('%s → %s', (text, expected) => {
    expect(medicationConfirmed(text)).toBe(expected);
  });

  it('is null when there is no answer', () => {
    expect(medicationConfirmed('')).toBeNull();
  });
});

describe('detectSymptoms', () => {
  it.each([
    ['tô com uma tontura quando levanto', ['tontura']],
    ['estou meio tonta hoje', ['tontura']],
    ['me deu uma dor no peito', ['dor']],
    ['tô com falta de ar', ['falta de ar']],
    ['eu caí no banheiro', ['queda']],
    ['estou enjoada', ['enjoo']],
    ['estou bem, graças a Deus', []],
    ['dormi bem, não sinto dor nenhuma', []],
  ])('%s → %j', (text, expected) => {
    expect(detectSymptoms(text)).toEqual(expected);
  });
});

describe('temporalOrientation', () => {
  const morning = new Date('2026-11-22T08:02:00-03:00');
  it.each([
    ['De manhã', 'OK'],
    ['agora é de manhã, né', 'OK'],
    ['é... deixa eu ver... de manhã', 'HESITANT'],
    ['de noite', 'DISORIENTED'],
    ['não sei', 'DISORIENTED'],
    ['', 'UNKNOWN'],
  ])('%s → %s', (text, expected) => {
    expect(temporalOrientation(text, morning, 'America/Sao_Paulo')).toBe(expected);
  });

  it('marks long hesitation as HESITANT even with the right answer', () => {
    expect(temporalOrientation('de manhã', morning, 'America/Sao_Paulo', { latencyMs: 4500 })).toBe('HESITANT');
  });
});

describe('isEmergencyDismissal', () => {
  it.each([
    ['foi só um barulho, estou bem', true],
    ['tá tudo bem, derrubei uma panela', true],
    ['não foi nada, pode ficar tranquila', true],
    ['eu caí', false],
    ['socorro', false],
    ['estou bem mas bati a cabeça e tô com dor', false],
    ['', false],
  ])('%s → %s', (text, expected) => {
    expect(isEmergencyDismissal(text)).toBe(expected);
  });
});
