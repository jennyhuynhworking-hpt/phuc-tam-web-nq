(function () {
  const T = (n, e, p, m) => ({ name: n, en: e, price: p, must: !!m });
  const MENUS = {
      chay: {
        label: 'Ngày chay (Rằm & mùng Một)',
        note: 'Thực đơn gọn cho ngày Rằm & mùng Một. Ngày chay đông khách, quý khách nên đặt bàn trước.',
        cats: [
          { label: 'Khai vị', items: [T('Gỏi Nấm Sốt Chanh Dây','Mushroom Salad with Passion Fruit Sauce','65k'),T('Gỏi Sụn Rong Biển','Seaweed and Cartilage Salad','60k'),T('Gỏi Ngó Sen','Lotus Root Salad','65k'),T('Chả Giò Phúc Tâm','Phuc Tam Spring Rolls','55k'),T('Chả Giò Phô Mai','Cheese Spring Rolls','79k'),T('Chả Giò Kim Sa','Kim Sa Spring Rolls','60k'),T('Chả Cá Muối Ớt Đỏ','Salted and Chili Fish Cakes','60k'),T('Tôm Chiên Xù Sốt Me','Crispy Fried Shrimp with Tamarind Sauce','69k')] },
          { label: 'Điểm tâm', items: [T('Bún Riêu','Crab Noodle Soup','40k'),T('Hủ Tiếu Nam Vang','Hu Tieu Nam Vang','35k'),T('Cà Ri Ấn Độ','Indian Curry','55k'),T('Cơm Tấm Sườn Bì Chả','Broken Rice with Pork Ribs, Pork Skin and Sausage','50k'),T('Mì Cay','Spicy Noodles','55k')] },
          { label: 'Món chính', items: [T('Miến Trộn Sốt Rong Biển','Vermicelli with Seaweed Sauce','60k'),T('Miến Xào Phúc Tâm','Phuc Tam Stir-fried Vermicelli','50k'),T('Pad Thái','Pad Thai','55k'),T('Hủ Tiếu Xào Trung Hoa','Chinese Stir-fried Noodles','60k'),T('Mì Xào Giòn','Crispy Stir-fried Noodles','55k'),T('Cơm Chiên Lá É','Fried Rice with Basil Leaves','55k'),T('Nấm Đùi Gà Bơ Tỏi','Chicken Leg Mushrooms with Garlic Butter','55k')] },
          { label: 'Món xào', items: [T('Nấm Hấp Thái','Steamed Mushrooms with Thai Sauce','55k'),T('Cải Thìa Đông Cô','Bok Choy with Shiitake Mushrooms','60k'),T('Chân Nấm Kho Gừng','Braised Mushroom Stems with Ginger','65k'),T('Gà Chay Sốt Mắm Tỏi','Vegetarian Chicken with Garlic Fish Sauce','60k')] },
          { label: 'Món Âu', items: [T('Nui Đúc Lò','Baked Pasta','80k'),T('Nấm Nướng Phô Mai','Grilled Mushrooms with Cheese','75k'),T('Khoai Tây Lắc Phô Mai','Cheese-flavored French Fries','65k'),T('Mì Ý Phô Mai','Spaghetti with Cheese','85k')] },
          { label: 'Món canh', items: [T('Canh Chua Nam Bộ','Southern-style Sour Soup','50k'),T('Canh Rong Biển','Seaweed Soup','50k')] },
          { label: 'Lẩu', items: [T('Lẩu Thái','Thai Hot Pot','169k'),T('Lẩu Tomyum','Tomyum Hot Pot','179k'),T('Lẩu Chao Môn','Chao Mon Hot Pot','169k'),T('Lẩu Lá É Phú Yên','Phu Yen Leaf Hot Pot','169k')] },
          { label: 'Gọi thêm', items: [T('Bún / Mì Thêm','Noodles / Vermicelli Add','20k'),T('Cơm Trắng','White Rice','10k'),T('Combo Rau Lẩu','Vegetable Hot Pot Combo','50k'),T('Combo Rau & Nấm Lẩu','Vegetable & Mushroom Hot Pot Combo','90k'),T('Đậu Hũ / Chả','Tofu / Meatballs','30k')] },
          { label: 'Đồ uống', items: [T('Trà Đá','Iced Tea','4k'),T('Nước Suối','Bottled Water','13k'),T('Coca / 7up','Coca-Cola / 7up','20k'),T('Sâm Bông Cúc','Chrysanthemum Ginseng Drink','20k'),T('Atiso','Artichoke Drink','25k'),T('Đậu Nành Mè Đen','Black Sesame Soy Milk','25k')] }
        ]
      },
      thuong: {
        label: 'Ngày thường',
        note: 'Thực đơn đầy đủ hơn 90 món, phục vụ hằng ngày.',
        cats: [
          { label: 'Điểm tâm', items: [T('Hủ Tiếu Nam Vang','Nam Vang Noodle Soup','35k'),T('Bún Thái','Thai Noodle Soup','50k',1),T('Bún Huế','Hue Noodle Soup','45k'),T('Bún Riêu','Crab Noodle Soup','40k'),T('Mì Quảng','Quang Noodle Soup','45k',1),T('Mì Tiềm','Stewed Noodle Soup','50k',1),T('Cơm Tấm','Broken Rice with Grilled Pork','50k'),T('Cháo Nấm Hạt Sen','Mushroom and Lotus Seed Porridge','45k'),T('Bún Bì Chả Giò','Rice Noodles with Pork Skin and Spring Rolls','45k'),T('Mì Cay','Spicy Noodles','55k',1),T('Mì Tứ Xuyên','Sichuan Noodles','55k'),T('Cà Ri Ấn Độ','Indian Curry','55k')] },
          { label: 'Khai vị', items: [T('Chả Giò Phúc Tâm','Phuc Tam Spring Rolls','55k',1),T('Chả Giò Kim Sa','Kim Sa Spring Rolls','60k'),T('Chả Giò Phô Mai Que','Cheese Stick Spring Rolls','79k'),T('Nấm Xúc Bánh Đa','Mushrooms with Rice Paper Wraps','60k'),T('Nấm Bào Ngư Phúc Tâm','Phuc Tam Oyster Mushrooms','65k'),T('Gỏi Cuốn','Fresh Spring Rolls','10k/cuốn')] },
          { label: 'Ăn chơi', items: [T('Chả Cá Muối Ớt Đỏ','Salted and Chili Fish Cakes','60k'),T('Tôm Chiên Xù Sốt Me','Crispy Fried Shrimp with Tamarind Sauce','69k'),T('Đậu Hũ Rang Muối','Salted Fried Tofu','60k'),T('Đậu Hũ Chiên Nước Mắm','Fried Tofu with Fish Sauce','45k'),T('Nấm Hấp Sả / Thái','Steamed Mushrooms with Lemongrass / Thai Style','55k'),T('Nấm Hầu Thủ Hấp Chanh Sả','Steamed Lion’s Mane Mushrooms with Lemon, Lemongrass','60k'),T('Nấm Đùi Gà Sốt Bơ Tỏi','Chicken Leg Mushrooms with Garlic Butter Sauce','55k')] },
          { label: 'Gỏi', items: [T('Gỏi Tiến Vua','King’s Salad','75k',1),T('Gỏi Nấm Tam Vị','Three-Flavor Mushroom Salad','65k'),T('Gỏi Sụn Rong Biển','Seaweed and Cartilage Salad','60k',1),T('Gỏi Ngó Sen','Lotus Root Salad','65k'),T('Gỏi Nấm Chanh Dây','Mushroom and Passion Fruit Salad','65k'),T('Gỏi Xoài Long Phụng','Long Phung Mango Salad','60k')] },
          { label: 'Món kho', items: [T('Đậu Hũ Nấm Kho Tiêu','Braised Tofu with Mushrooms and Pepper','55k',1),T('Măng Kho Nấm Đậu','Braised Bamboo Shoots with Mushrooms and Beans','55k'),T('Cà Tím Tay Cầm','Eggplant Clay Pot','50k'),T('Chân Nấm Kho Gừng','Braised Mushroom Stems with Ginger','65k'),T('Đậu Hũ Tứ Xuyên','Sichuan Tofu','55k'),T('Nấm Hầu Thủ Roti','Lion’s Mane Mushroom Roti','65k')] },
          { label: 'Xào / Trộn', items: [T('Mì Xào Giòn','Crispy Fried Noodles','55k'),T('Mì Xào Rau Củ','Vegetable Fried Noodles','45k'),T('Miến Xào Phúc Tâm','Phuc Tam Fried Vermicelli','50k'),T('Pad Thái','Pad Thai','55k',1),T('Hủ Tiếu Xào Trung Hoa','Chinese Fried Rice Noodles','60k',1),T('Miến Trộn Sốt Rong Biển','Mixed Vermicelli with Seaweed Sauce','60k'),T('Bún Gạo Xào Singapore','Singapore Fried Rice Noodles','55k')] },
          { label: 'Cơm chiên', items: [T('Cơm Chiên Ngọc Bích','Jade Green Fried Rice','50k',1),T('Cơm Chiên Tiêu Xanh','Green Pepper Fried Rice','50k'),T('Cơm Chiên Lá É Phú Yên','Phu Yen Basil Leaf Fried Rice','55k',1),T('Cơm Chiên Tay Cầm','Clay Pot Fried Rice','55k'),T('Cơm Chiên Thơm Thái','Thai Pineapple Fried Rice','50k'),T('Cơm Chiên Gạo Lứt','Brown Rice Fried Rice','60k'),T('Cơm Chiên Sốt Tiêu Đen','Black Pepper Sauce Fried Rice','55k'),T('Cơm Chiên Ý Vị','Spicy Fried Rice','55k')] },
          { label: 'Rau xào / luộc', items: [T('Cải Thìa Đông Cô / Tóc Tiên','Bok Choy with Shiitake / Hair Moss','60k',1),T('Đậu Bắp Xào Tỏi / Chao','Stir-fried Okra with Garlic / Fermented Tofu','50k'),T('Rau Muống Xào Tỏi / Chao','Stir-fried Water Spinach with Garlic / Fermented Tofu','40k'),T('Rau Quê Kho Quẹt','Countryside Vegetables with Dipping Sauce','60k')] },
          { label: 'Canh', items: [T('Canh Đồng Quê','Countryside Soup','45k'),T('Canh Rong Biển','Seaweed Soup','50k'),T('Canh Chua Nam Bộ','Southern Vietnamese Sour Soup','50k',1),T('Canh Chua Thái','Thai Sour Soup','60k')] },
          { label: 'Súp', items: [T('Súp Tóc Tiên','Hair Moss Soup','40k'),T('Súp Rong Biển','Seaweed Soup','45k'),T('Súp Bí Đỏ','Pumpkin Soup','55k'),T('Súp Bắp Hạt Sen','Corn and Lotus Seed Soup','50k')] },
          { label: 'Món Âu', items: [T('Nấm Nướng Phô Mai','Grilled Mushrooms with Cheese','75k',1),T('Nui Đút Lò','Baked Pasta','80k'),T('Mì Ý Phô Mai','Spaghetti with Cheese','85k',1),T('Khoai Tây Lắc Phô Mai','Shaken Potatoes with Cheese','65k')] },
          { label: 'Lẩu', items: [T('Lẩu Thái Chua Cay','Spicy and Sour Thai Hot Pot','169k',1),T('Lẩu Chao Khoai Môn','Taro and Fermented Tofu Hot Pot','169k',1),T('Lẩu Nấm Hương Rừng','Wild Shiitake Mushroom Hot Pot','169k'),T('Lẩu Tiềm Thảo Mộc','Herbal Hot Pot','179k'),T('Lẩu Tomyum','Tomyum Hot Pot','179k'),T('Lẩu Lá É Phú Yên','Phu Yen Basil Leaf Hot Pot','169k',1),T('Lẩu Tứ Xuyên','Sichuan Hot Pot','179k')] },
          { label: 'Món thêm', items: [T('Cơm Trắng','White Rice','10k'),T('Cơm Gạo Lứt','Brown Rice','20k'),T('Bún / Mì Thêm','Extra Noodles / Vermicelli','20k'),T('Bánh Mì','Bread','5k'),T('Combo Rau Lẩu','Vegetable Hot Pot Combo','50k'),T('Combo Rau + Nấm Lẩu','Vegetable + Mushroom Hot Pot Combo','90k'),T('Combo Thả Lẩu','Tofu + Chicken + Meatballs + Fish Balls','60k'),T('Nấm Thêm','Extra Mushrooms','70k'),T('Nước Lẩu Thêm','Extra Hot Pot Broth','20k'),T('Đậu Hũ Ki','Tofu Skin','30k'),T('Khoai Môn','Taro','30k')] },
          { label: 'Giải khát', items: [T('Nước Suối','Bottled Water','13k'),T('Coca / 7up','Coca-Cola / 7up','20k'),T('Sâm Bông Cúc','Chrysanthemum Ginseng Drink','20k'),T('Trà Atiso','Artichoke Tea','25k'),T('Đậu Nành Mè Đen','Black Sesame Soy Milk','25k'),T('Trà Đá','Iced Tea','4k')] },
          { label: 'Tráng miệng', items: [T('Sữa Chua Yogurt','Yogurt','10k')] }
        ]
      }
    };

  const ORDER = ['thuong', 'chay'];
  const FEATURED = [
    { name: 'Lẩu Thái Chua Cay', en: 'Spicy and Sour Thai Hot Pot', price: '169k', img: 'images/lau2.jpg' },
    { name: 'Pad Thái', en: 'Pad Thai', price: '55k', img: 'images/padthai.jpg' },
    { name: 'Đậu Hũ Nấm Kho Tiêu', en: 'Braised Tofu with Mushrooms and Pepper', price: '55k', img: 'images/kho.jpg' },
    { name: 'Cải Thìa Đông Cô', en: 'Bok Choy with Shiitake Mushrooms', price: '60k', img: 'images/caithia.jpg' },
    { name: 'Nui Đút Lò', en: 'Baked Pasta', price: '80k', img: 'images/pasta.jpg' },
    { name: 'Cơm Chiên Thơm Thái', en: 'Thai Pineapple Fried Rice', price: '50k', img: 'images/comthom.jpg' }
  ];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = { menu: 'thuong', cat: 0, guests: 2 };

  $('featured').innerHTML = FEATURED.map((f) => `
    <article class="dish">
      <img src="${f.img}" alt="${esc(f.name)}" loading="lazy">
      <div class="dish-body">
        <div class="dish-top"><h3>${esc(f.name)}</h3><span class="price">${f.price}</span></div>
        <span class="en">${esc(f.en)}</span>
      </div>
    </article>`).join('');

  function render() {
    const cur = MENUS[state.menu];
    $('menuSwitch').innerHTML = ORDER.map((k) =>
      `<button type="button" role="tab" data-menu="${k}" aria-selected="${k === state.menu}">${esc(MENUS[k].label)}</button>`).join('');
    $('menuNote').textContent = cur.note;
    $('cats').innerHTML = cur.cats.map((c, i) =>
      `<button type="button" role="tab" data-cat="${i}" aria-selected="${i === state.cat}">${esc(c.label)}</button>`).join('');
    const cat = cur.cats[state.cat];
    $('catTitle').textContent = cat.label;
    $('items').innerHTML = cat.items.map((it) => `
      <div class="item">
        <div class="item-main">
          <span class="item-name">${esc(it.name)}${it.must ? '<span class="badge">Must try</span>' : ''}</span>
          <span class="item-en">${esc(it.en)}</span>
        </div>
        <span class="item-price">${esc(it.price)}</span>
      </div>`).join('');
  }

  $('menuSwitch').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-menu]'); if (!b) return;
    state.menu = b.dataset.menu; state.cat = 0; render();
  });
  $('cats').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cat]'); if (!b) return;
    state.cat = Number(b.dataset.cat); render();
  });

  const showGuests = () => { $('guests').textContent = state.guests + ' khách'; };
  $('inc').addEventListener('click', () => { state.guests = Math.min(30, state.guests + 1); showGuests(); });
  $('dec').addEventListener('click', () => { state.guests = Math.max(1, state.guests - 1); showGuests(); });

  // Demo: form chưa gửi đi đâu. Khi chạy thật, nối với Google Form / Formspree / Zalo OA.
  $('bookForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, st = $('status');
    const name = f.name.value.trim(), phone = f.phone.value.trim();
    f.name.classList.toggle('invalid', !name);
    f.phone.classList.toggle('invalid', !/^[0-9 +.]{9,15}$/.test(phone));
    st.hidden = false;
    if (!name || !/^[0-9 +.]{9,15}$/.test(phone)) {
      st.className = 'status error';
      st.textContent = 'Vui lòng nhập họ tên và số điện thoại hợp lệ để Phúc Tâm gọi xác nhận.';
      return;
    }
    st.className = 'status';
    st.textContent = 'Cảm ơn ' + name + '! Phúc Tâm đã nhận yêu cầu đặt bàn cho ' + state.guests + ' khách và sẽ gọi lại xác nhận trong ít phút.';
    f.reset(); state.guests = 2; showGuests();
  });

  render();
})();
