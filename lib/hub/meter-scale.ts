/**
 * Display math for the giant on-screen loudness meter (pure, testable).
 * The bar is relative to the patient's habitual voice: the target band starts at
 * habitual + target effort, so "get into the green" means "reach the therapist's goal".
 */

/** dB below / above the habitual voice shown by the bar */
export const METER_RANGE = { belowDb: 12, aboveDb: 18 } as const;

/** Fast rise, slow fall — readable for elderly users, still responsive to effort. */
export const SMOOTHING = { attackMs: 60, releaseMs: 350 } as const;

export function smoothDb(prevDb: number, nextDb: number, dtMs: number): number {
  const tau = nextDb > prevDb ? SMOOTHING.attackMs : SMOOTHING.releaseMs;
  const k = 1 - Math.exp(-Math.max(0, dtMs) / tau);
  return prevDb + (nextDb - prevDb) * k;
}

export type MeterZone = 'quiet' | 'habitual' | 'almost' | 'target';

export interface MeterReading {
  /** 0..1 height of the bar */
  fill: number;
  /** 0..1 height where the target band starts */
  targetAt: number;
  /** 0..1 height of the habitual-voice line */
  habitualAt: number;
  /** Current effort above habitual, dB */
  effortDb: number;
  zone: MeterZone;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function meterReading(levelDb: number, habitualDb: number, targetEffortDb: number, almostMarginDb = 2): MeterReading {
  const lo = habitualDb - METER_RANGE.belowDb;
  const span = METER_RANGE.belowDb + METER_RANGE.aboveDb;
  const pos = (db: number) => clamp01((db - lo) / span);
  const effortDb = levelDb - habitualDb;
  const zone: MeterZone =
    effortDb >= targetEffortDb
      ? 'target'
      : effortDb >= targetEffortDb - almostMarginDb
        ? 'almost'
        : effortDb >= -3
          ? 'habitual'
          : 'quiet';
  return {
    fill: pos(levelDb),
    targetAt: pos(habitualDb + targetEffortDb),
    habitualAt: pos(habitualDb),
    effortDb: Math.round(effortDb * 10) / 10,
    zone,
  };
}
