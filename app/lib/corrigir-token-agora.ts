/**
 * A agora-agents 2.15 chama ConvoAITokenBuilder.buildToken com a lista de
 * argumentos de buildTokenWithPrivilege. No agora-token instalado, o 5º
 * argumento de buildToken é a validade em segundos, e o SDK passa o papel
 * PUBLISHER (1). O token nascia com 1 segundo de vida e a Agora respondia
 * "Token is expired".
 *
 * Este arquivo corrige a chamada no mesmo módulo que o SDK usa. Importar
 * antes de convidar o agente.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const agoraToken = require('agora-token') as {
  RtcRole: { PUBLISHER: number };
  ConvoAITokenBuilder?: {
    buildToken: (...args: unknown[]) => string;
    buildTokenWithPrivilege: (...args: unknown[]) => string;
  };
};

const builder = agoraToken.ConvoAITokenBuilder;
if (!builder?.buildToken || !builder.buildTokenWithPrivilege) {
  // agora-token 2.0.5 não exporta ConvoAITokenBuilder. O SDK 2.9 monta o
  // token por RtcTokenBuilder e não cai no bug de 1 segundo.
} else {
const original = builder.buildToken;

builder.buildToken = function patchedBuildToken(...args: unknown[]) {
  const papel = args[4];
  const validade = args[5];
  if (
    args.length >= 12 &&
    papel === agoraToken.RtcRole.PUBLISHER &&
    typeof validade === 'number' &&
    validade > 1
  ) {
    return builder.buildTokenWithPrivilege(...args);
  }
  return original.apply(this, args);
};
}
