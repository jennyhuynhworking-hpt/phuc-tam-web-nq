// Dữ liệu thực đơn dùng chung cho trang gọi món (order.html), quản lý và bếp.
// Sửa món / giá ở đây: T('Tên món', 'English', '55k', 1)  → số 1 = Must try
const T = (n, e, p, m) => ({ name: n, en: e, price: p, must: !!m });

export const MENUS = {
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


export const ALL_CATS = [...new Set(Object.values(MENUS).flatMap((m) => m.cats.map((c) => c.label)))];

const HOT = ['Điểm tâm','Món chính','Món xào','Món kho','Xào / Trộn','Cơm chiên','Rau xào / luộc','Canh','Món canh','Súp','Món Âu','Lẩu','Gọi thêm','Món thêm'];
const COLD = ['Khai vị','Ăn chơi','Gỏi','Tráng miệng'];
const DRINK = ['Đồ uống','Giải khát'];
const catStation = {};
HOT.forEach((c) => { catStation[c] = 'nong'; });
COLD.forEach((c) => { catStation[c] = 'nguoi'; });
DRINK.forEach((c) => { catStation[c] = 'nuoc'; });

export const DEFAULT_CONFIG = {
  activeMenu: 'thuong',
  tables: Array.from({ length: 12 }, (_, i) => ({
    id: 'B' + (i + 1),
    name: 'Bàn ' + (i + 1),
    seats: i % 4 === 3 ? 6 : 4,
    x: 14 + (i % 4) * 24,
    y: 20 + Math.floor(i / 4) * 30
  })),
  stations: [
    { id: 'nong', name: 'Bếp nóng' },
    { id: 'nguoi', name: 'Bếp nguội – Khai vị' },
    { id: 'nuoc', name: 'Quầy nước' }
  ],
  catStation: catStation,
  delivery: {
    enabled: true,
    minOrder: 100000,
    prepMin: 30,
    payMinutes: 15,
    areas: [
      { name: 'Quận 4', fee: 15000 },
      { name: 'Quận 1', fee: 25000 },
      { name: 'Quận 7', fee: 30000 },
      { name: 'Quận 8', fee: 30000 },
      { name: 'Quận 5', fee: 30000 },
      { name: 'Bình Thạnh', fee: 40000 }
    ]
  }
};
