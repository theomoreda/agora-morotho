'use client';
import { useState } from 'react';
import AgoraRTC, { AgoraRTCProvider } from 'agora-rtc-react';

/** One RTC client per mount (lazy state initializer; an extra StrictMode dev instance is never joined). */
export default function AgoraProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' }));
  return <AgoraRTCProvider client={client}>{children}</AgoraRTCProvider>;
}
