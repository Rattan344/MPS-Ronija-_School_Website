// Shared helpers for the admin area (client-side only — see README for the security note).

// Some browsers/privacy modes throw on sessionStorage access instead of
// returning null. Fall back to an in-memory store so the guard never throws.
const mpsStore = (() => {
  try {
    const probe = '__mps_probe__';
    sessionStorage.setItem(probe, '1');
    sessionStorage.removeItem(probe);
    return sessionStorage;
  } catch (error) {
    console.warn('sessionStorage unavailable, using in-memory fallback.', error);
    const mem = new Map();
    return {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k)
    };
  }
})();

function isAuthed() {
  return mpsStore.getItem('mps-auth') === '1';
}

function requireAuth() {
  if (!isAuthed()) {
    location.replace('login.html');
    return false;
  }
  return true;
}

function logout() {
  mpsStore.removeItem('mps-auth');
  location.href = 'index.html';
}

// Read a JSON payload from session storage without ever throwing.
function readSessionJSON(key, fallback) {
  try {
    const raw = mpsStore.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (error) {
    console.warn('Could not read "' + key + '" from session storage.', error);
    return fallback;
  }
}

function writeSessionJSON(key, value) {
  try {
    mpsStore.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('Could not save "' + key + '" to session storage.', error);
    return false;
  }
}
