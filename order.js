import { initStore, defaultMenu } from './store.js';
import { $, esc, money, parsePrice, uid, STATUS, toast, showFatal, hydrateImages } from './common.js';

const tableId = new URLSearchParams(location.search).get('ban');
let store;
try { store = await initStore(); } catch (e) { showFatal(e); throw e; }

// Ảnh món nổi bật: tên món (có thể nhiều cách viết) → file ảnh
const FEATURED = [
  { names: ['Lẩu Thái Chua Cay', 'Lẩu Thái'], img: 'lau2.jpg' },
  { names: ['Pad Thái'], img: 'padthai.jpg' },
  { names: ['Chả Giò Phúc Tâm'], img: 'chagio.jpg' },
  { names: ['Đậu Hũ Nấm Kho Tiêu'], img: 'kho.jpg' },
  { names: ['Cơm Chiên Thơm Thái'], img: 'comthom.jpg' },
  { names: ['Nui Đút Lò', 'Nui Đúc Lò'], img: 'pasta.jpg' },
  { names: ['Cải Thìa Đông Cô / Tóc Tiên', 'Cải Thìa Đông Cô'], img: 'caithia.jpg' }
];
const CALLS = ['Gọi nhân viên', 'Xin thanh toán', 'Thêm chén đũa, khăn giấy', 'Thêm trà đá'];

let MENU = defaultMenu();
let menuLoaded = false;
let config = null;
let table = null;
let menuKey = null;
let tab = 'noibat';
let tickets = [];
let calls = [];
const cart = new Map();

const menu = () => MENU[menuKey] || MENU.thuong;
function itemOf(key) {
  const [ci, ii] = key.split('-').map(Number);
  const cat = menu().cats[ci];
  return { key, cat: cat.label, ...cat.items[ii] };
}
function findKey(names) {
  const cats = menu().cats;
  for (const n of names) for (let ci = 0; ci < cats.length; ci++) {
    const ii = cats[ci].items.findIndex((x) => x.name === n);
    if (ii >= 0) return ci + '-' + ii;
  }
  return null;
}

function fail(title, msg) {
  $('loading').hidden = true; $('menuView').hidden = true; $('cartBar').hidden = true;
  $('errBox').hidden = false;
  $('errBox').innerHTML = `<h1>${esc(title)}</h1><p>${esc(msg)}</p>`;
}

