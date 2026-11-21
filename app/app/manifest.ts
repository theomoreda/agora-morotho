import type { MetadataRoute } from 'next';

/**
 * Manifesto do PWA do Prosa.
 *
 * FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).
 *
 * Por que PWA e não app de loja: a pessoa idosa não precisa achar uma loja,
 * criar conta, aceitar termos nem atualizar nada. A família instala uma vez,
 * o ícone fica na tela inicial, e dali em diante é um ícone só — igual a
 * qualquer outro aplicativo, do ponto de vista dela.
 *
 * `display: 'fullscreen'` é deliberado: sem barra de endereço, sem botão de
 * voltar, sem aba. Uma vez aberto, não existe como "sair sem querer" e cair
 * numa tela estranha — que é o medo real de quem mexe pouco em celular.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Prosa — conversar com a Clara',
    short_name: 'Prosa',
    description:
      'Converse com a Clara todos os dias. Ela faz companhia e acompanha o seu bem-estar.',
    lang: 'pt-BR',
    dir: 'ltr',
    start_url: '/',
    // Sem barra de endereço e sem botão de voltar: a pessoa não consegue
    // sair da tela por acidente.
    display: 'fullscreen',
    display_override: ['fullscreen', 'standalone'],
    orientation: 'portrait',
    background_color: '#101010',
    theme_color: '#101010',
    categories: ['health', 'lifestyle', 'social'],
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    // Atalho para a família abrir o painel direto, sem passar pela tela da
    // pessoa idosa.
    shortcuts: [
      {
        name: 'Painel da família',
        short_name: 'Painel',
        description: 'Ver como ela está falando nos últimos dias',
        url: '/familia',
      },
    ],
  };
}
