/**
 * Service worker do Prosa.
 *
 * FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).
 *
 * Faz duas coisas, e só:
 *   1. torna o app instalável na tela inicial (requisito de PWA)
 *   2. quando não há internet, mostra uma tela que a pessoa idosa entende,
 *      em vez do dinossauro do Chrome ou de uma mensagem em inglês
 *
 * O que ele deliberadamente NÃO faz: fingir funcionar offline. Conversar com
 * a Clara exige rede em tempo real. Um app que abre bonito e depois falha no
 * meio é pior, para esta pessoa, do que um que avisa logo que está sem
 * internet. Então o cache guarda a casca, nunca a conversa.
 */

const CACHE = 'prosa-casca-v1';

// Só o indispensável para desenhar a tela de "sem internet".
const CASCA = ['/offline.html', '/android-chrome-192x192.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CASCA))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) =>
        Promise.all(
          nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const { request } = evento;

  if (request.method !== 'GET') return;

  // NUNCA interceptar as rotas de API: token, agente e Custom LLM precisam
  // sempre da rede de verdade. Servir isso de cache quebraria a conversa de
  // um jeito difícil de diagnosticar.
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return;

  // Navegação: tenta a rede; sem rede, mostra a tela de "sem internet".
  if (request.mode === 'navigate') {
    evento.respondWith(
      fetch(request).catch(() => caches.match('/offline.html')),
    );
    return;
  }

  // Resto (ícones, etc.): cache primeiro, rede depois.
  evento.respondWith(
    caches.match(request).then((resposta) => resposta || fetch(request)),
  );
});
