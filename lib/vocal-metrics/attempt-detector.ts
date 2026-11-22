/**
 * Streaming attempt detector (pure reducer). The hub opens a window when the agent finishes
 * speaking and the uplink is muted, then feeds ~50 Hz level frames; as soon as the state turns
 * `done` the hub measures `framesOf(state)` and fires think() — no waiting for the agent's VAD.
 *
 *   waiting ──voice ≥ minSpeechMs──▶ speaking ──silence ≥ endSilenceMs──▶ done('ended')
 *      ▲  │                              │  └──── onset + maxAttemptMs ───▶ done('max')
 *      │  │                              └─ voiced < minAttemptMs (cough, tail of earlier speech) → back to waiting
 *      │  └──── no voice for noAttemptMs (since the window opened) ───────▶ done('no_attempt')
 */
import { DEFAULT_VOICE, levelDb, type EnergyFrame, type VoiceOptions } from './level';

export interface DetectorOptions extends VoiceOptions {
  endSilenceMs: number;
  /** Voiced bursts shorter than this are discarded (cough, tail of speech started before the window) */
  minAttemptMs: number;
  maxAttemptMs: number;
  noAttemptMs: number;
}

export const DEFAULT_DETECTOR: DetectorOptions = {
  ...DEFAULT_VOICE,
  endSilenceMs: 1000,
  minAttemptMs: 400,
  maxAttemptMs: 15000,
  noAttemptMs: 8000,
};

export type DetectorOutcome = 'ended' | 'max' | 'no_attempt';

export interface DetectorState {
  phase: 'waiting' | 'speaking' | 'done';
  openedAt: number;
  /** Start of the current voiced run while waiting (onset candidate) */
  candidateAt: number | null;
  onsetAt: number | null;
  lastVoiceAt: number | null;
  /** End of the attempt (last voiced frame, or the cut-off for 'max') */
  endedAt: number | null;
  outcome: DetectorOutcome | null;
  frames: EnergyFrame[];
}

export function startDetector(openedAt: number): DetectorState {
  return {
    phase: 'waiting',
    openedAt,
    candidateAt: null,
    onsetAt: null,
    lastVoiceAt: null,
    endedAt: null,
    outcome: null,
    frames: [],
  };
}

function done(s: DetectorState, outcome: DetectorOutcome, endedAt: number | null): DetectorState {
  return { ...s, phase: 'done', outcome, endedAt };
}

export function stepDetector(state: DetectorState, frame: EnergyFrame, opts: DetectorOptions = DEFAULT_DETECTOR): DetectorState {
  if (state.phase === 'done' || frame.t < state.openedAt) return state;
  const s: DetectorState = { ...state, frames: [...state.frames, frame] };
  const voiced = levelDb(frame.rms) >= opts.voiceFloorDb;

  if (s.phase === 'waiting') {
    if (voiced) {
      const candidateAt = s.candidateAt ?? frame.t;
      if (frame.t - candidateAt >= opts.minSpeechMs) {
        return { ...s, phase: 'speaking', candidateAt, onsetAt: candidateAt, lastVoiceAt: frame.t };
      }
      return { ...s, candidateAt };
    }
    if (frame.t - s.openedAt >= opts.noAttemptMs) return done({ ...s, candidateAt: null }, 'no_attempt', null);
    return { ...s, candidateAt: null };
  }

  // speaking
  const lastVoiceAt = voiced ? frame.t : s.lastVoiceAt!;
  const next = { ...s, lastVoiceAt };
  if (frame.t - s.onsetAt! >= opts.maxAttemptMs) return done(next, 'max', frame.t);
  if (frame.t - lastVoiceAt >= opts.endSilenceMs) {
    if (lastVoiceAt - s.onsetAt! < opts.minAttemptMs) {
      // Too short to be an attempt: forget it and keep waiting (the no-attempt clock keeps running).
      return { ...next, phase: 'waiting', candidateAt: null, onsetAt: null, lastVoiceAt: null };
    }
    return done(next, 'ended', lastVoiceAt);
  }
  return next;
}

/** Frames of the attempt itself (onset → end, inclusive), ready for measureAttempt(). */
export function framesOf(state: DetectorState): EnergyFrame[] {
  if (state.onsetAt === null) return [];
  const end = state.endedAt ?? Infinity;
  return state.frames.filter((f) => f.t >= state.onsetAt! && f.t <= end);
}
