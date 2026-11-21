/**
 * Gravador de áudio da conversa, para as medidas acústicas do Prosa.
 *
 * FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).
 *
 * ── Por que uma segunda captura do microfone ──────────────────────────────
 * A Agora já captura o microfone para a conversa com a Clara, mas aquele
 * caminho passa por cancelamento de eco, supressão de ruído e controle
 * automático de ganho. Essas três coisas mexem exatamente no que queremos
 * medir: supressão de ruído altera jitter e shimmer, e o ganho automático
 * destrói a variação de intensidade que usamos para achar as pausas.
 *
 * Então abrimos uma segunda captura com ANS e AGC DESLIGADOS. O cancelamento
 * de eco fica ligado por padrão, senão a voz da Clara no alto-falante entra
 * na gravação e é medida como se fosse a pessoa. Com fone de ouvido, dá para
 * desligar também (`echoCancellation: false`) e o sinal fica mais puro.
 *
 * Esta é a abordagem "plano B" do documento do time. O "plano A" (receita
 * Thymia, com go-audio-subscriber pegando o PCM no servidor) depende do SDK
 * nativo em Linux — não dá para rodar na máquina da demo.
 */

export type OpcoesGravador = {
  /** URL base do serviço de análise. Ex.: http://127.0.0.1:8000 */
  urlAnalise: string;
  /** deviceId do microfone, para casar com o que a Agora está usando. */
  deviceId?: string;
  /** Com fone de ouvido, false deixa o sinal mais limpo. */
  cancelamentoDeEco?: boolean;
  /** Teto de segurança: para de acumular áudio depois disso. */
  duracaoMaximaS?: number;
};

const DURACAO_MAXIMA_PADRAO_S = 15 * 60;

export class ProsaGravador {
  private contexto: AudioContext | null = null;
  private fonte: MediaStreamAudioSourceNode | null = null;
  private no: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;

  private blocos: Float32Array[] = [];
  private totalAmostras = 0;
  private taxaAmostragem = 48000;
  private limiteAmostras = Infinity;
  private gravando = false;

  constructor(private readonly opcoes: OpcoesGravador) {}

  get estaGravando(): boolean {
    return this.gravando;
  }

  /** Duração acumulada, em segundos. Útil para mostrar na interface. */
  get duracaoS(): number {
    return this.totalAmostras / this.taxaAmostragem;
  }

  async iniciar(): Promise<void> {
    if (this.gravando) return;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: this.opcoes.deviceId
          ? { exact: this.opcoes.deviceId }
          : undefined,
        // As três que importam para a medida:
        noiseSuppression: false, // altera jitter/shimmer
        autoGainControl: false, // destrói a variação de intensidade
        echoCancellation: this.opcoes.cancelamentoDeEco ?? true,
      },
      video: false,
    });

    this.contexto = new AudioContext();
    this.taxaAmostragem = this.contexto.sampleRate;
    this.limiteAmostras =
      (this.opcoes.duracaoMaximaS ?? DURACAO_MAXIMA_PADRAO_S) *
      this.taxaAmostragem;

    await this.contexto.audioWorklet.addModule('/prosa-worklet.js');

    this.fonte = this.contexto.createMediaStreamSource(this.stream);
    this.no = new AudioWorkletNode(this.contexto, 'prosa-gravador');

    this.no.port.onmessage = (evento: MessageEvent<Float32Array>) => {
      if (this.totalAmostras >= this.limiteAmostras) return;
      this.blocos.push(evento.data);
      this.totalAmostras += evento.data.length;
    };

    this.fonte.connect(this.no);
    // Sem conexão ao destino: não queremos tocar o próprio microfone de volta.
    // Em alguns navegadores o grafo só roda se houver um destino, então
    // ligamos num ganho zerado.
    const silencio = this.contexto.createGain();
    silencio.gain.value = 0;
    this.no.connect(silencio).connect(this.contexto.destination);

    this.gravando = true;
  }

  /** Para a gravação e devolve o WAV. Não envia nada. */
  async parar(): Promise<Blob | null> {
    if (!this.gravando) return null;
    this.gravando = false;

    this.no?.port.postMessage('parar');
    this.no?.disconnect();
    this.fonte?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    await this.contexto?.close().catch(() => undefined);

    this.contexto = null;
    this.fonte = null;
    this.no = null;
    this.stream = null;

    if (!this.totalAmostras) return null;
    return montarWav(this.blocos, this.totalAmostras, this.taxaAmostragem);
  }

  /**
   * Para, envia o áudio para análise e descarta tudo da memória.
   *
   * O servidor mede e apaga o arquivo na mesma requisição — o áudio nunca é
   * armazenado em lugar nenhum. Aqui também soltamos os blocos para o
   * navegador não ficar segurando a voz da pessoa na memória.
   */
  async pararEEnviar(sessaoId: number): Promise<unknown | null> {
    const wav = await this.parar();
    this.blocos = [];
    this.totalAmostras = 0;

    if (!wav) return null;

    const formulario = new FormData();
    formulario.append('arquivo', wav, `sessao-${sessaoId}.wav`);

    const resposta = await fetch(
      `${this.opcoes.urlAnalise}/api/sessoes/${sessaoId}/audio`,
      { method: 'POST', body: formulario },
    );

    if (!resposta.ok) {
      throw new Error(`falha ao enviar áudio: HTTP ${resposta.status}`);
    }
    return resposta.json();
  }

  /** Descarta a gravação sem enviar (a pessoa desistiu, ou deu erro). */
  async descartar(): Promise<void> {
    await this.parar();
    this.blocos = [];
    this.totalAmostras = 0;
  }
}

/** Monta um WAV PCM 16-bit mono a partir dos blocos Float32. */
export function montarWav(
  blocos: Float32Array[],
  totalAmostras: number,
  taxaAmostragem: number,
): Blob {
  const bytesDados = totalAmostras * 2; // 16-bit = 2 bytes por amostra
  const buffer = new ArrayBuffer(44 + bytesDados);
  const vista = new DataView(buffer);

  const escreverTexto = (deslocamento: number, texto: string) => {
    for (let i = 0; i < texto.length; i++) {
      vista.setUint8(deslocamento + i, texto.charCodeAt(i));
    }
  };

  // Cabeçalho RIFF/WAVE canônico.
  escreverTexto(0, 'RIFF');
  vista.setUint32(4, 36 + bytesDados, true);
  escreverTexto(8, 'WAVE');
  escreverTexto(12, 'fmt ');
  vista.setUint32(16, 16, true); // tamanho do bloco fmt
  vista.setUint16(20, 1, true); // 1 = PCM sem compressão
  vista.setUint16(22, 1, true); // mono
  vista.setUint32(24, taxaAmostragem, true);
  vista.setUint32(28, taxaAmostragem * 2, true); // bytes por segundo
  vista.setUint16(32, 2, true); // bytes por quadro
  vista.setUint16(34, 16, true); // bits por amostra
  escreverTexto(36, 'data');
  vista.setUint32(40, bytesDados, true);

  let deslocamento = 44;
  for (const bloco of blocos) {
    for (let i = 0; i < bloco.length; i++) {
      // Satura em [-1, 1] antes de converter, senão estoura e vira estalo.
      const amostra = Math.max(-1, Math.min(1, bloco[i]));
      vista.setInt16(
        deslocamento,
        amostra < 0 ? amostra * 0x8000 : amostra * 0x7fff,
        true,
      );
      deslocamento += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
