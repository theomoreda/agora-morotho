import type { Metadata, Viewport } from 'next';
import './globals.css';
import { RegistrarPWA } from '@/components/RegistrarPWA';

// ADAPTADO NO HACKATHON — original intacto em original-quickstart/app/layout.tsx
//
// Três mudanças, todas por acessibilidade:
//   1. lang 'en' -> 'pt-BR' (leitor de tela precisa saber a língua para
//      pronunciar certo; em inglês, "Gabriel" e "conversar" saem errados)
//   2. maximumScale: 1 REMOVIDO — bloquear pinch-zoom viola a WCAG 1.4.4 e
//      é exatamente o recurso que quem tem presbiopia usa
//   3. metadata em português, para o nome na tela inicial

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Sem maximumScale e sem userScalable: false. A pessoa PRECISA poder dar
  // zoom. Nosso layout já usa tipografia grande, mas a decisão é dela.
  themeColor: '#101010',
};

export const metadata: Metadata = {
  title: 'Prosa — conversar com o Gabriel',
  description:
    'Converse com o Gabriel todos os dias. Ele faz companhia e percebe quando algo mudou.',
  applicationName: 'Prosa',
  appleWebApp: {
    capable: true,
    title: 'Prosa',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    // Evita que o iOS transforme números do transcrito em link de telefone,
    // o que criaria um jeito de sair do app por acidente.
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png' }],
    other: [
      {
        url: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full min-h-screen">
        {children}
        <RegistrarPWA />
      </body>
    </html>
  );
}
