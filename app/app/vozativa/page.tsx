import Link from 'next/link';
import { Activity, HeartPulse, Stethoscope } from 'lucide-react';

/**
 * Lançador do VozAtiva — abre /paciente e /clinica lado a lado para demonstrar
 * a sincronização em tempo real entre as duas telas.
 *
 * Observação: a rota raiz (/) deste repositório continua servindo o quickstart
 * da Agora. O VozAtiva vive em /vozativa para não substituir aquela demo.
 */
export default function VozAtivaHome() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-5 py-12 text-slate-50">
      <div className="w-full max-w-3xl text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-1.5 text-sm font-medium text-emerald-300">
          <HeartPulse className="h-4 w-4" aria-hidden />
          Treino vocal diário guiado por voz
        </div>
        <h1 className="text-4xl font-bold md:text-5xl">VozAtiva</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
          Abra as duas telas em abas separadas. Edite o protocolo em{' '}
          <span className="text-slate-200">/clinica</span> e veja mudar na hora
          em <span className="text-slate-200">/paciente</span>.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <LaunchCard
            href="/paciente"
            icon={<HeartPulse className="h-7 w-7" />}
            title="Tela do Paciente"
            subtitle="Hub acessível de treino (B2C)"
            accent="emerald"
          />
          <LaunchCard
            href="/clinica"
            icon={<Stethoscope className="h-7 w-7" />}
            title="Painel do Fonoaudiólogo"
            subtitle="Protocolo e acompanhamento (B2B)"
            accent="teal"
          />
        </div>

        <p className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-600">
          <Activity className="h-4 w-4" aria-hidden />
          Sincronização em tempo real entre abas via BroadcastChannel — pronta
          para Agora RTM na próxima etapa.
        </p>
      </div>
    </main>
  );
}

function LaunchCard({
  href,
  icon,
  title,
  subtitle,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: 'emerald' | 'teal';
}) {
  const ring =
    accent === 'emerald'
      ? 'hover:border-emerald-500 text-emerald-400'
      : 'hover:border-teal-500 text-teal-400';
  return (
    <Link
      href={href}
      target="_blank"
      className={`group flex min-h-[140px] flex-col items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition-colors ${ring}`}
    >
      <span className="rounded-xl bg-slate-800 p-3">{icon}</span>
      <div>
        <h2 className="text-xl font-semibold text-slate-50">{title}</h2>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
      <span className="mt-auto text-sm font-medium text-slate-500 group-hover:text-slate-300">
        Abrir em nova aba →
      </span>
    </Link>
  );
}
