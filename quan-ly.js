import { initStore, mode } from './store.js';
import { ALL_CATS } from './menu-data.js';
import { $, esc, money, STATUS, clock, toast, showFatal } from './common.js';

let store;
try { store = await initStore(); } catch (e) { showFatal(e); throw e; }

let config = null;
let tickets = [];
let editMode = false;
let openId = null;
let drag = null;
let justDragged = false;
let tab = 'so-do';
let calls = [];

$('modeBadge').textContent = mode === 'firebase' ? 'Đang đồng bộ thật' : 'Chế độ demo';
$('modeBadge').classList.toggle('live', mode === 'firebase');
$('modeText').textContent = mode === 'firebase'
  ? 'Đang dùng Firebase: mọi thiết bị (điện thoại khách, máy bếp, máy thu ngân) đồng bộ tức thì.'
  : 'Chế độ demo: dữ liệu lưu trong trình duyệt này, chỉ đồng bộ giữa các tab trên cùng máy. Muốn điện thoại khách gửi order tới máy bếp, hãy cấu hình Firebase (xem README).';

const byTable = (id) => tickets.filter((t) => t.table === id);
function tableState(id) {
  const ts = byTable(id);
  if (!ts.length) return 'trong';
  if (ts.some((t) => t.status === 'xong')) return 'xong';
  if (ts.some((t) => t.status === 'moi' || t.status === 'dang')) return 'cho';
  return 'du';
}
const sumOf = (ts) => ts.reduce((s, t) => s + (t.price || 0) * t.qty, 0);

/* ---------- Tabs ---------- */
$('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  tab = b.dataset.tab;
  document.querySelectorAll('#tabs [data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
  ['so-do', 'qr', 'phan-cong', 'cai-dat'].forEach((t) => { $('tab-' + t).hidden = t !== tab; });
  renderTab();
});
function renderTab() {
  if (!config) return;
  if (tab === 'so-do') renderFloor();
  if (tab === 'qr') renderQR();
  if (tab === 'phan-cong') renderAssign();
  if (tab === 'cai-dat') renderSettings();
}

/* ---------- Sơ đồ ---------- */
function renderSummary() {
  const busy = config.tables.filter((t) => byTable(t.id).length).length;
  const waiting = tickets.filter((t) => t.status === 'moi' || t.status === 'dang').reduce((s, t) => s + t.qty, 0);
  const ready = tickets.filter((t) => t.status === 'xong').reduce((s, t) => s + t.qty, 0);
  $('summary').innerHTML = `
    <div><b>${busy}/${config.tables.length}</b>bàn có khách</div>
    <div><b>${waiting}</b>món đang chờ / đang làm</div>
    <div><b>${ready}</b>món xong chờ mang ra</div>
    <div><b>${money(sumOf(tickets))}</b>tạm tính chưa thanh toán</div>`;
}
function renderFloor() {
  renderSummary();
  if (drag) return;
  const floor = $('floor');
  floor.classList.toggle('editing', editMode);
  floor.innerHTML = config.tables.map((t) => {
    const ts = byTable(t.id);
    const pending = ts.filter((x) => x.status !== 'phucvu').reduce((s, x) => s + x.qty, 0);
    const total = sumOf(ts);
    const sub = !ts.length ? t.seats + ' chỗ' : pending ? pending + ' món chưa lên' : 'Đủ món';
    const call = calls.some((c) => c.table === t.id);
    return `<button type="button" class="tbl st-${tableState(t.id)} ${t.seats > 4 ? 'big' : ''}" data-id="${esc(t.id)}" style="left:${t.x}%;top:${t.y}%" aria-label="${esc(t.name)}, ${esc(sub)}">
      <span class="tbl-name">${esc(t.name)}</span>${call ? '<span class="tbl-call">Đang gọi</span>' : ''}<span class="tbl-sub">${esc(sub)}</span>${total ? `<span class="tbl-total">${money(total)}</span>` : ''}</button>`;
  }).join('');
  $('floorHint').textContent = editMode
    ? 'Đang chỉnh sơ đồ: kéo thả bàn tới vị trí thật (hoặc chọn bàn rồi dùng phím mũi tên). Bấm "Xong" để lưu.'
    : 'Bấm vào bàn để xem món đã gọi, thanh toán hoặc đổi tên bàn.';
}
$('editBtn').addEventListener('click', () => {
  editMode = !editMode;
  $('editBtn').setAttribute('aria-pressed', String(editMode));
  $('editBtn').textContent = editMode ? 'Xong' : 'Chỉnh sơ đồ';
  renderFloor();
});
$('addTableBtn').addEventListener('click', async () => {
  const nums = config.tables.map((t) => parseInt(String(t.id).replace(/\D/g, ''), 10) || 0);
  const n = Math.max(0, ...nums) + 1;
  const tables = [...config.tables, { id: 'B' + n, name: 'Bàn ' + n, seats: 4, x: 50, y: 50 }];
  await store.saveConfig({ tables });
  toast('Đã thêm Bàn ' + n + ' vào giữa sơ đồ. Bật "Chỉnh sơ đồ" để kéo tới đúng chỗ.');
});

