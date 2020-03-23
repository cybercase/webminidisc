// List of extra files to be precached for offline use.
// WARNING: don't forget to update the revision string after updating these files.
self.__precacheManifest = (self.__precacheManifest || []).concat([
    {
        "revision": "1",
        "url": "/webminidisc/atracdenc.js"
    },
    {
        "revision": "1",
        "url": "/webminidisc/worker.min.js"
    },
    {
        "revision": "1",
        "url": "/webminidisc/ffmpeg-core.js"
    },
]);
importScripts(
    "/webminidisc/service-worker.js"
);
