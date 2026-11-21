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
   * FEITO NO HACKATHON: id da sessão no serviço de análise do Prosa.
   * Vai para a llm.url como `?sid=`, porque a requisição do Custom LLM não
   * traz o canal — é o que amarra a chamada do LLM à conversa certa.
   */
  prosa_sessao_id?: number | null;
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
  /** FEITO NO HACKATHON: sessão aberta no serviço de análise do Prosa. */
  prosaSessaoId?: number | null;
  rtmClient: RTMClient;
  onTokenWillExpire: (uid: string) => Promise<AgoraRenewalTokens>;
  onEndConversation: () => void;
}
