/**
 * Custom LLM do cliente virtual.
 *
 * Endpoint OpenAI-compatible que a Agora chama durante a conversa. Registra e
 * executa a ferramenta `consultarPolitica` (function calling): quando o
 * vendedor oferece um desconto, o cliente consulta o plano e contesta com o
 * número permitido.
 *
 * Só é usado quando o agente é iniciado com `llm.url` apontando para cá
 * (NEXT_LLM_URL definido no invite-agent). Sem isso, o agente usa o LLM
 * gerenciado da Agora e esta rota fica inativa.
 */
import { clienteChatCompletions } from '@/lib/cliente-chat-completions';

export const POST = clienteChatCompletions;
