// Lớp dữ liệu dùng chung: tự chọn chế độ DEMO (localStorage) hoặc THẬT (Firebase Firestore).
import { DEFAULT_CONFIG, MENUS } from './menu-data.js';
import { uid } from './common.js';

const FB = window.FIREBASE_CONFIG;
export const mode = FB && FB.apiKey && FB.projectId ? 'firebase' : 'local';

const clone = (o) => JSON.parse(JSON.stringify(o));
const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

export function defaultMenu() {
  const out = {};
  Object.keys(MENUS).forEach((k) => {
    out[k] = {
      label: MENUS[k].label, note: MENUS[k].note,
      cats: MENUS[k].cats.map((c) => ({ label: c.label, items: c.items.map((it) => ({ name: it.name, en: it.en, price: it.price, must: !!it.must, out: false })) }))
    };
  });
  return out;
}
function withConfig(c) {
  const d = clone(DEFAULT_CONFIG);
  return { ...d, ...(c || {}), catStation: { ...d.catStation, ...((c && c.catStation) || {}) }, bank: { ...((c && c.bank) || {}) }, delivery: { ...d.delivery, ...((c && c.delivery) || {}) } };
}
const withMenu = (m) => (m && m.thuong && m.chay ? m : defaultMenu());
const imgCache = new Map();

let api = null;
export async function initStore() {
  if (!api) api = mode === 'firebase' ? await firebaseStore() : localStore();
  return api;
}

/* ================= DEMO: localStorage ================= */
function localStore() {
  const KEY = 'phuctam_qr_v2';
  const blank = () => ({ config: clone(DEFAULT_CONFIG), menu: null, tickets: [], calls: [], bookings: [], bills: [], expenses: [], deliveries: [], images: {} });
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const fix = (s) => ({ ...blank(), ...(s || {}) });
  let st = fix(read());
  const subs = { config: new Set(), menu: new Set(), tickets: new Set(), calls: new Set(), bookings: new Set(), deliveries: new Set() };
  const docSubs = new Map();
  const views = {
    config: () => withConfig(st.config),
    menu: () => withMenu(st.menu),
    tickets: () => st.tickets.filter((x) => !x.paid),
    calls: () => st.calls.filter((x) => !x.done),
    bookings: () => st.bookings.filter((b) => b.date >= todayKey()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    deliveries: () => st.deliveries.filter((d) => d.open).sort((a, b) => a.createdAt - b.createdAt)
  };
  const emit = () => {
    Object.keys(subs).forEach((k) => subs[k].forEach((f) => f(views[k]())));
    docSubs.forEach((set, id) => { const d = st.deliveries.find((x) => x.id === id) || null; set.forEach((f) => f(d)); });
  };
  const commit = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { console.error(e); } emit(); };
  window.addEventListener('storage', (e) => { if (e.key === KEY) { st = fix(read()); emit(); } });
  const sub = (k) => (f) => { subs[k].add(f); f(views[k]()); return () => subs[k].delete(f); };
  const inRange = (ts, a, b) => ts >= a && ts < b;
  return {
    onConfig: sub('config'), onMenu: sub('menu'), onTickets: sub('tickets'), onCalls: sub('calls'), onBookings: sub('bookings'), onDeliveries: sub('deliveries'),
    onDelivery(id, f) { if (!docSubs.has(id)) docSubs.set(id, new Set()); docSubs.get(id).add(f); f(st.deliveries.find((x) => x.id === id) || null); return () => docSubs.get(id).delete(f); },
    async addDelivery(d) { const id = uid(); st.deliveries.push({ ...d, id }); commit(); return id; },
    async updateDelivery(id, p) { const d = st.deliveries.find((x) => x.id === id); if (d) { Object.assign(d, p); commit(); } },
    async confirmDelivery(id, tickets, bill, patch) {
      tickets.forEach((t) => st.tickets.push({ ...t, id: uid() }));
      st.bills.push({ ...bill, id: uid() });
      const d = st.deliveries.find((x) => x.id === id); if (d) Object.assign(d, patch);
      commit();
    },
    async closeDelivery(id, patch) {
      const d = st.deliveries.find((x) => x.id === id); if (d) Object.assign(d, patch);
      st.tickets = st.tickets.filter((t) => t.deliveryId !== id);
      commit();
    },
    async saveConfig(p) { st.config = { ...withConfig(st.config), ...p }; commit(); },
    async saveMenu(m) { st.menu = clone(m); commit(); },
    async addTickets(arr) { arr.forEach((t) => st.tickets.push({ ...t, id: uid() })); commit(); },
    async updateTicket(id, p) { const t = st.tickets.find((x) => x.id === id); if (t) { Object.assign(t, p); commit(); } },
    async updateTickets(ids, p) { st.tickets.forEach((t) => { if (ids.includes(t.id)) Object.assign(t, p); }); commit(); },
    async addCall(c) { st.calls.push({ ...c, id: uid(), done: false }); commit(); },
    async resolveCall(id) { st.calls = st.calls.filter((x) => x.id !== id); commit(); },
    async checkout(tid, bill) {
      st.bills.push({ ...bill, id: uid() });
      st.tickets = st.tickets.filter((x) => x.table !== tid);
      st.calls = st.calls.filter((x) => x.table !== tid);
      commit();
    },
    async addBooking(b) { st.bookings.push({ ...b, id: uid() }); commit(); },
    async updateBooking(id, p) { const b = st.bookings.find((x) => x.id === id); if (b) { Object.assign(b, p); commit(); } },
    async listBills(a, b) { return st.bills.filter((x) => inRange(x.paidAt, a, b)); },
    async listExpenses(a, b) { return st.expenses.filter((x) => inRange(x.at, a, b)); },
    async addExpense(e) { st.expenses.push({ ...e, id: uid() }); commit(); },
    async deleteExpense(id) { st.expenses = st.expenses.filter((x) => x.id !== id); commit(); },
    async saveImage(data) { const id = uid(); st.images[id] = data; commit(); return id; },
    async getImage(id) { return st.images[id] || ''; },
    async resetAll() { const keepMenu = st.menu, keepImg = st.images; st = blank(); st.menu = keepMenu; st.images = keepImg; commit(); }
  };
}

