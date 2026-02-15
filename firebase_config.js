// Import the functions you need from the SDKs you need
// Using CDN links because we are not using a bundler
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDqXPdbpNUX7kNJ-eZpPuyjko6IO6JbZD8",
    authDomain: "portfolio-64d54.firebaseapp.com",
    projectId: "portfolio-64d54",
    storageBucket: "portfolio-64d54.firebasestorage.app",
    messagingSenderId: "126238897702",
    appId: "1:126238897702:web:e9a213f14cf459e19558e7",
    measurementId: "G-1WR4ETN33D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export services for use in other files
export { app, auth, db, storage };