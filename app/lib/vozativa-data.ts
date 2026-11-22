/**
 * Dados-semente e mocks do VozAtiva, compartilhados por /paciente e /clinica.
 * Na Etapa 2 estes valores virão de backend/RTM; aqui servem de ponto de
 * partida determinístico (sem Math.random na renderização, para não causar
 * divergência de hidratação).
 */

import type {
  DailyProgressPoint,
  PatientSummary,
  ProtocolConfig,
  SessionState,
} from '@/types/vozativa';

export const PRIMARY_PATIENT_ID = 'antonio-silva';
export const PRIMARY_PATIENT_NAME = 'Antônio';

/** Nível de referência (0..1) que representa o tom habitual (1.0x). */
export const BASELINE_REF = 0.34;

export const TARGET_OPTIONS = [
  { value: 1.2, label: '1.20x — Leve' },
  { value: 1.35, label: '1.35x — Moderada' },
  { value: 1.5, label: '1.50x — Intensa' },
] as const;

export function createDefaultProtocol(): ProtocolConfig {
  return {
    patientId: PRIMARY_PATIENT_ID,
    targetMultiplier: 1.35,
    phrases: [
      {
        id: 1,
        label: 'Projeção Sustentada',
        text: 'A arara azul voa alto sobre o rio.',
      },
      {
        id: 2,
        label: 'Frase Funcional',
        text: 'Bom dia! Eu quero um copo de água, por favor.',
      },
      {
        id: 3,
        label: 'Articulação',
        text: 'O relógio da parede marca três horas.',
      },
    ],
    updatedAt: new Date(0).toISOString(),
  };
}

export function createInitialSessionState(): SessionState {
  return {
    status: 'idle',
    agentSpeaking: false,
    agentCaption: 'Toque em “Iniciar treino de hoje” quando estiver pronto.',
    currentExerciseIndex: 0,
    liveRawLevel: 0,
    liveMultiplier: 1.0,
    results: [],
  };
}

export const MOCK_PATIENTS: PatientSummary[] = [
  {
    id: PRIMARY_PATIENT_ID,
    name: 'Sr. Antônio Silva',
    age: 74,
    condition: 'Parkinson Estágio II (Hoehn & Yahr)',
    adherence: 92,
    online: true,
  },
  {
    id: 'helena-costa',
    name: 'Dona Helena Costa',
    age: 69,
    condition: 'Parkinson Estágio I',
    adherence: 78,
    online: false,
  },
  {
    id: 'carlos-mendes',
    name: 'Sr. Carlos Mendes',
    age: 78,
    condition: 'Parkinson Estágio II',
    adherence: 64,
    online: false,
  },
  {
    id: 'nair-oliveira',
    name: 'Dona Nair Oliveira',
    age: 71,
    condition: 'Parkinson Estágio I',
    adherence: 88,
    online: false,
  },
];

/**
 * 14 dias de histórico determinístico para o Sr. Antônio.
 * O ponto do dia atual é adicionado dinamicamente quando a sessão conclui.
 */
export function buildFourteenDayHistory(): DailyProgressPoint[] {
  // Série fixa (sem aleatoriedade) para 13 dias anteriores; o 14º fica aberto.
  const series = [
    1.18, 1.22, 1.2, 1.27, 1.31, 1.29, 1.34, 1.33, 1.38, 1.36, 1.41, 1.39, 1.43,
  ];
  const points: DailyProgressPoint[] = [];
  const today = new Date();
  for (let i = 13; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const idx = 13 - i;
    points.push({
      date: d.toISOString().slice(0, 10),
      label: `${String(d.getDate()).padStart(2, '0')}/${String(
        d.getMonth() + 1,
      ).padStart(2, '0')}`,
      avgMultiplier: series[idx] ?? 1.3,
      completed: true,
    });
  }
  // Dia atual, ainda não concluído.
  points.push({
    date: today.toISOString().slice(0, 10),
    label: `${String(today.getDate()).padStart(2, '0')}/${String(
      today.getMonth() + 1,
    ).padStart(2, '0')}`,
    avgMultiplier: 0,
    completed: false,
  });
  return points;
}
