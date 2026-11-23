// In bill qua máy in nhiệt (khổ 80mm / 58mm) bằng hộp thoại in của trình duyệt.
import { esc, money, fmtDateTime } from './common.js';

export function billLines(tickets) {
  const m = new Map();
  tickets.forEach((t) => {
    const k = t.name + '|' + t.price;
    const cur = m.get(k) || { name: t.name, cat: t.cat || '', price: t.price || 0, qty: 0 };
    cur.qty += t.qty; m.set(k, cur);
  });
  return [...m.values()];
}

export function printBill(bill, config, provisional) {
  const p = config.bill || {};
  const paper = config.paper === '58' ? 58 : 80;
  const box = document.getElementById('receipt');
  box.style.setProperty('--paper', paper + 'mm');
  box.innerHTML = `
    <div class="rc">
      <div class="rc-c"><b class="rc-name">NHÀ HÀNG CHAY PHÚC TÂM</b>
        <div>${esc(p.addr || 'Số 12 Lô C1, CC Tân Vĩnh, P. Khánh Hội, Q.4, TP.HCM')}</div>
        <div>ĐT: ${esc(p.phone || '035 844 9199')}</div></div>
      <div class="rc-c rc-title">${provisional ? 'PHIẾU TẠM TÍNH' : 'HÓA ĐƠN THANH TOÁN'}</div>
      <div>${provisional ? '' : 'Số: ' + esc(bill.no) + '<br>'}${bill.customer ? '' : 'Bàn: '}<b>${esc(bill.tableName)}</b><br>${fmtDateTime(bill.paidAt || Date.now())}</div>
      ${bill.customer ? `<div class="rc-ship"><b>GIAO ĐẾN:</b> ${esc(bill.customer.name)} – ${esc(bill.customer.phone)}<br>${esc(bill.customer.address)}<br>${bill.customer.when === 'asap' ? 'Giao sớm nhất' : 'Hẹn giờ: ' + esc(bill.customer.when)}${bill.customer.note ? '<br>Ghi chú: ' + esc(bill.customer.note) : ''}<br><b>ĐÃ THANH TOÁN CHUYỂN KHOẢN</b></div>` : ''}
      <table><thead><tr><th>Món</th><th>SL</th><th>T.Tiền</th></tr></thead><tbody>
      ${bill.items.map((i) => `<tr><td>${esc(i.name)}<br><small>${money(i.price)}</small></td><td>${i.qty}</td><td>${money(i.price * i.qty)}</td></tr>`).join('')}
      </tbody></table>
      <div class="rc-row"><span>Tạm tính</span><span>${money(bill.subtotal)}</span></div>
      ${bill.discount ? `<div class="rc-row"><span>Giảm giá</span><span>-${money(bill.discount)}</span></div>` : ''}
      <div class="rc-row rc-total"><span>TỔNG CỘNG</span><span>${money(bill.total)}</span></div>
      ${provisional ? '' : `<div class="rc-row"><span>Thanh toán</span><span>${bill.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</span></div>
      ${bill.method === 'cash' && bill.cashGiven ? `<div class="rc-row"><span>Khách đưa</span><span>${money(bill.cashGiven)}</span></div><div class="rc-row"><span>Tiền thối</span><span>${money(bill.change)}</span></div>` : ''}`}
      ${provisional && bill.qr ? `<div class="rc-c"><img src="${esc(bill.qr)}" alt="" style="width:60%;margin-top:6px"><div>Quét mã để chuyển khoản</div></div>` : ''}
      <div class="rc-c" style="margin-top:8px">${esc(p.thanks || 'Cảm ơn quý khách – Hữu Tâm Ắt Thành Tựu!')}</div>
    </div>`;
  document.body.classList.add('print-receipt');
  const done = () => { document.body.classList.remove('print-receipt'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  const imgs = [...box.querySelectorAll('img')];
  Promise.all(imgs.map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; })))).then(() => setTimeout(() => window.print(), 50));
}
