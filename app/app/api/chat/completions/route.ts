/**
 * Custom LLM (opcional) que a Agora pode chamar durante a conversa.
 *
 * Endpoint OpenAI-compatible baseado no quickstart oficial. Só é usado quando
 * o agente é configurado com `llm.url` apontando para cá (NEXT_LLM_URL +
 * NEXT_LLM_API_KEY). Por padrão o agente usa o LLM gerenciado da Agora e esta
 * rota fica inativa.
 */
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createChatCompletionsHandler } from '@/lib/chat-completions';

export const POST = createChatCompletionsHandler({
  createOpenAIClient: createOpenAI,
  streamTextImpl: streamText,
});
