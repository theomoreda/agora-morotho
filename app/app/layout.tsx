import type { Metadata, Viewport } from 'next';
import { Faustina, Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const faustina = Faustina({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Treino de vendedores por voz | Agora',
  description:
    'Plataforma de treino e avaliação de vendedores com cliente virtual por voz, usando o Conversational AI Engine da Agora.',
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
    <html lang="pt-BR" className={`h-full ${geist.variable} ${faustina.variable}`}>
      <body className="h-full min-h-screen">{children}</body>
    </html>
  );
}
