'use client';

import { Headphones, TrendingUp } from 'lucide-react';
import { AppShell, type NavItem } from '@/components/layout/AppShell';

const NAV: NavItem[] = [
  { href: '/vendedor', label: 'Minhas simulações', icon: Headphones },
  { href: '/vendedor/desempenho', label: 'Desempenho', icon: TrendingUp },
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
