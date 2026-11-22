'use client';
/**
 * Browser-side Signaling (RTM) login for clinic-sync.
 * The hub can instead reuse the RTM client of its agent session: createClinicSync(existingRtm).
 */
import type { RTMClient } from 'agora-rtm';
import { CLINIC_CHANNEL } from '@/lib/contracts';
import { createClinicSync, type ClinicSync } from './sync';

export interface ClinicConnection {
  sync: ClinicSync;
  rtm: RTMClient;
  uid: string;
  close(): Promise<void>;
}

export async function connectClinicSync(): Promise<ClinicConnection> {
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  if (!appId) throw new Error('NEXT_PUBLIC_AGORA_APP_ID is not set');

  // The starter's token route issues RTC+RTM tokens (buildTokenWithRtm); RTM login only needs the uid.
  const res = await fetch(`/api/generate-agora-token?channel=${CLINIC_CHANNEL}`);
  const data = (await res.json()) as { token?: string; uid?: string; error?: string };
  if (!res.ok || !data.token || !data.uid) throw new Error(`token request failed: ${data.error ?? res.status}`);

  const { default: AgoraRTM } = await import('agora-rtm');
  const rtm: RTMClient = new AgoraRTM.RTM(appId, data.uid);
  await rtm.login({ token: data.token });

  return {
    sync: createClinicSync(rtm),
    rtm,
    uid: data.uid,
    close: async () => {
      await rtm.logout().catch(() => {});
    },
  };
}