/* ================= THẬT: Firebase Firestore ================= */
async function firebaseStore() {
  const V = '10.12.2';
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const F = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  const db = F.getFirestore(initializeApp(FB));
  const cfgRef = F.doc(db, 'phuctam', 'config');
  const menuRef = F.doc(db, 'phuctam', 'menu');
  const C = (n) => F.collection(db, n);
  let tCache = [];
  let cCache = [];
  const err = (e) => console.error(e);
  const list = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return {
    onConfig(f) { return F.onSnapshot(cfgRef, (s) => f(withConfig(s.exists() ? s.data() : null)), err); },
    onMenu(f) { return F.onSnapshot(menuRef, (s) => f(withMenu(s.exists() ? s.data() : null)), err); },
    onTickets(f) { return F.onSnapshot(F.query(C('tickets'), F.where('paid', '==', false)), (s) => { tCache = list(s); f(tCache); }, err); },
    onCalls(f) { return F.onSnapshot(F.query(C('calls'), F.where('done', '==', false)), (s) => { cCache = list(s); f(cCache); }, err); },
    onDeliveries(f) { return F.onSnapshot(F.query(C('deliveries'), F.where('open', '==', true)), (s) => f(list(s).sort((a, b) => a.createdAt - b.createdAt)), err); },
    onDelivery(id, f) { return F.onSnapshot(F.doc(db, 'deliveries', id), (s) => f(s.exists() ? { id: s.id, ...s.data() } : null), err); },
    async addDelivery(d) { const r = await F.addDoc(C('deliveries'), d); return r.id; },
    updateDelivery(id, p) { return F.updateDoc(F.doc(db, 'deliveries', id), p); },
    async confirmDelivery(id, tickets, bill, patch) {
      const b = F.writeBatch(db);
      tickets.forEach((t) => b.set(F.doc(C('tickets')), t));
      b.set(F.doc(C('bills')), bill);
      b.update(F.doc(db, 'deliveries', id), patch);
      await b.commit();
    },
    async closeDelivery(id, patch) {
      const b = F.writeBatch(db);
      tCache.filter((t) => t.deliveryId === id).forEach((t) => b.update(F.doc(db, 'tickets', t.id), { paid: true }));
      b.update(F.doc(db, 'deliveries', id), patch);
      await b.commit();
    },
    onBookings(f) {
      return F.onSnapshot(F.query(C('bookings'), F.where('date', '>=', todayKey())), (s) => {
        f(list(s).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
      }, err);
    },
    saveConfig(p) { return F.setDoc(cfgRef, p, { merge: true }); },
    saveMenu(m) { return F.setDoc(menuRef, clone(m)); },
    async addTickets(arr) { const b = F.writeBatch(db); arr.forEach((t) => b.set(F.doc(C('tickets')), t)); await b.commit(); },
    updateTicket(id, p) { return F.updateDoc(F.doc(db, 'tickets', id), p); },
    async updateTickets(ids, p) { const b = F.writeBatch(db); ids.forEach((id) => b.update(F.doc(db, 'tickets', id), p)); await b.commit(); },
    async addCall(c) { await F.addDoc(C('calls'), { ...c, done: false }); },
    resolveCall(id) { return F.updateDoc(F.doc(db, 'calls', id), { done: true, doneAt: Date.now() }); },
    async checkout(tid, bill) {
      const b = F.writeBatch(db);
      b.set(F.doc(C('bills')), bill);
      tCache.filter((t) => t.table === tid).forEach((t) => b.update(F.doc(db, 'tickets', t.id), { paid: true, paidAt: bill.paidAt }));
      cCache.filter((c) => c.table === tid).forEach((c) => b.update(F.doc(db, 'calls', c.id), { done: true }));
      await b.commit();
    },
    async saveImage(data) { const r = await F.addDoc(C('images'), { data, createdAt: Date.now() }); imgCache.set(r.id, data); return r.id; },
    async getImage(id) {
      if (imgCache.has(id)) return imgCache.get(id);
      const p = F.getDoc(F.doc(db, 'images', id)).then((s) => (s.exists() ? s.data().data : '')).catch(() => '');
      imgCache.set(id, p); const v = await p; imgCache.set(id, v); return v;
    },
    async addBooking(x) { await F.addDoc(C('bookings'), x); },
    updateBooking(id, p) { return F.updateDoc(F.doc(db, 'bookings', id), p); },
    async listBills(a, b) { return list(await F.getDocs(F.query(C('bills'), F.where('paidAt', '>=', a), F.where('paidAt', '<', b)))); },
    async listExpenses(a, b) { return list(await F.getDocs(F.query(C('expenses'), F.where('at', '>=', a), F.where('at', '<', b)))); },
    async addExpense(e) { await F.addDoc(C('expenses'), e); },
    deleteExpense(id) { return F.deleteDoc(F.doc(db, 'expenses', id)); },
    async resetAll() {
      const b = F.writeBatch(db);
      tCache.forEach((t) => b.delete(F.doc(db, 'tickets', t.id)));
      cCache.forEach((c) => b.delete(F.doc(db, 'calls', c.id)));
      b.set(cfgRef, clone(DEFAULT_CONFIG));
      await b.commit();
    }
  };
}
