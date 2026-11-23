import { initStore, mode } from './store.js';
import { $, esc, money, STATUS, clock, toast, showFatal, beep, BANKS, vietQR, fmtDate, dayKey, DSTATUS, minutesAgo } from './common.js';
import { billLines, printBill } from './ql-bill.js';
import { initMenuEditor } from './ql-menu.js';
import { initReport } from './ql-report.js';

let store;
try { store = await initStore(); } catch (e) { showFatal(e); throw e; }

const S = { config: null, menu: null, tickets: [], calls: [], bookings: [], deliveries: [] };
let firstDv = true; const seenDv = new Set(); const seenPaid = new Set();
let tab = 'so-do', editMode = false, openId = null, payMode = false, drag = null, justDragged = false, soundOn = false;
let firstBook = true; const seenBook = new Set();

$('modeBadge').textContent = mode === 'firebase' ? 'Đang đồng bộ thật' : 'Chế độ demo';
$('modeBadge').classList.toggle('live', mode === 'firebase');
$('modeText').textContent = mode === 'firebase'
  ? 'Đang dùng Firebase: mọi thiết bị đồng bộ tức thì.'
  : 'Chế độ demo: dữ liệu lưu trong trình duyệt này. Cấu hình Firebase để dùng trên nhiều thiết bị.';
$('soundBtn').addEventListener('click', () => {
  soundOn = !soundOn; $('soundBtn').setAttribute('aria-pressed', String(soundOn));
  $('soundBtn').textContent = soundOn ? 'Âm báo: Bật' : 'Bật âm báo'; if (soundOn) beep();
});
document.addEventListener('click', (e) => { const c = e.target.closest('[data-close]'); if (c) c.closest('dialog').close(); });

const byTable = (id) => S.tickets.filter((t) => t.table === id);
const sumOf = (ts) => ts.reduce((s, t) => s + (t.price || 0) * t.qty, 0);
function tableState(id) {
  const ts = byTable(id);
  if (!ts.length) return 'trong';
  if (ts.some((t) => t.status === 'xong')) return 'xong';
  if (ts.some((t) => t.status === 'moi' || t.status === 'dang')) return 'cho';
  return 'du';
}

/* ---------------- Tabs ---------------- */
const TABS = ['so-do', 'dat-ban', 'giao-hang', 'thuc-don', 'bao-cao', 'qr', 'phan-cong', 'cai-dat'];
$('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  tab = b.dataset.tab;
  document.querySelectorAll('#tabs [data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
  TABS.forEach((t) => { $('tab-' + t).hidden = t !== tab; });
  renderTab();
});
function renderTab() {
  if (!S.config) return;
  ({ 'so-do': renderFloor, 'dat-ban': renderBookings, 'giao-hang': renderDeliveries, 'thuc-don': () => menuEd.render(), 'bao-cao': () => report.show(), qr: renderQR, 'phan-cong': renderAssign, 'cai-dat': renderSettings })[tab]();
}

