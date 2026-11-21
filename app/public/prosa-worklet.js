/**
 * AudioWorklet do gravador do Prosa.
 *
 * FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).
 *
 * Roda na thread de áudio (não na principal), então não engasga a interface
 * nem a conversa em tempo real com o Gabriel. A única coisa que faz é copiar o
 * bloco de PCM e mandar para a thread principal, que monta o WAV.
 *
 * Por que WAV e não webm/opus: o Praat precisa de PCM. Gravando WAV direto no
 * navegador, o servidor de análise não depende de ffmpeg para converter — uma
 * dependência de sistema a menos para instalar em cada máquina do time.
 */
class ProsaGravadorProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ativo = true;
    this.port.onmessage = (evento) => {
      if (evento.data === 'parar') this.ativo = false;
    };
  }

  process(entradas) {
    if (!this.ativo) return false; // devolve false = worklet pode ser liberado

    const canal = entradas[0]?.[0];
    if (canal && canal.length) {
      // Cópia obrigatória: o buffer de entrada é reaproveitado pelo navegador
      // no bloco seguinte, então mandar a referência entregaria áudio corrompido.
      this.port.postMessage(new Float32Array(canal));
    }
    return true;
  }
}

registerProcessor('prosa-gravador', ProsaGravadorProcessor);
