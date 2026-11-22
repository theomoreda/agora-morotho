/**
 * Casos que não precisam de microfone: a oferta transcrita não vira "não entendi",
 * e a voz da ligação é Fish Audio com o id vindo do ambiente.
 *
 * Rodar: node --import tsx scripts/verify-oferta.ts
 */
import { FishAudioTTS } from 'agora-agents';
import { montarPromptCliente } from '../lib/cenario-prompt';
import type { Cenario } from '../lib/types';
import { silencioMs, vozDoCliente } from '../lib/voz-cliente';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const cenario: Cenario = {
  id: 'cen-teste',
  titulo: 'Teste',
  produtoId: 'prod',
  perfilCliente: 'acha_caro',
  dificuldade: 'medio',
  objetivo: 'fechar',
  objecoes: ['está caro'],
  comportamento: 'pede desconto',
  criterios: [],
  criadoEm: '2026-11-22',
};

function verifyPromptNaoPedeRepeticao() {
  const prompt = montarPromptCliente({
    cenario,
    produto: {
      id: 'prod',
      nome: 'Plano Gestão 360',
      descricao: 'R$ 79,90',
      materiais: [],
    },
  });
  assert(
    prompt.includes('Não diga que não entendeu'),
    'O prompt deveria proibir "não entendi" quando a frase tem plano ou preço',
  );
  assert(
    prompt.includes('plano ou o preço'),
    'O prompt deveria tratar plano ou preço transcrito como oferta',
  );
  assert(
    prompt.includes('consultarPolitica'),
    'O prompt deveria continuar mandando consultar a política',
  );
  assert(
    !prompt.toLowerCase().includes('você pode repetir? não entendi'),
    'O prompt não deveria ensinar a frase que ignorou a oferta da Claro',
  );
}

function verifyFish() {
  process.env.PROSA_FISH_API_KEY = 'chave-de-teste';
  process.env.PROSA_FISH_VOICE_ID = 'voz-de-teste';
  delete process.env.PROSA_FISH_BACKEND;
  const cfg = vozDoCliente().toConfig() as {
    vendor?: string;
    params?: { api_key?: string; reference_id?: string; backend?: string };
  };
  assert(cfg.vendor === 'fishaudio', 'A voz da ligação deveria ser fishaudio');
  assert(cfg.params?.reference_id === 'voz-de-teste', 'O id da voz deveria vir do ambiente');
  assert(cfg.params?.backend === 'speech-1.5', 'O backend padrão do SDK é speech-1.5');
  assert(
    typeof cfg.params?.api_key === 'string' && cfg.params.api_key.length > 0,
    'A chave deveria ir no config, sem aparecer no log',
  );

  const direto = new FishAudioTTS({
    key: 'outra',
    referenceId: 'ref',
    backend: 'speech-1.5',
  }).toConfig() as { vendor?: string };
  assert(direto.vendor === 'fishaudio', 'FishAudioTTS.toConfig usa vendor fishaudio');
}

function verifySilencio() {
  delete process.env.PROSA_SILENCE_MS;
  delete process.env.NEXT_SILENCE_MS;
  assert(silencioMs() === 700, 'Sem env, o silêncio padrão deveria ser 700 ms');
  process.env.PROSA_SILENCE_MS = '700';
  assert(silencioMs() === 700, 'PROSA_SILENCE_MS deveria valer');
}

function main() {
  verifyPromptNaoPedeRepeticao();
  verifyFish();
  verifySilencio();
  console.log('Offer and voice checks passed');
}

main();
