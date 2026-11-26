/* Hoho.xo Web Push Service Worker — never displays or stores note text */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let targetUrl = "/";
  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload && typeof payload.url === "string" && payload.url.startsWith("/")) {
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
