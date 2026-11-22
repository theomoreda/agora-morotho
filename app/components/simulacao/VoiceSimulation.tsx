'use client';

import { useState, useRef, Suspense, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { RTMClient } from 'agora-rtm';
import type {
  AgoraTokenData,
  ClientStartRequest,
  AgentResponse,
  AgoraRenewalTokens,
} from '@/types/conversation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PreCallScenarioCard } from './PreCallScenarioCard';
import { VerdictCard } from '@/components/veredito/VerdictCard';
import { Button } from '@/components/ui/button';
import { avaliarTurnos } from '@/lib/veredito';
import type { Cenario, Turno, Veredito } from '@/lib/types';

// Dynamically import the ConversationComponent with ssr disabled
const ConversationComponent = dynamic(
  () => import('@/components/ConversationComponent'),
  { ssr: false },
);

// Dynamically import AgoraRTCProvider (browser-only).
const AgoraProvider = dynamic(
  async () => {
    const { AgoraRTCProvider, default: AgoraRTC } =
      await import('agora-rtc-react');
    return {
      default: function AgoraProviders({
        children,
      }: {
        children: React.ReactNode;
      }) {
        // useRef persists across StrictMode's simulated unmount/remount, so only
        // one RTC client is ever created per session.
        const clientRef = useRef<ReturnType<
          typeof AgoraRTC.createClient
        > | null>(null);
        if (!clientRef.current) {
          clientRef.current = AgoraRTC.createClient({
            mode: 'rtc',
            codec: 'vp8',
          });
        }
        return (
          <AgoraRTCProvider client={clientRef.current}>
            {children}
          </AgoraRTCProvider>
        );
      },
    };
  },
  { ssr: false },
);

type VoiceSimulationProps = {
  cenario: Cenario;
  /** Chamado quando o vendedor encerra a conversa. */
  onFinish?: () => void;
};

/**
 * Simulação de voz: reusa o encanamento RTC/RTM/ConvoAI da Agora, parametrizado
 * pelo cenário. O `cenario.id` é enviado ao `invite-agent`, que monta a persona
 * do cliente virtual.
 */
export default function VoiceSimulation({
  cenario,
  onFinish,
}: VoiceSimulationProps) {
  const [showConversation, setShowConversation] = useState(false);

  // Preload heavy modules on mount so they're cached when the user starts.
  useEffect(() => {
    import('agora-rtc-react').catch(() => {});
    import('agora-rtm').catch(() => {});
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agoraData, setAgoraData] = useState<AgoraTokenData | null>(null);
  const [rtmClient, setRtmClient] = useState<RTMClient | null>(null);
  const [agentJoinError, setAgentJoinError] = useState(false);
  // Veredito pós-chamada, calculado quando a conversa encerra.
  const [veredito, setVeredito] = useState<Veredito | null>(null);

  const handleStartConversation = async () => {
    setIsLoading(true);
    setError(null);
    setAgentJoinError(false);

    try {
      // 1. Fetch RTC token + channel
      const agoraResponse = await fetch('/api/generate-agora-token');
      const responseData = await agoraResponse.json();

      if (!agoraResponse.ok) {
        throw new Error(
          `Failed to generate Agora token: ${JSON.stringify(responseData)}`,
        );
      }

      // 2. Start the agent (with the scenario persona) and set up RTM in parallel.
      const [agentData, rtm] = await Promise.all([
        fetch('/api/invite-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requester_id: responseData.uid,
            channel_name: responseData.channel,
            cenario_id: cenario.id,
          } as ClientStartRequest),
        })
          .then(async (res) => {
            if (!res.ok) {
              setAgentJoinError(true);
              return null;
            }
            return res.json() as Promise<AgentResponse>;
          })
          .catch((err) => {
            console.error('Failed to start conversation with agent:', err);
            setAgentJoinError(true);
            return null;
          }),

        (async () => {
          const { default: AgoraRTM } = await import('agora-rtm');
          const rtm: RTMClient = new AgoraRTM.RTM(
            process.env.NEXT_PUBLIC_AGORA_APP_ID!,
            responseData.uid,
          );
          await rtm.login({ token: responseData.token });
          await rtm.subscribe(responseData.channel);
          return rtm;
        })(),
      ]);

      setRtmClient(rtm);
      setAgoraData({ ...responseData, agentId: agentData?.agent_id });
      setShowConversation(true);
    } catch (err) {
      setError('Não foi possível iniciar a simulação. Tente novamente.');
      console.error('Error starting conversation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenWillExpire = useCallback(
    async (uid: string): Promise<AgoraRenewalTokens> => {
      try {
        const channel = agoraData?.channel;
        if (!channel) {
          throw new Error('Missing channel for token renewal');
        }

        const [rtcResponse, rtmResponse] = await Promise.all([
          fetch(`/api/generate-agora-token?channel=${channel}&uid=${uid}`),
          fetch(
            `/api/generate-agora-token?channel=${channel}&uid=${agoraData.uid}`,
          ),
        ]);
        const [rtcData, rtmData] = await Promise.all([
          rtcResponse.json(),
          rtmResponse.json(),
        ]);

        if (!rtcResponse.ok || !rtmResponse.ok) {
          throw new Error('Failed to generate renewal tokens');
        }

        return {
          rtcToken: rtcData.token,
          rtmToken: rtmData.token,
        };
      } catch (error) {
        console.error('Error renewing token:', error);
        throw error;
      }
    },
    [agoraData],
  );

  const handleEndConversation = async (turnos: Turno[]) => {
    // Veredito pós-chamada a partir dos turnos atribuídos da transcrição.
    setVeredito(avaliarTurnos(turnos));

    // Stop the AI agent
    if (agoraData?.agentId) {
      try {
        const response = await fetch('/api/stop-conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agoraData.agentId }),
        });
        if (!response.ok) {
          console.error('Failed to stop agent:', await response.text());
        }
      } catch (error) {
        console.error('Error stopping agent:', error);
      }
    }

    // Tear down RTM — owned here since we created it here
    rtmClient?.logout().catch((err) => console.error('RTM logout error:', err));
    setRtmClient(null);
    setShowConversation(false);
    // Não navega embora ainda: mostra o veredito e deixa o usuário sair depois.
  };

  return (
    <div className="relative flex h-dvh min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div
        className={`flex min-h-0 flex-1 flex-col ${
          showConversation
            ? 'items-stretch justify-start'
            : 'items-center justify-center'
        }`}
      >
        <div
          className={`z-10 flex min-h-0 flex-1 flex-col ${
            showConversation
              ? 'h-full w-full max-w-none items-stretch gap-0 px-0 text-left'
              : 'w-full max-w-none items-center justify-center px-4 text-center'
          }`}
        >
          {veredito && !showConversation ? (
            <div className="mx-auto w-[min(92vw,30rem)] space-y-4 text-left">
              <h2 className="text-lg font-semibold text-white">
                Veredito da simulação
              </h2>
              <VerdictCard veredito={veredito} />
              <Button className="w-full" onClick={() => onFinish?.()}>
                Concluir
              </Button>
            </div>
          ) : !showConversation ? (
            <PreCallScenarioCard
              cenario={cenario}
              isLoading={isLoading}
              error={error}
              onStartConversation={handleStartConversation}
            />
          ) : agoraData && rtmClient ? (
            <>
              {agentJoinError && (
                <div className="p-3 bg-destructive/10 rounded-md text-destructive text-sm max-w-sm">
                  Falha ao conectar com o cliente virtual. A simulação pode não
                  funcionar como esperado.
                </div>
              )}
              <Suspense fallback={<LoadingSkeleton />}>
                <ErrorBoundary>
                  <AgoraProvider>
                    <ConversationComponent
                      agoraData={agoraData}
                      rtmClient={rtmClient}
                      onTokenWillExpire={handleTokenWillExpire}
                      onEndConversation={handleEndConversation}
                    />
                  </AgoraProvider>
                </ErrorBoundary>
              </Suspense>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Falha ao carregar os dados da conversa.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
