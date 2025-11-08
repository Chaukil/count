// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

// Cấu hình Firebase
firebase.initializeApp({
    apiKey: "AIzaSyC-sC4qy1Xy6Q8O2EcOh_jKa7rSkvdA9w8",
    authDomain: "inventorynew-aa3f1.firebaseapp.com",
    projectId: "inventorynew-aa3f1",
    storageBucket: "inventorynew-aa3f1.firebasestorage.app",
    messagingSenderId: "1068757151671",
    appId: "1:1068757151671:web:8874f1c0399f124a520232"
});

const messaging = firebase.messaging();

// Xử lý background notification
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);
    
    const notificationTitle = payload.notification?.title || 'Thông báo mới';
    const notificationOptions = {
        body: payload.notification?.body || 'Bạn có thông báo mới',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200, 100, 200],
        tag: 'inventory-notification-' + Date.now(),
        requireInteraction: true,
        data: payload.data,
        actions: [
            {
                action: 'open',
                title: 'Xem ngay',
                icon: '/favicon.ico'
            },
            {
                action: 'close',
                title: 'Đóng'
            }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Xử lý click vào notification
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification click received.');
    
    event.notification.close();
    
    if (event.action === 'open') {
        // Mở app
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Service Worker install
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    self.skipWaiting();
});

// Service Worker activate
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(clients.claim());
});
