/**
 * Practice history helpers (pure): adherence, recent effort and missed days.
 * Shared by the dashboard (status of each patient) and the hub (StatusContext for the session).
 */
import type { AttemptResult } from '@/lib/contracts';
import { exerciseSummary } from './status';

export interface PracticeDay {
  /** YYYY-MM-DD */
  date: string;
  practiced: boolean;
  /** Mean effort of the best attempt per exercise (dB above habitual) */
  effortDb: number | null;
  /** Best sustained "Aaa" of the day */
  sustainMs: number | null;
  metCount: number;
  total: number;
}

export const RECENT_DAYS = 7;

/** Mean effort over the last 7 practiced days (most recent first); null without data. */
export function recentAvgEffortDb(days: ReadonlyArray<PracticeDay>, n = RECENT_DAYS): number | null {
  const efforts = days
    .filter((d) => d.practiced && d.effortDb !== null)
    .slice(-n)
    .map((d) => d.effortDb!);
  if (efforts.length === 0) return null;
  return Math.round((efforts.reduce((a, b) => a + b, 0) / efforts.length) * 10) / 10;
}

/** Consecutive days without practice at the end of the history (i.e. right before today). */
export function missedDaysBefore(days: ReadonlyArray<PracticeDay>): number {
  let n = 0;
  for (let i = days.length - 1; i >= 0 && !days[i].practiced; i--) n++;
  return n;
}

export function adherence(days: ReadonlyArray<PracticeDay>): { practiced: number; total: number } {
  return { practiced: days.filter((d) => d.practiced).length, total: days.length };
}

/** Today's history point from the session attempts. */
export function dayFromAttempts(date: string, attempts: ReadonlyArray<AttemptResult>): PracticeDay {
  const sum = exerciseSummary(attempts);
  const sustains = attempts.filter((a) => a.kind === 'sustain' && a.duration_ms !== null).map((a) => a.duration_ms!);
  return {
    date,
    practiced: attempts.some((a) => !a.no_attempt),
    effortDb: sum.meanEffortDb,
    sustainMs: sustains.length ? Math.max(...sustains) : null,
    metCount: sum.metCount,
    total: sum.total,
  };
}
