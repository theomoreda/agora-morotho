import { normalize } from '@/lib/vocal-biomarkers/extraction';

/**
 * Restricted Vosk grammar (v2): only the start command + [unk] can be recognised,
 * which keeps false positives low and inference cheap. Runs 100% on-device —
 * the patient starts practice by voice, with no small buttons to press (tremor).
 */
export const START_KEYWORD = 'treinar';

export const KEYWORD_GRAMMAR = JSON.stringify([
  'gabriel vamos treinar',
  'vamos treinar',
  'gabriel treinar',
  'treinar',
  'gabriel',
  '[unk]',
]);

/** "treinar" (alone or in "vamos treinar") starts practice; "gabriel" alone does not. */
const START = /\btreinar\b/;

/** Canonical keyword in a Vosk result/partial, or null. */
export function matchKeyword(text: string): string | null {
  const t = normalize(text.replace(/\[unk\]/g, ' '));
  if (!t) return null;
  return START.test(t) ? START_KEYWORD : null;
}
