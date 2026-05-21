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

// 🔥 2. Firebase Cloud Messaging (FCM) Compat imports
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

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

// Handle notification behavior when the application is minimized, closed, or in the background
messaging.onBackgroundMessage((payload) => {
  console.log("📨 Received background message:", payload);

  const notificationTitle = payload.notification?.title || "SplitEase Notification";
  const notificationOptions = {
    body: payload.notification?.body || "You have an expense update!",
    icon: "/logo-icon.png",
    badge: "/logo-icon.png",
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
