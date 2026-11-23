// Sửa thực đơn trực tiếp trên web + nhập/xuất Excel.
import { defaultMenu } from './store.js';
import { $, esc, toast } from './common.js';

export function initMenuEditor({ store, getMenu }) {
  let draft = null, key = 'thuong', dirty = false, saving = false;
  const HINT = 'Sửa trực tiếp tên, giá, bật/tắt Must try, đánh dấu Hết món. Bấm "Lưu thực đơn" để áp dụng ngay cho app gọi món và website.';
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const setDirty = (v) => { dirty = v; $('menuSave').disabled = !v; $('menuSave').textContent = v ? 'Lưu thực đơn *' : 'Đã lưu'; };

  function render() {
    if (!draft) { const m = getMenu(); if (!m) return; draft = clone(m); }
    $('menuSeg').innerHTML = ['thuong', 'chay'].map((k) => `<button type="button" data-mk="${k}" aria-pressed="${k === key}">${esc(draft[k].label)}</button>`).join('');
    const cats = draft[key].cats;
    $('menuEditor').innerHTML = cats.map((c, ci) => `
      <div class="panel menu-cat">
        <div class="row" style="align-items:center">
          <input class="cat-name" value="${esc(c.label)}" data-cl="${ci}" aria-label="Tên nhóm">
          <span class="hint" style="margin:0">${c.items.length} món</span>
          <div class="actions" style="margin-left:auto">
            <button type="button" class="icon-btn sm" data-cup="${ci}" aria-label="Đưa nhóm lên" ${ci === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="icon-btn sm" data-cdown="${ci}" aria-label="Đưa nhóm xuống" ${ci === cats.length - 1 ? 'disabled' : ''}>↓</button>
            <button type="button" class="btn btn-danger btn-sm" data-cdel="${ci}">Xóa nhóm</button>
          </div>
        </div>
        <div class="mi-head"><span>Tên món</span><span>Tên tiếng Anh</span><span>Giá</span><span>Must try</span><span>Còn món</span><span></span></div>
        ${c.items.map((it, ii) => `<div class="mi-row ${it.out ? 'is-out' : ''}">
          <input value="${esc(it.name)}" data-f="name" data-ci="${ci}" data-ii="${ii}" aria-label="Tên món">
          <input value="${esc(it.en || '')}" data-f="en" data-ci="${ci}" data-ii="${ii}" aria-label="Tên tiếng Anh">
          <input value="${esc(it.price)}" data-f="price" data-ci="${ci}" data-ii="${ii}" aria-label="Giá" placeholder="55k">
          <label class="ck"><input type="checkbox" data-f="must" data-ci="${ci}" data-ii="${ii}" ${it.must ? 'checked' : ''}><span>Must try</span></label>
          <label class="ck"><input type="checkbox" data-f="avail" data-ci="${ci}" data-ii="${ii}" ${it.out ? '' : 'checked'}><span>${it.out ? 'Hết món' : 'Còn'}</span></label>
          <button type="button" class="icon-btn sm" data-idel="${ci}-${ii}" aria-label="Xóa ${esc(it.name)}">×</button>
        </div>`).join('')}
        <button type="button" class="btn btn-outline btn-sm" data-iadd="${ci}" style="margin-top:10px">+ Thêm món vào ${esc(c.label)}</button>
      </div>`).join('') || '<div class="panel"><p class="empty">Thực đơn trống. Bấm "+ Thêm nhóm".</p></div>';
  }

  $('menuSeg').addEventListener('click', (e) => { const b = e.target.closest('[data-mk]'); if (!b) return; key = b.dataset.mk; render(); });
  $('menuEditor').addEventListener('input', (e) => {
    const t = e.target; const cats = draft[key].cats;
    if (t.dataset.cl !== undefined) { cats[+t.dataset.cl].label = t.value; setDirty(true); return; }
    const f = t.dataset.f; if (!f) return;
    const it = cats[+t.dataset.ci].items[+t.dataset.ii];
    if (f === 'must') it.must = t.checked;
    else if (f === 'avail') { it.out = !t.checked; t.nextElementSibling.textContent = it.out ? 'Hết món' : 'Còn'; t.closest('.mi-row').classList.toggle('is-out', it.out); }
    else it[f] = t.value;
    setDirty(true);
  });
  $('menuEditor').addEventListener('click', (e) => {
    const cats = draft[key].cats; const d = e.target.closest('button'); if (!d) return;
    if (d.dataset.iadd !== undefined) { cats[+d.dataset.iadd].items.push({ name: 'Món mới', en: '', price: '50k', must: false, out: false }); setDirty(true); render(); const rows = $('menuEditor').querySelectorAll(`[data-ci="${d.dataset.iadd}"][data-f="name"]`); const last = rows[rows.length - 1]; if (last) { last.focus(); last.select(); } return; }
    if (d.dataset.idel) { const [ci, ii] = d.dataset.idel.split('-').map(Number); if (!confirm('Xóa món "' + cats[ci].items[ii].name + '"?')) return; cats[ci].items.splice(ii, 1); setDirty(true); render(); return; }
    if (d.dataset.cdel !== undefined) { const ci = +d.dataset.cdel; if (!confirm('Xóa cả nhóm "' + cats[ci].label + '" (' + cats[ci].items.length + ' món)?')) return; cats.splice(ci, 1); setDirty(true); render(); return; }
    if (d.dataset.cup !== undefined) { const ci = +d.dataset.cup; [cats[ci - 1], cats[ci]] = [cats[ci], cats[ci - 1]]; setDirty(true); render(); return; }
    if (d.dataset.cdown !== undefined) { const ci = +d.dataset.cdown; [cats[ci + 1], cats[ci]] = [cats[ci], cats[ci + 1]]; setDirty(true); render(); }
  });
  $('menuAddCat').addEventListener('click', () => { draft[key].cats.push({ label: 'Nhóm mới', items: [] }); setDirty(true); render(); toast('Đã thêm nhóm ở cuối. Nhớ vào Phân công bếp chọn trạm cho nhóm mới.'); });
  $('menuSave').addEventListener('click', async () => {
    const bad = []; Object.values(draft).forEach((m) => m.cats.forEach((c) => c.items.forEach((it) => { if (!it.name.trim() || !/\d/.test(it.price)) bad.push(it.name || '(chưa có tên)'); })));
    if (bad.length) { toast('Kiểm tra tên/giá: ' + bad.slice(0, 3).join(', '), true); return; }
    $('menuSave').disabled = true;
    saving = true;
    try { await store.saveMenu(draft); setDirty(false); $('menuHint').textContent = HINT; toast('Đã lưu. App gọi món và website cập nhật ngay.'); }
    catch (e) { console.error(e); toast('Lưu chưa được, thử lại.', true); setDirty(true); }
    finally { saving = false; }
  });

  /* Excel */
  const LABEL = { thuong: 'Ngày thường', chay: 'Ngày chay' };
  $('menuExport').addEventListener('click', () => {
    if (!window.XLSX) { toast('Chưa tải được thư viện Excel.', true); return; }
    const rows = [];
    ['thuong', 'chay'].forEach((k) => draft[k].cats.forEach((c) => c.items.forEach((it) => rows.push({ 'Thực đơn': LABEL[k], 'Nhóm': c.label, 'Tên món': it.name, 'Tên tiếng Anh': it.en || '', 'Giá': it.price, 'Must try': it.must ? 'x' : '', 'Hết món': it.out ? 'x' : '' }))));
    const ws = XLSX.utils.json_to_sheet(rows); ws['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 30 }, { wch: 40 }, { wch: 10 }, { wch: 9 }, { wch: 9 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Thuc don');
    XLSX.writeFile(wb, 'thuc-don-phuc-tam.xlsx');
  });
  $('menuImport').addEventListener('change', async (e) => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    if (!window.XLSX) { toast('Chưa tải được thư viện Excel.', true); return; }
    try {
      const wb = XLSX.read(await file.arrayBuffer());
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      const next = { thuong: { ...draft.thuong, cats: [] }, chay: { ...draft.chay, cats: [] } };
      let n = 0;
      rows.forEach((r) => {
        const k = /chay/i.test(String(r['Thực đơn'])) ? 'chay' : 'thuong';
        const name = String(r['Tên món']).trim(); if (!name) return;
        const catName = String(r['Nhóm']).trim() || 'Khác';
        let cat = next[k].cats.find((c) => c.label === catName);
        if (!cat) { cat = { label: catName, items: [] }; next[k].cats.push(cat); }
        let price = String(r['Giá']).trim(); if (/^\d+$/.test(price)) price = Number(price) >= 1000 ? Math.round(Number(price) / 1000) + 'k' : price + 'k';
        cat.items.push({ name, en: String(r['Tên tiếng Anh']).trim(), price, must: !!String(r['Must try']).trim(), out: !!String(r['Hết món']).trim() });
        n++;
      });
      if (!n) { toast('File không có dòng món nào. Dùng đúng mẫu từ nút "Tải file Excel".', true); return; }
      if (!next.chay.cats.length) next.chay.cats = draft.chay.cats;
      if (!next.thuong.cats.length) next.thuong.cats = draft.thuong.cats;
      draft = next; setDirty(true); render();
      toast(`Đã nhập ${n} món từ Excel. Kiểm tra lại rồi bấm "Lưu thực đơn".`);
    } catch (err) { console.error(err); toast('Không đọc được file Excel.', true); }
  });

  return {
    render,
    remote(m) {
      if (saving) return;
      if (dirty) { if ($('menuHint')) $('menuHint').textContent = 'Thực đơn vừa được sửa ở máy khác. Bạn đang có thay đổi chưa lưu – lưu sẽ ghi đè.'; return; }
      draft = clone(m); setDirty(false); if ($('menuHint')) $('menuHint').textContent = HINT;
      if (!$('tab-thuc-don').hidden) render();
    },
    reset() { draft = defaultMenu(); setDirty(true); render(); }
  };
}
