import Link from 'next/link';
import { Briefcase, Headphones } from 'lucide-react';

/**
 * Seleção de perfil (mockada): leva o usuário para a área do Gestor ou do
 * Vendedor. Sem login real — decisão de escopo do MVP.
 */
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-2xl text-center">
        <p className="type-label">Treino e avaliação de vendedores por voz</p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight md:text-5xl">
          Quem está entrando?
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
          Escolha um perfil para explorar a plataforma. A seleção é apenas para
          a demonstração.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          <ProfileCard
            href="/gestor"
            icon={<Briefcase className="h-7 w-7" />}
            title="Gestor comercial"
            subtitle="Cria cenários, define critérios e acompanha a equipe."
          />
          <ProfileCard
            href="/vendedor"
            icon={<Headphones className="h-7 w-7" />}
            title="Vendedor"
            subtitle="Pratica conversas por voz e recebe avaliação."
          />
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Testar o veredito por texto?{' '}
          <Link href="/veredito" className="text-primary hover:underline">
            Abrir avaliador de conversa
          </Link>
        </p>
      </div>

      <footer className="pointer-events-none fixed bottom-4 right-4 text-xs text-muted-foreground">
        Powered by Agora
      </footer>
    </main>
  );
}

function ProfileCard({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card/50 p-6 text-left transition-colors hover:border-primary hover:bg-card"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
        {icon}
      </span>
      <span className="mt-1 font-display text-xl font-semibold text-foreground">{title}</span>
      <span className="text-sm leading-relaxed text-muted-foreground">{subtitle}</span>
    </Link>
  );
}
