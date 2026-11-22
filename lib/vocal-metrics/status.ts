/**
 * Session status for the speech therapist (SPEC §vocal-metrics). Thresholds are
 * configurable and NOT clinically validated — the dashboard says so.
 */
import type { AttemptResult, SessionStatus } from '@/lib/contracts';

export interface StatusThresholds {
  /** Drop vs the 7-day average effort that flags BELOW_TARGET */
  watchDropDb: number;
  /** Drop vs the 7-day average effort that flags REVIEW */
  reviewDropDb: number;
  /** Days without practice before today that flag REVIEW */
  reviewMissedDays: number;
}

export const DEFAULT_THRESHOLDS: StatusThresholds = { watchDropDb: 3, reviewDropDb: 6, reviewMissedDays: 2 };

/** Symptom labels (from detectSymptoms) that point to dysphagia → aspiration-pneumonia risk. */
export const DYSPHAGIA_SYMPTOMS: ReadonlySet<string> = new Set(['engasgo', 'tosse ao comer', 'dificuldade para engolir']);

export interface StatusContext {
  /** Mean effort (best attempt per exercise) over the last 7 practice days; null if no history */
  recentAvgEffortDb: number | null;
  /** Consecutive days without practice right before today */
  missedDaysBefore: number;
  /** Labels from detectSymptoms over the session transcript */
  reportedSymptoms: string[];
}

export interface ExerciseSummary {
  /** Exercises with at least one attempt so far */
  total: number;
  /** Exercises whose best attempt met the target */
  metCount: number;
  /** Mean effort of the best measured attempt per exercise; null if none measured */
  meanEffortDb: number | null;
}

/** Best attempt per exercise: any that met the target, else the highest effort. */
export function bestAttempts(attempts: ReadonlyArray<AttemptResult>): AttemptResult[] {
  const best = new Map<string, AttemptResult>();
  for (const a of attempts) {
    const cur = best.get(a.exercise_id);
    const score = (r: AttemptResult) => (r.met_target ? 1000 : 0) + (r.effort_db ?? -1000);
    if (!cur || score(a) > score(cur)) best.set(a.exercise_id, a);
  }
  return [...best.values()];
}

export function exerciseSummary(attempts: ReadonlyArray<AttemptResult>): ExerciseSummary {
  const best = bestAttempts(attempts);
  const efforts = best.map((a) => a.effort_db).filter((e): e is number => e !== null);
  return {
    total: best.length,
    metCount: best.filter((a) => a.met_target).length,
    meanEffortDb: efforts.length ? Math.round((efforts.reduce((x, y) => x + y, 0) / efforts.length) * 10) / 10 : null,
  };
}

const fmt = (db: number) => db.toFixed(1).replace('.', ',');

export function sessionStatus(
  attempts: ReadonlyArray<AttemptResult>,
  ctx: StatusContext,
  t: StatusThresholds = DEFAULT_THRESHOLDS,
): { status: SessionStatus; reasons: string[] } {
  const sum = exerciseSummary(attempts);
  const drop = sum.meanEffortDb !== null && ctx.recentAvgEffortDb !== null ? ctx.recentAvgEffortDb - sum.meanEffortDb : null;

  const review: string[] = [];
  const dysphagia = ctx.reportedSymptoms.filter((s) => DYSPHAGIA_SYMPTOMS.has(s));
  if (dysphagia.length) review.push(`Relato de ${dysphagia.join(', ')} — risco de aspiração, avaliar com a fono`);
  if (ctx.missedDaysBefore >= t.reviewMissedDays) review.push(`${ctx.missedDaysBefore} dias sem treinar antes de hoje`);
  if (drop !== null && drop >= t.reviewDropDb) review.push(`Esforço ${fmt(drop)} dB abaixo da média dos últimos 7 dias`);
  if (review.length) return { status: 'REVIEW', reasons: review };

  if (sum.total === 0) return { status: 'BELOW_TARGET', reasons: ['Nenhum exercício realizado ainda'] };
  if (sum.meanEffortDb === null) return { status: 'BELOW_TARGET', reasons: ['Nenhuma tentativa com voz registrada'] };

  const score = `Meta atingida em ${sum.metCount} de ${sum.total} exercícios`;
  const watch: string[] = [];
  if (drop !== null && drop >= t.watchDropDb) watch.push(`Esforço ${fmt(drop)} dB abaixo da média dos últimos 7 dias`);
  if (sum.metCount * 2 <= sum.total) watch.push(score);
  if (watch.length) return { status: 'BELOW_TARGET', reasons: watch };

  return { status: 'ON_TARGET', reasons: [score] };
}
