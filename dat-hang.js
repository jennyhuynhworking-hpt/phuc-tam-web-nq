// Đặt món giao hàng trên web – bắt buộc chuyển khoản trước.
import { initStore, defaultMenu } from './store.js';
import { $, esc, money, parsePrice, toast, showFatal, vietQR, clock, nowHM, inShift, DSTATUS, shortCode, beep } from './common.js';

let store;
try { store = await initStore(); } catch (e) { showFatal(e); throw e; }

const KEY = 'pt_delivery_id';
let MENU = defaultMenu(), config = null, menuKey = 'thuong', tab = '0', view = 'menu', when = 'asap';
let current = null, unsubDoc = null, lastStatus = null;
const cart = new Map();

const menu = () => MENU[menuKey] || MENU.thuong;
const itemOf = (key) => { const [ci, ii] = key.split('-').map(Number); const c = menu().cats[ci]; return { key, cat: c.label, ...c.items[ii] }; };
const cartCount = () => [...cart.values()].reduce((s, x) => s + x.qty, 0);
const subtotal = () => [...cart.values()].reduce((s, x) => s + x.qty * x.price, 0);
const D = () => config.delivery;
const area = () => D().areas.find((a) => a.name === $('dArea').value);

function openState() {
  if (!D().enabled) return 'Phúc Tâm đang tạm ngưng nhận đơn giao hàng. Quý khách vui lòng gọi 035 844 9199.';
  if (!config.bank || !config.bank.account) return 'Kênh giao hàng đang được cài đặt. Quý khách vui lòng gọi 035 844 9199 để đặt món.';
  if (!inShift(nowHM())) return 'Ngoài giờ nhận đơn (9:00–13:30 và 16:30–20:30). Quý khách vẫn xem được thực đơn.';
  return '';
}
function setView(v) {
  view = v;
  $('v-menu').hidden = v !== 'menu'; $('v-info').hidden = v !== 'info'; $('v-track').hidden = v !== 'track';
  document.querySelectorAll('#steps [data-step]').forEach((s) => {
    const order = ['menu', 'info', 'pay', 'track'];
    const cur = v === 'track' ? (current && current.status === 'cho_tt' ? 'pay' : 'track') : v;
    s.classList.toggle('on', s.dataset.step === cur);
    s.classList.toggle('done', order.indexOf(s.dataset.step) < order.indexOf(cur));
  });
  renderBar(); window.scrollTo({ top: 0 });
}

/* ---------- Bước 1: thực đơn ---------- */
function renderMenu() {
  const cats = menu().cats;
  if (Number(tab) >= cats.length) tab = '0';
  $('tabNav').innerHTML = cats.map((c, i) => `<button type="button" class="chip" data-tab="${i}" aria-pressed="${String(i) === tab}">${esc(c.label)}</button>`).join('');
  const ci = Number(tab), c = cats[ci];
  $('menuContent').innerHTML = `<h2 class="sec-title">${esc(c.label)}</h2>${c.items.map((it, ii) => {
    const key = ci + '-' + ii;
    return `<div class="m-item ${it.out ? 'is-out' : ''}"><div class="m-info"><span class="m-name">${esc(it.name)}${it.must ? '<span class="badge">Must try</span>' : ''}</span><span class="m-en">${esc(it.en)}</span><span class="m-price">${esc(it.price)}</span></div><span data-ctl="${key}">${ctl(key)}</span></div>`;
  }).join('')}`;
}
function ctl(key) {
  const it = itemOf(key);
  if (it.out) return '<span class="out-tag">Tạm hết</span>';
  const q = cart.get(key)?.qty || 0;
  return q ? `<span class="qty"><button type="button" data-sub="${key}" aria-label="Bớt ${esc(it.name)}">−</button><span>${q}</span><button type="button" data-add="${key}" aria-label="Thêm ${esc(it.name)}">+</button></span>`
    : `<span class="qty"><button type="button" class="add-only" data-add="${key}" aria-label="Thêm ${esc(it.name)}">+</button></span>`;
}
function change(key, d) {
  const it = itemOf(key);
  const cur = cart.get(key) || { key, name: it.name, cat: it.cat, price: parsePrice(it.price), qty: 0 };
  cur.qty += d; if (cur.qty <= 0) cart.delete(key); else cart.set(key, cur);
  document.querySelectorAll(`[data-ctl="${key}"]`).forEach((el) => { el.innerHTML = ctl(key); });
  renderBar(); if (view === 'info') renderInfo();
}
function renderBar() {
  const n = cartCount();
  $('cartBar').hidden = view !== 'menu' || n === 0;
  $('cartCount').textContent = n + ' món · ' + money(subtotal());
}