/* ---------- Khung trang ---------- */
function render() {
  if (!config || !menuLoaded) return;
  table = config.tables.find((t) => t.id === tableId);
  if (!tableId || !table) { fail('Không tìm thấy bàn', 'Mã QR này chưa gắn với bàn nào. Quý khách vui lòng gọi nhân viên để được hỗ trợ.'); return; }
  $('loading').hidden = true; $('errBox').hidden = true; $('menuView').hidden = false;
  $('tablePill').hidden = false; $('bellBtn').hidden = false;
  $('tablePill').textContent = table.name;
  document.title = 'Gọi món – ' + table.name + ' – Phúc Tâm';
  if (menuKey !== config.activeMenu) {
    if (menuKey !== null && cart.size) toast('Nhà hàng vừa đổi thực đơn, giỏ món đã được làm mới.');
    menuKey = config.activeMenu; cart.clear(); tab = 'noibat';
  }
  renderTabs(); renderContent(); renderBar();
}
function renderTabs() {
  const tabs = [{ id: 'noibat', label: 'Nổi bật' }, ...menu().cats.map((c, i) => ({ id: String(i), label: c.label }))];
  $('tabNav').innerHTML = tabs.map((t) => `<button type="button" class="chip" data-tab="${t.id}" aria-pressed="${t.id === tab}">${esc(t.label)}</button>`).join('');
}
function qtyCtl(key, small) {
  const it = itemOf(key);
  if (it.out) return '<span class="out-tag">Tạm hết</span>';
  const q = cart.get(key)?.qty || 0;
  return q
    ? `<span class="qty ${small ? 'sm' : ''}"><button type="button" data-sub="${key}" aria-label="Bớt ${esc(it.name)}">−</button><span>${q}</span><button type="button" data-add="${key}" aria-label="Thêm ${esc(it.name)}">+</button></span>`
    : `<span class="qty ${small ? 'sm' : ''}"><button type="button" class="add-only" data-add="${key}" aria-label="Thêm ${esc(it.name)}">+</button></span>`;
}
function renderContent() {
  const box = $('content');
  if (tab === 'noibat') {
    let feats = FEATURED.map((f) => ({ ...f, key: findKey(f.names) })).filter((f) => f.key && !itemOf(f.key).out);
    // Món Must try có ảnh tải lên cũng được đưa vào "Món nên thử"
    menu().cats.forEach((c, ci) => c.items.forEach((it, ii) => { const k = ci + '-' + ii; if (it.must && it.img && !it.out && !feats.some((f) => f.key === k)) feats.push({ key: k }); }));
    feats = feats.map((f) => { const it = itemOf(f.key); return { ...f, src: it.img ? '' : f.img, imgId: it.img || '' }; }).slice(0, 8);
    const musts = [];
    menu().cats.forEach((c, ci) => c.items.forEach((it, ii) => { if (it.must && !feats.some((f) => f.key === ci + '-' + ii)) musts.push(ci + '-' + ii); }));
    box.innerHTML = `
      <div class="welcome"><h1>Chào mừng quý khách!</h1><p>Chọn món rồi gửi order, bếp nhận ngay – không cần chờ nhân viên.</p></div>
      ${feats.length ? `<h2 class="sec-title">Món nên thử</h2>
      <div class="feat-grid">${feats.map((f) => { const it = itemOf(f.key); return `
        <article class="feat-card">${f.imgId ? `<img data-img="${esc(f.imgId)}" alt="${esc(it.name)}">` : `<img src="${f.src}" alt="${esc(it.name)}" loading="lazy">`}
          <div class="feat-body"><span class="feat-name">${esc(it.name)}</span>
            <div class="feat-foot"><span class="m-price">${esc(it.price)}</span><span data-ctl="${f.key}" data-small="1">${qtyCtl(f.key, true)}</span></div></div></article>`; }).join('')}</div>` : ''}
      ${musts.length ? `<h2 class="sec-title">Must try khác</h2>${musts.map(rowHtml).join('')}` : ''}`;
  } else {
    const ci = Number(tab);
    const c = menu().cats[ci];
    box.innerHTML = `<h2 class="sec-title">${esc(c.label)}</h2>${c.items.map((_, ii) => rowHtml(ci + '-' + ii)).join('')}`;
  }
  hydrateImages(box, store);
}
function rowHtml(key) {
  const it = itemOf(key);
  return `<div class="m-item ${it.out ? 'is-out' : ''}"><div class="m-left">${it.img ? `<img class="m-thumb" data-img="${esc(it.img)}" alt="">` : ''}<div class="m-info">
      <span class="m-name">${esc(it.name)}${it.must ? '<span class="badge">Must try</span>' : ''}</span>
      <span class="m-en">${esc(it.en)}</span><span class="m-price">${esc(it.price)}</span></div></div>
    <span data-ctl="${key}">${qtyCtl(key)}</span></div>`;
}

/* ---------- Giỏ ---------- */
function change(key, d) {
  const it = itemOf(key);
  const cur = cart.get(key) || { key, name: it.name, cat: it.cat, price: parsePrice(it.price), qty: 0 };
  cur.qty += d;
  if (cur.qty <= 0) cart.delete(key); else cart.set(key, cur);
  document.querySelectorAll(`[data-ctl="${key}"]`).forEach((el) => { el.innerHTML = qtyCtl(key, !!el.dataset.small); });
  renderBar();
  if ($('cartDlg').open) { if (cart.size) renderCart(); else $('cartDlg').close(); }
}
const cartCount = () => [...cart.values()].reduce((s, x) => s + x.qty, 0);
const cartTotal = () => [...cart.values()].reduce((s, x) => s + x.qty * x.price, 0);
function renderBar() {
  const n = cartCount();
  $('cartBar').hidden = n === 0;
  $('cartCount').textContent = n + ' món · ' + money(cartTotal());
}
function renderCart() {
  $('cartTitle').textContent = 'Giỏ món · ' + table.name;
  $('cartLines').innerHTML = [...cart.values()].map((x) => `
    <div class="cart-line"><div class="line-main"><span>${esc(x.name)}</span><span class="line-sub">${money(x.price)} / phần</span></div>
      <span class="qty sm"><button type="button" data-sub="${x.key}" aria-label="Bớt ${esc(x.name)}">−</button><span>${x.qty}</span><button type="button" data-add="${x.key}" aria-label="Thêm ${esc(x.name)}">+</button></span></div>`).join('');
  $('cartTotal').textContent = money(cartTotal());
}
$('openCart').addEventListener('click', () => { renderCart(); $('cartDlg').showModal(); });
$('sendBtn').addEventListener('click', async () => {
  if (!cart.size) return;
  const btn = $('sendBtn');
  btn.disabled = true; btn.textContent = 'Đang gửi…';
  const now = Date.now();
  const orderId = uid();
  const note = $('cartNote').value.trim();
  const items = [...cart.values()].map((x, i) => ({
    orderId, table: table.id, tableName: table.name, name: x.name, cat: x.cat, qty: x.qty, price: x.price, note,
    station: config.stations.some((s) => s.id === config.catStation[x.cat]) ? config.catStation[x.cat] : config.stations[0].id,
    status: 'moi', paid: false, createdAt: now + i
  }));
  try {
    await store.addTickets(items);
    cart.clear(); $('cartNote').value = '';
    renderContent(); renderBar();
    $('cartDlg').close();
    toast('Đã gửi order! Bếp đang chuẩn bị món cho quý khách.');
  } catch (e) {
    console.error(e);
    toast('Gửi order chưa được. Quý khách thử lại hoặc bấm chuông gọi nhân viên nhé.', true);
  } finally {
    btn.disabled = false; btn.textContent = 'Gửi order cho bếp';
  }
});

