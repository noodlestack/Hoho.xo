/* Hoho.xo Service Worker — static shell + push alerts only.
   Never caches /api/* responses, owner Mail, or note bodies. */

const CACHE_NAME = "hoho-static-v1";
const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

function isCacheableStaticPath(pathname) {
  return (
    pathname === "/offline.html" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/icon.svg" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/_next/static/")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("hoho-static-") && k !== CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match("/offline.html");
        return (
          cached ||
          new Response("Offline — reconnect to open Hoho.xo.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      }),
    );
    return;
  }

  if (isCacheableStaticPath(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((response) => {
          if (response && response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
  }
});

self.addEventListener("push", (event) => {
  let targetUrl = "/";
  if (event.data) {
    try {
      const payload = event.data.json();
      if (
        payload &&
        typeof payload.url === "string" &&
        payload.url.startsWith("/")
      ) {
        targetUrl = payload.url;
      }
    } catch {
      // Ignore malformed payload; always show generic alert
    }
  }

  event.waitUntil(
    self.registration.showNotification("New ornament on your Hoho.xo tree", {
      body: "Open Mail to unwrap it.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "hoho-ornament",
      renotify: true,
      data: { url: targetUrl },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification &&
      event.notification.data &&
      typeof event.notification.data.url === "string" &&
      event.notification.data.url.startsWith("/") &&
      event.notification.data.url) ||
    "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});
