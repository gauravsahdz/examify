
// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Import getStorage

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check for missing Firebase config values and log warnings
if (typeof window !== 'undefined') { // Log only on client-side for NEXT_PUBLIC variables during init
    const missingKeys: string[] = [];
    Object.entries(firebaseConfig).forEach(([key, value]) => {
        if (!value) {
            missingKeys.push(`NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);
        }
    });

    if (missingKeys.length > 0) {
        console.warn(
            `\n*********************************************************************\n` +
            `WARNING: The following Firebase environment variables are missing or empty:\n` +
            `${missingKeys.join('\n')}\n` +
            `This will likely cause Firebase initialization to fail or lead to runtime errors.\n` +
            `Please ensure these are correctly set in your .env.local file or server environment.\n` +
            `*********************************************************************\n`
        );
    } else if (!firebaseConfig.apiKey) {
         // This specific warning for apiKey might be redundant due to the loop above,
         // but kept for emphasis if the generic loop is changed.
         console.warn(
            `\n*********************************************************************\n` +
            `WARNING: NEXT_PUBLIC_FIREBASE_API_KEY is not set.\n` +
            `Firebase initialization will likely fail.\n` +
            `*********************************************************************\n`
        );
    }
}


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app); // Firestore is already initialized here
const storage = getStorage(app);

export { app, auth, db, storage };
