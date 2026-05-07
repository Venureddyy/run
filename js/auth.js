// js/auth.js
import { setUid, loadAll } from './storage.js';
import { onDataLoaded } from './app.js';

export async function signInWithGoogle() {
  const { auth, GoogleAuthProvider, signInWithPopup } = window._fb;
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await handleUser(result.user);
  } catch(e) {
    console.error('Sign in failed:', e);
    alert('Sign in failed: ' + e.message);
  }
}

export async function continueAsGuest() {
  setUid(null);
  hidLoginShow();
  const data = await loadAll();
  onDataLoaded(data);
}

export async function signOut() {
  const { auth, fbSignOut } = window._fb;
  try {
    await fbSignOut(auth);
    setUid(null);
    localStorage.clear();
    location.reload();
  } catch(e) { console.error(e); }
}

export function initAuth() {
  // Wait for firebase-init to be ready
  const wait = setInterval(() => {
    if (!window._fb) return;
    clearInterval(wait);
    const { auth, onAuthStateChanged } = window._fb;
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        await handleUser(user);
      }
      // If no user and login screen is showing, keep it showing
    });
  }, 100);
}

async function handleUser(user) {
  setUid(user.uid);

  // Update UI
  const avatar = document.getElementById('user-avatar');
  if (user.photoURL) avatar.style.backgroundImage = `url(${user.photoURL})`;
  document.getElementById('um-name').textContent = user.displayName || 'User';
  document.getElementById('um-email').textContent = user.email || '';
  document.getElementById('a-user').textContent = user.email || user.displayName || 'Logged in';

  hidLoginShow();
  const data = await loadAll();
  onDataLoaded(data);
}

function hidLoginShow() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
}

// Expose globally (called from HTML onclick)
window.signInWithGoogle = signInWithGoogle;
window.continueAsGuest = continueAsGuest;
window.signOut = signOut;