/* ---------- Bước 2: thông tin ---------- */
function renderInfo() {
  if (!cart.size) { setView('menu'); return; }
  $('infoLines').innerHTML = [...cart.values()].map((x) => `<div class="cart-line"><div class="line-main"><span>${esc(x.name)}</span><span class="line-sub">${money(x.price)}</span></div><span class="qty sm"><button type="button" data-sub="${x.key}" aria-label="Bớt">−</button><span>${x.qty}</span><button type="button" data-add="${x.key}" aria-label="Thêm">+</button></span></div>`).join('');
  const a = area(); const sub = subtotal(); const ship = a ? a.fee : 0;
  $('sumSub').textContent = money(sub); $('sumShip').textContent = a ? money(ship) : '–'; $('sumTotal').textContent = money(sub + ship);
  const closed = openState();
  const warn = closed || (sub < D().minOrder ? `Đơn tối thiểu ${money(D().minOrder)} – thêm ${money(D().minOrder - sub)} nữa nhé.` : '');
  $('infoWarn').textContent = warn || `Dự kiến chuẩn bị khoảng ${D().prepMin} phút sau khi xác nhận thanh toán, chưa gồm thời gian di chuyển.`;
  $('infoWarn').classList.toggle('warn', !!warn);
  $('placeBtn').disabled = !!warn;
}
function fillAreas() {
  $('dArea').innerHTML = '<option value="">– Chọn khu vực –</option>' + D().areas.map((a) => `<option value="${esc(a.name)}">${esc(a.name)} – phí ${money(a.fee)}</option>`).join('') + '<option value="" disabled>Khu vực khác: gọi 035 844 9199</option>';
  const saved = JSON.parse(localStorage.getItem('pt_customer') || '{}');
  ['dName', 'dPhone', 'dAddr'].forEach((k) => { if (saved[k] && !$(k).value) $(k).value = saved[k]; });
  if (saved.dArea) $('dArea').value = saved.dArea;
}
$('dArea').addEventListener('change', renderInfo);
document.querySelectorAll('[data-when]').forEach((b) => b.addEventListener('click', () => {
  when = b.dataset.when; document.querySelectorAll('[data-when]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  $('whenWrap').hidden = when !== 'later';
}));
$('goInfo').addEventListener('click', () => { setView('info'); renderInfo(); });
$('backMenu').addEventListener('click', () => { setView('menu'); renderMenu(); });

$('placeBtn').addEventListener('click', async () => {
  const name = $('dName').value.trim(), phone = $('dPhone').value.replace(/\s+/g, ''), addr = $('dAddr').value.trim(), a = area();
  const errs = [];
  if (!name) errs.push('họ tên'); if (!/^(\+?84|0)\d{8,10}$/.test(phone)) errs.push('số điện thoại'); if (!a) errs.push('khu vực'); if (addr.length < 6) errs.push('địa chỉ');
  let time = '';
  if (when === 'later') { time = $('dTime').value; if (!time || !inShift(time) || time < nowHM()) errs.push('giờ hẹn (trong 9:00–13:30, 16:30–20:30)'); }
  if (errs.length) { toast('Vui lòng kiểm tra: ' + errs.join(', ') + '.', true); return; }
  localStorage.setItem('pt_customer', JSON.stringify({ dName: name, dPhone: phone, dAddr: addr, dArea: a.name }));
  const btn = $('placeBtn'); btn.disabled = true; btn.textContent = 'Đang tạo đơn…';
  const sub = subtotal(); const code = shortCode();
  const order = {
    code, name, phone, address: addr, area: a.name, fee: a.fee, when: when === 'later' ? time : 'asap', note: $('dNote').value.trim(),
    items: [...cart.values()].map((x) => ({ name: x.name, cat: x.cat, qty: x.qty, price: x.price })),
    subtotal: sub, total: sub + a.fee, payInfo: 'PT' + code + ' ' + phone.slice(-4),
    status: 'cho_tt', open: true, createdAt: Date.now()
  };
  try {
    const id = await store.addDelivery(order);
    localStorage.setItem(KEY, id);
    cart.clear(); renderBar();
    watch(id);
  } catch (e) { console.error(e); toast('Chưa tạo được đơn, vui lòng thử lại hoặc gọi 035 844 9199.', true); }
  finally { btn.disabled = false; btn.textContent = 'Đặt hàng & thanh toán'; }
});

/* ---------- Bước 3–4: thanh toán & theo dõi ---------- */
function watch(id) {
  if (unsubDoc) unsubDoc();
  unsubDoc = store.onDelivery(id, (d) => {
    if (!d) { localStorage.removeItem(KEY); current = null; setView('menu'); renderMenu(); return; }
    if (lastStatus && lastStatus !== d.status) { beep(); toast(DSTATUS[d.status]); }
    lastStatus = d.status; current = d; setView('track'); renderTrack();
  });
}
const FLOW = ['cho_tt', 'bep', 'san_sang', 'dang_giao', 'xong'];
function renderTrack() {
  const d = current; if (!d) return;
  const left = Math.max(0, d.createdAt + D().payMinutes * 60000 - Date.now());
  const expired = d.status === 'cho_tt' && left === 0;
  const qr = vietQR(config.bank, d.total, d.payInfo);
  const idx = FLOW.indexOf(d.status);
  $('trackBox').innerHTML = `
    <div class="welcome"><h1>Đơn #${esc(d.code)}</h1><p>${clock(d.createdAt)} · ${esc(d.name)} · ${esc(d.phone)}</p></div>
    ${d.status === 'huy' ? `<div class="panel warn-panel">Đơn đã hủy${d.cancelReason ? ': ' + esc(d.cancelReason) : ''}. Cần hỗ trợ vui lòng gọi 035 844 9199.</div>` : `
    <ol class="timeline">${FLOW.map((s, i) => `<li class="${i < idx ? 'done' : i === idx ? 'on' : ''}">${DSTATUS[s]}${s === 'dang_giao' && d.shipper && i <= idx ? `<small>Shipper: ${esc(d.shipper)}</small>` : ''}</li>`).join('')}</ol>`}
    ${d.status === 'cho_tt' ? `<div class="panel stack pay-box">
      <h2 style="margin:0">Chuyển khoản để xác nhận đơn</h2>
      ${qr ? `<img class="qr-img" src="${esc(qr)}" alt="Mã VietQR ${money(d.total)}">` : ''}
      <div class="pay-total"><span>Số tiền</span><b>${money(d.total)}</b></div>
      <div class="copy-row"><span>Nội dung CK</span><b>${esc(d.payInfo)}</b><button type="button" class="btn btn-outline btn-sm" data-copy="${esc(d.payInfo)}">Sao chép</button></div>
      <div class="copy-row"><span>Số tài khoản</span><b>${esc(config.bank.account)}</b><button type="button" class="btn btn-outline btn-sm" data-copy="${esc(config.bank.account)}">Sao chép</button></div>
      <p class="hint" style="margin:0">Mở app ngân hàng → quét mã QR (số tiền và nội dung tự điền). ${expired ? '<b class="warn">Đã quá thời gian giữ đơn – nếu đã chuyển khoản vui lòng gọi 035 844 9199.</b>' : `Đơn được giữ thêm <b id="countdown">${Math.ceil(left / 60000)} phút</b>.`}</p>
      ${d.customerPaidAt ? '<p class="ok-note">Quý khách đã báo chuyển khoản. Phúc Tâm đang kiểm tra và sẽ xác nhận trong ít phút.</p>'
        : '<button type="button" class="btn btn-gold" id="paidBtn" style="min-height:52px">Tôi đã chuyển khoản</button>'}
      <button type="button" class="btn btn-outline btn-sm" id="cancelBtn">Hủy đơn</button>
    </div>` : ''}
    <div class="panel stack" style="margin-top:14px">
      <h2 style="margin:0">Chi tiết đơn</h2>
      <div class="lines">${d.items.map((i) => `<div class="line"><span>${esc(i.name)} × ${i.qty}</span><span>${money(i.price * i.qty)}</span></div>`).join('')}
        <div class="line"><span>Phí giao (${esc(d.area)})</span><span>${money(d.fee)}</span></div></div>
      <div class="total"><span>Tổng</span><b>${money(d.total)}</b></div>
      <p class="hint" style="margin:0">Giao tới: ${esc(d.address)}, ${esc(d.area)} · ${d.when === 'asap' ? 'Giao sớm nhất' : 'Hẹn ' + esc(d.when)}${d.note ? '<br>Ghi chú: ' + esc(d.note) : ''}</p>
    </div>
    ${['xong', 'huy'].includes(d.status) ? '<button type="button" class="btn btn-gold" id="newOrder" style="margin-top:14px;width:100%">Đặt đơn mới</button>' : ''}`;
  const paid = $('paidBtn'); if (paid) paid.onclick = async () => { paid.disabled = true; await store.updateDelivery(d.id, { customerPaidAt: Date.now() }); };
  const cancel = $('cancelBtn'); if (cancel) cancel.onclick = async () => { if (!confirm('Hủy đơn #' + d.code + '?')) return; await store.updateDelivery(d.id, { status: 'huy', open: false, cancelReason: 'Khách tự hủy trước khi thanh toán', at_huy: Date.now() }); };
  const nw = $('newOrder'); if (nw) nw.onclick = () => { localStorage.removeItem(KEY); if (unsubDoc) unsubDoc(); current = null; lastStatus = null; setView('menu'); renderMenu(); };
}
setInterval(() => { if (current && current.status === 'cho_tt' && view === 'track') { const el = $('countdown'); const left = Math.max(0, current.createdAt + D().payMinutes * 60000 - Date.now()); if (el && left > 0) el.textContent = Math.ceil(left / 60000) + ' phút'; else if (left === 0) renderTrack(); } }, 20000);

document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-add]'); if (a) { change(a.dataset.add, 1); return; }
  const s = e.target.closest('[data-sub]'); if (s) { change(s.dataset.sub, -1); return; }
  const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; renderMenu(); t.scrollIntoView({ inline: 'center', block: 'nearest' }); return; }
  const c = e.target.closest('[data-copy]'); if (c) { navigator.clipboard?.writeText(c.dataset.copy).then(() => toast('Đã sao chép.')); }
});

/* ---------- Khởi động ---------- */
let started = false;
function start() {
  if (!config || started) return; started = true;
  $('loading').hidden = true;
  fillAreas();
  const msg = openState();
  $('closedBanner').hidden = !msg; $('closedBanner').textContent = msg;
  const saved = localStorage.getItem(KEY);
  if (saved) watch(saved); else { setView('menu'); renderMenu(); }
}
store.onConfig((c) => { config = c; menuKey = c.activeMenu; start(); if (started) { const msg = openState(); $('closedBanner').hidden = !msg; $('closedBanner').textContent = msg; if (view === 'menu') renderMenu(); if (view === 'track') renderTrack(); } });
store.onMenu((m) => { MENU = m; if (started && view === 'menu') renderMenu(); });
