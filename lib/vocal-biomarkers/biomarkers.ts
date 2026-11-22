/**
 * Temporal speech biomarkers (pure functions).
 * Latency = local VAD onset − agent speaking→listening timestamp (SPEC §vocal-biomarkers).
 */

/** One analysis frame of the local microphone: Unix ms + RMS energy (0..1). */
export interface EnergyFrame {
  t: number;
  rms: number;
}

export interface SpeechSegment {
  start: number;
  end: number;
}

export interface SegmentOptions {
  /** RMS above which a frame counts as speech (calibrated per room, T15) */
  threshold: number;
  /** Segments shorter than this are dropped (clicks, echo tails) */
  minSpeechMs: number;
  /** Gaps shorter than this are merged into one segment */
  minGapMs?: number;
}

export const BASELINE_WINDOW = 14;
export const CALIBRATION_SESSIONS = 7;
export const LONG_PAUSE_MS = 800;

export function turnLatencyMs(agentEndAt: number, userOnsetAt: number | null): number | null {
  if (userOnsetAt === null || userOnsetAt < agentEndAt) return null;
  return userOnsetAt - agentEndAt;
}

export function deviationPercent(currentMs: number, baselineMs: number): number {
  return Math.round(((currentMs - baselineMs) / baselineMs) * 1000) / 10;
}

/** Moving average of the last 14 answered sessions; null during the 7-session calibration. */
export function baselineLatencyMs(history: ReadonlyArray<number | null>): number | null {
  const answered = history.filter((v): v is number => v !== null).slice(-BASELINE_WINDOW);
  if (answered.length < CALIBRATION_SESSIONS) return null;
  return Math.round(answered.reduce((a, b) => a + b, 0) / answered.length);
}

export function segmentSpeech(frames: ReadonlyArray<EnergyFrame>, opts: SegmentOptions): SpeechSegment[] {
  const { threshold, minSpeechMs, minGapMs = 0 } = opts;
  const raw: SpeechSegment[] = [];
  let open: SpeechSegment | null = null;

  frames.forEach((f, i) => {
    const step = i + 1 < frames.length ? frames[i + 1].t - f.t : i > 0 ? f.t - frames[i - 1].t : 0;
    if (f.rms >= threshold) {
      if (open) open.end = f.t + step;
      else open = { start: f.t, end: f.t + step };
    } else if (open) {
      raw.push(open);
      open = null;
    }
  });
  if (open) raw.push(open);

  const merged: SpeechSegment[] = [];
  for (const seg of raw) {
    const last = merged[merged.length - 1];
    if (last && seg.start - last.end < minGapMs) last.end = seg.end;
    else merged.push({ ...seg });
  }
  return merged.filter((s) => s.end - s.start >= minSpeechMs);
}

/** Silences longer than `limitMs` between speech segments of one answer. */
export function pausesOver(segments: ReadonlyArray<SpeechSegment>, limitMs = LONG_PAUSE_MS): number {
  let count = 0;
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].start - segments[i - 1].end > limitMs) count++;
  }
  return count;
}
