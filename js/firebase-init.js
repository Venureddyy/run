// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBTmU0lVGFfShu3sqyTFxOJdRx42o0RkMI",
  authDomain: "car-dashboard-d3e4d.firebaseapp.com",
  projectId: "car-dashboard-d3e4d",
  storageBucket: "car-dashboard-d3e4d.firebasestorage.app",
  messagingSenderId: "869012144395",
  appId: "1:869012144395:web:c369a0fdff38c16398a20e",
  measurementId: "G-2WCRQJ91WC"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── Expose to window so other modules can use ──
window._fb = { auth, db, GoogleAuthProvider, signInWithPopup, fbSignOut, onAuthStateChanged, doc, getDoc, setDoc, updateDoc, serverTimestamp };
