// js/storage.js — Cloud sync with localStorage fallback
// Stores: odo, rangeFull, rangeCurrent, darkMode, spotifyToken

const STORAGE_KEY = 'dash_data';
let _uid = null; // set on login

export function setUid(uid) { _uid = uid; }

// ── SAVE ──
export async function save(key, value) {
  // Always save locally first (instant)
  const local = getLocal();
  local[key] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(local));

  // Then sync to Firestore if logged in
  if (_uid && window._fb) {
    try {
      const { db, doc, setDoc, serverTimestamp } = window._fb;
      const ref = doc(db, 'users', _uid);
      await setDoc(ref, { [key]: value, updatedAt: serverTimestamp() }, { merge: true });
    } catch(e) {
      console.warn('Firestore save failed, local only:', e);
    }
  }
}

// ── LOAD ──
export async function load(key, defaultVal = null) {
  // Try Firestore first if logged in
  if (_uid && window._fb) {
    try {
      const { db, doc, getDoc } = window._fb;
      const ref = doc(db, 'users', _uid);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data()[key] !== undefined) {
        const val = snap.data()[key];
        // Cache locally
        const local = getLocal();
        local[key] = val;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
        return val;
      }
    } catch(e) {
      console.warn('Firestore load failed, falling back to local:', e);
    }
  }
  // Fallback to localStorage
  return getLocal()[key] ?? defaultVal;
}

// ── LOAD ALL (batch) ──
export async function loadAll() {
  if (_uid && window._fb) {
    try {
      const { db, doc, getDoc } = window._fb;
      const ref = doc(db, 'users', _uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        // Merge into local
        const local = { ...getLocal(), ...data };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
        return local;
      }
    } catch(e) {
      console.warn('Firestore loadAll failed:', e);
    }
  }
  return getLocal();
}

function getLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch(e) { return {}; }
}
