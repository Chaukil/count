// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

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
    console.log('Received background message:', payload);
    
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        tag: 'inventory-notification',
        requireInteraction: true
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});
