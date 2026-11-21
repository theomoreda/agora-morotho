import type { Metadata } from 'next';

/**
 * Porta de entrada da família para o painel.
 *
 * FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).
 *
 * O painel em si mora no serviço de análise (../analise), que é outro processo
 * e outra porta — porque as medidas acústicas usam Praat, que é GPLv3, e
 * mantê-lo separado evita que o app Next.js seja um trabalho derivado dele.
 *
 * Esta página existe por dois motivos:
 *   1. o atalho do manifesto do PWA aponta para cá
 *   2. é o único lugar do app pensado para a FAMÍLIA, não para a pessoa idosa
 *
 * De propósito, não embutimos o painel num iframe: a família costuma abrir
 * isso no próprio celular dela, e um iframe de outra origem com gráfico
 * dentro fica ruim de ler e de dar zoom.
 */

export const metadata: Metadata = {
  title: 'Prosa — painel da família',
  description: 'Acompanhe como ela está falando nos últimos dias.',
};

export default function PaginaFamilia() {
  const base =
    process.env.NEXT_PUBLIC_PROSA_ANALISE_URL ?? 'http://127.0.0.1:8000';
  const pessoaId = process.env.NEXT_PUBLIC_PROSA_PESSOA_ID;

  const urlPainel = pessoaId
    ? `${base}/painel?pessoa=${encodeURIComponent(pessoaId)}`
    : null;

  return (
    <main className="mx-auto flex min-h-dvh w-[min(94vw,38rem)] flex-col justify-center gap-6 py-16">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Prosa
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Painel da família
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-zinc-300">
          Aqui você acompanha como ela está falando ao longo dos dias — e é
          avisada quando algo muda em relação ao jeito dela.
        </p>
      </div>

      {urlPainel ? (
        <a
          href={urlPainel}
          className="flex min-h-16 items-center justify-center rounded-2xl bg-primary px-6 text-lg font-semibold text-black transition hover:bg-white"
        >
          Abrir o painel
        </a>
      ) : (
        <div className="rounded-2xl border border-border bg-card/60 p-5 text-base leading-relaxed text-zinc-300">
          <p className="font-medium text-white">
            Nenhuma pessoa configurada ainda.
          </p>
          <p className="mt-2">
            Defina <code className="text-primary">NEXT_PUBLIC_PROSA_PESSOA_ID</code>{' '}
            no <code>.env.local</code>. Crie a pessoa com:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-black/50 p-3 text-sm">
            cd analise{'\n'}python -m scripts.criar_pessoa &quot;Nome&quot; 78
          </pre>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card/40 p-5 text-sm leading-relaxed text-zinc-400">
        <p>
          <strong className="text-zinc-200">
            O Prosa não faz diagnóstico.
          </strong>{' '}
          Ele compara a pessoa com ela mesma e avisa quando algo mudou. Qualquer
          avaliação de saúde é de um profissional.
        </p>
        <p className="mt-2">
          Você vê tendências, nunca gravações: o áudio é apagado logo após a
          análise e nunca é armazenado.
        </p>
      </div>
    </main>
  );
}