/* ---------------- Sơ đồ ---------------- */
function renderFloor() {
  const busy = S.config.tables.filter((t) => byTable(t.id).length).length;
  const waiting = S.tickets.filter((t) => t.status === 'moi' || t.status === 'dang').reduce((s, t) => s + t.qty, 0);
  const openDv = S.deliveries.filter((d) => d.status !== 'xong' && d.status !== 'huy').length;
  $('summary').innerHTML = `<div><b>${busy}/${S.config.tables.length}</b>bàn có khách</div><div><b>${waiting}</b>món đang chờ / làm</div>
    <div><b>${S.calls.length}</b>yêu cầu gọi nhân viên</div><div><b>${openDv}</b>đơn giao đang xử lý</div><div><b>${money(sumOf(S.tickets.filter((t) => !t.delivery)))}</b>tại bàn chưa thanh toán</div>`;
  $('floorHint').textContent = editMode ? 'Kéo thả bàn tới vị trí thật (hoặc chọn bàn rồi dùng phím mũi tên). Bấm "Xong" để kết thúc.' : 'Bấm vào bàn để xem món, in tạm tính hoặc thanh toán.';
  if (drag) return;
  const floor = $('floor');
  floor.classList.toggle('editing', editMode);
  floor.innerHTML = S.config.tables.map((t) => {
    const ts = byTable(t.id);
    const pending = ts.filter((x) => x.status !== 'phucvu').reduce((s, x) => s + x.qty, 0);
    const total = sumOf(ts);
    const sub = !ts.length ? t.seats + ' chỗ' : pending ? pending + ' món chưa lên' : 'Đủ món';
    const call = S.calls.some((c) => c.table === t.id);
    return `<button type="button" class="tbl st-${tableState(t.id)} ${t.seats > 4 ? 'big' : ''}" data-id="${esc(t.id)}" style="left:${t.x}%;top:${t.y}%" aria-label="${esc(t.name)}, ${esc(sub)}">
      <span class="tbl-name">${esc(t.name)}</span>${call ? '<span class="tbl-call">Đang gọi</span>' : ''}<span class="tbl-sub">${esc(sub)}</span>${total ? `<span class="tbl-total">${money(total)}</span>` : ''}</button>`;
  }).join('');
}
$('editBtn').addEventListener('click', () => {
  editMode = !editMode; $('editBtn').setAttribute('aria-pressed', String(editMode)); $('editBtn').textContent = editMode ? 'Xong' : 'Chỉnh sơ đồ'; renderFloor();
});
$('addTableBtn').addEventListener('click', async () => {
  const n = Math.max(0, ...S.config.tables.map((t) => parseInt(String(t.id).replace(/\D/g, ''), 10) || 0)) + 1;
  await store.saveConfig({ tables: [...S.config.tables, { id: 'B' + n, name: 'Bàn ' + n, seats: 4, x: 50, y: 50 }] });
  toast('Đã thêm Bàn ' + n + '. Bật "Chỉnh sơ đồ" để kéo tới đúng chỗ.');
});
const floor = $('floor');
floor.addEventListener('pointerdown', (e) => { const b = e.target.closest('.tbl'); if (!b || !editMode) return; drag = { id: b.dataset.id, el: b, moved: false }; b.setPointerCapture(e.pointerId); });
floor.addEventListener('pointermove', (e) => {
  if (!drag) return; const r = floor.getBoundingClientRect();
  drag.x = Math.min(95, Math.max(5, ((e.clientX - r.left) / r.width) * 100)); drag.y = Math.min(92, Math.max(8, ((e.clientY - r.top) / r.height) * 100));
  drag.el.style.left = drag.x + '%'; drag.el.style.top = drag.y + '%'; drag.moved = true;
});
const moveTable = (id, x, y) => store.saveConfig({ tables: S.config.tables.map((t) => (t.id === id ? { ...t, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } : t)) });
async function endDrag() { if (!drag) return; const d = drag; drag = null; if (!d.moved) return; justDragged = true; setTimeout(() => { justDragged = false; }, 0); await moveTable(d.id, d.x, d.y); }
floor.addEventListener('pointerup', endDrag); floor.addEventListener('pointercancel', endDrag);
floor.addEventListener('keydown', async (e) => {
  const b = e.target.closest('.tbl'); if (!b || !editMode) return;
  const d = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }[e.key]; if (!d) return;
  e.preventDefault(); const t = S.config.tables.find((x) => x.id === b.dataset.id);
  await moveTable(t.id, Math.min(95, Math.max(5, t.x + d[0])), Math.min(92, Math.max(8, t.y + d[1])));
  const again = floor.querySelector(`[data-id="${CSS.escape(t.id)}"]`); if (again) again.focus();
});
floor.addEventListener('click', (e) => { const b = e.target.closest('.tbl'); if (!b || justDragged) return; openId = b.dataset.id; payMode = false; renderDialog(); $('tableDlg').showModal(); });

