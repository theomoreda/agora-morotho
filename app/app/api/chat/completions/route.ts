/**
 * Custom LLM que a Agora chama durante a conversa.
 *
 * ADAPTADO NO HACKATHON. O handler original do quickstart (um proxy SSE sem
 * ferramentas) está preservado em route.ts.orig-quickstart e continua em
 * lib/chat-completions.ts. O nosso acrescenta as brincadeiras do Prosa.
 */
import { prosaChatCompletions } from '@/lib/prosa-chat-completions';

export const POST = prosaChatCompletions;
