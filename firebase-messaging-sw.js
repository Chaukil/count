// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

// Cấu hình Firebase (copy từ index.html)
const firebaseConfig = {
    apiKey: "AIzaSyC-sC4qy1Xy6Q8O2EcOh_jKa7rSkvdA9w8",
    authDomain: "inventorynew-aa3f1.firebaseapp.com",
    projectId: "inventorynew-aa3f1",
    storageBucket: "inventorynew-aa3f1.firebasestorage.app",
    messagingSenderId: "1068757151671",
    appId: "1:1068757151671:web:8874f1c0399f124a520232",
    measurementId: "G-64E256GGPT"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Xử lý background notifications
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);
    
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'inventory-notification',
        requireInteraction: true, // Notification không tự động đóng
        vibrate: [200, 100, 200],
        data: payload.data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Xử lý khi user click vào notification
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    event.notification.close();
    
    // Mở hoặc focus vào app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Nếu đã có tab mở, focus vào tab đó
                for (let client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Nếu không có tab nào, mở tab mới
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});
