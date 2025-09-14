
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDp8Tds3R9QnezVGqNNbJWIjSxshSFGgsM",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "recipedia-a37b0.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "recipedia-a37b0",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "recipedia-a37b0.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "459895287309",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:459895287309:web:2b6ddca1901172bd05af44",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
