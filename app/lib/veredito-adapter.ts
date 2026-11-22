/**
 * Adaptador: transforma os turnos da transcrição da Agora (`messageList`) nos
 * turnos atribuídos que o motor do veredito consome.
 *
 * O toolkit entrega cada turno com um `uid`. O agente (cliente virtual) usa o
 * UID padrão; qualquer outro UID é o vendedor (usuário local).
 */
import type { IMessageListItem } from 'agora-agent-uikit';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
import type { Turno } from '@/lib/types';

export function messageListParaTurnos(
  messageList: IMessageListItem[],
  agentUid: number = DEFAULT_AGENT_UID,
): Turno[] {
  return messageList
    .filter((m) => typeof m.text === 'string' && m.text.trim().length > 0)
    .map((m) => ({
      falante: m.uid === agentUid ? ('cliente' as const) : ('vendedor' as const),
      texto: m.text.trim(),
    }));
}
