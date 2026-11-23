# HƯỚNG DẪN TRIỂN KHAI – Phúc Tâm (Website + Gọi món QR + Quản lý + Bếp)

## 0. Bộ code gồm gì
| File | Vai trò |
|---|---|
| index.html, style.css, script.js | Website giới thiệu cho khách |
| order.html, order.js | App gọi món trên điện thoại khách (mở bằng QR) |
| quan-ly.html, quan-ly.js | Quản lý: sơ đồ bàn, in QR, phân công, thanh toán |
| bep.html, bep.js | Màn hình bếp theo trạm + chạy món + khách gọi |
| menu-data.js | Thực đơn dùng cho app gọi món (ngày thường + ngày chay) |
| store.js, common.js, app.css | Dùng chung (dữ liệu, tiện ích, giao diện) |
| firebase-config.js | Nơi dán cấu hình Firebase (bật đồng bộ thật) |
| manifest.json, icon-192.png, icon-512.png | Cài app Quản lý/Bếp ra màn hình chính |
| *.jpg | Logo và ảnh món |

Tất cả file nằm CÙNG MỘT CẤP, không có thư mục con.

---

## BƯỚC 1 – Đưa code lên GitHub
1. Giải nén phuc-tam-web.zip.
2. Vào repo phuc-tam-web-nq → Add file → Upload files.
3. Chọn tất cả file trong thư mục đã giải nén (Ctrl + A) → kéo thả vào → Commit changes.
   File trùng tên sẽ được ghi đè.
4. Vercel tự deploy lại sau khoảng 30 giây.

Kiểm tra nhanh: mở https://phuc-tam-web-nq.vercel.app/quan-ly.html – thấy sơ đồ 12 bàn là đúng.

---

## BƯỚC 2 – Test thử trên 1 máy (chế độ demo, chưa cần Firebase)
Mở 3 tab trên cùng trình duyệt:
- Tab 1: …/bep.html
- Tab 2: …/quan-ly.html
- Tab 3: …/order.html?ban=B3

Ở tab 3: chọn món → Xem giỏ → Gửi order. Bấm chuông → Xin thanh toán.
→ Tab 1 hiện popup món mới; tab 2 Bàn 3 đổi màu, hiện nhãn "Đang gọi".

Chế độ demo chỉ đồng bộ giữa các tab trên CÙNG máy. Muốn điện thoại khách gửi được tới máy bếp, làm Bước 3.

---

## BƯỚC 3 – Bật Firebase để đồng bộ nhiều thiết bị (miễn phí, ~10 phút)
1. Vào https://console.firebase.google.com → đăng nhập Gmail → Create a project
   → đặt tên (vd: phuc-tam) → có thể tắt Google Analytics → Create.
2. Menu trái: Build → Firestore Database → Create database
   → Location: asia-southeast1 (Singapore) → Start in **test mode** → Create.
3. Bấm bánh răng (Project settings) → kéo xuống Your apps → bấm biểu tượng </> (Web)
   → đặt tên (vd: phuc-tam-web) → Register app.
4. Firebase hiện đoạn code có `const firebaseConfig = { ... }`. Copy phần trong ngoặc { }.
5. Trên GitHub mở file firebase-config.js → bấm bút chì (Edit) → sửa dòng
   `window.FIREBASE_CONFIG = null;` thành:
   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "AIza....",
     authDomain: "phuc-tam.firebaseapp.com",
     projectId: "phuc-tam",
     storageBucket: "phuc-tam.appspot.com",
     messagingSenderId: "....",
     appId: "...."
   };
   ```
   → Commit changes.
6. Đợi Vercel deploy xong → mở quan-ly.html, góc phải hiện **"Đang đồng bộ thật"** là thành công.

Firestore test mode tự khóa sau 30 ngày. Muốn demo lâu hơn: Firestore → tab Rules → dán:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /phuctam/{doc} { allow read, write: if true; }
    match /tickets/{doc} { allow read, write: if true; }
    match /calls/{doc}   { allow read, write: if true; }
  }
}
```
→ Publish. (Vẫn là quyền mở – chỉ dùng cho giai đoạn demo.)

---

## BƯỚC 4 – Cài đặt cho quán (máy Quản lý)
Mở …/quan-ly.html:
1. **Sơ đồ bàn** → bấm "Chỉnh sơ đồ" → kéo thả bàn theo vị trí thật → "Xong".
   "+ Thêm bàn" để thêm; bấm vào bàn → "Đổi tên / số chỗ / xóa bàn".
