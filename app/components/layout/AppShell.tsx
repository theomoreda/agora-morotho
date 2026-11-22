'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type AppShellProps = {
  title: string;
  subtitle: string;
  nav: NavItem[];
  children: React.ReactNode;
};

/**
 * Casca das áreas autenticadas (gestor e vendedor): sidebar de navegação +
 * área de conteúdo. O perfil é mockado; a troca de perfil volta para a home.
 */
export function AppShell({ title, subtitle, nav, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/40 p-4 md:flex">
        <div className="mb-6 px-2">
          <p className="font-display text-base font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/gestor' &&
                item.href !== '/vendedor' &&
                pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-primary/15 font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-card hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/"
          className="mt-4 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          ← Trocar de perfil
        </Link>
      </aside>

      <main className="min-w-0 flex-1 p-6 md:p-8">
        {/* Nav compacta no mobile */}
        <nav className="mb-6 flex gap-2 overflow-x-auto md:hidden">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'whitespace-nowrap rounded-full border px-3 py-1 text-xs',
                  active
                    ? 'border-primary bg-primary/15 text-foreground'
                    : 'border-border text-muted-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {children}
      </main>
    </div>
  );
}
