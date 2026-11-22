/**
 * Loudness metrics for the voice coach (pure functions, SPEC §vocal-metrics).
 *
 * Frames come from a dedicated getUserMedia stream with AGC/NS off (lib/hub/level-meter.ts),
 * so RMS tracks the patient's real effort. Values are dBFS — RELATIVE and uncalibrated, never
 * dB SPL: effort is always expressed against the same patient's habitual voice of the day,
 * captured at a fixed distance from the microphone.
 */
import type { AttemptResult, ExerciseKind, PracticeProtocol } from '@/lib/contracts';
import { segmentSpeech, type EnergyFrame, type SpeechSegment } from '@/lib/vocal-biomarkers/biomarkers';

export type { EnergyFrame } from '@/lib/vocal-biomarkers/biomarkers';

/** Floor for digital silence (rms 0). */
export const SILENCE_DB = -100;

export interface VoiceOptions {
  /** dBFS above which a frame counts as voice (calibrated on stage, P11) */
  voiceFloorDb: number;
  /** Voiced runs shorter than this are dropped (clicks, bumps) */
  minSpeechMs: number;
  /** Unvoiced gaps shorter than this are bridged (consonants, tremor dips) */
  minGapMs: number;
}

export const DEFAULT_VOICE: VoiceOptions = { voiceFloorDb: -50, minSpeechMs: 150, minGapMs: 250 };

/** Minimum voiced time in the greeting answer to trust a habitual-level calibration. */
export const MIN_CALIBRATION_SPEECH_MS = 400;

export function levelDb(rms: number): number {
  if (!(rms > 0)) return SILENCE_DB;
  return Math.max(SILENCE_DB, 20 * Math.log10(rms));
}

export function dbToRms(db: number): number {
  return 10 ** (db / 20);
}

export function median(values: ReadonlyArray<number>): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export function voicedSegments(frames: ReadonlyArray<EnergyFrame>, opts: VoiceOptions = DEFAULT_VOICE): SpeechSegment[] {
  return segmentSpeech(frames, {
    threshold: dbToRms(opts.voiceFloorDb),
    minSpeechMs: opts.minSpeechMs,
    minGapMs: opts.minGapMs,
  });
}

/** dB of the frames that fall inside voiced segments (bridged gaps excluded). */
function voicedLevels(frames: ReadonlyArray<EnergyFrame>, segments: ReadonlyArray<SpeechSegment>, floorDb: number): number[] {
  return frames
    .filter((f) => segments.some((s) => f.t >= s.start && f.t < s.end))
    .map((f) => levelDb(f.rms))
    .filter((db) => db >= floorDb);
}

const totalMs = (segments: ReadonlyArray<SpeechSegment>) => segments.reduce((a, s) => a + (s.end - s.start), 0);

/**
 * Habitual voice level = median dBFS of the voiced frames in the patient's answer to the greeting.
 * null when there is too little speech to trust it (caller falls back to the seeded profile value).
 */
export function habitualLevelDb(frames: ReadonlyArray<EnergyFrame>, opts: VoiceOptions = DEFAULT_VOICE): number | null {
  const segments = voicedSegments(frames, opts);
  if (totalMs(segments) < MIN_CALIBRATION_SPEECH_MS) return null;
  const m = median(voicedLevels(frames, segments, opts.voiceFloorDb));
  return m === null ? null : round1(m);
}

export interface AttemptMeasurement {
  /** Median dBFS of voiced frames */
  levelDb: number;
  /** Longest continuous voicing — the phonation time of a sustained "Aaa" */
  longestMs: number;
  /** First voice onset → last voice offset — the length of a spoken phrase */
  spanMs: number;
}

/** Measures one attempt's frames; null when nothing voiced (no attempt). */
export function measureAttempt(frames: ReadonlyArray<EnergyFrame>, opts: VoiceOptions = DEFAULT_VOICE): AttemptMeasurement | null {
  const segments = voicedSegments(frames, opts);
  if (segments.length === 0) return null;
  const level = median(voicedLevels(frames, segments, opts.voiceFloorDb));
  if (level === null) return null;
  return {
    levelDb: round1(level),
    longestMs: Math.max(...segments.map((s) => s.end - s.start)),
    spanMs: segments[segments.length - 1].end - segments[0].start,
  };
}

export interface AttemptInput {
  kind: ExerciseKind;
  /** 1-based attempt number within the exercise */
  attempt: number;
  /** 0-based phrase index, for kind "phrase" */
  phraseIndex?: number;
  measurement: AttemptMeasurement | null;
  habitualDb: number;
  protocol: PracticeProtocol;
  /** ISO 8601 with offset */
  at: string;
}

/**
 * Turns a measurement into the wire AttemptResult.
 * Target: sustain needs effort AND duration; a phrase needs effort only.
 */
export function buildAttemptResult(input: AttemptInput): AttemptResult {
  const { kind, attempt, measurement: m, habitualDb, protocol, at } = input;
  const isSustain = kind === 'sustain';
  const phraseIndex = input.phraseIndex ?? 0;
  const targetDuration = isSustain ? protocol.sustain.target_duration_ms : null;

  const effort = m ? round1(m.levelDb - habitualDb) : null;
  const duration = m ? (isSustain ? m.longestMs : m.spanMs) : null;
  const met =
    effort !== null &&
    effort >= protocol.target_effort_db &&
    (targetDuration === null || (duration ?? 0) >= targetDuration);

  return {
    exercise_id: isSustain ? 'sustain' : `phrase-${phraseIndex + 1}`,
    kind,
    attempt,
    ...(isSustain ? {} : { phrase: protocol.phrases[phraseIndex] }),
    effort_db: effort,
    duration_ms: duration,
    target_effort_db: protocol.target_effort_db,
    target_duration_ms: targetDuration,
    met_target: met,
    no_attempt: m === null,
    at,
  };
}