/* ---------------- Dialog bàn + Thanh toán ---------------- */
const dlg = $('tableDlg');
dlg.addEventListener('close', () => { openId = null; payMode = false; });
const pay = { method: 'transfer', discount: 0, given: 0 };
function currentBill(t) {
  const ts = byTable(t.id);
  const items = billLines(ts);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = Math.min(subtotal, Math.max(0, pay.discount || 0));
  return { tableId: t.id, tableName: t.name, items, subtotal, discount, total: subtotal - discount };
}
function renderDialog() {
  if (!openId || !S.config) return;
  const t = S.config.tables.find((x) => x.id === openId);
  if (!t) { dlg.close(); return; }
  const ts = byTable(t.id).sort((a, b) => a.createdAt - b.createdAt);
  if (payMode && !ts.length) payMode = false;
  $('dlgTitle').textContent = payMode ? 'Thanh toán · ' + t.name : t.name;
  if (payMode) { renderPay(t); return; }
  const tCalls = S.calls.filter((c) => c.table === t.id);
  $('dlgBody').innerHTML = `<div class="stack">
    ${tCalls.map((c) => `<div class="call-card"><b>${esc(c.type)}</b><span>${clock(c.createdAt)}</span><button type="button" class="btn btn-outline btn-sm" data-resolve="${esc(c.id)}">Đã xử lý</button></div>`).join('')}
    ${ts.length ? `<div class="lines">${ts.map((x) => `<div class="line"><div class="line-main"><span>${esc(x.name)} × ${x.qty}</span><span class="line-sub">${clock(x.createdAt)} · ${money(x.price * x.qty)}${x.note ? ' · ' + esc(x.note) : ''}</span></div><span class="status s-${x.status}">${STATUS[x.status]}</span></div>`).join('')}</div>
      <div class="total"><span>Tạm tính</span><b>${money(sumOf(ts))}</b></div>` : '<p class="hint" style="margin:0">Bàn đang trống.</p>'}
    <div class="actions">
      ${ts.length ? '<button type="button" class="btn btn-gold" id="goPay">Thanh toán</button><button type="button" class="btn btn-outline btn-sm" id="printTmp">In tạm tính</button>' : ''}
      <a class="btn btn-outline btn-sm" href="order.html?ban=${encodeURIComponent(t.id)}" target="_blank">Gọi món giúp khách</a>
    </div>
    <details><summary style="cursor:pointer;color:var(--muted);font-size:14px">Đổi tên / số chỗ / xóa bàn</summary>
      <div class="row" style="margin-top:12px">
        <label class="f" style="flex:1 1 180px">Tên bàn<input id="tName" value="${esc(t.name)}"></label>
        <label class="f">Số chỗ<select id="tSeats">${[2, 4, 6, 8, 10].map((n) => `<option ${n === t.seats ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <button type="button" class="btn btn-outline btn-sm" id="saveTbl">Lưu</button>
      </div>
      <p class="hint" style="margin:10px 0">Mã bàn trong QR: <b>${esc(t.id)}</b> – đổi tên không cần in lại QR.</p>
      <button type="button" class="btn btn-danger btn-sm" id="delTbl" ${ts.length ? 'disabled' : ''}>Xóa bàn này</button>
    </details></div>`;
  $('dlgBody').querySelectorAll('[data-resolve]').forEach((b) => { b.onclick = () => { b.disabled = true; store.resolveCall(b.dataset.resolve); }; });
  if ($('goPay')) $('goPay').onclick = () => { payMode = true; pay.method = 'transfer'; pay.discount = 0; pay.given = 0; renderDialog(); };
  if ($('printTmp')) $('printTmp').onclick = () => { const b = currentBill(t); b.qr = vietQR(S.config.bank, b.total, 'PhucTam ' + t.name); printBill(b, S.config, true); };
  $('saveTbl').onclick = async () => { const name = $('tName').value.trim() || t.name; await store.saveConfig({ tables: S.config.tables.map((x) => (x.id === t.id ? { ...x, name, seats: Number($('tSeats').value) } : x)) }); toast('Đã lưu ' + name + '.'); };
  $('delTbl').onclick = async () => { if (!confirm('Xóa ' + t.name + ' khỏi sơ đồ?')) return; await store.saveConfig({ tables: S.config.tables.filter((x) => x.id !== t.id) }); dlg.close(); };
}
function renderPay(t) {
  const b = currentBill(t);
  const info = 'PhucTam ' + t.name.replace(/\s+/g, '') + ' ' + new Date().toTimeString().slice(0, 5).replace(':', 'h');
  const qr = vietQR(S.config.bank, b.total, info);
  const change = Math.max(0, (pay.given || 0) - b.total);
  const quick = [b.total, ...[100000, 200000, 500000].filter((v) => v > b.total)].slice(0, 4);
  $('dlgBody').innerHTML = `<div class="stack">
    <div class="lines">${b.items.map((i) => `<div class="line"><span>${esc(i.name)} × ${i.qty}</span><span>${money(i.price * i.qty)}</span></div>`).join('')}</div>
    <div class="row"><label class="f" style="flex:1">Giảm giá (đ)<input id="pDiscount" type="number" min="0" step="1000" value="${pay.discount || ''}" placeholder="0"></label></div>
    <div class="pay-total"><span>Khách cần trả</span><b>${money(b.total)}</b></div>
    <div class="seg pay-seg" role="group" aria-label="Hình thức thanh toán">
      <button type="button" data-m="transfer" aria-pressed="${pay.method === 'transfer'}">Chuyển khoản</button>
      <button type="button" data-m="cash" aria-pressed="${pay.method === 'cash'}">Tiền mặt</button>
    </div>
    ${pay.method === 'transfer' ? (qr ? `<div class="qr-pay"><img src="${esc(qr)}" alt="Mã VietQR ${money(b.total)}"><p>Đưa khách quét mã. Kiểm tra app ngân hàng báo nhận <b>${money(b.total)}</b> rồi bấm xác nhận.</p></div>`
      : '<p class="hint">Chưa cài tài khoản nhận tiền. Vào tab Cài đặt → Tài khoản nhận chuyển khoản.</p>')
      : `<div class="stack"><label class="f">Khách đưa (đ)<input id="pGiven" type="number" min="0" step="1000" value="${pay.given || ''}" placeholder="${b.total}"></label>
        <div class="chips">${quick.map((v) => `<button type="button" class="chip" data-given="${v}">${money(v)}</button>`).join('')}</div>
        <div class="pay-total small"><span>Tiền thối</span><b>${money(change)}</b></div></div>`}
    <div class="actions">
      <button type="button" class="btn btn-gold" id="pDonePrint">${pay.method === 'cash' ? 'Đã thu tiền' : 'Đã nhận chuyển khoản'} & in bill</button>
      <button type="button" class="btn btn-outline" id="pDone">Xác nhận, không in</button>
      <button type="button" class="btn btn-outline btn-sm" id="pBack">← Quay lại</button>
    </div></div>`;
  $('pDiscount').onchange = (e) => { pay.discount = Number(e.target.value) || 0; renderDialog(); };
  $('dlgBody').querySelectorAll('[data-m]').forEach((x) => { x.onclick = () => { pay.method = x.dataset.m; renderDialog(); }; });
  if ($('pGiven')) $('pGiven').oninput = (e) => { pay.given = Number(e.target.value) || 0; const c = Math.max(0, pay.given - b.total); $('dlgBody').querySelector('.pay-total.small b').textContent = money(c); };
  $('dlgBody').querySelectorAll('[data-given]').forEach((x) => { x.onclick = () => { pay.given = Number(x.dataset.given); renderDialog(); }; });
  $('pBack').onclick = () => { payMode = false; renderDialog(); };
  const finish = async (doPrint) => {
    if (pay.method === 'cash' && pay.given && pay.given < b.total) { toast('Tiền khách đưa chưa đủ.', true); return; }
    const now = Date.now();
    const bill = {
      no: 'HD' + dayKey().replace(/-/g, '').slice(2) + '-' + String(now).slice(-5),
      table: t.id, tableName: t.name, items: b.items, subtotal: b.subtotal, discount: b.discount, total: b.total,
      method: pay.method, cashGiven: pay.method === 'cash' ? (pay.given || b.total) : 0,
      change: pay.method === 'cash' ? Math.max(0, (pay.given || b.total) - b.total) : 0, paidAt: now
    };
    try {
      await store.checkout(t.id, bill);
      dlg.close();
      toast(`${t.name} đã thanh toán ${money(bill.total)} (${bill.method === 'cash' ? 'tiền mặt' : 'chuyển khoản'}).`);
      if (doPrint) printBill(bill, S.config, false);
    } catch (e) { console.error(e); toast('Lưu thanh toán chưa được, thử lại.', true); }
  };
  $('pDonePrint').onclick = () => finish(true);
  $('pDone').onclick = () => finish(false);
}

/* ---------------- Đặt bàn ---------------- */
const BST = { moi: ['Mới – chưa gọi', 's-xong'], xacnhan: ['Đã xác nhận', 's-dang'], den: ['Khách đã đến', 's-phucvu'], huy: ['Đã hủy', 's-moi'] };
function renderBookings() {
  const list = S.bookings;
  const n = list.filter((b) => b.status === 'moi').length;
  $('bookCount').hidden = !n; $('bookCount').textContent = n;
  if (tab !== 'dat-ban') return;
  if (!list.length) { $('bookList').innerHTML = '<div class="panel"><p class="empty">Chưa có lịch đặt bàn sắp tới.</p></div>'; return; }
  const days = {};
  list.forEach((b) => { (days[b.date] = days[b.date] || []).push(b); });
  $('bookList').innerHTML = Object.keys(days).sort().map((d) => `<div class="panel"><h2>${d === dayKey() ? 'Hôm nay' : fmtDate(new Date(d + 'T00:00'))} · ${days[d].filter((b) => b.status !== 'huy').reduce((s, b) => s + (b.guests || 0), 0)} khách</h2>
    ${days[d].map((b) => `<div class="book-row ${b.status === 'huy' ? 'cancel' : ''}">
      <div class="book-time">${esc(b.time)}</div>
      <div class="book-main"><b>${esc(b.name)}</b> · ${b.guests} khách · <a href="tel:${esc(b.phone)}">${esc(b.phone)}</a>${b.note ? `<div class="line-sub">${esc(b.note)}</div>` : ''}</div>
      <span class="status ${BST[b.status][1]}">${BST[b.status][0]}</span>
      <div class="actions">
        ${b.status === 'moi' ? `<button class="btn btn-gold btn-sm" data-bk="${b.id}" data-st="xacnhan">Xác nhận</button>` : ''}
        ${b.status === 'xacnhan' ? `<button class="btn btn-outline btn-sm" data-bk="${b.id}" data-st="den">Khách đã đến</button>` : ''}
        ${b.status !== 'huy' && b.status !== 'den' ? `<button class="btn btn-danger btn-sm" data-bk="${b.id}" data-st="huy">Hủy</button>` : ''}
      </div></div>`).join('')}</div>`).join('');
}
$('bookList').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-bk]'); if (!b) return;
  b.disabled = true; await store.updateBooking(b.dataset.bk, { status: b.dataset.st, ['at_' + b.dataset.st]: Date.now() });
});
function bookingPopup(list) {
  $('bookTitle').textContent = list.length > 1 ? list.length + ' yêu cầu đặt bàn mới' : 'Đặt bàn mới từ website';
  $('bookBody').innerHTML = `<div class="stack">${list.map((b) => `<div class="pop-group"><h3>${esc(b.name)}<span>${esc(b.time)} · ${b.date.split('-').reverse().join('/')}</span></h3>
    <div>${b.guests} khách · <a href="tel:${esc(b.phone)}">${esc(b.phone)}</a></div>${b.note ? `<div class="line-sub">${esc(b.note)}</div>` : ''}
    <div class="actions" style="margin-top:8px"><a class="btn btn-outline btn-sm" href="tel:${esc(b.phone)}">Gọi khách</a><button class="btn btn-gold btn-sm" data-bkp="${b.id}">Đã gọi – Xác nhận</button></div></div>`).join('')}
    <button class="btn btn-outline" data-close>Để sau</button></div>`;
  $('bookBody').querySelectorAll('[data-bkp]').forEach((x) => { x.onclick = async () => { x.disabled = true; await store.updateBooking(x.dataset.bkp, { status: 'xacnhan', at_xacnhan: Date.now() }); x.textContent = 'Đã xác nhận'; }; });
  if (!$('bookDlg').open) $('bookDlg').showModal();
  if (soundOn) beep();
}
$('addBookingBtn').addEventListener('click', () => {
  $('bookTitle').textContent = 'Thêm đặt bàn';
  $('bookBody').innerHTML = `<div class="stack"><div class="row">
    <label class="f" style="flex:1 1 200px">Tên khách<input id="nbName"></label><label class="f">Số điện thoại<input id="nbPhone" type="tel"></label></div>
    <div class="row"><label class="f">Ngày<input id="nbDate" type="date" value="${dayKey()}"></label><label class="f">Giờ<input id="nbTime" type="time" value="18:30"></label><label class="f">Số khách<input id="nbGuests" type="number" min="1" value="4" style="width:100px"></label></div>
    <label class="f">Ghi chú<input id="nbNote"></label><button class="btn btn-gold" id="nbSave">Lưu đặt bàn</button></div>`;
  $('nbSave').onclick = async () => {
    const name = $('nbName').value.trim(); if (!name) { toast('Nhập tên khách.', true); return; }
    await store.addBooking({ name, phone: $('nbPhone').value.trim(), date: $('nbDate').value, time: $('nbTime').value, guests: Number($('nbGuests').value) || 1, note: $('nbNote').value.trim(), status: 'xacnhan', createdAt: Date.now(), source: 'phone' });
    seenBook.add('__manual'); $('bookDlg').close(); toast('Đã thêm đặt bàn.');
  };
  $('bookDlg').showModal();
});

/* ---------------- QR ---------------- */
const defaultBase = () => new URL('order.html', location.href).href.split('?')[0];
$('baseUrl').value = defaultBase();
$('baseUrl').addEventListener('change', renderQR);
function renderQR() {
  const base = ($('baseUrl').value.trim() || defaultBase()).split('?')[0];
  $('qrGrid').innerHTML = S.config.tables.map((t) => { const url = base + '?ban=' + encodeURIComponent(t.id); return `<div class="qr-card"><div class="qr-brand">Phúc Tâm</div><div class="qr-box" data-url="${esc(url)}"></div><div class="qr-table">${esc(t.name)}</div><div class="qr-hint">Quét mã để xem menu & gọi món</div><a class="qr-link" href="${esc(url)}" target="_blank">Mở thử</a></div>`; }).join('');
  $('qrGrid').querySelectorAll('.qr-box').forEach((b) => { if (window.QRCode) new window.QRCode(b, { text: b.dataset.url, width: 168, height: 168, correctLevel: window.QRCode.CorrectLevel.M }); else b.textContent = 'Chưa tải được thư viện QR.'; });
}
$('printQrBtn').addEventListener('click', () => { document.body.classList.add('print-qr'); window.print(); });
window.addEventListener('afterprint', () => document.body.classList.remove('print-qr'));

/* ---------------- Phân công ---------------- */
const menuCats = () => [...new Set(Object.values(S.menu || {}).flatMap((m) => (m.cats || []).map((c) => c.label)))];
function renderAssign() {
  $('stations').innerHTML = S.config.stations.map((s) => `<div class="st-row"><input value="${esc(s.name)}" data-st="${esc(s.id)}" aria-label="Tên trạm">
    <a class="btn btn-outline btn-sm" href="bep.html?tram=${encodeURIComponent(s.id)}" target="_blank">Mở màn hình trạm</a>
    <button type="button" class="btn btn-danger btn-sm" data-del="${esc(s.id)}" ${S.config.stations.length < 2 ? 'disabled' : ''}>Xóa</button></div>`).join('');
  $('mapGrid').innerHTML = menuCats().map((c) => {
    const cur = S.config.stations.some((s) => s.id === S.config.catStation[c]) ? S.config.catStation[c] : S.config.stations[0].id;
    return `<label class="map-row"><span>${esc(c)}</span><select data-cat="${esc(c)}">${S.config.stations.map((s) => `<option value="${esc(s.id)}" ${s.id === cur ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>`;
  }).join('');
}
$('stations').addEventListener('change', async (e) => { const i = e.target.closest('[data-st]'); if (!i || !i.value.trim()) return; await store.saveConfig({ stations: S.config.stations.map((s) => (s.id === i.dataset.st ? { ...s, name: i.value.trim() } : s)) }); toast('Đã đổi tên trạm.'); });
$('stations').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-del]'); if (!b) return;
  if (!confirm('Xóa trạm này? Các nhóm món sẽ chuyển sang trạm đầu tiên còn lại.')) return;
  const stations = S.config.stations.filter((s) => s.id !== b.dataset.del);
  const catStation = { ...S.config.catStation }; Object.keys(catStation).forEach((c) => { if (catStation[c] === b.dataset.del) catStation[c] = stations[0].id; });
  await store.saveConfig({ stations, catStation });
});
$('addStationBtn').addEventListener('click', () => store.saveConfig({ stations: [...S.config.stations, { id: 's' + Date.now().toString(36), name: 'Trạm mới ' + (S.config.stations.length + 1) }] }));
$('mapGrid').addEventListener('change', async (e) => { const s = e.target.closest('[data-cat]'); if (!s) return; await store.saveConfig({ catStation: { ...S.config.catStation, [s.dataset.cat]: s.value } }); toast('Đã chuyển nhóm "' + s.dataset.cat + '".'); });

