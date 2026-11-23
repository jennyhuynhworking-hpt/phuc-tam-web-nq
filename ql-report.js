// Báo cáo thu chi theo ngày, món bán chạy, doanh thu theo giờ, chi phí.
import { $, esc, money, clock, dayKey, fmtDateTime, toast } from './common.js';
import { printBill } from './ql-bill.js';

export function initReport({ store, getConfig }) {
  let from = dayKey(), to = dayKey(), bills = [], expenses = [];
  const EXP = ['Nguyên liệu', 'Nhân công', 'Điện, nước, gas', 'Mặt bằng', 'Bao bì, vật dụng', 'Khác'];
  const range = () => { const a = new Date(from + 'T00:00').getTime(); const b = new Date(to + 'T00:00').getTime() + 86400000; return [a, b]; };
  function setPreset(p) {
    const d = new Date();
    if (p === 'today') { from = to = dayKey(d); }
    if (p === 'yesterday') { d.setDate(d.getDate() - 1); from = to = dayKey(d); }
    if (p === '7d') { to = dayKey(d); d.setDate(d.getDate() - 6); from = dayKey(d); }
    if (p === 'month') { to = dayKey(d); d.setDate(1); from = dayKey(d); }
    $('rFrom').value = from; $('rTo').value = to;
    document.querySelectorAll('#rangeChips [data-range]').forEach((c) => c.setAttribute('aria-selected', String(c.dataset.range === p)));
  }
  async function load() {
    $('report').innerHTML = '<div class="panel"><p class="empty">Đang tải…</p></div>';
    try {
      const [a, b] = range();
      [bills, expenses] = await Promise.all([store.listBills(a, b), store.listExpenses(a, b)]);
      render();
    } catch (e) { console.error(e); $('report').innerHTML = '<div class="panel"><p class="empty">Không tải được báo cáo.</p></div>'; }
  }
  function bars(rows, fmt) {
    const max = Math.max(1, ...rows.map((r) => r.v));
    return rows.map((r) => `<div class="bar-row"><span class="bar-label">${esc(r.k)}</span><span class="bar"><i style="width:${(r.v / max) * 100}%"></i></span><span class="bar-val">${fmt(r)}</span></div>`).join('');
  }
  function render() {
    const rev = bills.reduce((s, b) => s + b.total, 0);
    const cash = bills.filter((b) => b.method === 'cash').reduce((s, b) => s + b.total, 0);
    const exp = expenses.reduce((s, e) => s + e.amount, 0);
    const disc = bills.reduce((s, b) => s + (b.discount || 0), 0);
    const dish = {}; const cat = {}; const hours = {};
    bills.forEach((b) => {
      const h = new Date(b.paidAt).getHours(); hours[h] = (hours[h] || 0) + b.total;
      b.items.filter((i) => i.cat !== 'Phí giao hàng').forEach((i) => {
        dish[i.name] = dish[i.name] || { k: i.name, q: 0, v: 0 }; dish[i.name].q += i.qty; dish[i.name].v += i.qty * i.price;
        const c = i.cat || 'Khác'; cat[c] = (cat[c] || 0) + i.qty * i.price;
      });
    });
    const top = Object.values(dish).sort((a, b) => b.q - a.q || b.v - a.v);
    const hourRows = []; for (let h = 9; h <= 21; h++) hourRows.push({ k: h + 'h', v: hours[h] || 0 });
    const multiDay = from !== to;
    const byDay = {};
    if (multiDay) bills.forEach((b) => { const k = dayKey(new Date(b.paidAt)); byDay[k] = (byDay[k] || 0) + b.total; });
    $('report').innerHTML = `
      <div class="summary kpi">
        <div><b>${money(rev)}</b>Doanh thu (${bills.length} bill)</div>
        <div><b>${money(bills.length ? Math.round(rev / bills.length) : 0)}</b>Trung bình / bill</div>
        <div><b>${money(cash)}</b>Tiền mặt</div>
        <div><b>${money(rev - cash)}</b>Chuyển khoản</div>
        <div><b>${money(bills.filter((b) => b.channel === 'delivery').reduce((s, b) => s + b.total, 0))}</b>Giao hàng (${bills.filter((b) => b.channel === 'delivery').length} đơn)</div>
        <div><b>${money(exp)}</b>Chi phí</div>
        <div class="${rev - exp >= 0 ? 'pos' : 'neg'}"><b>${money(rev - exp)}</b>Thu – Chi</div>
      </div>
      ${disc ? `<p class="hint">Đã giảm giá tổng cộng ${money(disc)}.</p>` : ''}
      <div class="rep-grid">
        <div class="panel"><h2>Món bán chạy</h2>${top.length ? bars(top.slice(0, 15).map((d) => ({ k: d.k, v: d.q, m: d.v })), (r) => `${r.v} phần · ${money(r.m)}`) : '<p class="empty">Chưa có dữ liệu.</p>'}</div>
        <div class="panel"><h2>Doanh thu theo nhóm món</h2>${Object.keys(cat).length ? bars(Object.entries(cat).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, v })), (r) => money(r.v)) : '<p class="empty">Chưa có dữ liệu.</p>'}</div>
        <div class="panel"><h2>${multiDay ? 'Doanh thu theo ngày' : 'Doanh thu theo giờ'}</h2>${bars(multiDay ? Object.keys(byDay).sort().map((k) => ({ k: k.slice(8) + '/' + k.slice(5, 7), v: byDay[k] })) : hourRows, (r) => money(r.v))}</div>
        <div class="panel"><h2>Ghi chi phí</h2>
          <div class="row"><label class="f">Ngày<input type="date" id="eDate" value="${to}"></label>
            <label class="f">Loại<select id="eType">${EXP.map((x) => `<option>${x}</option>`).join('')}</select></label>
            <label class="f" style="flex:1 1 160px">Nội dung<input id="eNote" placeholder="Rau củ chợ Bình Điền"></label>
            <label class="f">Số tiền (đ)<input id="eAmt" type="number" min="0" step="1000" style="width:130px"></label>
            <button class="btn btn-gold btn-sm" id="eAdd">Thêm</button></div>
          <div class="lines" style="margin-top:10px">${expenses.sort((a, b) => b.at - a.at).map((e) => `<div class="line"><div class="line-main"><span>${esc(e.type)} – ${esc(e.note || '')}</span><span class="line-sub">${fmtDateTime(e.at)}</span></div><span>${money(e.amount)}</span><button class="icon-btn sm" data-edel="${e.id}" aria-label="Xóa">×</button></div>`).join('') || '<p class="empty">Chưa có khoản chi.</p>'}</div>
        </div>
      </div>
      <div class="panel"><h2>Danh sách hóa đơn</h2>
        <div class="table-wrap"><table class="tbl-list"><thead><tr><th>Giờ</th><th>Số HĐ</th><th>Bàn</th><th>Số món</th><th>Hình thức</th><th style="text-align:right">Tổng</th><th></th></tr></thead><tbody>
        ${bills.sort((a, b) => b.paidAt - a.paidAt).map((b) => `<tr><td>${multiDay ? fmtDateTime(b.paidAt) : clock(b.paidAt)}</td><td>${esc(b.no)}</td><td>${esc(b.tableName)}</td><td>${b.items.reduce((s, i) => s + i.qty, 0)}</td><td>${b.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</td><td style="text-align:right">${money(b.total)}</td><td><button class="btn btn-outline btn-sm" data-reprint="${b.id}">In lại</button></td></tr>`).join('') || '<tr><td colspan="7" class="empty">Chưa có hóa đơn trong khoảng này.</td></tr>'}
        </tbody></table></div></div>`;
    $('eAdd').onclick = async () => {
      const amount = Number($('eAmt').value); if (!amount) { toast('Nhập số tiền chi.', true); return; }
      const at = new Date($('eDate').value + 'T12:00').getTime();
      await store.addExpense({ type: $('eType').value, note: $('eNote').value.trim(), amount, at, createdAt: Date.now() });
      toast('Đã ghi chi phí.'); load();
    };
    $('report').querySelectorAll('[data-edel]').forEach((b) => { b.onclick = async () => { if (!confirm('Xóa khoản chi này?')) return; await store.deleteExpense(b.dataset.edel); load(); }; });
    $('report').querySelectorAll('[data-reprint]').forEach((b) => { b.onclick = () => printBill(bills.find((x) => x.id === b.dataset.reprint), getConfig(), false); });
  }
  document.querySelectorAll('#rangeChips [data-range]').forEach((c) => c.addEventListener('click', () => { setPreset(c.dataset.range); load(); }));
  $('rLoad').addEventListener('click', () => { from = $('rFrom').value || from; to = $('rTo').value || to; if (to < from) [from, to] = [to, from]; document.querySelectorAll('#rangeChips [data-range]').forEach((c) => c.setAttribute('aria-selected', 'false')); load(); });
  $('rExport').addEventListener('click', () => {
    if (!window.XLSX) { toast('Chưa tải được thư viện Excel.', true); return; }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bills.map((b) => ({ 'Thời gian': fmtDateTime(b.paidAt), 'Số HĐ': b.no, 'Bàn': b.tableName, 'Tạm tính': b.subtotal, 'Giảm giá': b.discount || 0, 'Tổng': b.total, 'Hình thức': b.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản' }))), 'Hoa don');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bills.flatMap((b) => b.items.map((i) => ({ 'Thời gian': fmtDateTime(b.paidAt), 'Số HĐ': b.no, 'Bàn': b.tableName, 'Món': i.name, 'Nhóm': i.cat || '', 'SL': i.qty, 'Đơn giá': i.price, 'Thành tiền': i.qty * i.price })))), 'Chi tiet mon');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenses.map((e) => ({ 'Ngày': fmtDateTime(e.at), 'Loại': e.type, 'Nội dung': e.note, 'Số tiền': e.amount }))), 'Chi phi');
    XLSX.writeFile(wb, `bao-cao-phuc-tam_${from}_${to}.xlsx`);
  });
  setPreset('today');
  return { show: load };
}
