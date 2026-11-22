import type { EnergyFrame } from '@/lib/vocal-biomarkers/biomarkers';

export interface ImpactOptions {
  /** RMS of an abrupt loud sound (fall, object hitting the floor) */
  spikeRms: number;
  /** Below this RMS the room counts as silent */
  floorRms: number;
  /** Silence that must follow the spike */
  silenceMs: number;
}

export const DEFAULT_IMPACT: ImpactOptions = { spikeRms: 0.3, floorRms: 0.02, silenceMs: 2000 };

/**
 * Streaming "abrupt spike followed by silence" detector (SPEC §edge-listener).
 * feed() returns true exactly once per detected event.
 */
export function createImpactDetector(opts: ImpactOptions = DEFAULT_IMPACT) {
  let spikeAt: number | null = null;

  return {
    feed({ t, rms }: EnergyFrame): boolean {
      if (rms >= opts.spikeRms) {
        spikeAt = t;
        return false;
      }
      if (spikeAt === null) return false;
      if (rms > opts.floorRms) {
        // activity after the spike: someone is moving/talking — not a silent fall
        spikeAt = null;
        return false;
      }
      if (t - spikeAt >= opts.silenceMs) {
        spikeAt = null;
        return true;
      }
      return false;
    },
    reset() {
      spikeAt = null;
    },
  };
}
