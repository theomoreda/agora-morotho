/**
 * Rule-based clinical extraction from pt-BR transcripts (deterministic, testable).
 * Deliberately conservative: uncertainty about medication counts as "not confirmed".
 */
import type { TemporalOrientation } from '@/lib/contracts';

/** lowercase, no accents, punctuation → space */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const UNCERTAIN_OR_NO = /\b(nao|esqueci|acho que|talvez|sei la|nao lembro|nao sei|nao tenho certeza)\b/;
const YES = /\b(sim|tomei|ja|tomado)\b/;

export function medicationConfirmed(text: string): boolean | null {
  const t = normalize(text);
  if (!t) return null;
  if (UNCERTAIN_OR_NO.test(t)) return false;
  if (YES.test(t)) return true;
  return null;
}

const SYMPTOMS: ReadonlyArray<[label: string, pattern: RegExp]> = [
  ['tontura', /\b(tontura|tont[oa]|zonz[oa]|vertigem)\b/],
  ['dor', /\bdor(es)?\b/],
  ['falta de ar', /\b(falta de ar|dificuldade (pra|para) respirar)\b/],
  ['queda', /\b(cai|caido|caida|levei um tombo|tombo)\b/],
  ['enjoo', /\b(enjo\w*|nausea|vomit\w*)\b/],
  // v2 — dysphagia (aspiration-pneumonia risk in Parkinson); labels match DYSPHAGIA_SYMPTOMS
  ['engasgo', /\b(engasg\w*|entalei|entalou|entalad[oa])\b/],
  ['tosse ao comer', /\b(toss\w*|tuss\w*)\b.*\b(com(o|er|endo|ida)|beb(o|er|endo|ida)|agua|almoco|janta)\b|\b(com(o|er|endo)|beb(o|er|endo))\b.*\b(toss\w*|tuss\w*)\b/],
  ['dificuldade para engolir', /\b(dificuldade (pra|para|de) engolir|nao consigo engolir|dor (pra|para|ao) engolir|custa engolir|dificil engolir)\b/],
];

/** Drops negated clauses ("não sinto dor nenhuma", "sem dor") up to the next comma/period. */
function stripNegations(raw: string): string {
  return raw
    .split(/[,.;!?]/)
    .map(normalize)
    .map((clause) => clause.replace(/\b(nao sinto|nao tenho|nao estou com|nao to com|sem)\b.*$/, ''))
    .join(' ');
}

export function detectSymptoms(text: string): string[] {
  const t = stripNegations(text);
  return SYMPTOMS.filter(([, re]) => re.test(t)).map(([label]) => label);
}

const HESITATION = /\b(hum+|hm+|deixa eu ver|acho que|sei la|aquele negocio)\b|\b[eé]\s*\.\.\./i;
const HESITANT_LATENCY_MS = 4000;

type Period = 'manha' | 'tarde' | 'noite';

function expectedPeriod(now: Date, timeZone: string): Period {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(now));
  if (hour >= 5 && hour < 12) return 'manha';
  if (hour >= 12 && hour < 18) return 'tarde';
  return 'noite';
}

function answeredPeriod(t: string): Period | null {
  if (/\bmanha\b/.test(t)) return 'manha';
  if (/\btarde\b/.test(t)) return 'tarde';
  if (/\b(noite|madrugada)\b/.test(t)) return 'noite';
  return null;
}

export function temporalOrientation(
  text: string,
  now: Date,
  timeZone: string,
  opts: { latencyMs?: number | null } = {},
): TemporalOrientation {
  const t = normalize(text);
  if (!t) return 'UNKNOWN';
  const answer = answeredPeriod(t);
  if (answer === null || answer !== expectedPeriod(now, timeZone)) return 'DISORIENTED';
  if (HESITATION.test(text) || (opts.latencyMs ?? 0) > HESITANT_LATENCY_MS) return 'HESITANT';
  return 'OK';
}

const HELP = /\b(socorro|ajuda|me ajuda)\b/;
const DISMISSAL =
  /\b(tudo bem|esta tudo bem|ta tudo bem|estou bem|to bem|so um barulho|foi um barulho|nao foi nada|derrubei|foi engano|pode ficar tranquil\w*)\b/;

/** Clear, symptom-free "it was nothing" after an edge trigger. */
export function isEmergencyDismissal(text: string): boolean {
  const t = normalize(text);
  if (!t || HELP.test(t) || detectSymptoms(text).length > 0) return false;
  return DISMISSAL.test(t);
}
