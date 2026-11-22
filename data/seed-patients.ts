/**
 * SIMULATED 14-day history for the clinic dashboard (fictional patients).
 * Shown with a "dados simulados" badge — never presented as real data.
 */
import { HELENA_PROFILE } from './patients';

export interface DayPoint {
  /** ISO date (YYYY-MM-DD) */
  date: string;
  latencyMs: number | null;
  pauses: number;
  medicationTaken: boolean;
}

export interface SeedPatient {
  id: string;
  name: string;
  age: number;
  condition: string;
  medication: string;
  history: DayPoint[];
}

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

const DAYS = 14;
const TODAY = new Date('2026-11-22T00:00:00-03:00');

function history(seed: number, baseMs: number, jitterMs: number, adherence: number): DayPoint[] {
  const rnd = mulberry32(seed);
  const raw = Array.from({ length: DAYS }, () => Math.round(baseMs + (rnd() * 2 - 1) * jitterMs));
  // re-centre so the 14-day mean is exactly baseMs
  const shift = Math.round(baseMs - raw.reduce((a, b) => a + b, 0) / DAYS);
  return raw.map((ms, i) => {
    const d = new Date(TODAY.getTime() - (DAYS - i) * 86_400_000);
    return {
      date: d.toISOString().slice(0, 10),
      latencyMs: ms + shift,
      pauses: Math.floor(rnd() * 2),
      medicationTaken: rnd() < adherence,
    };
  });
}

export const SEED_PATIENTS: SeedPatient[] = [
  {
    id: HELENA_PROFILE.id,
    name: HELENA_PROFILE.name,
    age: HELENA_PROFILE.age,
    condition: 'Hipertensão · pós-alta (dia 12)',
    medication: HELENA_PROFILE.medication.name,
    history: history(84, 1240, 90, 1),
  },
  {
    id: 'HC-2026-031',
    name: 'Antônio Ribeiro',
    age: 82,
    condition: 'Insuficiência cardíaca',
    medication: 'Furosemida 40mg',
    history: history(31, 1460, 120, 0.93),
  },
  {
    id: 'HC-2026-057',
    name: 'Maria das Graças Lima',
    age: 74,
    condition: 'Diabetes tipo 2',
    medication: 'Metformina 850mg',
    history: history(57, 1090, 80, 1),
  },
  {
    id: 'HC-2026-062',
    name: 'José Carlos Mendes',
    age: 80,
    condition: 'Anticoagulação (FA)',
    medication: 'Varfarina 5mg',
    history: history(62, 1720, 150, 0.86),
  },
  {
    id: 'HC-2026-090',
    name: 'Lourdes Ferreira',
    age: 86,
    condition: 'DPOC · pós-alta',
    medication: 'Budesonida + Formoterol',
    history: history(90, 1380, 110, 1),
  },
];
