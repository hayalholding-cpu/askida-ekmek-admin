import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBDMKD9ATqkL2Hs9BZmwstzXWLrnk4zusA",
  authDomain: "askida-ekmek-bb8b6.firebaseapp.com",
  projectId: "askida-ekmek-bb8b6",
  storageBucket: "askida-ekmek-bb8b6.firebasestorage.app",
  messagingSenderId: "484303163152",
  appId: "1:484303163152:web:7afa6ef4053b7b33599f95",
  measurementId: "G-MFCXJYJ1J6"
};
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);