/* ---------------- Cài đặt ---------------- */
$('bankBin').innerHTML = '<option value="">– Chọn ngân hàng –</option>' + BANKS.map(([b, n]) => `<option value="${b}">${n}</option>`).join('');
function renderSettings() {
  document.querySelectorAll('input[name="menu"]').forEach((r) => { r.checked = r.value === S.config.activeMenu; });
  const bk = S.config.bank || {};
  $('bankBin').value = bk.bin || ''; $('bankAcc').value = bk.account || ''; $('bankName').value = bk.name || '';
  const qr = vietQR(bk, 10000, 'Test PhucTam');
  $('bankPreview').innerHTML = qr ? `<p class="hint">Mã thử 10.000đ – quét bằng app ngân hàng để kiểm tra đúng tên tài khoản:</p><img src="${esc(qr)}" alt="Mã QR thử" style="width:180px;background:#fff;border-radius:12px;padding:6px">` : '';
  const bl = S.config.bill || {};
  $('billAddr').value = bl.addr || 'Số 12 Lô C1, CC Tân Vĩnh, P. Khánh Hội, Q.4, TP.HCM';
  $('billPhone').value = bl.phone || '035 844 9199';
  $('billThanks').value = bl.thanks || 'Cảm ơn quý khách – Hữu Tâm Ắt Thành Tựu!';
  $('paperSize').value = S.config.paper || '80';
  const dv = S.config.delivery;
  $('dvEnabled').checked = !!dv.enabled; $('dvMin').value = dv.minOrder; $('dvPrep').value = dv.prepMin; $('dvPay').value = dv.payMinutes;
  $('dvAreas').value = dv.areas.map((a) => a.name + ' | ' + a.fee).join('\n');
}
$('dvSave').addEventListener('click', async () => {
  const areas = $('dvAreas').value.split('\n').map((l) => l.split('|')).filter((p) => p[0].trim()).map((p) => ({ name: p[0].trim(), fee: Number(String(p[1] || '0').replace(/\D/g, '')) || 0 }));
  if (!areas.length) { toast('Cần ít nhất 1 khu vực giao.', true); return; }
  await store.saveConfig({ delivery: { enabled: $('dvEnabled').checked, minOrder: Number($('dvMin').value) || 0, prepMin: Number($('dvPrep').value) || 30, payMinutes: Number($('dvPay').value) || 15, areas } });
  toast('Đã lưu cài đặt giao hàng.');
});
document.querySelectorAll('input[name="menu"]').forEach((r) => r.addEventListener('change', async () => { await store.saveConfig({ activeMenu: r.value }); toast(r.value === 'chay' ? 'Đã chuyển sang thực đơn ngày chay.' : 'Đã chuyển sang thực đơn ngày thường.'); }));
$('bankSave').addEventListener('click', async () => { await store.saveConfig({ bank: { bin: $('bankBin').value, account: $('bankAcc').value.trim(), name: $('bankName').value.trim().toUpperCase() } }); toast('Đã lưu tài khoản nhận tiền.'); });
$('billSave').addEventListener('click', async () => { await store.saveConfig({ bill: { addr: $('billAddr').value.trim(), phone: $('billPhone').value.trim(), thanks: $('billThanks').value.trim() } }); toast('Đã lưu thông tin bill.'); });
$('paperSize').addEventListener('change', (e) => store.saveConfig({ paper: e.target.value }));
$('resetBtn').addEventListener('click', async () => { if (!confirm('Xóa toàn bộ order đang mở và đưa sơ đồ, phân công về mặc định? (Báo cáo và thực đơn giữ nguyên)')) return; await store.resetAll(); toast('Đã khôi phục.'); });

