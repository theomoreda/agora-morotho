/**
 * Builds the [APP] messages the hub injects into the agent via think(), plus a verbatim
 * pt-BR fallback for say() when think() fails (SPEC §platform). Pure and deterministic.
 *
 * The [APP] text carries the qualitative verdict (met / almost / below / none) and the exact
 * next step; numbers in dB are for the LLM's context only — the prompt forbids speaking them.
 */
import type { AttemptResult, PracticeProtocol, SessionStatus } from '@/lib/contracts';
import { APP_PREFIX } from '@/lib/voice-agent/prompts';

/** Within this many dB below target counts as "almost there". */
export const ALMOST_MARGIN_DB = 2;

export type Verdict = 'met' | 'almost' | 'below' | 'none';

export type NextStep =
  | { kind: 'sustain'; attempt: number; targetDurationMs: number }
  | { kind: 'phrase'; index: number; phrase: string; retry: boolean }
  | { kind: 'summary'; metCount: number; total: number; status: SessionStatus };

export type CoachStep =
  /** Right after the patient answered the greeting (habitual voice calibrated). */
  | { kind: 'start'; protocol: PracticeProtocol }
  /** An attempt was measured (or timed out with no_attempt) and the session moves on. */
  | { kind: 'result'; result: AttemptResult; next: NextStep }
  /** Agent reconnected mid-session; pick up where we left off. */
  | { kind: 'resume'; next: NextStep };

export interface CoachMessage {
  /** Sent through think() */
  text: string;
  /** Spoken verbatim through say() if think() fails */
  fallback: string;
}

/** A sustain within this fraction of its duration target can still be "almost there". */
export const ALMOST_DURATION_FRACTION = 0.75;

export function verdict(r: AttemptResult): Verdict {
  if (r.no_attempt || r.effort_db === null) return 'none';
  if (r.met_target) return 'met';
  const effortClose = r.target_effort_db - r.effort_db <= ALMOST_MARGIN_DB;
  const durationClose =
    r.kind !== 'sustain' ||
    r.target_duration_ms === null ||
    (r.duration_ms ?? 0) >= r.target_duration_ms * ALMOST_DURATION_FRACTION;
  return effortClose && durationClose ? 'almost' : 'below';
}

const seconds = (ms: number) => Math.round(ms / 1000);
const fmtDb = (db: number) => `${db >= 0 ? '+' : ''}${db.toFixed(1).replace('.', ',')} dB`;

function describeResult(r: AttemptResult): string {
  const label = r.kind === 'sustain' ? `"Aaa", tentativa ${r.attempt}` : `frase "${r.phrase ?? ''}", tentativa ${r.attempt}`;
  const v = verdict(r);
  if (v === 'none') return `Medição do ${label}: ela não vocalizou (sem tentativa).`;

  const parts = [`esforço ${fmtDb(r.effort_db!)} acima da voz habitual (meta ${fmtDb(r.target_effort_db)})`];
  if (r.kind === 'sustain' && r.duration_ms !== null) {
    const goal = r.target_duration_ms !== null ? ` (meta ${seconds(r.target_duration_ms)} segundos)` : '';
    parts.push(`segurou ${seconds(r.duration_ms)} segundos${goal}`);
  }
  const outcome = { met: 'META ATINGIDA', almost: 'QUASE LÁ', below: 'ABAIXO DA META' }[v];
  return `Medição do ${label}: ${parts.join(', ')}. Resultado: ${outcome}.`;
}

function describeNext(n: NextStep): string {
  switch (n.kind) {
    case 'sustain':
      return n.attempt === 1
        ? `peça para ela respirar fundo e fazer um "Aaa" bem forte, segurando o máximo que conseguir (meta ${seconds(n.targetDurationMs)} segundos).`
        : `peça mais um "Aaa" bem forte, segurando o máximo que conseguir.`;
    case 'phrase':
      return n.retry
        ? `peça para ela repetir, mais forte, a frase "${n.phrase}".`
        : `peça para ela dizer em voz bem forte a frase ${n.index + 1} de 3: "${n.phrase}".`;
    case 'summary':
      return `o treino acabou: ela atingiu a meta em ${n.metCount} de ${n.total} exercícios. Comemore o treino de hoje e se despeça.`;
  }
}

/** Fixed pt-BR sentence for each verdict (fallback only; the LLM varies the wording). */
function fallbackFeedback(r: AttemptResult): string {
  switch (verdict(r)) {
    case 'met':
      return r.kind === 'sustain' && r.duration_ms !== null
        ? `Isso! Voz forte, e a senhora segurou ${seconds(r.duration_ms)} segundos!`
        : 'Isso! Essa saiu forte e clara!';
    case 'almost':
      return 'Muito bem, quase lá! Só um pouquinho mais de força.';
    case 'below':
      return 'Boa tentativa! Agora mais forte, como se estivesse chamando alguém do outro lado da sala.';
    case 'none':
      return 'Sem pressa, estou aqui.';
  }
}

function fallbackNext(n: NextStep, address: string): string {
  switch (n.kind) {
    case 'sustain':
      return n.attempt === 1
        ? 'Respire fundo e faça um "Aaa" bem forte, segurando o máximo que conseguir.'
        : 'Vamos de novo: um "Aaa" bem forte!';
    case 'phrase':
      return n.retry ? `Mais forte agora: "${n.phrase}"` : `Agora diga bem forte: "${n.phrase}"`;
    case 'summary':
      return `Treino concluído! A senhora atingiu a meta em ${n.metCount} de ${n.total} exercícios. Até amanhã, ${address}.`;
  }
}

/** @param address how the patient is addressed, e.g. "Dona Helena" (fallback wording only) */
export function coachMessage(step: CoachStep, address: string): CoachMessage {
  switch (step.kind) {
    case 'start': {
      const first: NextStep = { kind: 'sustain', attempt: 1, targetDurationMs: step.protocol.sustain.target_duration_ms };
      return {
        text: `${APP_PREFIX} Voz habitual calibrada. Vamos começar o aquecimento. Próximo passo: ${describeNext(first)}`,
        fallback: `Vamos começar o aquecimento. ${fallbackNext(first, address)}`,
      };
    }
    case 'result':
      return {
        text: `${APP_PREFIX} ${describeResult(step.result)} Próximo passo: ${describeNext(step.next)}`,
        fallback: `${fallbackFeedback(step.result)} ${fallbackNext(step.next, address)}`,
      };
    case 'resume':
      return {
        text: `${APP_PREFIX} A conexão voltou no meio do treino. Diga que vocês vão continuar de onde pararam. Próximo passo: ${describeNext(step.next)}`,
        fallback: `Pronto, voltei! Vamos continuar. ${fallbackNext(step.next, address)}`,
      };
  }
}
