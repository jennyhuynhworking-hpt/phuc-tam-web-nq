import { initStore, mode } from './store.js';
import { $, esc, minutesAgo, clock, beep, showFatal } from './common.js';

let store;
try { store = await initStore(); } catch (e) { showFatal(e); throw e; }

const params = new URLSearchParams(location.search);
let tram = params.get('tram') || 'all';            // 'all' | id trạm | 'chaymon'
let view = localStorage.getItem('pt_view') || 'order';   // 'order' | 'dish'
let autoAccept = localStorage.getItem('pt_auto') === '1';
let config = null;
let tickets = [];
let calls = [];
let firstT = true, firstC = true;
const seenT = new Set(), seenReady = new Set(), seenC = new Set();
let pending = [], pendingCalls = [];
let soundOn = false, wakeLock = null;
const LATE = 15;
const baseTitle = document.title;

$('modeBadge').textContent = mode === 'firebase' ? 'Đang đồng bộ thật' : 'Chế độ demo';
$('modeBadge').classList.toggle('live', mode === 'firebase');
$('autoAccept').checked = autoAccept;

const stName = (id) => (config.stations.find((s) => s.id === id) || {}).name || 'Chưa phân công';
const isActive = (t) => t.status === 'moi' || t.status === 'dang';
const inView = (t) => tram === 'all' || t.station === tram;
function queueNo(t) {
  const q = tickets.filter((x) => x.station === t.station && isActive(x)).sort((a, b) => a.createdAt - b.createdAt);
  const i = q.findIndex((x) => x.id === t.id);
  return i < 0 ? null : i + 1;
}
const NEXT = { moi: ['dang', 'Bắt đầu'], dang: ['xong', 'Xong'], xong: ['phucvu', 'Đã lên'] };
async function advance(ids, to) {
  if (!ids.length) return;
  await store.updateTickets(ids, { status: to, ['at_' + to]: Date.now() });
}

/* ---------- Thanh trạm + công cụ ---------- */
function renderBar() {
  const items = [{ id: 'all', name: 'Tất cả trạm' }, ...config.stations, { id: 'chaymon', name: 'Chạy món & khách gọi' }];
  if (!items.some((s) => s.id === tram)) tram = 'all';
  $('stationBar').innerHTML = items.map((s) => {
    const n = s.id === 'chaymon' ? tickets.filter((t) => t.status === 'xong').length + calls.length
      : tickets.filter((t) => t.status === 'moi' && (s.id === 'all' || t.station === s.id)).length;
    return `<button type="button" class="chip" role="tab" data-tram="${esc(s.id)}" aria-selected="${s.id === tram}">${esc(s.name)}${n ? `<span class="count">${n}</span>` : ''}</button>`;
  }).join('');
  $('viewTools').hidden = tram === 'chaymon';
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  $('stationHint').textContent = tram === 'chaymon'
    ? 'Khách gọi nhân viên hiện trên cùng. Món xong gom theo bàn để mang ra; đơn GIAO HÀNG thì đóng gói rồi bấm "Đã đóng gói xong".'
    : view === 'dish'
      ? 'Món giống nhau được gom lại để nấu một lần. Bấm một nút cho cả nhóm.'
      : `Mỗi thẻ là một lần gọi của một bàn, #số là thứ tự làm. Quá ${LATE} phút báo đỏ.`;
}
$('stationBar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tram]'); if (!b) return;
  tram = b.dataset.tram;
  const u = new URL(location.href); u.searchParams.set('tram', tram); history.replaceState(null, '', u);
  render();
});
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  view = b.dataset.view; localStorage.setItem('pt_view', view); render();
}));
$('autoAccept').addEventListener('change', (e) => {
  autoAccept = e.target.checked; localStorage.setItem('pt_auto', autoAccept ? '1' : '0');
  if (autoAccept) advance(tickets.filter((t) => t.status === 'moi' && inView(t)).map((t) => t.id), 'dang');
});

