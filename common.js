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