/* ---------------- Giao hàng ---------------- */
const dvTickets = (id) => S.tickets.filter((t) => t.deliveryId === id);
function dvCard(d) {
  const ts = dvTickets(d.id);
  const done = ts.filter((t) => t.status === 'xong' || t.status === 'phucvu').length;
  const age = minutesAgo(d.createdAt);
  const alert = d.status === 'cho_tt' && d.customerPaidAt;
  let act = '';
  if (d.status === 'cho_tt') act = `<button class="btn btn-gold btn-sm" data-dv="${d.id}" data-act="paid">Đã nhận ${money(d.total)} → chuyển bếp</button><button class="btn btn-danger btn-sm" data-dv="${d.id}" data-act="cancel">Hủy</button>`;
  if (d.status === 'bep') act = `<span class="hint" style="margin:0">Bếp: ${done}/${ts.length} món xong</span><button class="btn btn-outline btn-sm" data-dv="${d.id}" data-act="print">In phiếu giao</button><button class="btn btn-danger btn-sm" data-dv="${d.id}" data-act="refund">Hủy & hoàn tiền</button>`;
  if (d.status === 'san_sang') act = `<button class="btn btn-gold btn-sm" data-dv="${d.id}" data-act="ship">Giao cho shipper</button><button class="btn btn-outline btn-sm" data-dv="${d.id}" data-act="print">In phiếu giao</button>`;
  if (d.status === 'dang_giao') act = `<button class="btn btn-gold btn-sm" data-dv="${d.id}" data-act="done">Đã giao xong</button>`;
  return `<article class="dv ${alert ? 'alert' : ''}">
    <div class="dv-top"><b>#${esc(d.code)}</b><span class="hint" style="margin:0">${clock(d.createdAt)} · ${age} phút</span></div>
    ${alert ? '<span class="status s-xong" style="align-self:flex-start">Khách báo đã chuyển khoản</span>' : ''}
    <div><b>${esc(d.name)}</b> · <a href="tel:${esc(d.phone)}">${esc(d.phone)}</a></div>
    <div class="line-sub">${esc(d.address)}, ${esc(d.area)} · ${d.when === 'asap' ? 'Giao sớm nhất' : 'Hẹn ' + esc(d.when)}</div>
    <ul class="dv-items">${d.items.map((i) => `<li>${esc(i.name)} × ${i.qty}</li>`).join('')}</ul>
    ${d.note ? `<div class="tk-note">Ghi chú: ${esc(d.note)}</div>` : ''}
    <div class="line-sub">Món ${money(d.subtotal)} + ship ${money(d.fee)} = <b style="color:var(--gold)">${money(d.total)}</b> · ND CK: <b>${esc(d.payInfo)}</b></div>
    ${d.shipper ? `<div class="line-sub">Shipper: ${esc(d.shipper)}</div>` : ''}
    <div class="actions">${act}</div></article>`;
}
function renderDeliveries() {
  const n = S.deliveries.filter((d) => d.status === 'cho_tt').length;
  $('dvCount').hidden = !n; $('dvCount').textContent = n;
  if (tab !== 'giao-hang') return;
  const cols = [['cho_tt', 'Chờ xác nhận tiền'], ['bep', 'Bếp đang làm'], ['san_sang', 'Chờ giao'], ['dang_giao', 'Đang giao']];
  $('dvBoard').innerHTML = cols.map(([st, title]) => { const list = S.deliveries.filter((d) => d.status === st);
    return `<section class="col"><h2><span>${title}</span><span>${list.length}</span></h2>${list.map(dvCard).join('') || '<p class="empty">Không có đơn.</p>'}</section>`; }).join('');
}
function dvBill(d, now) {
  return { no: 'GH' + dayKey().replace(/-/g, '').slice(2) + '-' + d.code, channel: 'delivery', table: 'GH-' + d.code, tableName: 'Giao hàng #' + d.code,
    items: [...d.items, { name: 'Phí giao hàng (' + d.area + ')', cat: 'Phí giao hàng', qty: 1, price: d.fee }],
    subtotal: d.total, discount: 0, total: d.total, method: 'transfer', cashGiven: 0, change: 0, paidAt: now,
    customer: { name: d.name, phone: d.phone, address: d.address + ', ' + d.area, when: d.when, note: d.note || '' } };
}
$('dvBoard').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-dv]'); if (!b) return;
  const d = S.deliveries.find((x) => x.id === b.dataset.dv); if (!d) return;
  const now = Date.now();
  if (b.dataset.act === 'paid') {
    if (!confirm(`Xác nhận đã nhận ${money(d.total)} với nội dung "${d.payInfo}"?`)) return;
    b.disabled = true;
    const tickets = d.items.map((i, k) => ({ orderId: d.id, deliveryId: d.id, delivery: true, table: 'GH-' + d.code, tableName: 'Giao #' + d.code,
      name: i.name, cat: i.cat, qty: i.qty, price: i.price, note: d.note || '',
      station: S.config.stations.some((s) => s.id === S.config.catStation[i.cat]) ? S.config.catStation[i.cat] : S.config.stations[0].id,
      status: 'moi', paid: false, createdAt: now + k }));
    await store.confirmDelivery(d.id, tickets, dvBill(d, now), { status: 'bep', at_bep: now });
    toast('Đơn #' + d.code + ' đã chuyển bếp.');
  }
  if (b.dataset.act === 'cancel') {
    const why = prompt('Lý do hủy (khách sẽ thấy):', 'Chưa nhận được chuyển khoản'); if (why === null) return;
    await store.updateDelivery(d.id, { status: 'huy', open: false, cancelReason: why, at_huy: now });
  }
  if (b.dataset.act === 'refund') {
    const why = prompt('Lý do hủy – nhớ hoàn tiền cho khách ' + money(d.total) + ':', 'Hết món'); if (why === null) return;
    await store.closeDelivery(d.id, { status: 'huy', open: false, cancelReason: why + ' (đã hoàn tiền)', at_huy: now });
    await store.addExpense({ type: 'Hoàn tiền đơn giao', note: '#' + d.code + ' – ' + why, amount: d.total, at: now, createdAt: now });
    toast('Đã hủy đơn và ghi khoản hoàn tiền vào chi phí.');
  }
  if (b.dataset.act === 'ship') {
    const who = prompt('Shipper (tên / SĐT / Grab, Be…):', ''); if (who === null) return;
    await store.updateDelivery(d.id, { status: 'dang_giao', shipper: who.trim(), at_dang_giao: now });
  }
  if (b.dataset.act === 'done') { await store.closeDelivery(d.id, { status: 'xong', open: false, at_xong: now }); toast('Đơn #' + d.code + ' hoàn thành.'); }
  if (b.dataset.act === 'print') printBill(dvBill(d, d.at_bep || now), S.config, false);
});
const autoDone = new Set();
function dvAuto() {
  S.deliveries.filter((d) => d.status === 'bep' && !autoDone.has(d.id)).forEach((d) => {
    const ts = dvTickets(d.id);
    if (ts.length && ts.every((t) => t.status === 'phucvu')) { autoDone.add(d.id); store.updateDelivery(d.id, { status: 'san_sang', at_san_sang: Date.now() }); }
  });
}
function dvPopup(list, title) {
  $('bookTitle').textContent = title;
  $('bookBody').innerHTML = `<div class="stack">${list.map((d) => `<div class="pop-group"><h3>#${esc(d.code)} · ${esc(d.name)}<span>${money(d.total)}</span></h3>
    <div class="line-sub">${esc(d.area)} · ${d.items.reduce((s, i) => s + i.qty, 0)} món · ND CK: <b>${esc(d.payInfo)}</b></div></div>`).join('')}
    <div class="actions"><button class="btn btn-gold" id="goDv">Xem đơn giao hàng</button><button class="btn btn-outline" data-close>Để sau</button></div></div>`;
  $('goDv').onclick = () => { $('bookDlg').close(); document.querySelector('#tabs [data-tab="giao-hang"]').click(); };
  if (!$('bookDlg').open) $('bookDlg').showModal();
  if (soundOn) beep();
}