/* ---------- Trạng thái món đã gọi ---------- */
const mine = () => tickets.filter((t) => t.table === tableId).sort((a, b) => a.createdAt - b.createdAt);
function renderStatus() {
  const list = mine();
  $('statusBanner').hidden = !list.length;
  if (!list.length) { if ($('statusDlg').open) $('statusDlg').close(); return; }
  const total = list.reduce((s, t) => s + t.qty, 0);
  const done = list.filter((t) => t.status === 'phucvu').reduce((s, t) => s + t.qty, 0);
  $('statusText').textContent = `Đã gọi ${total} món · ${done} món đã lên`;
  $('statusTitle').textContent = 'Món ' + (table ? table.name : '') + ' đã gọi';
  $('statusLines').innerHTML = list.map((t) => `<div class="line"><div class="line-main"><span>${esc(t.name)} × ${t.qty}</span><span class="line-sub">${money(t.price * t.qty)}</span></div><span class="status s-${t.status}">${STATUS[t.status]}</span></div>`).join('');
  $('statusTotal').textContent = money(list.reduce((s, t) => s + t.price * t.qty, 0));
}
$('statusBanner').addEventListener('click', () => { renderStatus(); $('statusDlg').showModal(); });

/* ---------- Gọi nhân viên ---------- */
function renderCalls() {
  const pending = calls.filter((c) => c.table === tableId).map((c) => c.type);
  $('callList').innerHTML = CALLS.map((c) => pending.includes(c)
    ? `<button type="button" class="call-btn sent" disabled>${esc(c)}<small>Đã báo, nhân viên đang tới</small></button>`
    : `<button type="button" class="call-btn" data-call="${esc(c)}">${esc(c)}</button>`).join('');
  $('bellBtn').classList.toggle('ringing', pending.length > 0);
}
$('bellBtn').addEventListener('click', () => { renderCalls(); $('callDlg').showModal(); });
$('callList').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-call]'); if (!b) return;
  b.disabled = true;
  try {
    await store.addCall({ table: table.id, tableName: table.name, type: b.dataset.call, createdAt: Date.now() });
    $('callDlg').close();
    toast('Đã báo nhân viên, quý khách vui lòng chờ trong giây lát.');
  } catch (err) { console.error(err); b.disabled = false; toast('Chưa gửi được, quý khách thử lại nhé.', true); }
});

/* ---------- Sự kiện chung ---------- */
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-add]'); if (a) { change(a.dataset.add, 1); return; }
  const s = e.target.closest('[data-sub]'); if (s) { change(s.dataset.sub, -1); return; }
  const t = e.target.closest('[data-tab]');
  if (t) { tab = t.dataset.tab; renderTabs(); renderContent(); window.scrollTo({ top: 0 }); t.scrollIntoView({ inline: 'center', block: 'nearest' }); return; }
  const c = e.target.closest('[data-close]'); if (c) c.closest('dialog').close();
});

store.onConfig((c) => { config = c; render(); renderStatus(); });
store.onMenu((m) => {
  MENU = m; menuLoaded = true;
  // Giữ giỏ hàng khi quản lý sửa thực đơn: dò lại món theo tên
  if (menuKey && cart.size) {
    const old = [...cart.values()]; cart.clear();
    old.forEach((x) => { const k = findKey([x.name]); if (k && !itemOf(k).out) cart.set(k, { ...x, key: k, price: parsePrice(itemOf(k).price) }); });
  }
  if (config) { render(); renderStatus(); }
});
store.onTickets((t) => { tickets = t; renderStatus(); });
store.onCalls((c) => { calls = c; if ($('callDlg').open) renderCalls(); else $('bellBtn').classList.toggle('ringing', c.some((x) => x.table === tableId)); });