const floor = $('floor');
floor.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.tbl'); if (!b || !editMode) return;
  drag = { id: b.dataset.id, el: b, moved: false };
  b.setPointerCapture(e.pointerId);
});
floor.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = floor.getBoundingClientRect();
  drag.x = Math.min(95, Math.max(5, ((e.clientX - r.left) / r.width) * 100));
  drag.y = Math.min(92, Math.max(8, ((e.clientY - r.top) / r.height) * 100));
  drag.el.style.left = drag.x + '%';
  drag.el.style.top = drag.y + '%';
  drag.moved = true;
});
async function endDrag() {
  if (!drag) return;
  const d = drag; drag = null;
  if (!d.moved) return;
  justDragged = true; setTimeout(() => { justDragged = false; }, 0);
  await moveTable(d.id, d.x, d.y);
}
floor.addEventListener('pointerup', endDrag);
floor.addEventListener('pointercancel', endDrag);
async function moveTable(id, x, y) {
  const tables = config.tables.map((t) => (t.id === id ? { ...t, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } : t));
  await store.saveConfig({ tables });
}
floor.addEventListener('keydown', async (e) => {
  const b = e.target.closest('.tbl'); if (!b || !editMode) return;
  const d = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }[e.key];
  if (!d) return;
  e.preventDefault();
  const t = config.tables.find((x) => x.id === b.dataset.id);
  await moveTable(t.id, Math.min(95, Math.max(5, t.x + d[0])), Math.min(92, Math.max(8, t.y + d[1])));
  const again = floor.querySelector(`[data-id="${CSS.escape(t.id)}"]`); if (again) again.focus();
});
floor.addEventListener('click', (e) => {
  const b = e.target.closest('.tbl'); if (!b || justDragged) return;
  openTable(b.dataset.id);
});

