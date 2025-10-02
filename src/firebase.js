import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBKDc1GQtWAdnxRv5VHcHHJwJuPS8LZO2A",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "recipe-palette-v1.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "recipe-palette-v1",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "recipe-palette-v1.appspot.com", 
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "662894538527",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:662894538527:web:9917d42102ae1d684aca2a",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
