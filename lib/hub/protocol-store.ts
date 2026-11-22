/**
 * Last protocol received by this hub (per patient), kept in localStorage so a page reload
 * on stage does not lose what the therapist sent. Best-effort: storage may be unavailable.
 */
import { protocolErrors, type PracticeProtocol } from '@/lib/contracts';

export interface StoredProtocol {
  protocol: PracticeProtocol;
  version: number;
}

const key = (patientId: string) => `unmute:protocol:${patientId}`;

export function loadProtocol(patientId: string, fallback: StoredProtocol): StoredProtocol {
  try {
    const raw = localStorage.getItem(key(patientId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as StoredProtocol;
    if (!Number.isInteger(parsed.version) || protocolErrors(parsed.protocol).length > 0) return fallback;
    return parsed.version >= fallback.version ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveProtocol(patientId: string, value: StoredProtocol): void {
  try {
    localStorage.setItem(key(patientId), JSON.stringify(value));
  } catch {
    // storage blocked (private mode) — the in-memory value still works for this session
  }
}
