import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAsfWcy9LnoanBFhtjuJR_TlTHFMBsJDJk",
  authDomain: "nfc-attendance-5fb9c.firebaseapp.com",
  databaseURL: "https://nfc-attendance-5fb9c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nfc-attendance-5fb9c",
  storageBucket: "nfc-attendance-5fb9c.firebasestorage.app",
  messagingSenderId: "497661840319",
  appId: "1:497661840319:web:8c8d8a411e71d0c6492f0a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const database = getDatabase(app);