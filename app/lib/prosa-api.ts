/**
 * Cliente do serviço de análise do Prosa (../analise).
 *
 * FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).
 *
 * O serviço é separado de propósito, por dois motivos:
 *   1. As medidas acústicas usam Praat (parselmouth), que é Python.
 *   2. O Praat é GPLv3. Mantendo-o como processo separado, que fala por HTTP,
 *      o app Next.js não é um trabalho derivado dele.
 */

export type PapelFala = 'pessoa' | 'clara';
export type Brincadeira = 'fluencia' | 'memoria' | 'orientacao';

export type Semaforo = 'calibrando' | 'verde' | 'amarelo' | 'vermelho';

export interface ResultadoFinal {
  sessao_id: number;
  status: Semaforo;
  cor: string;
  mensagem: string;
  n_sessoes_base: number;
  medidas: Record<string, number | null>;
  mudancas: string[];
}

/** No navegador precisa ser pública; no servidor, a interna basta. */
export function urlAnalise(): string {
  return (
    process.env.NEXT_PUBLIC_PROSA_ANALISE_URL ??
    process.env.PROSA_ANALISE_URL ??
    'http://127.0.0.1:8000'
  );
}

async function pedir<T>(
  caminho: string,
  init?: RequestInit,
  base = urlAnalise(),
): Promise<T> {
  const resposta = await fetch(`${base}${caminho}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (!resposta.ok) {
    let detalhe = `HTTP ${resposta.status}`;
    try {
      const corpo = await resposta.json();
      if (corpo?.detail) detalhe = String(corpo.detail);
    } catch {
      // resposta sem JSON: fica o status
    }
    throw new Error(`serviço de análise: ${detalhe}`);
  }

  return resposta.json() as Promise<T>;
}

export async function abrirSessao(params: {
  pessoaId: number;
  canal?: string;
  agentId?: string;
}): Promise<number> {
  const dados = await pedir<{ sessao_id: number }>('/api/sessoes', {
    method: 'POST',
    body: JSON.stringify({
      pessoa_id: params.pessoaId,
      canal: params.canal ?? null,
      agent_id: params.agentId ?? null,
    }),
  });
  return dados.sessao_id;
}

export async function registrarFala(
  sessaoId: number,
  papel: PapelFala,
  texto: string,
  brincadeira?: Brincadeira | null,
): Promise<void> {
  await pedir(`/api/sessoes/${sessaoId}/falas`, {
    method: 'POST',
    body: JSON.stringify({
      papel,
      texto,
      brincadeira: brincadeira ?? null,
    }),
  });
}

export async function finalizarSessao(
  sessaoId: number,
  palavrasMemoria?: readonly string[],
): Promise<ResultadoFinal> {
  return pedir<ResultadoFinal>(`/api/sessoes/${sessaoId}/finalizar`, {
    method: 'POST',
    body: JSON.stringify({
      palavras_memoria: palavrasMemoria ? [...palavrasMemoria] : null,
    }),
  });
}

export async function garantirPessoa(
  nome: string,
  idade?: number,
): Promise<number> {
  const dados = await pedir<{ pessoa_id: number }>('/api/pessoas', {
    method: 'POST',
    body: JSON.stringify({
      nome,
      idade: idade ?? null,
      simulado: false,
      // O consentimento de verdade é colhido na tela antes da conversa.
      consentimento: true,
    }),
  });
  return dados.pessoa_id;
}
