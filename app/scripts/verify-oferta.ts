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
    prompt.includes('Nunca repita uma frase'),
    'O prompt deveria proibir o cliente de repetir falas já ditas',
  );
  assert(
    prompt.includes('não falas prontas'),
    'As objeções do cenário deveriam ir como temas, não como falas para recitar',
  );
  assert(
    !prompt.includes('SEMPRE que o vendedor'),
    'O prompt não deveria mandar citar a política a cada menção de desconto',
  );
  assert(
    prompt.includes('nunca cite "política"'),
    'O cliente não deveria ensinar a política ao vendedor',
  );
  assert(
    prompt.includes('tchau') && prompt.includes('entre 6 e 10 falas'),
    'O prompt deveria levar a conversa a uma decisão com despedida',
  );

  const comMateriais = montarPromptCliente({
    cenario,
    materiais: [
      { id: 'a', titulo: 'Catálogo', tipo: 'catalogo', conteudo: 'fibra 600 Mega', atualizadoEm: '' },
      { id: 'b', titulo: 'Política', tipo: 'politica', conteudo: 'desconto máximo 10%', atualizadoEm: '' },
    ],
  });
  assert(
    comMateriais.includes('fibra 600 Mega') && !comMateriais.includes('desconto máximo 10%'),
    'Material de política não deveria chegar ao cliente',
  );
  assert(
    !prompt.toLowerCase().includes('você pode repetir? não entendi'),
    'O prompt não deveria ensinar a frase que ignorou a oferta da Claro',
  );
}

function verifyFish() {
  type Cfg = {
    vendor?: string;
    credential_mode?: string;
    params?: { api_key?: string; reference_id?: string; backend?: string };
  };
  process.env.PROSA_FISH_API_KEY = 'chave-de-teste';
  process.env.PROSA_FISH_VOICE_ID = 'voz-de-teste';
  delete process.env.PROSA_FISH_BACKEND;
  delete process.env.PROSA_FISH_CREDENTIAL;

  const gerenciado = vozDoCliente().toConfig() as Cfg;
  assert(gerenciado.vendor === 'fishaudio', 'A voz da ligação deveria ser fishaudio');
  assert(gerenciado.credential_mode === 'managed', 'O padrão deveria ser o modo gerenciado');
  assert(gerenciado.params?.reference_id === 'voz-de-teste', 'O id da voz deveria vir do ambiente');
  assert(gerenciado.params?.backend === 's2.1-pro', 'O modo gerenciado usa s2.1-pro');
  assert(gerenciado.params?.api_key === undefined, 'O modo gerenciado não envia chave');

  process.env.PROSA_FISH_CREDENTIAL = 'byok';
  const byok = vozDoCliente().toConfig() as Cfg;
  delete process.env.PROSA_FISH_CREDENTIAL;
  assert(byok.credential_mode === undefined, 'byok não envia credential_mode');
  assert(byok.params?.backend === 'speech-1.5', 'O backend padrão do byok é speech-1.5');
  assert(byok.params?.api_key === 'chave-de-teste', 'byok envia a chave própria');

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
