// 🌍 PWA Offline Caching logic
const CACHE_NAME = 'splitwise-v1';
const STATIC_ASSETS = ['/', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
      return cached || networkFetch;
    })
  );
});

// Firebase Messaging compat SDK
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyADcvVdYlkOb223lixSKnRUOnerBtSNLzg",
  authDomain: "agent-assist-vw57a.firebaseapp.com",
  projectId: "agent-assist-vw57a",
  storageBucket: "agent-assist-vw57a.firebasestorage.app",
  messagingSenderId: "803396684704",
  appId: "1:803396684704:web:77e68026f87f4889eb72c5"
});

const messaging = firebase.messaging();

// Handle background messages — fires when the app tab is closed or not focused.
// Backend sends data-only messages (no `notification` field) so FCM does NOT
// auto-display anything. This handler is the single place that shows the toast.
messaging.onBackgroundMessage((payload) => {
  const notificationTitle =
    payload.data?.title || payload.notification?.title || "SplitEase";
  const notificationBody =
    payload.data?.body  || payload.notification?.body  || "You have a new update!";
  const link = payload.data?.link || "/dashboard";
  const type = payload.data?.type || "splitease";

  // Use a unique tag per message so rapid notifications don't collapse each other.
  const tag = `${type}-${Date.now()}`;

  return self.registration.showNotification(notificationTitle, {
    body: notificationBody,
    icon: "/logo-icon.png",
    badge: "/logo-icon.png",
    tag,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { link, type },
  });
});

// Open / focus the app when the user clicks the notification.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const link = event.notification.data?.link || "/dashboard";
  const targetUrl = new URL(link, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});
