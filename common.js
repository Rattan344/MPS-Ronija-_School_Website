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

// Small read-through cache: repeated reads (e.g. one row at a time) do not
// re-parse the whole JSON. Writes refresh the cache.
const mpsListCache = new Map();

function mpsReadList(key) {
  try {
    const raw = mpsStore.getItem(key) || '';
    const hit = mpsListCache.get(key);
    if (hit && hit.raw === raw) return hit.list;
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed.filter((x) => x && typeof x === 'object') : [];
    mpsListCache.set(key, { raw, list });
    return list;
  } catch (error) {
    console.warn('Could not read ' + key, error);
    return [];
  }
}

function mpsWriteList(key, list) {
  try {
    const raw = JSON.stringify(Array.isArray(list) ? list : []);
    mpsStore.setItem(key, raw);
    mpsListCache.set(key, { raw, list });
    return true;
  } catch (error) {
    console.warn('Could not save ' + key, error);
    return false;
  }
}

function mpsStudents() {
  return mpsReadList(MPS_STUDENTS_KEY);
}

function mpsSaveStudents(list) {
  return mpsWriteList(MPS_STUDENTS_KEY, list);
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
    roll: student.roll || student.adm || '',
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

// ---------------------------------------------------------------------------
// Central records: marks, fees, awards, sessions
// Every record points at a student id, so editing a student once updates all
// pages, ID cards, admit cards and reports. No duplicated student data.
// ---------------------------------------------------------------------------
const MPS_DB = {
  students: 'mps-students',
  marks: 'mps-marks',
  fees: 'mps-fees',
  awards: 'mps-awards',
  config: 'mps-config'
};

function mpsMarks() { return mpsReadList(MPS_DB.marks); }
function mpsSaveMarks(list) { return mpsWriteList(MPS_DB.marks, list); }
function mpsFees() { return mpsReadList(MPS_DB.fees); }
function mpsSaveFees(list) { return mpsWriteList(MPS_DB.fees, list); }
function mpsAwards() { return mpsReadList(MPS_DB.awards); }
function mpsSaveAwards(list) { return mpsWriteList(MPS_DB.awards, list); }

const MPS_DEFAULT_SESSION = '2026–27';

function mpsConfig() {
  const fallback = { activeSession: MPS_DEFAULT_SESSION, sessions: [MPS_DEFAULT_SESSION] };
  try {
    const raw = mpsStore.getItem(MPS_DB.config);
    const parsed = raw ? JSON.parse(raw) : null;
    const cfg = Object.assign({}, fallback, parsed || {});
    if (!Array.isArray(cfg.sessions) || !cfg.sessions.length) cfg.sessions = [cfg.activeSession || MPS_DEFAULT_SESSION];
    if (!cfg.activeSession) cfg.activeSession = cfg.sessions[0];
    return cfg;
  } catch (error) {
    return fallback;
  }
}

function mpsSaveConfig(cfg) {
  try {
    mpsStore.setItem(MPS_DB.config, JSON.stringify(cfg));
    return true;
  } catch (error) {
    return false;
  }
}

function mpsSession() { return mpsConfig().activeSession; }

function mpsNextSessionLabel(label) {
  const m = String(label || '').match(/(\d{4})/);
  if (!m) return MPS_DEFAULT_SESSION;
  const start = parseInt(m[1], 10) + 1;
  return start + '–' + String(start + 1).slice(2);
}

const MPS_GRADES = ['Nursery', 'LKG', 'UKG', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function mpsGradeIndex(grade) {
  const g = String(grade || '').trim().toLowerCase();
  return MPS_GRADES.findIndex((x) => x.toLowerCase() === g);
}

function mpsNextGrade(grade) {
  const i = mpsGradeIndex(grade);
  if (i < 0) return '';
  return i === MPS_GRADES.length - 1 ? 'Graduated' : MPS_GRADES[i + 1];
}

function mpsNewId(prefix) {
  return (prefix || 'rec') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

function mpsStudentById(id) {
  return mpsStudents().find((s) => s.id === id) || null;
}

function mpsStudentAdm(s) {
  return (s && (s.adm || s.roll)) || '';
}

function mpsStudentStatus(s) {
  return (s && s.status) || 'active';
}

function mpsIsActive(s) {
  return mpsStudentStatus(s) === 'active';
}

function mpsClassListFrom(list) {
  const map = new Map();
  (list || mpsStudents()).forEach((s) => {
    const key = mpsClassKey(s);
    if (!map.has(key)) map.set(key, { key, grade: s.grade || '', section: s.section || '', label: mpsClassLabel(s), count: 0 });
    map.get(key).count += 1;
  });
  return Array.from(map.values()).sort((a, b) => {
    const ga = mpsGradeIndex(a.grade), gb = mpsGradeIndex(b.grade);
    const na = ga < 0 ? 999 : ga, nb = gb < 0 ? 999 : gb;
    if (na !== nb) return na - nb;
    return String(a.section || '').localeCompare(String(b.section || ''));
  });
}

/* -------- Marks -------- */
function mpsPercentFromMark(mark) {
  const obtained = Number(mark && mark.obtained);
  const max = Number(mark && mark.max);
  if (!isFinite(obtained) || !(max > 0)) return null;
  return Math.round((obtained / max) * 1000) / 10;
}

function mpsMarksFor(studentId, session) {
  return mpsMarks().filter((m) => m.studentId === studentId && (!session || m.session === session));
}

function mpsLatestMark(studentId, session) {
  const list = mpsMarksFor(studentId, session);
  if (!list.length) return null;
  return list.slice().sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0))[0];
}

function mpsPercent(studentId, session) {
  const mark = mpsLatestMark(studentId, session);
  return mark ? mpsPercentFromMark(mark) : null;
}

function mpsGradeLetter(percent) {
  if (percent == null) return '—';
  if (percent >= 90) return 'A+';
  if (percent >= 80) return 'A';
  if (percent >= 70) return 'B+';
  if (percent >= 60) return 'B';
  if (percent >= 50) return 'C';
  if (percent >= 33) return 'D';
  return 'E';
}

/* -------- Fees -------- */
function mpsFeeTotals(studentId, session) {
  const records = mpsFees().filter((f) => f.studentId === studentId && (!session || f.session === session));
  let billed = 0, paid = 0;
  records.forEach((f) => {
    billed += Number(f.amount) || 0;
    paid += Number(f.paid) || 0;
  });
  billed = Math.round(billed * 100) / 100;
  paid = Math.round(paid * 100) / 100;
  const due = Math.max(0, Math.round((billed - paid) * 100) / 100);
  const status = billed <= 0 ? 'none' : due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
  return { billed, paid, due, status, records };
}

function mpsFeeStatusLabel(status) {
  return { paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid', none: 'No dues' }[status] || '—';
}

function mpsFeeStatusBadge(status) {
  const cls = status === 'paid' ? 'good' : status === 'partial' ? 'warn' : status === 'unpaid' ? 'bad' : 'muted';
  return '<span class="badge ' + cls + '">' + mpsFeeStatusLabel(status) + '</span>';
}

function mpsCurrency(n) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/* -------- Awards -------- */
function mpsAwardsFor(studentId, session) {
  return mpsAwards().filter((a) => a.studentId === studentId && (!session || a.session === session));
}

/* -------- Deleting a student removes their linked records -------- */
function mpsDeleteStudentCascade(id) {
  mpsSaveStudents(mpsStudents().filter((s) => s.id !== id));
  mpsSaveMarks(mpsMarks().filter((m) => m.studentId !== id));
  mpsSaveFees(mpsFees().filter((f) => f.studentId !== id));
  mpsSaveAwards(mpsAwards().filter((a) => a.studentId !== id));
  mpsPhotoDelete(id);
}

/* -------- Whole-database backup -------- */
function mpsExportAll() {
  return {
    app: 'mps-school-data',
    version: 2,
    exportedAt: new Date().toISOString(),
    students: mpsStudents(),
    marks: mpsMarks(),
    fees: mpsFees(),
    awards: mpsAwards(),
    config: mpsConfig()
  };
}

async function mpsExportAllWithPhotos() {
  const payload = mpsExportAll();
  payload.version = 3;
  const photos = {};
  const list = payload.students.filter((s) => s.hasPhoto || (typeof s.photo === 'string' && s.photo));
  await Promise.all(list.map(async (s) => {
    const photo = s.photo || (await mpsPhotoGet(s.id));
    if (photo) photos[s.id] = photo;
  }));
  payload.photos = photos;
  return payload;
}

async function mpsImportAll(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Not a valid backup file.');
  let imported = 0;
  const photos = (payload.photos && typeof payload.photos === 'object') ? payload.photos : {};
  // A restore replaces everything, including the photo store.
  await mpsPhotoClear();
  if (Array.isArray(payload.students)) {
    const list = payload.students.map((s) => Object.assign({}, s));
    for (const s of list) {
      const photo = (typeof s.photo === 'string' && s.photo) ? s.photo : (photos[s.id] || '');
      s.photo = '';
      s.hasPhoto = false;
      if (photo) {
        const stored = await mpsStoreStudentPhoto(s.id, photo);
        s.hasPhoto = stored.hasPhoto;
        s.photo = stored.inline;
      }
    }
    mpsSaveStudents(list);
    imported = list.length;
  }
  if (Array.isArray(payload.marks)) mpsSaveMarks(payload.marks);
  if (Array.isArray(payload.fees)) mpsSaveFees(payload.fees);
  if (Array.isArray(payload.awards)) mpsSaveAwards(payload.awards);
  if (payload.config && typeof payload.config === 'object') mpsSaveConfig(payload.config);
  return imported;
}

/* ---------------------------------------------------------------------------
 * Photo compression
 * Student photos are the only large field in localStorage. Downscale them to
 * a card-sized WebP (JPEG fallback) so a database of ~1000 students fits.
 * ------------------------------------------------------------------------- */
function mpsCompressImage(src, max, quality) {
  return new Promise((resolve) => {
    if (!src || typeof src !== 'string' || src.indexOf('data:image') !== 0) { resolve(src || ''); return; }
    const img = new Image();
    img.onload = () => {
      try {
        const limit = max || 180;
        const scale = Math.min(1, limit / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const q = quality || 0.72;
        let out = canvas.toDataURL('image/webp', q);
        if (out.indexOf('data:image/webp') !== 0) out = canvas.toDataURL('image/jpeg', 0.68);
        resolve(out && out.length < src.length ? out : src);
      } catch (error) {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}


/* ---------------------------------------------------------------------------
 * Photo store (IndexedDB)
 * A school database can reach 1,000 students. Photos would blow the
 * localStorage quota, so only a small hasPhoto flag lives in the student
 * record; the image is kept in IndexedDB and loaded when a card or avatar
 * actually needs it. If IndexedDB is unavailable the compressed data URL is
 * kept inline as a fallback.
 * ------------------------------------------------------------------------- */
const MPS_PHOTO_DB = 'mps-media';
const MPS_PHOTO_STORE = 'photos';
let mpsPhotoDBPromise = null;

function mpsPhotoDB() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (mpsPhotoDBPromise) return mpsPhotoDBPromise;
  mpsPhotoDBPromise = new Promise((resolve) => {
    let req;
    try { req = indexedDB.open(MPS_PHOTO_DB, 1); } catch (error) { resolve(null); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MPS_PHOTO_STORE)) db.createObjectStore(MPS_PHOTO_STORE);
    };
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
  return mpsPhotoDBPromise;
}

function mpsPhotoPut(id, dataUrl) {
  if (!id) return Promise.resolve(false);
  return mpsPhotoDB().then((db) => {
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(MPS_PHOTO_STORE, 'readwrite');
        const store = tx.objectStore(MPS_PHOTO_STORE);
        if (dataUrl) store.put(String(dataUrl), id); else store.delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (error) { resolve(false); }
    });
  });
}

function mpsPhotoGet(id) {
  if (!id) return Promise.resolve('');
  return mpsPhotoDB().then((db) => {
    if (!db) return '';
    return new Promise((resolve) => {
      try {
        const req = db.transaction(MPS_PHOTO_STORE, 'readonly').objectStore(MPS_PHOTO_STORE).get(id);
        req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : '');
        req.onerror = () => resolve('');
      } catch (error) { resolve(''); }
    });
  });
}

function mpsPhotoDelete(id) { return mpsPhotoPut(id, ''); }

function mpsPhotoClear() {
  return mpsPhotoDB().then((db) => {
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(MPS_PHOTO_STORE, 'readwrite');
        tx.objectStore(MPS_PHOTO_STORE).clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (error) { resolve(false); }
    });
  });
}

async function mpsStoreStudentPhoto(id, dataUrl) {
  if (!dataUrl) { await mpsPhotoDelete(id); return { hasPhoto: false, inline: '' }; }
  const ok = await mpsPhotoPut(id, dataUrl);
  return ok ? { hasPhoto: true, inline: '' } : { hasPhoto: false, inline: dataUrl };
}

function mpsHydratePhotos(list) {
  return Promise.all((list || []).map((s) => {
    if (!s) return Promise.resolve(s);
    if (s.photo || !s.hasPhoto) return Promise.resolve(s);
    return mpsPhotoGet(s.id).then((photo) => Object.assign({}, s, { photo }));
  }));
}

async function mpsMigratePhotos() {
  const students = mpsStudents();
  const inline = students.filter((s) => typeof s.photo === 'string' && s.photo.indexOf('data:image') === 0);
  if (!inline.length) return 0;
  let moved = 0;
  for (const s of inline) {
    const small = await mpsCompressImage(s.photo, 180, 0.72);
    const stored = await mpsStoreStudentPhoto(s.id, small || s.photo);
    if (stored.hasPhoto) {
      s.photo = '';
      s.hasPhoto = true;
      s.updatedAt = Date.now();
      moved++;
    }
  }
  if (moved) mpsSaveStudents(students);
  return moved;
}

async function mpsCompressStoredPhotos(max, quality) {
  const students = mpsStudents();
  let before = 0, after = 0, changed = 0, total = 0;
  for (const s of students) {
    let photo = (typeof s.photo === 'string' && s.photo) ? s.photo : (s.hasPhoto ? await mpsPhotoGet(s.id) : '');
    if (!photo) continue;
    total++;
    before += photo.length;
    const small = await mpsCompressImage(photo, max || 180, quality || 0.72);
    if (small && small.length < photo.length) {
      const stored = await mpsStoreStudentPhoto(s.id, small);
      s.hasPhoto = stored.hasPhoto;
      s.photo = stored.inline;
      changed++;
      after += small.length;
    } else {
      after += photo.length;
    }
  }
  if (changed) mpsSaveStudents(students);
  return { changed, total, before, after };
}

async function mpsCleanOrphanPhotos() {
  const ids = new Set(mpsStudents().map((s) => s.id));
  const db = await mpsPhotoDB();
  if (!db) return { removed: 0, checked: 0 };
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(MPS_PHOTO_STORE, 'readwrite');
      const store = tx.objectStore(MPS_PHOTO_STORE);
      let removed = 0, checked = 0;
      const req = store.openKeyCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        checked++;
        if (!ids.has(cursor.key)) { store.delete(cursor.key); removed++; }
        cursor.continue();
      };
      tx.oncomplete = () => resolve({ removed, checked });
      tx.onerror = () => resolve({ removed: 0, checked: 0 });
      tx.onabort = () => resolve({ removed: 0, checked: 0 });
    } catch (error) { resolve({ removed: 0, checked: 0 }); }
  });
}

