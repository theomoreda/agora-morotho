'use client';

import {
  LayoutDashboard,
  Library,
  ListChecks,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { AppShell, type NavItem } from '@/components/layout/AppShell';

const NAV: NavItem[] = [
  { href: '/gestor', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/gestor/biblioteca', label: 'Biblioteca', icon: Library },
  { href: '/gestor/cenarios', label: 'Cenários', icon: ListChecks },
  { href: '/gestor/criterios', label: 'Critérios', icon: SlidersHorizontal },
  { href: '/gestor/vendedores', label: 'Vendedores', icon: Users },
];

export default function GestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell title="Área do Gestor" subtitle="Treino de vendedores" nav={NAV}>
      {children}
    </AppShell>
  );
}
