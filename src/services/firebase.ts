import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBOijqeFnF5bFBHIvIulAGusp4OVuVGg88",
  authDomain: "fleet-a4a43.firebaseapp.com",
  databaseURL: "https://fleet-a4a43-default-rtdb.firebaseio.com",
  projectId: "fleet-a4a43",
  storageBucket: "fleet-a4a43.firebasestorage.app",
  messagingSenderId: "763957167114",
  appId: "1:763957167114:web:dd7a26ed4ada24c74c0bf3"
};

console.log("Initializing Firebase with project:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export default app;
