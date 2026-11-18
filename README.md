# Phúc Tâm – Web nhà hàng chay (bản demo)

Web tĩnh (HTML/CSS/JS thuần), không cần build. Deploy thẳng lên Vercel.

## Cấu trúc
- `index.html` – nội dung trang
- `style.css` – giao diện (màu ở đầu file, biến `--gold`, `--bg`…)
- `script.js` – dữ liệu thực đơn (`MENUS`), món nổi bật (`FEATURED`), form đặt bàn
- `images/` – logo và ảnh món (cắt từ menu)

## Sửa nhanh
- Giờ mở cửa / hotline: tìm `[GIỜ MỞ CỬA]`, `[SỐ ĐIỆN THOẠI]` trong `index.html`
- Giá / món: sửa trong `script.js`, dạng `T('Tên món', 'English name', '55k', 1)` – số 1 = Must try
- Bản đồ: thay khối `[Bản đồ Google Maps…]` bằng mã nhúng iframe của Google Maps
- Form đặt bàn hiện chỉ là demo (chưa gửi dữ liệu đi đâu)

## Chạy thử trên máy
Mở trực tiếp `index.html`, hoặc: `npx serve .`
