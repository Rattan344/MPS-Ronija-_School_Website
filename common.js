// Shared helpers for the admin area (client-side only — see README for the security note).
// Auth is persisted in localStorage with an expiry so staff don't have to log in every time.
// If localStorage is unavailable (private mode quirks), we fall back to an in-memory store.

const MPS_AUTH_KEY = 'mps-auth';
const MPS_AUTH_DAYS = 30;

const mpsStore = (() => {
  try {
    const probe = '__mps_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch (error) {
    console.warn('localStorage unavailable, using in-memory fallback (session will not persist).', error);
    const mem = new Map();
    return {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k)
    };
  }
})();

function mpsAuthClear() {
  try { mpsStore.removeItem(MPS_AUTH_KEY); } catch (_) { /* ignore */ }
}

function mpsAuthRead() {
  try {
    const raw = mpsStore.getItem(MPS_AUTH_KEY);
    if (!raw) return null;
    // Backward compat: old value was just "1"
    if (raw === '1') return { exp: Date.now() + MPS_AUTH_DAYS * 24 * 60 * 60 * 1000, legacy: true };
    const data = JSON.parse(raw);
    if (!data || typeof data.exp !== 'number') return null;
    return data;
  } catch (_) {
    return null;
  }
}

function isAuthed() {
  const data = mpsAuthRead();
  if (!data) return false;
  if (Date.now() > data.exp) {
    mpsAuthClear();
    return false;
  }
  return true;
}

function requireAuth() {
  if (!isAuthed()) {
    location.replace('login.html');
    return false;
  }
  // If this came from legacy "1", migrate to a proper expiry token.
  try {
    const raw = mpsStore.getItem(MPS_AUTH_KEY);
    if (raw === '1') mpsSetAuth();
  } catch (_) { /* ignore */ }
  return true;
}

function mpsSetAuth(days = MPS_AUTH_DAYS) {
  const exp = Date.now() + days * 24 * 60 * 60 * 1000;
  try {
    mpsStore.setItem(MPS_AUTH_KEY, JSON.stringify({ v: 1, exp }));
  } catch (error) {
    console.warn('Could not persist login session.', error);
  }
}

function logout() {
  mpsAuthClear();
  location.href = 'index.html';
}

// Read a JSON payload from storage without ever throwing.
function readSessionJSON(key, fallback) {
  try {
    const raw = mpsStore.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (error) {
    console.warn('Could not read "' + key + '" from storage.', error);
    return fallback;
  }
}

function writeSessionJSON(key, value) {
  try {
    mpsStore.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('Could not save "' + key + '" to storage.', error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Student database (local to this browser/computer)
// Stored in localStorage under "mps-students". Export/Import on students.html
// is how you move the list to another computer.
// ---------------------------------------------------------------------------
const MPS_STUDENTS_KEY = 'mps-students';

function mpsStudents() {
  try {
    const raw = mpsStore.getItem(MPS_STUDENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s) => s && typeof s === 'object') : [];
  } catch (error) {
    console.warn('Could not read the student database.', error);
    return [];
  }
}

function mpsSaveStudents(list) {
  try {
    mpsStore.setItem(MPS_STUDENTS_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    return true;
  } catch (error) {
    console.warn('Could not save the student database.', error);
    return false;
  }
}

function mpsNewStudentId() {
  return 'stu-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

function mpsClassKey(student) {
  const g = String((student && student.grade) || '').trim().toLowerCase();
  const s = String((student && student.section) || '').trim().toLowerCase();
  return g + '|' + s;
}

function mpsClassLabel(student) {
  const g = String((student && student.grade) || '').trim();
  const s = String((student && student.section) || '').trim();
  if (!g) return 'Unassigned';
  return 'Class ' + g + (s ? ' · ' + s : '');
}

function mpsSortStudents(list) {
  const gradeRank = (g) => {
    const order = ['nursery', 'lkg', 'ukg', 'kg'];
    const v = String(g || '').trim().toLowerCase();
    if (order.includes(v)) return order.indexOf(v);
    const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
    return Number.isNaN(n) ? 99 : n;
  };
  return list.slice().sort((a, b) => {
    const ga = gradeRank(a.grade), gb = gradeRank(b.grade);
    if (ga !== gb) return ga - gb;
    if (String(a.grade || '') !== String(b.grade || '')) return String(a.grade || '').localeCompare(String(b.grade || ''));
    const sa = String(a.section || ''), sb = String(b.section || '');
    if (sa !== sb) return sa.localeCompare(sb);
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

function mpsStudentToCard(student) {
  return {
    name: student.name || '',
    grade: student.grade || '',
    section: student.section || '',
    roll: student.roll || '',
    blood: student.blood || '',
    dob: student.dob || '',
    valid: student.valid || '',
    father: student.father || '',
    mother: student.mother || '',
    contact: student.contact || '',
    address: student.address || '',
    photo: student.photo || ''
  };
}

function removeStoredJSON(key) {
  try { mpsStore.removeItem(key); } catch (error) { /* ignore */ }
}
