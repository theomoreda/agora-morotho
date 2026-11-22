'use client';

import { Headphones, History } from 'lucide-react';
import { AppShell, type NavItem } from '@/components/layout/AppShell';

const NAV: NavItem[] = [
  { href: '/vendedor', label: 'Minhas simulações', icon: Headphones },
  { href: '/vendedor/historico', label: 'Histórico', icon: History },
];

export default function VendedorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell title="Área do Vendedor" subtitle="Treino por voz" nav={NAV}>
      {children}
    </AppShell>
  );
}
