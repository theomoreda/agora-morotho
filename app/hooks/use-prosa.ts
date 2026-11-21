'use client';

/**
 * Liga a conversa da Agora ao serviço de análise do Prosa.
 *
 * FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).
 *
 * Fica num hook separado de propósito: o ConversationComponent do quickstart
 * oficial continua praticamente intacto, só chamando este hook. Fica fácil
 * mostrar ao júri o que é do sample e o que é nosso.
 *
 * O que ele faz, no ciclo de uma conversa:
 *   1. começa a gravar o áudio (segunda captura, sem ANS/AGC — ver lib/gravador)
 *   2. a cada turno encerrado, manda a transcrição para o banco
 *   3. no fim: envia o áudio (que é medido e apagado) e pede o semáforo
 *
 * Quem ABRE a sessão é a LandingPage, não este hook: o id tem de existir
 * antes do convite do agente, para entrar na llm.url do Custom LLM.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ProsaGravador } from '@/lib/gravador';
import {
  finalizarSessao,
  registrarFala,
  urlAnalise,
  type ResultadoFinal,
} from '@/lib/prosa-api';

/** Turno já encerrado, como o toolkit da Agora entrega. */
export type TurnoEncerrado = {
  turn_id: number | string;
  uid: number | string;
  text: string;
};

export type OpcoesProsa = {
  /**
   * Sessão já aberta no serviço de análise.
   *
   * Quem abre é a LandingPage, ANTES de convidar o agente — o id precisa
   * existir a tempo de entrar na llm.url (?sid=) do Custom LLM. null significa
   * "esta conversa não está sendo acompanhada", e tudo aqui vira no-op.
   */
  sessaoId: number | null;
  /** UID local, para separar a fala da pessoa da fala da Clara. */
  uidLocal: string;
  /** Só começa quando a conversa está de fato no ar. */
  ativo: boolean;
  /** Microfone escolhido, para gravar o mesmo que a Agora está ouvindo. */
  deviceId?: string;
  /** Turnos encerrados (o messageList do componente). */
  turnos: TurnoEncerrado[];
  /** As três palavras do jogo de memória. */
  palavrasMemoria?: readonly string[];
};

export type EstadoProsa = {
  gravando: boolean;
  analisando: boolean;
  resultado: ResultadoFinal | null;
  erro: string | null;
  /** Chame ao encerrar a conversa. Devolve o semáforo. */
  encerrar: () => Promise<ResultadoFinal | null>;
};

export function useProsa(opcoes: OpcoesProsa): EstadoProsa {
  const { sessaoId, uidLocal, ativo, deviceId, turnos, palavrasMemoria } =
    opcoes;

  const [gravando, setGravando] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoFinal | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const gravadorRef = useRef<ProsaGravador | null>(null);
  const enviadosRef = useRef<Set<string>>(new Set());
  const encerrandoRef = useRef(false);

  // --- 1: começar a gravar ---
  useEffect(() => {
    if (!ativo || sessaoId === null) return;

    let cancelado = false;

    (async () => {
      try {
        const gravador = new ProsaGravador({
          urlAnalise: urlAnalise(),
          deviceId,
        });
        await gravador.iniciar();
        if (cancelado) {
          await gravador.descartar();
          return;
        }
        gravadorRef.current = gravador;
        setGravando(true);
      } catch (e) {
        if (!cancelado) {
          // Falha aqui não derruba a conversa: a pessoa continua falando com a
          // Clara, só não teremos as medidas desta sessão. É o comportamento
          // certo — companhia é o valor principal, a medida é o secundário.
          setErro(e instanceof Error ? e.message : String(e));
        }
      }
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, sessaoId]);

  // Rede de segurança: se o componente sair sem passar pelo encerrar(),
  // soltamos o microfone e a memória em vez de deixar vazando.
  useEffect(() => {
    return () => {
      const g = gravadorRef.current;
      gravadorRef.current = null;
      if (g && !encerrandoRef.current) {
        void g.descartar();
      }
    };
  }, []);

  // --- 2: mandar cada turno encerrado ---
  useEffect(() => {
    if (sessaoId === null) return;

    for (const turno of turnos) {
      const chave = `${turno.uid}:${turno.turn_id}`;
      if (enviadosRef.current.has(chave)) continue;
      if (!turno.text?.trim()) continue;

      enviadosRef.current.add(chave);

      const papel = String(turno.uid) === String(uidLocal) ? 'pessoa' : 'clara';

      // A etiqueta de brincadeira NÃO vem daqui. Quem sabe se o minuto dos
      // bichos está rolando é o Custom LLM, que abre e fecha a janela no
      // serviço de análise. Mandamos sem etiqueta e o serviço aplica a janela
      // que estiver aberta.
      void registrarFala(sessaoId, papel, turno.text).catch((e) => {
        console.warn('[prosa] não foi possível registrar a fala:', e);
        // Deixa reenviar numa próxima atualização.
        enviadosRef.current.delete(chave);
      });
    }
  }, [turnos, sessaoId, uidLocal]);

  // --- 3: encerrar ---
  const encerrar = useCallback(async (): Promise<ResultadoFinal | null> => {
    if (sessaoId === null || encerrandoRef.current) return null;
    encerrandoRef.current = true;
    setAnalisando(true);

    try {
      const gravador = gravadorRef.current;
      gravadorRef.current = null;

      if (gravador) {
        setGravando(false);
        // O serviço mede e apaga o arquivo na mesma requisição.
        await gravador.pararEEnviar(sessaoId);
      }

      const final = await finalizarSessao(sessaoId, palavrasMemoria);
      setResultado(final);
      return final;
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setAnalisando(false);
      encerrandoRef.current = false;
    }
  }, [sessaoId, palavrasMemoria]);

  return { gravando, analisando, resultado, erro, encerrar };
}