async function mpsPhotoStats() {
  const db = await mpsPhotoDB();
  if (!db) return { count: 0, bytes: 0, available: false };
  return new Promise((resolve) => {
    try {
      const req = db.transaction(MPS_PHOTO_STORE, 'readonly').objectStore(MPS_PHOTO_STORE).openCursor();
      let count = 0, bytes = 0;
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          count++;
          if (typeof cursor.value === 'string') bytes += cursor.value.length;
          cursor.continue();
        } else {
          resolve({ count, bytes, available: true });
        }
      };
      req.onerror = () => resolve({ count: 0, bytes: 0, available: true });
    } catch (error) { resolve({ count: 0, bytes: 0, available: true }); }
  });
}

function mpsPhotoInitials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
}

function mpsAvatar(student) {
  if (!student) return '<div class="avatar">?</div>';
  const photo = typeof student.photo === 'string' ? student.photo : '';
  if (photo) return '<div class="avatar"><img src="' + photo.replace(/"/g, '&quot;') + '" alt=""></div>';
  const initial = mpsPhotoInitials(student.name);
  if (student.hasPhoto && student.id) {
    return '<div class="avatar" data-photo="' + String(student.id).replace(/"/g, '&quot;') + '">' + initial + '</div>';
  }
  return '<div class="avatar">' + initial + '</div>';
}

async function mpsHydrateAvatars(root) {
  const scope = (root && root.querySelectorAll) ? root : document;
  const els = Array.from(scope.querySelectorAll('[data-photo]'));
  await Promise.all(els.map(async (el) => {
    if (el.dataset.loaded) return;
    el.dataset.loaded = '1';
    const photo = await mpsPhotoGet(el.dataset.photo);
    if (photo) {
      el.textContent = '';
      const img = document.createElement('img');
      img.src = photo;
      img.alt = '';
      el.appendChild(img);
    }
  }));
}
