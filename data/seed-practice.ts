/**
 * SIMULATED 14-day practice history for the speech-therapy dashboard (fictional patients).
 * Always shown with a "dados simulados" badge — never presented as real data.
 * Replaces the V1 Home Care seed (data/seed-patients.ts, still used by the V1 hub until P9).
 */
import { DEFAULT_PROTOCOL, type PracticeProtocol } from '@/lib/contracts';
import type { PracticeDay } from '@/lib/vocal-metrics/history';
import { HELENA_PK_PROFILE } from './patients';

export interface PracticePatient {
  id: string;
  name: string;
  age: number;
  condition: string;
  /** Marks patients outside the Parkinson wedge (expansion story) */
  expansion?: boolean;
  therapist: string;
  /** Seeded habitual level, used when the greeting calibration fails */
  habitualDb: number;
  protocol: PracticeProtocol;
  protocolVersion: number;
  history: PracticeDay[];
}

export const THERAPIST = 'Fga. Marina Alves';
export const DAYS = 14;
const TODAY = new Date('2026-11-22T12:00:00-03:00');

/** Small deterministic PRNG so the seed is identical on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Trend {
  seed: number;
  /** Effort (dB above habitual) on day 1 → day 14, linear, plus jitter */
  effort: [start: number, end: number];
  /** Best "Aaa" in seconds, day 1 → day 14 */
  sustainS: [start: number, end: number];
  /** Day indexes (0..13) without practice */
  missed: number[];
  target?: number;
}

function history({ seed, effort, sustainS, missed, target = DEFAULT_PROTOCOL.target_effort_db }: Trend): PracticeDay[] {
  const rnd = mulberry32(seed);
  return Array.from({ length: DAYS }, (_, i) => {
    const date = new Date(TODAY.getTime() - (DAYS - i) * 86_400_000).toISOString().slice(0, 10);
    if (missed.includes(i)) return { date, practiced: false, effortDb: null, sustainMs: null, metCount: 0, total: 0 };
    const f = i / (DAYS - 1);
    const e = Math.round((effort[0] + (effort[1] - effort[0]) * f + (rnd() * 2 - 1) * 0.8) * 10) / 10;
    const s = sustainS[0] + (sustainS[1] - sustainS[0]) * f + (rnd() * 2 - 1) * 0.7;
    const total = 4;
    const metCount = Math.max(0, Math.min(total, Math.round(total * (0.5 + (e - target) / 6))));
    return { date, practiced: true, effortDb: e, sustainMs: Math.round(s * 10) * 100, metCount, total };
  });
}

export const PRACTICE_PATIENTS: PracticePatient[] = [
  {
    id: HELENA_PK_PROFILE.id,
    name: HELENA_PK_PROFILE.name,
    age: HELENA_PK_PROFILE.age,
    condition: 'Parkinson (H&Y 2) · hipofonia',
    therapist: THERAPIST,
    habitualDb: -40,
    protocol: DEFAULT_PROTOCOL,
    protocolVersion: 1,
    // improving: the story of the demo
    history: history({ seed: 31, effort: [2.5, 6], sustainS: [5, 8], missed: [3, 9] }),
  },
  {
    id: 'PK-2026-018',
    name: 'Antônio Ribeiro',
    age: 79,
    condition: 'Parkinson (H&Y 3) · hipofonia + disfagia leve',
    therapist: THERAPIST,
    habitualDb: -42,
    protocol: DEFAULT_PROTOCOL,
    protocolVersion: 3,
    // stopped practising for the last 2 days → REVIEW
    history: history({ seed: 18, effort: [4, 4.5], sustainS: [6, 6.5], missed: [5, 12, 13] }),
  },
  {
    id: 'PK-2026-024',
    name: 'Maria das Graças Lima',
    age: 68,
    condition: 'Parkinson (H&Y 1) · hipofonia',
    therapist: THERAPIST,
    habitualDb: -37,
    protocol: { ...DEFAULT_PROTOCOL, target_effort_db: 8, sustain: { target_duration_ms: 12000, attempts: 2 } },
    protocolVersion: 2,
    history: history({ seed: 24, effort: [7.5, 9], sustainS: [11, 13], missed: [], target: 8 }),
  },
  {
    id: 'PK-2026-027',
    name: 'José Carlos Mendes',
    age: 75,
    condition: 'Parkinson (H&Y 2) · hipofonia',
    therapist: THERAPIST,
    habitualDb: -41,
    protocol: DEFAULT_PROTOCOL,
    protocolVersion: 1,
    // effort fading over the last week → BELOW_TARGET
    history: history({ seed: 27, effort: [6.5, 3.5], sustainS: [8, 6], missed: [6] }),
  },
  {
    id: 'AV-2026-005',
    name: 'Lourdes Ferreira',
    age: 81,
    condition: 'Pós-AVC · disartria (módulo em expansão)',
    expansion: true,
    therapist: THERAPIST,
    habitualDb: -39,
    protocol: {
      ...DEFAULT_PROTOCOL,
      phrases: ['Meu nome é Lourdes.', 'Hoje está um dia bonito.', 'Quero falar com a minha filha.'],
    },
    protocolVersion: 1,
    history: history({ seed: 5, effort: [3, 5.5], sustainS: [4, 6], missed: [2] }),
  },
];

export function findPracticePatient(id: string | undefined): PracticePatient {
  return PRACTICE_PATIENTS.find((p) => p.id === id) ?? PRACTICE_PATIENTS[0];
}
