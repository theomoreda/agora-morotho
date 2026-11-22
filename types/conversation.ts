import type { PracticeProtocol } from '@/lib/contracts';
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
  /** UNMUTE: 'practice' (default, v2 voice coach); 'checkin' | 'emergency' are deprecated V1 modes */
  mode?: 'practice' | 'checkin' | 'emergency';
  /** UNMUTE: patient profile id (defaults to Helena, PK-2026-031) */
  patient_id?: string;
  /** UNMUTE v2: protocol set by the speech therapist (defaults to DEFAULT_PROTOCOL) */
  protocol?: PracticeProtocol;
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
  onEndConversation: () => void;
}
