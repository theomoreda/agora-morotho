/**
 * Fictional patient profiles (no real patient data — see SPEC Boundaries).
 * T9 adds the simulated 14-day history in data/seed-patients.ts.
 */
export interface ScheduledMedication {
  name: string; // e.g. "Losartana 50mg"
  spokenName: string; // how the agent says it, e.g. "a Losartana"
  time: string; // "08:00"
  spokenTime: string; // "das oito horas"
}

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  /** How the agent addresses the patient */
  address: string;
  medication: ScheduledMedication;
}

export const HELENA_PROFILE: PatientProfile = {
  id: 'HC-2026-084',
  name: 'Helena Costa',
  age: 78,
  address: 'Dona Helena',
  medication: {
    name: 'Losartana 50mg',
    spokenName: 'a Losartana',
    time: '08:00',
    spokenTime: 'das oito horas',
  },
};

/** v2 protagonist: Parkinson's disease with hypophonia (fictional). P7 adds the rest of the roster. */
export const HELENA_PK_PROFILE: PatientProfile = {
  id: 'PK-2026-031',
  name: 'Helena Costa',
  age: 72,
  address: 'Dona Helena',
  medication: {
    name: 'Levodopa + Benserazida 100/25mg',
    spokenName: 'a Levodopa',
    time: '08:00',
    spokenTime: 'das oito horas',
  },
};

export const PATIENTS: Record<string, PatientProfile> = {
  [HELENA_PROFILE.id]: HELENA_PROFILE,
  [HELENA_PK_PROFILE.id]: HELENA_PK_PROFILE,
};

/** Unknown/missing id → the v2 protagonist. */
export function findPatient(id: string | undefined): PatientProfile {
  return (id && PATIENTS[id]) || HELENA_PK_PROFILE;
}
