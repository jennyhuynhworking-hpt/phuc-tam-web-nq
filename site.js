// Website giới thiệu: món nổi bật, thực đơn (lấy từ dữ liệu quản lý), form đặt bàn gửi về trang quản lý.
import { initStore, defaultMenu } from './store.js';
import { $, esc, toast, hydrateImages } from './common.js';

const FEATURED = [
  { name: 'Lẩu Thái Chua Cay', en: 'Spicy and Sour Thai Hot Pot', price: '169k', img: 'lau2.jpg' },
  { name: 'Pad Thái', en: 'Pad Thai', price: '55k', img: 'padthai.jpg' },
  { name: 'Đậu Hũ Nấm Kho Tiêu', en: 'Braised Tofu with Mushrooms and Pepper', price: '55k', img: 'kho.jpg' },
  { name: 'Cải Thìa Đông Cô', en: 'Bok Choy with Shiitake Mushrooms', price: '60k', img: 'caithia.jpg' },
  { name: 'Nui Đút Lò', en: 'Baked Pasta', price: '80k', img: 'pasta.jpg' },
  { name: 'Cơm Chiên Thơm Thái', en: 'Thai Pineapple Fried Rice', price: '50k', img: 'comthom.jpg' }
];
$('featured').innerHTML = FEATURED.map((f) => `
  <article class="dish"><img src="${f.img}" alt="${esc(f.name)}" loading="lazy">
    <div class="dish-body"><div class="dish-top"><h3>${esc(f.name)}</h3><span class="price">${f.price}</span></div><span class="en">${esc(f.en)}</span></div>
  </article>`).join('');

let MENU = defaultMenu();
let store = null;
const state = { menu: 'thuong', cat: 0, guests: 2 };
function render() {
  const cur = MENU[state.menu];
  if (state.cat >= cur.cats.length) state.cat = 0;
  $('menuSwitch').innerHTML = ['thuong', 'chay'].map((k) => `<button type="button" role="tab" data-menu="${k}" aria-selected="${k === state.menu}">${esc(MENU[k].label)}</button>`).join('');
  $('menuNote').textContent = cur.note || '';
  $('cats').innerHTML = cur.cats.map((c, i) => `<button type="button" role="tab" data-cat="${i}" aria-selected="${i === state.cat}">${esc(c.label)}</button>`).join('');
  const cat = cur.cats[state.cat];
  $('catTitle').textContent = cat ? cat.label : '';
  $('items').innerHTML = (cat ? cat.items : []).map((it) => `
    <div class="item ${it.out ? 'out' : ''}"><div class="item-left">${it.img ? `<img class="item-thumb" data-img="${esc(it.img)}" alt="">` : ''}<div class="item-main">
      <span class="item-name">${esc(it.name)}${it.must ? '<span class="badge">Must try</span>' : ''}${it.out ? '<span class="out-tag">Tạm hết</span>' : ''}</span>
      <span class="item-en">${esc(it.en)}</span></div></div><span class="item-price">${esc(it.price)}</span></div>`).join('');
  if (store) hydrateImages($('items'), store);
}
$('menuSwitch').addEventListener('click', (e) => { const b = e.target.closest('[data-menu]'); if (!b) return; state.menu = b.dataset.menu; state.cat = 0; render(); });
$('cats').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; state.cat = Number(b.dataset.cat); render(); });
render();

/* ---------- Đặt bàn ---------- */
const showGuests = () => { $('guests').textContent = state.guests + ' khách'; };
$('inc').addEventListener('click', () => { state.guests = Math.min(50, state.guests + 1); showGuests(); });
$('dec').addEventListener('click', () => { state.guests = Math.max(1, state.guests - 1); showGuests(); });
const f = $('bookForm');
const today = new Date(); const pad = (n) => String(n).padStart(2, '0');
f.date.min = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
f.date.value = f.date.min;
const inHours = (t) => (t >= '09:00' && t <= '13:30') || (t >= '16:30' && t <= '20:30');

initStore().then((s) => { store = s; s.onMenu((m) => { MENU = m; render(); }); }).catch((e) => console.error(e));

f.addEventListener('submit', async (e) => {
  e.preventDefault();
  const st = $('status');
  const name = f.name.value.trim(), phone = f.phone.value.trim().replace(/\s+/g, ''), date = f.date.value, time = f.time.value;
  const okPhone = /^(\+?84|0)\d{8,10}$/.test(phone);
  f.name.classList.toggle('invalid', !name); f.phone.classList.toggle('invalid', !okPhone);
  st.hidden = false;
  let msg = '';
  if (!name || !okPhone) msg = 'Vui lòng nhập họ tên và số điện thoại hợp lệ để Phúc Tâm gọi xác nhận.';
  else if (!date) msg = 'Vui lòng chọn ngày.';
  else if (!inHours(time)) msg = 'Giờ nhận khách: 9:00–13:30 và 16:30–20:30. Quý khách chọn lại giờ giúp nhé.';
  if (msg) { st.className = 'status error'; st.textContent = msg; return; }
  const btn = f.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    if (!store) store = await initStore();
    await store.addBooking({ name, phone, date, time, guests: state.guests, note: f.note.value.trim(), status: 'moi', createdAt: Date.now(), source: 'website' });
    st.className = 'status';
    st.textContent = `Cảm ơn ${name}! Phúc Tâm đã nhận yêu cầu đặt bàn ${state.guests} khách lúc ${time} ngày ${date.split('-').reverse().join('/')} và sẽ gọi xác nhận sớm.`;
    f.reset(); f.date.value = f.date.min; f.time.value = '18:30'; state.guests = 2; showGuests();
  } catch (err) {
    console.error(err);
    st.className = 'status error';
    st.textContent = 'Chưa gửi được yêu cầu. Quý khách vui lòng gọi 035 844 9199 để đặt bàn.';
    toast('Lỗi kết nối', true);
  } finally { btn.disabled = false; }
});
