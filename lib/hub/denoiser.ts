'use client';
/**
 * Agora AI Noise Suppression on the hub microphone (TV, radio, fan in the living room).
 * Falls back silently to the browser's native ANS if unsupported or the WASM fails to load.
 */
import AgoraRTC, { type IMicrophoneAudioTrack } from 'agora-rtc-react';
import type { AIDenoiserExtension } from 'agora-extension-ai-denoiser';

export type DenoiserStatus = 'on' | 'unsupported' | 'error';

let extension: AIDenoiserExtension | null = null;

export async function applyAiDenoiser(track: IMicrophoneAudioTrack): Promise<DenoiserStatus> {
  try {
    const { AIDenoiserExtension } = await import('agora-extension-ai-denoiser');
    if (!extension) {
      const ext = new AIDenoiserExtension({ assetsPath: '/agora-denoiser' });
      if (!ext.checkCompatibility()) return 'unsupported';
      AgoraRTC.registerExtensions([ext]);
      extension = ext;
    }
    const processor = extension.createProcessor();
    processor.on('overload', async () => {
      console.warn('[hub] AI denoiser overloaded — switching to stationary noise suppression');
      await processor.setMode('STATIONARY_NS' as Parameters<typeof processor.setMode>[0]);
    });
    track.pipe(processor).pipe(track.processorDestination);
    await processor.enable();
    return 'on';
  } catch (e) {
    console.warn('[hub] AI denoiser unavailable, using native noise suppression', e);
    return 'error';
  }
}