/* ---------- Thẻ theo lần gọi (gom các món cùng order + cùng trạng thái) ---------- */
function orderCard(group, st) {
  const first = group[0];
  const m = minutesAgo(first.createdAt);
  const late = st !== 'xong' && m >= LATE;
  const nos = group.map(queueNo).filter(Boolean);
  const [to, label] = NEXT[st];
  const ids = group.map((t) => t.id).join(',');
  return `<article class="tk ${late ? 'late' : ''} ${st === 'xong' ? 'done' : ''}">
    <div class="tk-top">${nos.length ? `<span class="tk-no">#${Math.min(...nos)}</span>` : ''}<span class="tk-table">${esc(first.tableName || first.table)}</span>${first.delivery ? '<span class="tag-ship">GIAO HÀNG</span>' : ''}<span class="tk-time">${clock(first.createdAt)} · ${m} phút</span></div>
    <ul class="tk-items">${group.map((t) => `<li><button type="button" class="tk-item" data-one="${esc(t.id)}" data-to="${to}" title="${label} riêng món này"><span class="dot" aria-hidden="true"></span>${esc(t.name)} <b>× ${t.qty}</b>${tram === 'all' ? `<small>${esc(stName(t.station))}</small>` : ''}</button></li>`).join('')}</ul>
    ${first.note ? `<div class="tk-note">Ghi chú: ${esc(first.note)}</div>` : ''}
    <button type="button" class="btn ${to === 'phucvu' ? 'btn-outline' : 'btn-gold'} btn-sm" data-ids="${ids}" data-to="${to}">${label} cả ${group.length > 1 ? group.length + ' món' : 'món'}</button>
  </article>`;
}
function groupBy(list, keyFn) {
  const m = new Map();
  list.forEach((t) => { const k = keyFn(t); if (!m.has(k)) m.set(k, []); m.get(k).push(t); });
  return [...m.values()];
}
function renderOrders(list) {
  const cols = [['moi', 'Chờ làm'], ['dang', 'Đang làm'], ['xong', 'Xong – chờ mang ra']];
  return `<div class="board">${cols.map(([st, title]) => {
    const groups = groupBy(list.filter((t) => t.status === st), (t) => (t.orderId || t.id) + '|' + t.table);
    const n = list.filter((t) => t.status === st).reduce((s, t) => s + t.qty, 0);
    return `<section class="col" aria-label="${title}"><h2><span>${title}</span><span>${n} phần</span></h2>
      ${groups.length ? groups.map((g) => orderCard(g, st)).join('') : '<p class="empty">Không có món.</p>'}</section>`;
  }).join('')}</div>`;
}

/* ---------- Gom theo món ---------- */
function renderDishes(list) {
  const act = list.filter(isActive);
  const groups = groupBy(act, (t) => t.name).sort((a, b) => Math.min(...a.map((t) => t.createdAt)) - Math.min(...b.map((t) => t.createdAt)));
  const done = groupBy(list.filter((t) => t.status === 'xong'), (t) => t.table);
  return `<div class="dish-wrap">
    <section class="col"><h2><span>Cần nấu</span><span>${act.reduce((s, t) => s + t.qty, 0)} phần</span></h2>
    ${groups.length ? groups.map((g) => {
      const total = g.reduce((s, t) => s + t.qty, 0);
      const waiting = g.filter((t) => t.status === 'moi');
      const late = g.some((t) => minutesAgo(t.createdAt) >= LATE);
      return `<article class="tk dish ${late ? 'late' : ''}">
        <div class="tk-name">${esc(g[0].name)} <b>× ${total}</b></div>
        <div class="chips-mini">${g.sort((a, b) => a.createdAt - b.createdAt).map((t) => `<span class="mini ${t.status}">#${queueNo(t) || '-'} ${esc(t.tableName || t.table)} ×${t.qty}${t.status === 'dang' ? ' · đang làm' : ''}${t.note ? ' · ' + esc(t.note) : ''}</span>`).join('')}</div>
        <div class="actions">
          ${waiting.length ? `<button type="button" class="btn btn-outline btn-sm" data-ids="${waiting.map((t) => t.id).join(',')}" data-to="dang">Bắt đầu ${waiting.reduce((s, t) => s + t.qty, 0)} phần</button>` : ''}
          <button type="button" class="btn btn-gold btn-sm" data-ids="${g.map((t) => t.id).join(',')}" data-to="xong">Xong cả ${total} phần</button>
        </div></article>`;
    }).join('') : '<p class="empty">Không có món cần nấu.</p>'}</section>
    <section class="col"><h2><span>Xong – chờ mang ra</span><span>${list.filter((t) => t.status === 'xong').reduce((s, t) => s + t.qty, 0)} phần</span></h2>
    ${done.length ? done.map((g) => orderCard(g, 'xong')).join('') : '<p class="empty">Không có món.</p>'}</section>
  </div>`;
}

/* ---------- Chạy món & khách gọi ---------- */
function renderRun() {
  const callHtml = calls.length ? `<div class="panel" style="margin-top:14px;display:flex;flex-direction:column;gap:10px"><h2 style="margin:0">Khách đang gọi (${calls.length})</h2>
    ${[...calls].sort((a, b) => a.createdAt - b.createdAt).map((c) => `<div class="call-card"><b>${esc(c.tableName || c.table)}</b><span>${esc(c.type)} · ${clock(c.createdAt)} (${minutesAgo(c.createdAt)} phút)</span><button type="button" class="btn btn-outline btn-sm" data-resolve="${esc(c.id)}">Đã xử lý</button></div>`).join('')}</div>` : '';
  const groups = groupBy(tickets.filter((t) => t.status === 'xong').sort((a, b) => a.createdAt - b.createdAt), (t) => t.table);
  return callHtml + (groups.length ? `<div class="run-grid">${groups.map((g) => `
    <div class="col"><h2><span>${esc(g[0].tableName || g[0].table)}${g[0].delivery ? ' <span class="tag-ship">GIAO HÀNG</span>' : ''}</span><span>${g.reduce((s, t) => s + t.qty, 0)} phần</span></h2>
      <ul class="tk-items">${g.map((t) => `<li><button type="button" class="tk-item" data-one="${esc(t.id)}" data-to="phucvu"><span class="dot" aria-hidden="true"></span>${esc(t.name)} <b>× ${t.qty}</b><small>${esc(stName(t.station))}</small></button></li>`).join('')}</ul>
      <button type="button" class="btn btn-gold btn-sm" data-ids="${g.map((t) => t.id).join(',')}" data-to="phucvu">${g[0].delivery ? 'Đã đóng gói xong' : 'Đã mang ra hết'}</button>
    </div>`).join('')}</div>` : '<div class="panel" style="margin-top:14px"><p class="empty">Chưa có món nào chờ mang ra.</p></div>');
}

function render() {
  if (!config) return;
  renderBar();
  if (tram === 'chaymon') { $('board').innerHTML = renderRun(); return; }
  const list = tickets.filter(inView).sort((a, b) => a.createdAt - b.createdAt);
  $('board').innerHTML = view === 'dish' ? renderDishes(list) : renderOrders(list);
}
$('board').addEventListener('click', async (e) => {
  const many = e.target.closest('[data-ids]');
  if (many) { many.disabled = true; await advance(many.dataset.ids.split(','), many.dataset.to); return; }
  const one = e.target.closest('[data-one]');
  if (one) { one.disabled = true; await advance([one.dataset.one], one.dataset.to); return; }
  const r = e.target.closest('[data-resolve]');
  if (r) { r.disabled = true; await store.resolveCall(r.dataset.resolve); }
});

/* ---------- Popup ---------- */
function renderPopup() {
  const live = pending.map((p) => tickets.find((t) => t.id === p.id) || p);
  const isRun = tram === 'chaymon';
  const groups = groupBy(live, (t) => t.table);
  const callBlock = pendingCalls.length ? `<div class="pop-group" style="border:1px solid #8C3B35"><h3>Khách gọi nhân viên<span>${pendingCalls.length} yêu cầu</span></h3>
    ${pendingCalls.map((c) => `<div class="pop-item"><span class="no" style="color:#FF9B93">!</span><span><b>${esc(c.tableName || c.table)}</b> – ${esc(c.type)}</span><span class="who">${clock(c.createdAt)}</span></div>`).join('')}</div>` : '';
  $('popTitle').textContent = !live.length ? 'Khách đang gọi nhân viên' : isRun ? `${live.length} món xong – mang ra bàn` : `${live.length} món mới – ${tram === 'all' ? 'tất cả trạm' : stName(tram)}`;
  $('popBody').innerHTML = groups.map((g) => `<div class="pop-group"><h3>${esc(g[0].tableName || g[0].table)}<span>gọi lúc ${clock(g[0].createdAt)}</span></h3>
    ${g.map((t) => { const no = queueNo(t); return `<div class="pop-item"><span class="no">${no ? '#' + no : '✓'}</span><span>${esc(t.name)} <b>× ${t.qty}</b>${t.note ? `<br><small style="color:#F0C987">${esc(t.note)}</small>` : ''}</span><span class="who">${esc(stName(t.station))}</span></div>`; }).join('')}</div>`).join('') + callBlock;
  const canAct = live.some((t) => (isRun ? t.status === 'xong' : t.status === 'moi'));
  $('popMain').hidden = !canAct;
  $('popMain').textContent = isRun ? 'Đã mang ra hết' : 'Nhận tất cả & bắt đầu làm';
}
function pushPopup(list, newCalls = []) {
  if (!list.length && !newCalls.length) return;
  pending.push(...list); pendingCalls.push(...newCalls);
  renderPopup();
  if (!$('popup').open) $('popup').showModal();
  document.title = `(${pending.length + pendingCalls.length}) ${pendingCalls.length ? 'Khách gọi' : 'Món mới'} – Phúc Tâm`;
  if (soundOn) beep();
}
function closePopup() { pending = []; pendingCalls = []; document.title = baseTitle; if ($('popup').open) $('popup').close(); }
$('popOk').addEventListener('click', closePopup);
$('popClose').addEventListener('click', closePopup);
$('popup').addEventListener('cancel', () => { pending = []; pendingCalls = []; document.title = baseTitle; });
$('popMain').addEventListener('click', async () => {
  const isRun = tram === 'chaymon';
  const ids = pending.map((p) => tickets.find((t) => t.id === p.id)).filter((t) => t && (isRun ? t.status === 'xong' : t.status === 'moi')).map((t) => t.id);
  closePopup();
  await advance(ids, isRun ? 'phucvu' : 'dang');
});

/* ---------- Âm báo + giữ màn hình sáng ---------- */
$('soundBtn').addEventListener('click', () => {
  soundOn = !soundOn;
  $('soundBtn').setAttribute('aria-pressed', String(soundOn));
  $('soundBtn').textContent = soundOn ? 'Âm báo: Bật' : 'Bật âm báo';
  if (soundOn) beep();
  keepAwake(soundOn);
});
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    else if (wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { console.warn(e); }
}
document.addEventListener('visibilitychange', () => { if (soundOn && document.visibilityState === 'visible') keepAwake(true); });

/* ---------- Dữ liệu realtime ---------- */
store.onConfig((c) => { config = c; render(); });
store.onTickets((list) => {
  tickets = list;
  if (firstT) { list.forEach((t) => { seenT.add(t.id); if (t.status === 'xong') seenReady.add(t.id); }); firstT = false; }
  else {
    const fresh = list.filter((t) => !seenT.has(t.id)); fresh.forEach((t) => seenT.add(t.id));
    const ready = list.filter((t) => t.status === 'xong' && !seenReady.has(t.id)); ready.forEach((t) => seenReady.add(t.id));
    if (config) {
      const mineNew = fresh.filter(inView);
      if (tram !== 'chaymon' && autoAccept && mineNew.length) advance(mineNew.filter((t) => t.status === 'moi').map((t) => t.id), 'dang');
      pushPopup(tram === 'chaymon' ? ready : mineNew);
    }
  }
  render();
  if ($('popup').open) renderPopup();
});
store.onCalls((list) => {
  calls = list;
  if (firstC) { list.forEach((c) => seenC.add(c.id)); firstC = false; }
  else {
    const fresh = list.filter((c) => !seenC.has(c.id)); fresh.forEach((c) => seenC.add(c.id));
    if (config && (tram === 'chaymon' || tram === 'all')) pushPopup([], fresh);
  }
  pendingCalls = pendingCalls.filter((p) => list.some((c) => c.id === p.id));
  render();
  if ($('popup').open) { if (!pending.length && !pendingCalls.length) closePopup(); else renderPopup(); }
});
setInterval(render, 30000);
