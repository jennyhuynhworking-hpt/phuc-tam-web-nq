export const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const parsePrice = (t) => { const m = String(t).match(/([\d.,]+)\s*k/i); return m ? Math.round(parseFloat(m[1].replace(',', '.')) * 1000) : 0; };
export const money = (n) => (n || 0).toLocaleString('vi-VN') + 'đ';
export const minutesAgo = (ts) => Math.max(0, Math.floor((Date.now() - ts) / 60000));
export const clock = (ts) => new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
export const STATUS = { moi: 'Chờ làm', dang: 'Đang làm', xong: 'Xong – chờ lên', phucvu: 'Đã lên món' };

export function toast(msg, isErr) {
  const t = document.createElement('div');
  t.className = 'toast' + (isErr ? ' err' : '');
  t.setAttribute('role', 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

export function showFatal(err) {
  console.error(err);
  const box = document.createElement('div');
  box.className = 'fatal';
  box.textContent = 'Không kết nối được dữ liệu. Kiểm tra lại cấu hình Firebase trong firebase-config.js hoặc mạng internet. (' + (err && err.message ? err.message : err) + ')';
  document.body.prepend(box);
}

export const dayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
export const fmtDate = (ts) => new Date(ts).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
export const fmtDateTime = (ts) => new Date(ts).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

// Mã BIN ngân hàng dùng cho VietQR
export const BANKS = [
  ['970436', 'Vietcombank'], ['970407', 'Techcombank'], ['970422', 'MB Bank'], ['970416', 'ACB'],
  ['970415', 'VietinBank'], ['970418', 'BIDV'], ['970405', 'Agribank'], ['970432', 'VPBank'],
  ['970423', 'TPBank'], ['970403', 'Sacombank'], ['970441', 'VIB'], ['970437', 'HDBank'],
  ['970448', 'OCB'], ['970426', 'MSB'], ['970443', 'SHB'], ['970431', 'Eximbank'], ['970440', 'SeABank']
];
export function vietQR(bank, amount, info) {
  if (!bank || !bank.bin || !bank.account) return '';
  const q = new URLSearchParams({ amount: String(Math.round(amount)), addInfo: info || '', accountName: bank.name || '' });
  return `https://img.vietqr.io/image/${bank.bin}-${encodeURIComponent(bank.account)}-compact2.png?${q}`;
}

// Âm báo dùng chung
let audioCtx = null;
export function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.22].forEach((t, i) => {
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      o.frequency.value = i ? 1046 : 784;
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.4, audioCtx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.2);
      o.connect(g).connect(audioCtx.destination); o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.22);
    });
  } catch (e) { console.warn(e); }
}

// Giờ nhận khách / nhận đơn
export const SHIFTS = [['09:00', '13:30'], ['16:30', '20:30']];
export const nowHM = () => new Date().toTimeString().slice(0, 5);
export const inShift = (hm) => SHIFTS.some(([a, b]) => hm >= a && hm <= b);
export const DSTATUS = {
  cho_tt: 'Chờ xác nhận thanh toán', bep: 'Đã thanh toán – bếp đang làm', san_sang: 'Đã đóng gói – chờ giao',
  dang_giao: 'Đang giao', xong: 'Đã giao xong', huy: 'Đã hủy'
};
export const shortCode = () => Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[O0I1]/g, 'X');

// Nén ảnh món trước khi lưu (miễn phí, lưu thẳng trong Firestore): tối đa ~480px, JPEG
export function compressImage(file, maxSide = 480) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      let q = 0.75, out = cv.toDataURL('image/jpeg', q);
      while (out.length > 140000 && q > 0.35) { q -= 0.1; out = cv.toDataURL('image/jpeg', q); }
      URL.revokeObjectURL(img.src);
      resolve(out);
    };
    img.onerror = () => reject(new Error('Không đọc được ảnh'));
    img.src = URL.createObjectURL(file);
  });
}
// Gắn ảnh vào các thẻ <img data-img="id"> sau khi render
export function hydrateImages(root, store) {
  root.querySelectorAll('img[data-img]:not([src])').forEach(async (el) => {
    const src = await store.getImage(el.dataset.img);
    if (src) el.src = src; else el.remove();
  });
}
