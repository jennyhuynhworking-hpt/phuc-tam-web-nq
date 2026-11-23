import { initStore, mode } from './store.js';
import { $, esc, minutesAgo, clock, showFatal } from './common.js';

let store;
try { store = await initStore(); } catch (e) { showFatal(e); throw e; }

const params = new URLSearchParams(location.search);
let tram = params.get('tram') || 'all';   // 'all' | id trạm | 'chaymon'
let config = null;
let tickets = [];
let firstLoad = true;
const seenNew = new Set();
const seenReady = new Set();
let pending = [];
let calls = [];
let firstCalls = true;
const seenCalls = new Set();
let pendingCalls = [];
let wakeLock = null;
let soundOn = false;
let audioCtx = null;
const LATE_MIN = 15;
const baseTitle = document.title;

$('modeBadge').textContent = mode === 'firebase' ? 'Đang đồng bộ thật' : 'Chế độ demo';
$('modeBadge').classList.toggle('live', mode === 'firebase');

const stationName = (id) => (config.stations.find((s) => s.id === id) || {}).name || 'Chưa phân công';
const active = (t) => t.status === 'moi' || t.status === 'dang';
const inView = (t) => tram === 'all' || t.station === tram;

// Thứ tự trong hàng chờ của từng trạm (theo giờ gọi)
function queueNo(t) {
  const q = tickets.filter((x) => x.station === t.station && active(x)).sort((a, b) => a.createdAt - b.createdAt);
  const i = q.findIndex((x) => x.id === t.id);
  return i < 0 ? null : i + 1;
}

/* ---------- Thanh chọn trạm ---------- */
function renderBar() {
  const items = [{ id: 'all', name: 'Tất cả trạm' }, ...config.stations, { id: 'chaymon', name: 'Chạy món (mang ra bàn)' }];
  if (!items.some((s) => s.id === tram)) tram = 'all';
  $('stationBar').innerHTML = items.map((s) => {
    const n = s.id === 'chaymon'
      ? tickets.filter((t) => t.status === 'xong').length + calls.length
      : tickets.filter((t) => t.status === 'moi' && (s.id === 'all' || t.station === s.id)).length;
    return `<button type="button" class="chip" role="tab" data-tram="${esc(s.id)}" aria-selected="${s.id === tram}">${esc(s.name)}${n ? `<span class="count">${n}</span>` : ''}</button>`;
  }).join('');
  $('stationHint').textContent = tram === 'chaymon'
    ? 'Khách gọi nhân viên hiện trên cùng. Món bếp đã làm xong, mang ra đúng bàn rồi bấm "Đã lên món".'
    : `Món xếp theo thứ tự khách gọi (#1 làm trước). Quá ${LATE_MIN} phút sẽ báo đỏ. Có món mới sẽ hiện popup.`;
}
$('stationBar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tram]'); if (!b) return;
  tram = b.dataset.tram;
  const u = new URL(location.href); u.searchParams.set('tram', tram); history.replaceState(null, '', u);
  render();
});

