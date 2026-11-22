/**
 * Triage rules from SPEC §vocal-biomarkers.
 * Thresholds are NOT clinically validated — configurable and labelled as such in the UI.
 */
import type { RecommendedAction, TriageStatus } from '@/lib/contracts';
import { deviationPercent } from './biomarkers';

export const TRIAGE_THRESHOLDS = {
  absoluteLatencyMs: 5000,
  redDeviationPercent: 150,
  yellowDeviationPercent: 50,
  yellowLongPauses: 3,
} as const;

export interface TriageInput {
  answered: boolean;
  latencyMs: number | null;
  /** null during the calibration phase (< 7 sessions) */
  baselineMs: number | null;
  pausesOver800: number;
  /** null = not asked / not answered yet */
  medicationConfirmed: boolean | null;
  reportedSymptoms: string[];
  /** Present only for sessions opened by an edge trigger */
  emergency: { dismissed: boolean } | null;
}

export interface TriageResult {
  status: TriageStatus;
  action: RecommendedAction;
  reasons: string[];
}

const RANK: Record<TriageStatus, number> = { GREEN_STABLE: 0, YELLOW_WATCH: 1, RED_ALERT: 2 };
const ACTION: Record<TriageStatus, RecommendedAction> = {
  GREEN_STABLE: 'NONE',
  YELLOW_WATCH: 'NURSE_REVIEW_TODAY',
  RED_ALERT: 'IMMEDIATE_NURSE_CALLBACK',
};

const pct = (v: number) => v.toFixed(1).replace('.', ',');

export function triage(input: TriageInput, t = TRIAGE_THRESHOLDS): TriageResult {
  let status: TriageStatus = 'GREEN_STABLE';
  const reasons: string[] = [];
  const flag = (s: TriageStatus, reason: string) => {
    if (RANK[s] > RANK[status]) status = s;
    reasons.push(reason);
  };

  if (input.emergency) {
    if (input.emergency.dismissed) reasons.push('Falso alarme descartado por verificação ativa');
    else flag('RED_ALERT', 'Gatilho de emergência sem negação clara');
  }
  if (!input.answered) flag('RED_ALERT', 'Sem resposta do paciente');
  if (input.medicationConfirmed === false) flag('RED_ALERT', 'Medicação não confirmada');
  for (const s of input.reportedSymptoms) flag('RED_ALERT', `Sintoma relatado: ${s}`);

  const { latencyMs, baselineMs } = input;
  if (latencyMs !== null && latencyMs > t.absoluteLatencyMs) {
    flag('RED_ALERT', `Latência acima de ${t.absoluteLatencyMs / 1000} s`);
  }
  if (latencyMs !== null && baselineMs !== null) {
    const dev = deviationPercent(latencyMs, baselineMs);
    const reason = `Latência ${pct(dev)}% acima da linha de base pessoal`;
    if (dev >= t.redDeviationPercent) flag('RED_ALERT', reason);
    else if (dev >= t.yellowDeviationPercent) flag('YELLOW_WATCH', reason);
  }
  if (input.pausesOver800 >= t.yellowLongPauses) {
    flag('YELLOW_WATCH', `${input.pausesOver800} pausas longas (> 800 ms)`);
  }

  return { status, action: ACTION[status], reasons };
}
