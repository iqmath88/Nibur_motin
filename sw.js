/* Nibor Motion service worker — precaches the whole app (including MathJax, MathLive, fonts and
 * the video/zip libraries) so editing, math rendering and export work fully offline after first load. */
importScripts('./version.js');
const CACHE = 'nibor-motion-v' + APP_VERSION;
const ASSETS = [
 "./",
 "./KaTeX_AMS-Regular.woff2",
 "./KaTeX_Caligraphic-Bold.woff2",
 "./KaTeX_Caligraphic-Regular.woff2",
 "./KaTeX_Fraktur-Bold.woff2",
 "./KaTeX_Fraktur-Regular.woff2",
 "./KaTeX_Main-Bold.woff2",
 "./KaTeX_Main-BoldItalic.woff2",
 "./KaTeX_Main-Italic.woff2",
 "./KaTeX_Main-Regular.woff2",
 "./KaTeX_Math-BoldItalic.woff2",
 "./KaTeX_Math-Italic.woff2",
 "./KaTeX_SansSerif-Bold.woff2",
 "./KaTeX_SansSerif-Italic.woff2",
 "./KaTeX_SansSerif-Regular.woff2",
 "./KaTeX_Script-Regular.woff2",
 "./KaTeX_Size1-Regular.woff2",
 "./KaTeX_Size2-Regular.woff2",
 "./KaTeX_Size3-Regular.woff2",
 "./KaTeX_Size4-Regular.woff2",
 "./KaTeX_Typewriter-Regular.woff2",
 "./app.js",
 "./audiomix.js",
 "./auto-reels.js",
 "./cairo-arabic-700-normal.woff2",
 "./cairo-latin-700-normal.woff2",
 "./captions.js",
 "./export-webcodecs.js",
 "./fflate.min.js",
 "./fonts.js",
 "./free-editor.js",
 "./icon.svg",
 "./index.html",
 "./keypress-delete.wav",
 "./keypress-return.wav",
 "./keypress-spacebar.wav",
 "./keypress-standard.wav",
 "./manifest.webmanifest",
 "./math-studio.js",
 "./mathanim.js",
 "./mathjax-color.js",
 "./mathjax-tex-svg.js",
 "./mathlive.min.js",
 "./mp4-muxer.js",
 "./noto-sans-arabic-arabic-400-normal.woff2",
 "./noto-sans-arabic-arabic-700-normal.woff2",
 "./noto-sans-arabic-latin-400-normal.woff2",
 "./noto-sans-arabic-latin-700-normal.woff2",
 "./overlays.js",
 "./plonk.wav",
 "./project-store.js",
 "./question-composer.js",
 "./studio-ui.js",
 "./styles.css",
 "./timeline-editor.js",
 "./version.js"
];
self.addEventListener('install', (event) =>
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', (event) =>
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
// Network first (fresh code when online), cache as fallback (offline).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true })),
  );
});