/* ---------- Bảng món ---------- */
function card(t, next, label) {
  const m = minutesAgo(t.createdAt);
  const late = active(t) && m >= LATE_MIN;
  const no = queueNo(t);
  return `<article class="tk ${late ? 'late' : ''} ${t.status === 'xong' ? 'done' : ''}">
    <div class="tk-top">${no ? `<span class="tk-no">#${no}</span>` : ''}<span class="tk-table">${esc(t.tableName || t.table)}</span><span class="tk-time">${clock(t.createdAt)} · ${m} phút</span></div>
    <div class="tk-name">${esc(t.name)} <b>× ${t.qty}</b></div>
    ${t.note ? `<div class="tk-note">Ghi chú: ${esc(t.note)}</div>` : ''}
    ${tram === 'all' ? `<div class="tk-st">${esc(stationName(t.station))}</div>` : ''}
    <button type="button" class="btn ${next === 'phucvu' ? 'btn-outline' : 'btn-gold'} btn-sm" data-id="${esc(t.id)}" data-next="${next}">${label}</button>
  </article>`;
}
function render() {
  if (!config) return;
  renderBar();
  const board = $('board');
  if (tram === 'chaymon') {
    const ready = tickets.filter((t) => t.status === 'xong').sort((a, b) => a.createdAt - b.createdAt);
    const groups = {};
    ready.forEach((t) => { (groups[t.table] = groups[t.table] || []).push(t); });
    const keys = Object.keys(groups);
    const callHtml = calls.length ? `<div class="panel" style="margin-top:14px;display:flex;flex-direction:column;gap:10px"><h2 style="margin:0">Khách đang gọi (${calls.length})</h2>
      ${[...calls].sort((a, b) => a.createdAt - b.createdAt).map((c) => `<div class="call-card"><b>${esc(c.tableName || c.table)}</b><span>${esc(c.type)} · ${clock(c.createdAt)} (${minutesAgo(c.createdAt)} phút)</span><button type="button" class="btn btn-outline btn-sm" data-resolve="${esc(c.id)}">Đã xử lý</button></div>`).join('')}</div>` : '';
    board.innerHTML = callHtml + (keys.length ? `<div class="run-grid">${keys.map((k) => `
      <div class="col"><h2><span>${esc(groups[k][0].tableName || k)}</span><span>${groups[k].length} món</span></h2>
        ${groups[k].map((t) => card(t, 'phucvu', 'Đã lên món')).join('')}
        <button type="button" class="btn btn-gold btn-sm" data-table-done="${esc(k)}">Đã lên hết món bàn này</button>
      </div>`).join('')}</div>`
      : '<div class="panel" style="margin-top:14px"><p class="empty">Chưa có món nào chờ mang ra.</p></div>');
    return;
  }
  const list = tickets.filter(inView).sort((a, b) => a.createdAt - b.createdAt);
  const cols = [
    { st: 'moi', title: 'Chờ làm', next: 'dang', label: 'Bắt đầu làm' },
    { st: 'dang', title: 'Đang làm', next: 'xong', label: 'Xong món' },
    { st: 'xong', title: 'Xong – chờ mang ra', next: 'phucvu', label: 'Đã lên món' }
  ];
  board.innerHTML = `<div class="board">${cols.map((c) => {
    const items = list.filter((t) => t.status === c.st);
    return `<section class="col" aria-label="${c.title}"><h2><span>${c.title}</span><span>${items.length}</span></h2>
      ${items.length ? items.map((t) => card(t, c.next, c.label)).join('') : '<p class="empty">Không có món.</p>'}</section>`;
  }).join('')}</div>`;
}
$('board').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-next]');
  if (b) { b.disabled = true; await store.updateTicket(b.dataset.id, { status: b.dataset.next, ['at_' + b.dataset.next]: Date.now() }); return; }
  const r = e.target.closest('[data-resolve]');
  if (r) { r.disabled = true; await store.resolveCall(r.dataset.resolve); return; }
  const d = e.target.closest('[data-table-done]');
  if (d) {
    d.disabled = true;
    const ids = tickets.filter((t) => t.table === d.dataset.tableDone && t.status === 'xong').map((t) => t.id);
    await Promise.all(ids.map((id) => store.updateTicket(id, { status: 'phucvu', at_phucvu: Date.now() })));
  }
});

/* ---------- Popup món mới theo phân công ---------- */
function beep() {
  if (!soundOn) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.22].forEach((t, i) => {
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      o.frequency.value = i ? 1046 : 784; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.4, audioCtx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.2);
      o.connect(g).connect(audioCtx.destination); o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.22);
    });
  } catch (e) { console.warn(e); }
}
$('soundBtn').addEventListener('click', () => {
  soundOn = !soundOn;
  $('soundBtn').setAttribute('aria-pressed', String(soundOn));
  $('soundBtn').textContent = soundOn ? 'Âm báo: Bật' : 'Bật âm báo';
  if (soundOn) beep();
  keepAwake(soundOn);
});
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); }
    else if (wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { console.warn(e); }
}
document.addEventListener('visibilitychange', () => { if (soundOn && document.visibilityState === 'visible') keepAwake(true); });

function renderPopup() {
  const live = pending.map((p) => tickets.find((t) => t.id === p.id) || p);
  const isRun = tram === 'chaymon';
  const callBlock = pendingCalls.length ? `<div class="pop-group" style="border:1px solid #8C3B35"><h3>Khách gọi nhân viên<span>${pendingCalls.length} yêu cầu</span></h3>
    ${pendingCalls.map((c) => `<div class="pop-item"><span class="no" style="color:#FF9B93">!</span><span><b>${esc(c.tableName || c.table)}</b> – ${esc(c.type)}</span><span class="who">${clock(c.createdAt)}</span></div>`).join('')}</div>` : '';
  $('popMain').hidden = !live.length;
  $('popTitle').textContent = !live.length ? 'Khách đang gọi nhân viên' : isRun ? `Có ${live.length} món xong – mang ra bàn` : `${live.length} món mới – ${tram === 'all' ? 'tất cả trạm' : stationName(tram)}`;
  const groups = {};
  live.forEach((t) => { (groups[t.table] = groups[t.table] || []).push(t); });
  $('popBody').innerHTML = Object.keys(groups).map((k) => {
    const g = groups[k].sort((a, b) => a.createdAt - b.createdAt);
    return `<div class="pop-group"><h3>${esc(g[0].tableName || k)}<span>gọi lúc ${clock(g[0].createdAt)}</span></h3>
      ${g.map((t) => { const no = queueNo(t); return `<div class="pop-item"><span class="no">${no ? '#' + no : '✓'}</span><span>${esc(t.name)} <b>× ${t.qty}</b>${t.note ? `<br><small style="color:#F0C987">${esc(t.note)}</small>` : ''}</span><span class="who">${esc(stationName(t.station))}</span></div>`; }).join('')}</div>`;
  }).join('') + callBlock;
  $('popMain').textContent = isRun ? 'Đã mang ra hết' : 'Nhận & bắt đầu làm';
}
function pushPopup(list, newCalls = []) {
  if (!list.length && !newCalls.length) return;
  pending.push(...list);
  pendingCalls.push(...newCalls);
  renderPopup();
  if (!$('popup').open) $('popup').showModal();
  document.title = `(${pending.length + pendingCalls.length}) ${pendingCalls.length ? 'Khách gọi' : tram === 'chaymon' ? 'Món xong' : 'Món mới'} – Phúc Tâm`;
  beep();
}
function closePopup() { pending = []; pendingCalls = []; document.title = baseTitle; if ($('popup').open) $('popup').close(); }
$('popOk').addEventListener('click', closePopup);
$('popClose').addEventListener('click', closePopup);
$('popup').addEventListener('cancel', () => { pending = []; pendingCalls = []; document.title = baseTitle; });
$('popMain').addEventListener('click', async () => {
  const isRun = tram === 'chaymon';
  const ids = pending.map((p) => p.id);
  closePopup();
  await Promise.all(ids.map((id) => {
    const t = tickets.find((x) => x.id === id); if (!t) return null;
    if (isRun && t.status === 'xong') return store.updateTicket(id, { status: 'phucvu', at_phucvu: Date.now() });
    if (!isRun && t.status === 'moi') return store.updateTicket(id, { status: 'dang', at_dang: Date.now() });
    return null;
  }));
});

/* ---------- Dữ liệu realtime ---------- */
store.onConfig((c) => { config = c; render(); });
store.onTickets((list) => {
  tickets = list;
  if (firstLoad) {
    list.forEach((t) => { seenNew.add(t.id); if (t.status === 'xong') seenReady.add(t.id); });
    firstLoad = false;
  } else {
    const fresh = list.filter((t) => !seenNew.has(t.id));
    fresh.forEach((t) => seenNew.add(t.id));
    const ready = list.filter((t) => t.status === 'xong' && !seenReady.has(t.id));
    ready.forEach((t) => seenReady.add(t.id));
    if (config) pushPopup(tram === 'chaymon' ? ready : fresh.filter(inView));
  }
  render();
  if ($('popup').open) renderPopup();
});
store.onCalls((list) => {
  calls = list;
  if (firstCalls) { list.forEach((c) => seenCalls.add(c.id)); firstCalls = false; }
  else {
    const fresh = list.filter((c) => !seenCalls.has(c.id));
    fresh.forEach((c) => seenCalls.add(c.id));
    if (config && (tram === 'chaymon' || tram === 'all')) pushPopup([], fresh);
  }
  pendingCalls = pendingCalls.filter((p) => list.some((c) => c.id === p.id));
  render();
  if ($('popup').open) { if (!pending.length && !pendingCalls.length) closePopup(); else renderPopup(); }
});
setInterval(render, 30000);
