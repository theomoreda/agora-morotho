import { describe, expect, it } from 'vitest';
import {
  baselineLatencyMs,
  deviationPercent,
  pausesOver,
  segmentSpeech,
  turnLatencyMs,
  type EnergyFrame,
} from './biomarkers';

/** Builds 10 ms frames from a pattern like "..###..#" ('.' = silence, '#' = speech). */
function frames(pattern: string, start = 0, stepMs = 10, loud = 0.2, quiet = 0.001): EnergyFrame[] {
  return [...pattern].map((c, i) => ({ t: start + i * stepMs, rms: c === '#' ? loud : quiet }));
}

describe('turnLatencyMs', () => {
  it('is the gap between agent end and user onset', () => {
    expect(turnLatencyMs(1000, 2240)).toBe(1240);
  });
  it('is null when the patient did not answer', () => {
    expect(turnLatencyMs(1000, null)).toBeNull();
  });
  it('is null when the onset precedes the agent end (overlap / echo)', () => {
    expect(turnLatencyMs(1000, 900)).toBeNull();
  });
});

describe('deviationPercent', () => {
  it('reproduces the PDF golden case: 1240 → 3890 ms = 213.7%', () => {
    expect(deviationPercent(3890, 1240)).toBe(213.7);
  });
  it('is negative when faster than baseline', () => {
    expect(deviationPercent(1180, 1240)).toBe(-4.8);
  });
});

describe('baselineLatencyMs', () => {
  it('averages the most recent 14 sessions', () => {
    const history = [...Array(20).fill(5000), ...Array(14).fill(1240)];
    expect(baselineLatencyMs(history)).toBe(1240);
  });
  it('is null below the 7-session calibration window', () => {
    expect(baselineLatencyMs([1200, 1300, 1250, 1240, 1230, 1260])).toBeNull();
  });
  it('ignores null (unanswered) sessions', () => {
    expect(baselineLatencyMs([1000, null, 1000, 1000, 1000, 1000, 1000, 1000])).toBe(1000);
  });
});

describe('segmentSpeech', () => {
  it('finds speech segments above the threshold', () => {
    const segs = segmentSpeech(frames('....####....'), { threshold: 0.05, minSpeechMs: 30 });
    expect(segs).toEqual([{ start: 40, end: 80 }]);
  });
  it('drops blips shorter than minSpeechMs (clicks, echo tails)', () => {
    expect(segmentSpeech(frames('..#.......'), { threshold: 0.05, minSpeechMs: 30 })).toEqual([]);
  });
  it('closes a segment still open at the end of the frames', () => {
    expect(segmentSpeech(frames('..#####'), { threshold: 0.05, minSpeechMs: 30 })).toEqual([{ start: 20, end: 70 }]);
  });
  it('merges segments separated by tiny gaps (< minGapMs)', () => {
    const segs = segmentSpeech(frames('####.####'), { threshold: 0.05, minSpeechMs: 30, minGapMs: 50 });
    expect(segs).toEqual([{ start: 0, end: 90 }]);
  });
});

describe('pausesOver', () => {
  it('counts silences longer than the limit between segments', () => {
    const segs = [
      { start: 0, end: 500 },
      { start: 1400, end: 2000 }, // 900 ms gap → counts
      { start: 2500, end: 3000 }, // 500 ms gap → no
      { start: 4000, end: 4200 }, // 1000 ms gap → counts
    ];
    expect(pausesOver(segs, 800)).toBe(2);
  });
  it('is zero for a single segment', () => {
    expect(pausesOver([{ start: 0, end: 900 }], 800)).toBe(0);
  });
});
