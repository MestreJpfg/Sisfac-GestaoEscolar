// This file must be in the public folder.

// Scripts for firebase and firebase messaging
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCMAVzrcO_4XFxZFV-LEnNYYgMVPy19ZJ0",
  authDomain: "studio-1312336971-92aca.firebaseapp.com",
  projectId: "studio-1312336971-92aca",
  storageBucket: "studio-1312336971-92aca.appspot.com",
  messagingSenderId: "441642282275",
  appId: "1:441642282275:web:e5badefab076d4200eb096",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/logoyuri.png", // Make sure you have this icon in the public folder
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
