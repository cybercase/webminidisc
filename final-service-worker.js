// List of extra files to be precached for offline use.
// WARNING: don't forget to update the revision before deploy
var revision = "9";
self.__precacheManifest = (self.__precacheManifest || []).concat([
    {
        "revision": revision,
        "url": "/webminidisc/atracdenc.js"
    },
    {
        "revision": revision,
        "url": "/webminidisc/worker.min.js"
    },
    {
        "revision": revision,
        "url": "/webminidisc/ffmpeg-core.js"
    },
    {
        "revision": revision,
        "url": "/webminidisc/recorderWorker.js"
    },
]);
/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app and you should
 * disable HTTP caching for this file too.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */

importScripts("https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js");

importScripts(
  "/webminidisc/precache-manifest.6f26e8b4eab5d73c27dc175e9402c9ea.js"
);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

workbox.core.clientsClaim();

/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
self.__precacheManifest = [].concat(self.__precacheManifest || []);
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});

workbox.routing.registerNavigationRoute(workbox.precaching.getCacheKeyForURL("/webminidisc/index.html"), {
  
  blacklist: [/^\/_/,/\/[^/?]+\.[^/]+$/],
});
