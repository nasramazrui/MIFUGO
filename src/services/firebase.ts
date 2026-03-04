import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBOijqeFnF5bFBHIvIulAGusp4OVuVGg88",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "fleet-a4a43.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://fleet-a4a43-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "fleet-a4a43",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "fleet-a4a43.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "763957167114",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:763957167114:web:dd7a26ed4ada24c74c0bf3"
};

console.log("Initializing Firebase with project:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with long polling to fix connection issues in restricted environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export const rtdb = getDatabase(app);
export default app;
