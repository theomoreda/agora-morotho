import { describe, expect, it } from 'vitest';
import { meterReading, smoothDb } from './meter-scale';

describe('meterReading', () => {
  const habitual = -38;
  const target = 6;

  it('places habitual and target lines on a fixed relative scale (−12 … +18 dB)', () => {
    const r = meterReading(-38, habitual, target);
    expect(r.habitualAt).toBeCloseTo(12 / 30, 6);
    expect(r.targetAt).toBeCloseTo(18 / 30, 6);
    expect(r.fill).toBeCloseTo(r.habitualAt, 6);
  });

  it.each([
    [-55, 'quiet'],
    [-40, 'habitual'],
    [-33, 'almost'],
    [-32, 'target'],
    [-20, 'target'],
  ] as const)('%d dBFS → %s', (level, zone) => {
    expect(meterReading(level, habitual, target).zone).toBe(zone);
  });

  it('clamps the bar to 0..1 and reports effort above habitual', () => {
    expect(meterReading(-100, habitual, target).fill).toBe(0);
    const loud = meterReading(0, habitual, target);
    expect(loud.fill).toBe(1);
    expect(loud.effortDb).toBe(38);
  });
});

describe('smoothDb', () => {
  it('rises fast and falls slowly', () => {
    const up = smoothDb(-50, -30, 60);
    const down = smoothDb(-30, -50, 60);
    expect(up - -50).toBeGreaterThan(-30 - down);
    expect(up).toBeCloseTo(-50 + 20 * (1 - Math.exp(-1)), 6);
  });

  it('is stable for zero or negative dt', () => {
    expect(smoothDb(-40, -20, 0)).toBe(-40);
    expect(smoothDb(-40, -20, -5)).toBe(-40);
  });
});
