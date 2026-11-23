// Lớp dữ liệu: tự chọn chế độ DEMO (localStorage) hoặc THẬT (Firebase Firestore).
import { DEFAULT_CONFIG } from './menu-data.js';
import { uid } from './common.js';

const FB = window.FIREBASE_CONFIG;
export const mode = FB && FB.apiKey && FB.projectId ? 'firebase' : 'local';

const clone = (o) => JSON.parse(JSON.stringify(o));
function withDefaults(c) {
  const d = clone(DEFAULT_CONFIG);
  return { ...d, ...(c || {}), catStation: { ...d.catStation, ...((c && c.catStation) || {}) } };
}

let api = null;
export async function initStore() {
  if (!api) api = mode === 'firebase' ? await firebaseStore() : localStore();
  return api;
}

function localStore() {
  const KEY = 'phuctam_qr_v1';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  let st = read() || { config: clone(DEFAULT_CONFIG), tickets: [], calls: [] };
  if (!st.calls) st.calls = [];
  const cfgSubs = new Set();
  const tSubs = new Set();
  const cSubs = new Set();
  const openCalls = () => st.calls.filter((x) => !x.done);
  const active = () => st.tickets.filter((x) => !x.paid);
  const emit = () => {
    const c = withDefaults(st.config);
    cfgSubs.forEach((f) => f(c));
    tSubs.forEach((f) => f(active()));
    cSubs.forEach((f) => f(openCalls()));
  };
  const commit = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { console.error(e); } emit(); };
  window.addEventListener('storage', (e) => { if (e.key === KEY) { st = read() || st; if (!st.calls) st.calls = []; emit(); } });
  return {
    onConfig(f) { cfgSubs.add(f); f(withDefaults(st.config)); return () => cfgSubs.delete(f); },
    onTickets(f) { tSubs.add(f); f(active()); return () => tSubs.delete(f); },
    async saveConfig(p) { st.config = { ...withDefaults(st.config), ...p }; commit(); },
    async addTickets(arr) { arr.forEach((t) => st.tickets.push({ ...t, id: uid() })); commit(); },
    async updateTicket(id, p) { const t = st.tickets.find((x) => x.id === id); if (t) { Object.assign(t, p); commit(); } },
    async payTable(tid) { st.tickets = st.tickets.filter((x) => x.table !== tid); st.calls = st.calls.filter((x) => x.table !== tid); commit(); },
    onCalls(f) { cSubs.add(f); f(openCalls()); return () => cSubs.delete(f); },
    async addCall(c) { st.calls.push({ ...c, id: uid(), done: false }); commit(); },
    async resolveCall(id) { const c = st.calls.find((x) => x.id === id); if (c) { c.done = true; st.calls = st.calls.filter((x) => !x.done); commit(); } },
    async resetAll() { st = { config: clone(DEFAULT_CONFIG), tickets: [], calls: [] }; commit(); }
  };
}

async function firebaseStore() {
  const V = '10.12.2';
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const F = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  const db = F.getFirestore(initializeApp(FB));
  const cfgRef = F.doc(db, 'phuctam', 'config');
  const col = F.collection(db, 'tickets');
  const callCol = F.collection(db, 'calls');
  let cache = [];
  let callCache = [];
  return {
    onConfig(f) { return F.onSnapshot(cfgRef, (s) => f(withDefaults(s.exists() ? s.data() : null)), (e) => console.error(e)); },
    onTickets(f) {
      return F.onSnapshot(F.query(col, F.where('paid', '==', false)), (s) => {
        cache = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        f(cache);
      }, (e) => console.error(e));
    },
    saveConfig(p) { return F.setDoc(cfgRef, p, { merge: true }); },
    async addTickets(arr) { const b = F.writeBatch(db); arr.forEach((t) => b.set(F.doc(col), t)); await b.commit(); },
    updateTicket(id, p) { return F.updateDoc(F.doc(db, 'tickets', id), p); },
    async payTable(tid) {
      const b = F.writeBatch(db);
      cache.filter((t) => t.table === tid).forEach((t) => b.update(F.doc(db, 'tickets', t.id), { paid: true, paidAt: Date.now() }));
      callCache.filter((c) => c.table === tid).forEach((c) => b.update(F.doc(db, 'calls', c.id), { done: true }));
      await b.commit();
    },
    onCalls(f) {
      return F.onSnapshot(F.query(callCol, F.where('done', '==', false)), (s) => {
        callCache = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        f(callCache);
      }, (e) => console.error(e));
    },
    async addCall(c) { await F.addDoc(callCol, { ...c, done: false }); },
    resolveCall(id) { return F.updateDoc(F.doc(db, 'calls', id), { done: true, doneAt: Date.now() }); },
    async resetAll() {
      const b = F.writeBatch(db);
      cache.forEach((t) => b.delete(F.doc(db, 'tickets', t.id)));
      callCache.forEach((c) => b.delete(F.doc(db, 'calls', c.id)));
      b.set(cfgRef, clone(DEFAULT_CONFIG));
      await b.commit();
    }
  };
}