/* ---------- Dialog bàn ---------- */
const dlg = $('tableDlg');
$('dlgClose').addEventListener('click', () => dlg.close());
dlg.addEventListener('close', () => { openId = null; });
function openTable(id) { openId = id; renderDialog(); if (!dlg.open) dlg.showModal(); }
function renderDialog() {
  if (!openId || !config) return;
  const t = config.tables.find((x) => x.id === openId);
  if (!t) { dlg.close(); return; }
  const ts = byTable(t.id).sort((a, b) => a.createdAt - b.createdAt);
  const orderUrl = 'order.html?ban=' + encodeURIComponent(t.id);
  const tCalls = calls.filter((c) => c.table === t.id);
  $('dlgTitle').textContent = t.name;
  $('dlgBody').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px">
      ${tCalls.map((c) => `<div class="call-card"><b>${esc(c.type)}</b><span>${clock(c.createdAt)}</span><button type="button" class="btn btn-outline btn-sm" data-resolve="${esc(c.id)}">Đã xử lý</button></div>`).join('')}
      ${ts.length ? `<div class="lines">${ts.map((x) => `
        <div class="line"><div class="line-main"><span>${esc(x.name)} × ${x.qty}</span><span class="line-sub">${clock(x.createdAt)} · ${money(x.price * x.qty)}${x.note ? ' · ' + esc(x.note) : ''}</span></div>
        <span class="status s-${x.status}">${STATUS[x.status]}</span></div>`).join('')}</div>
        <div class="total"><span>Tạm tính</span><b>${money(sumOf(ts))}</b></div>`
      : '<p class="hint" style="margin:0">Bàn đang trống.</p>'}
      <div class="actions">
        <a class="btn btn-outline btn-sm" href="${orderUrl}" target="_blank">Gọi món giúp khách</a>
        ${ts.length ? '<button type="button" class="btn btn-gold btn-sm" id="payBtn">Thanh toán & dọn bàn</button>' : ''}
      </div>
      <details>
        <summary style="cursor:pointer;color:var(--muted);font-size:14px">Đổi tên / số chỗ / xóa bàn</summary>
        <div class="row" style="margin-top:12px">
          <label class="f" style="flex:1 1 180px">Tên bàn<input id="tName" value="${esc(t.name)}"></label>
          <label class="f">Số chỗ<select id="tSeats">${[2, 4, 6, 8, 10].map((n) => `<option ${n === t.seats ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <button type="button" class="btn btn-outline btn-sm" id="saveTblBtn">Lưu</button>
        </div>
        <p class="hint" style="margin:10px 0">Mã bàn trong QR: <b>${esc(t.id)}</b> (không đổi khi đổi tên, nên không cần in lại QR).</p>
        <button type="button" class="btn btn-danger btn-sm" id="delTblBtn" ${ts.length ? 'disabled title="Thanh toán trước khi xóa bàn"' : ''}>Xóa bàn này</button>
      </details>
    </div>`;
  $('dlgBody').querySelectorAll('[data-resolve]').forEach((b) => { b.onclick = () => { b.disabled = true; store.resolveCall(b.dataset.resolve); }; });
  const pay = $('payBtn');
  if (pay) pay.onclick = async () => {
    if (!confirm(`Xác nhận ${t.name} đã thanh toán ${money(sumOf(ts))}? Order của bàn sẽ được dọn.`)) return;
    await store.payTable(t.id);
    toast(t.name + ' đã thanh toán, bàn sẵn sàng đón khách mới.');
    dlg.close();
  };
  $('saveTblBtn').onclick = async () => {
    const name = $('tName').value.trim() || t.name;
    const seats = Number($('tSeats').value);
    await store.saveConfig({ tables: config.tables.map((x) => (x.id === t.id ? { ...x, name, seats } : x)) });
    toast('Đã lưu ' + name + '.');
  };
  $('delTblBtn').onclick = async () => {
    if (!confirm('Xóa ' + t.name + ' khỏi sơ đồ? Mã QR của bàn này sẽ không dùng được nữa.')) return;
    await store.saveConfig({ tables: config.tables.filter((x) => x.id !== t.id) });
    dlg.close();
  };
}

/* ---------- QR ---------- */
const defaultBase = () => new URL('order.html', location.href).href.split('?')[0];
$('baseUrl').value = defaultBase();
$('baseUrl').addEventListener('change', renderQR);
function renderQR() {
  const base = ($('baseUrl').value.trim() || defaultBase()).split('?')[0];
  $('qrGrid').innerHTML = config.tables.map((t) => {
    const url = base + '?ban=' + encodeURIComponent(t.id);
    return `<div class="qr-card"><div class="qr-brand">Phúc Tâm</div><div class="qr-box" data-url="${esc(url)}"></div>
      <div class="qr-table">${esc(t.name)}</div><div class="qr-hint">Quét mã để xem menu & gọi món</div>
      <a class="qr-link" href="${esc(url)}" target="_blank">Mở thử trang gọi món</a></div>`;
  }).join('');
  $('qrGrid').querySelectorAll('.qr-box').forEach((b) => {
    if (window.QRCode) new window.QRCode(b, { text: b.dataset.url, width: 168, height: 168, correctLevel: window.QRCode.CorrectLevel.M });
    else b.textContent = 'Chưa tải được thư viện QR, kiểm tra mạng.';
  });
}
$('printBtn').addEventListener('click', () => {
  document.body.classList.add('print-qr');
  window.print();
});
window.addEventListener('afterprint', () => document.body.classList.remove('print-qr'));

/* ---------- Phân công ---------- */
function renderAssign() {
  $('stations').innerHTML = config.stations.map((s) => `
    <div class="st-row">
      <input value="${esc(s.name)}" data-st="${esc(s.id)}" aria-label="Tên trạm">
      <a class="btn btn-outline btn-sm" href="bep.html?tram=${encodeURIComponent(s.id)}" target="_blank">Mở màn hình trạm</a>
      <button type="button" class="btn btn-danger btn-sm" data-del="${esc(s.id)}" ${config.stations.length < 2 ? 'disabled' : ''}>Xóa</button>
    </div>`).join('');
  $('mapGrid').innerHTML = ALL_CATS.map((c) => {
    const cur = config.catStation[c] && config.stations.some((s) => s.id === config.catStation[c]) ? config.catStation[c] : config.stations[0].id;
    return `<label class="map-row"><span>${esc(c)}</span><select data-cat="${esc(c)}">${config.stations.map((s) => `<option value="${esc(s.id)}" ${s.id === cur ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>`;
  }).join('');
}
$('stations').addEventListener('change', async (e) => {
  const i = e.target.closest('[data-st]'); if (!i) return;
  const name = i.value.trim(); if (!name) { renderAssign(); return; }
  await store.saveConfig({ stations: config.stations.map((s) => (s.id === i.dataset.st ? { ...s, name } : s)) });
  toast('Đã đổi tên trạm.');
});
$('stations').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-del]'); if (!b) return;
  const id = b.dataset.del;
  const st = config.stations.find((s) => s.id === id);
  if (!confirm('Xóa trạm "' + st.name + '"? Các nhóm món của trạm này sẽ chuyển sang trạm đầu tiên còn lại.')) return;
  const stations = config.stations.filter((s) => s.id !== id);
  const catStation = { ...config.catStation };
  Object.keys(catStation).forEach((c) => { if (catStation[c] === id) catStation[c] = stations[0].id; });
  await store.saveConfig({ stations, catStation });
});
$('addStationBtn').addEventListener('click', async () => {
  const stations = [...config.stations, { id: 's' + Date.now().toString(36), name: 'Trạm mới ' + (config.stations.length + 1) }];
  await store.saveConfig({ stations });
});
$('mapGrid').addEventListener('change', async (e) => {
  const s = e.target.closest('[data-cat]'); if (!s) return;
  await store.saveConfig({ catStation: { ...config.catStation, [s.dataset.cat]: s.value } });
  toast('Nhóm "' + s.dataset.cat + '" giờ chuyển tới ' + s.selectedOptions[0].textContent + '.');
});

/* ---------- Cài đặt ---------- */
function renderSettings() {
  document.querySelectorAll('input[name="menu"]').forEach((r) => { r.checked = r.value === config.activeMenu; });
}
document.querySelectorAll('input[name="menu"]').forEach((r) => r.addEventListener('change', async () => {
  await store.saveConfig({ activeMenu: r.value });
  toast(r.value === 'chay' ? 'Khách quét QR sẽ thấy thực đơn ngày chay.' : 'Khách quét QR sẽ thấy thực đơn ngày thường.');
}));
$('resetBtn').addEventListener('click', async () => {
  if (!confirm('Xóa toàn bộ order đang có và đưa sơ đồ, phân công về mặc định?')) return;
  await store.resetAll();
  toast('Đã khôi phục mặc định.');
});

/* ---------- Dữ liệu realtime ---------- */
store.onConfig((c) => { config = c; renderTab(); renderDialog(); });
store.onCalls((c) => { calls = c; if (tab === 'so-do' && config) renderFloor(); renderDialog(); });
store.onTickets((t) => { tickets = t; if (tab === 'so-do' && config) renderFloor(); renderDialog(); });