2. **Phân công bếp** → đặt tên trạm (vd: Bếp nóng, Bếp nguội – Khai vị, Quầy nước)
   → chọn mỗi nhóm món thuộc trạm nào.
3. **Cài đặt** → chọn thực đơn đang mở: Ngày thường / Ngày chay (Rằm & mùng Một).
4. **Mã QR từng bàn** → kiểm tra đường dẫn là tên miền Vercel → "In tất cả mã QR"
   → in, ép plastic, dán lên đúng bàn.
   Đổi tên bàn KHÔNG cần in lại QR (QR dùng mã bàn B1, B2…).

---

## BƯỚC 5 – Cài màn hình Bếp & Phục vụ
Mỗi trạm 1 máy tính bảng / điện thoại:
- Bếp nóng: …/bep.html?tram=nong
- Bếp nguội – Khai vị: …/bep.html?tram=nguoi
- Quầy nước: …/bep.html?tram=nuoc
- Nhân viên chạy món / phục vụ: …/bep.html?tram=chaymon
(Trạm tự tạo thêm: vào Phân công bếp → "Mở màn hình trạm" để lấy link.)

Trên mỗi máy:
1. Mở link → bấm **"Bật âm báo"** (bắt buộc bấm 1 lần thì trình duyệt mới cho kêu; đồng thời giữ màn hình không tắt).
2. Cài ra màn hình chính cho tiện:
   - Android (Chrome): menu ⋮ → "Thêm vào màn hình chính" / "Cài đặt ứng dụng".
   - iPhone/iPad (Safari): nút Chia sẻ → "Thêm vào MH chính".
3. Để máy cắm sạc, tắt chế độ tự khóa màn hình.

Cách bếp làm việc:
- Có món mới → popup liệt kê theo bàn, số **#1, #2…** là thứ tự làm.
- "Nhận & bắt đầu làm" → món sang cột Đang làm → làm xong bấm "Xong món".
- Màn hình Chạy món nhận popup món đã xong → mang ra bàn → "Đã lên món".
- Khách bấm chuông → popup đỏ ở màn hình Chạy món và nhãn "Đang gọi" trên sơ đồ → xử lý xong bấm "Đã xử lý".
- Món chờ quá 15 phút chuyển viền đỏ.

---

## BƯỚC 6 – Test thật bằng điện thoại
1. Máy bếp mở bep.html (đã bật âm báo), máy quản lý mở quan-ly.html.
2. Dùng điện thoại quét QR Bàn 1 → chọn món → Gửi order.
3. Kiểm tra: máy bếp kêu + popup; sơ đồ Bàn 1 đổi màu; điện thoại thấy trạng thái món đổi theo bếp.
4. Bấm chuông trên điện thoại → "Xin thanh toán" → màn hình chạy món báo.
5. Máy quản lý bấm Bàn 1 → "Thanh toán & dọn bàn".

---

## Vận hành hằng ngày
- Ngày Rằm / mùng Một: quan-ly.html → Cài đặt → Ngày chay. Hôm sau chuyển lại Ngày thường.
- Khách thanh toán: bấm bàn trên sơ đồ → Thanh toán & dọn bàn.
- Đổi giá / thêm món: sửa menu-data.js trên GitHub (dòng dạng T('Tên', 'English', '55k', 1)) → Commit.
  Website giới thiệu dùng script.js – nếu đổi giá thì sửa cả 2 file.
- Ảnh món nổi bật trên app khách: khai báo trong order.js (mảng FEATURED).

## Gỡ lỗi thường gặp
| Hiện tượng | Cách xử lý |
|---|---|
| Điện thoại gửi order nhưng bếp không thấy | Chưa bật Firebase (góc phải ghi "Chế độ demo") → làm Bước 3 |
| Báo "Không kết nối được dữ liệu" | Sai cấu hình trong firebase-config.js hoặc Firestore hết hạn test mode → xem Bước 3 |
| Quét QR báo "Không tìm thấy bàn" | Bàn đã bị xóa trên sơ đồ; tạo lại hoặc in QR mới |
| Bếp không kêu | Bấm "Bật âm báo", tăng âm lượng máy, không để tab chạy nền quá lâu |
| Sửa code nhưng web chưa đổi | Đợi Vercel deploy xong (tab Deployments) rồi tải lại trang (Ctrl + F5) |

## Trước khi dùng chính thức (giai đoạn sau)
- Thêm đăng nhập cho nhân viên ở quan-ly.html và bep.html.
- Siết Firestore Rules: khách chỉ được tạo order, không sửa/xóa.
- Gắn tên miền riêng (Vercel → Settings → Domains).
