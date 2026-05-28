// 🌍 1. PWA Offline Caching logic (merged from sw.js to prevent conflicts)
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
  // Only cache same-origin requests, skip API calls
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

// Firebase Messaging compat SDK (must match the major version of the firebase npm package)
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

// Initialize Firebase in the service worker with public configuration values
firebase.initializeApp({
  apiKey: "AIzaSyADcvVdYlkOb223lixSKnRUOnerBtSNLzg",
  authDomain: "agent-assist-vw57a.firebaseapp.com",
  projectId: "agent-assist-vw57a",
  storageBucket: "agent-assist-vw57a.firebasestorage.app",
  messagingSenderId: "803396684704",
  appId: "1:803396684704:web:77e68026f87f4889eb72c5"
});

const messaging = firebase.messaging();

// Handle background messages (app closed / minimized / not focused)
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || "SplitEase";
  const link = payload.data?.link || "/dashboard";

  self.registration.showNotification(notificationTitle, {
    body: payload.notification?.body || "You have a new update!",
    icon: "/logo-icon.png",
    badge: "/logo-icon.png",
    tag: payload.data?.type || "splitease",   // collapse same-type duplicates
    renotify: true,
    data: { link, ...(payload.data || {}) },
  });
});

// Open / focus the app when the user clicks the notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const link = event.notification.data?.link || "/dashboard";
  const targetUrl = new URL(link, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus an already-open tab on the same origin
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // No open tab — open a new one
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});
