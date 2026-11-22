/**
 * VozAtiva — contratos de dados compartilhados entre o painel do fonoaudiólogo
 * (/clinica) e o hub do paciente (/paciente).
 *
 * Regra de domínio central: toda medição de projeção vocal é RELATIVA e
 * normalizada (0.0 a 1.0), comparada à linha de base habitual do próprio
 * paciente. Nunca usamos decibéis (dB). 1.0x = tom habitual; o multiplicador
 * da meta (ex.: 1.35x) é definido pelo fonoaudiólogo.
 */

export interface ExercisePhrase {
  /** 1, 2 ou 3 — ordem fixa do protocolo diário. */
  id: number;
  /** Rótulo clínico curto. Ex.: "Projeção Sustentada". */
  label: string;
  /** Frase que o paciente deve falar. */
  text: string;
}

export interface ProtocolConfig {
  patientId: string;
  /** Multiplicador da meta de projeção. Ex.: 1.35 (35% acima do tom habitual). */
  targetMultiplier: number;
  /** As 3 frases do treino do dia, nesta ordem. */
  phrases: ExercisePhrase[];
  /** ISO timestamp da última atualização feita pelo fonoaudiólogo. */
  updatedAt: string;
}

export interface TurnResult {
  exerciseId: number;
  phraseText: string;
  /** Pico bruto do nível relativo no turno (0.0 a 1.0). */
  rawPeak: number;
  /** Nível de referência da linha de base habitual (0.0 a 1.0). */
  baselineRef: number;
  /** Multiplicador efetivamente atingido. Ex.: 1.42. */
  achievedMultiplier: number;
  /** Multiplicador da meta vigente no momento do turno. Ex.: 1.35. */
  targetMultiplier: number;
  hitTarget: boolean;
  attempts: number;
  transcript: string;
  /** ISO timestamp. */
  timestamp: string;
}

export type SessionStatus =
  | 'idle'
  | 'calibrating_baseline'
  | 'active'
  | 'completed';

export interface SessionState {
  status: SessionStatus;
  agentSpeaking: boolean;
  agentCaption: string;
  /** 0, 1 ou 2 — índice do exercício atual. */
  currentExerciseIndex: number;
  /** Nível relativo bruto ao vivo (0.0 a 1.0). */
  liveRawLevel: number;
  /** Multiplicador ao vivo relativo à linha de base. Ex.: 1.15. */
  liveMultiplier: number;
  results: TurnResult[];
}

/**
 * Ponto do gráfico longitudinal de adesão/projeção (14 dias).
 */
export interface DailyProgressPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Rótulo curto para o eixo X. Ex.: "08/11". */
  label: string;
  /** Projeção relativa média do dia. Ex.: 1.37. */
  avgMultiplier: number;
  /** Se o treino daquele dia foi concluído. */
  completed: boolean;
}

/**
 * Metadados de paciente exibidos na lista do painel clínico.
 * Mock nesta etapa; virá de um backend/RTM na Etapa 2.
 */
export interface PatientSummary {
  id: string;
  name: string;
  age: number;
  /** Ex.: "Parkinson Estágio II (Hoehn & Yahr)". */
  condition: string;
  /** Adesão domiciliar em %. */
  adherence: number;
  online: boolean;
}

/**
 * Eventos trafegados pelo barramento de sessão (sessionBridge).
 *
 * A Etapa 2 troca o transporte (BroadcastChannel/localStorage) por
 * agora-rtm sem alterar estes tipos.
 */
export type SessionEvent =
  | { type: 'protocol/update'; payload: ProtocolConfig }
  | { type: 'session/state'; payload: SessionState }
  | { type: 'session/reset' }
  | { type: 'bridge/request-sync' };
