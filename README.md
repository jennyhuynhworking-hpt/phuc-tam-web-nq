# Phúc Tâm – Website + Gọi món bằng QR tại bàn

Hướng dẫn triển khai từng bước: xem **HUONG-DAN.md**.

Web tĩnh (HTML/CSS/JS thuần), không cần build. Deploy thẳng lên Vercel. Tất cả file nằm cùng một cấp (kể cả ảnh .jpg).

## Các trang
| Trang | Dành cho | Đường dẫn |
|---|---|---|
| Website giới thiệu | Khách | `/` (index.html) |
| Gọi món tại bàn | Khách quét QR | `/order.html?ban=B1` |
| Sơ đồ bàn, in QR, phân công, thanh toán | Quản lý / thu ngân | `/quan-ly.html` |
| Màn hình bếp theo trạm + chạy món + khách gọi | Bếp, phục vụ | `/bep.html` (hoặc `/bep.html?tram=nong`, `?tram=chaymon`) |

## Luồng hoạt động
1. Quản lý vào quan-ly.html → chỉnh sơ đồ bàn → tab Mã QR → in, dán lên bàn.
2. Khách quét QR → mở order.html?ban=… → chọn món → gửi order.
3. Món tự chia về đúng trạm theo Phân công bếp (Bếp nóng / Bếp nguội – Khai vị / Quầy nước…).
4. Màn hình bep.html của từng trạm hiện popup món mới, đánh số thứ tự #1, #2… theo giờ gọi.
5. Tab Chạy món hiện popup món đã xong theo bàn → nhân viên mang ra → Đã lên món.
6. Khách thấy trạng thái từng món trên điện thoại. Thu ngân bấm bàn → Thanh toán & dọn bàn.

## Hai chế độ dữ liệu (file firebase-config.js)
- Demo (mặc định): dữ liệu nằm trong trình duyệt, chỉ đồng bộ giữa các TAB trên CÙNG một máy.
- Thật (Firebase Firestore, gói miễn phí): mọi thiết bị đồng bộ tức thì.

### Bật Firebase
1. https://console.firebase.google.com → Add project.
2. Build → Firestore Database → Create database → vùng asia-southeast1 → Start in test mode.
3. Project settings → Your apps → biểu tượng </> (Web) → Register.
4. Copy khối firebaseConfig → dán vào firebase-config.js: window.FIREBASE_CONFIG = { ... };
5. Commit lên GitHub → Vercel tự deploy. Trang quản lý sẽ hiện "Đang đồng bộ thật".

Test mode cho phép ai có link đều đọc/ghi và hết hạn sau 30 ngày – chỉ dùng để demo.
Trước khi chạy thật cần thêm đăng nhập nhân viên và siết Firestore Rules.

## Sửa nhanh
- Món / giá trang gọi món: menu-data.js – T('Tên món', 'English', '55k', 1) (1 = Must try). Website dùng script.js.
- Sơ đồ bàn, tên trạm, nhóm món → trạm, thực đơn ngày thường/ngày chay: chỉnh trên quan-ly.html.
