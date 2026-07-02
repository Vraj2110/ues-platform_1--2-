// src/lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAHQsD5ZGhaeSiqogaXXvvDAhU0bPQBTWw",
  authDomain: "ues-platform.firebaseapp.com",
  projectId: "ues-platform",
  storageBucket: "ues-platform.firebasestorage.app",
  messagingSenderId: "537235471096",
  appId: "1:537235471096:web:16ad7e6e66c3e0acecd90d",
  measurementId: "G-7H8MM3HSWJ"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