/* ---------------- Module thực đơn & báo cáo ---------------- */
const menuEd = initMenuEditor({ store, getMenu: () => S.menu });
const report = initReport({ store, getConfig: () => S.config });

/* ---------------- Realtime ---------------- */
store.onConfig((c) => { S.config = c; renderTab(); renderDialog(); });
store.onMenu((m) => { S.menu = m; menuEd.remote(m); if (tab === 'phan-cong' && S.config) renderAssign(); });
store.onTickets((t) => { S.tickets = t; if (tab === 'so-do' && S.config) renderFloor(); renderDialog(); renderDeliveries(); dvAuto(); });
store.onCalls((c) => { S.calls = c; if (tab === 'so-do' && S.config) renderFloor(); if (!payMode) renderDialog(); });
store.onBookings((list) => {
  S.bookings = list;
  if (firstBook) { list.forEach((b) => seenBook.add(b.id)); firstBook = false; }
  else { const fresh = list.filter((b) => !seenBook.has(b.id)); fresh.forEach((b) => seenBook.add(b.id)); const web = fresh.filter((b) => b.status === 'moi'); if (web.length) bookingPopup(web); }
  renderBookings();
});

store.onDeliveries((list) => {
  S.deliveries = list;
  if (firstDv) { list.forEach((d) => { seenDv.add(d.id); if (d.customerPaidAt) seenPaid.add(d.id); }); firstDv = false; }
  else {
    const fresh = list.filter((d) => !seenDv.has(d.id)); fresh.forEach((d) => seenDv.add(d.id));
    const paid = list.filter((d) => d.status === 'cho_tt' && d.customerPaidAt && !seenPaid.has(d.id)); paid.forEach((d) => seenPaid.add(d.id));
    if (paid.length) dvPopup(paid, 'Khách báo đã chuyển khoản – kiểm tra app ngân hàng');
    else if (fresh.length) dvPopup(fresh, 'Đơn giao hàng mới – chờ khách chuyển khoản');
  }
  renderDeliveries(); dvAuto();
  if (tab === 'so-do' && S.config) renderFloor();
});
