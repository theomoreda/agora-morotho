import type { RTMClient } from 'agora-rtm';

export interface AgoraTokenData {
  token: string;
  uid: string;
  channel: string;
  agentId?: string;
}

export interface ClientStartRequest {
  requester_id: string;
  channel_name: string;
  /**
   * Cenário de simulação que define a persona do cliente virtual.
   * O servidor monta as instruções do agente a partir dele.
   */
  cenario_id?: string | null;
  /** Produto escolhido pelo vendedor. Sem ele, vale o produto do cenário. */
  produto_id?: string | null;
}

export interface StopConversationRequest {
  agent_id: string;
}

export interface AgentResponse {
  agent_id: string;
  create_ts: number;
  state: string;
}

export interface AgoraRenewalTokens {
  rtcToken: string;
  rtmToken: string;
}

export interface ConversationComponentProps {
  agoraData: AgoraTokenData;
  rtmClient: RTMClient;
  onTokenWillExpire: (uid: string) => Promise<AgoraRenewalTokens>;
  /**
   * Recebe os turnos atribuídos da conversa e o tempo, em segundos, entre a
   * primeira fala transcrita e o encerramento.
   */
  onEndConversation: (
    turnos: import('@/lib/types').Turno[],
    duracaoSeg: number,
  ) => void;
}
