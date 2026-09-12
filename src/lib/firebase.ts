import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBZp1zl_eUGa6JsPIYXHi8ku7e9oIryA30",
  authDomain: "monedo-e7849.firebaseapp.com",
  projectId: "monedo-e7849",
  storageBucket: "monedo-e7849.firebasestorage.app",
  messagingSenderId: "1059318428832",
  appId: "1:1059318428832:web:48805c718b2202ac4805c5",
  measurementId: "G-DZWFDF8DJC",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
