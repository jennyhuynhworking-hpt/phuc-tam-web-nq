# HƯỚNG DẪN – Nhà Hàng Chay Phúc Tâm (Website + Gọi món QR + Quản lý + Bếp)

## 0. Các màn hình
| Link | Ai dùng | Làm gì |
|---|---|---|
| `/` (index.html) | Khách | Website giới thiệu, xem thực đơn, đặt bàn (gửi thẳng về trang Quản lý) |
| `/dat-hang.html` | Khách đặt online | Đặt món giao tận nơi, chuyển khoản trước, theo dõi đơn |
| `/order.html?ban=B1` | Khách (quét QR) | Gọi món tại bàn, xem trạng thái món, bấm chuông gọi nhân viên |
| `/quan-ly.html` | Chủ quán / thu ngân | Sơ đồ & thanh toán, Đặt bàn, Thực đơn, Báo cáo thu chi, Mã QR, Phân công bếp, Cài đặt |
| `/bep.html?tram=…` | Bếp / phục vụ | Màn hình từng trạm, gom món, chạy món & khách gọi |

Tất cả file nằm CÙNG MỘT CẤP trong repo (kể cả ảnh .jpg, .png).

## 1. Cập nhật code lên GitHub
1. Giải nén phuc-tam-web.zip.
2. Repo → Add file → Upload files → kéo thả TẤT CẢ file (Ctrl + A) → Commit changes.
3. **Giữ nguyên file firebase-config.js đang có trên GitHub** (đã dán cấu hình). Nếu lỡ ghi đè, dán lại cấu hình Firebase.
4. Có thể xóa file script.js cũ trên GitHub (không còn dùng).

## 2. Cập nhật Firestore Rules (bắt buộc, vì có thêm dữ liệu mới)
Firebase Console → Databases & Storage → Firestore → tab **Rules** → dán → **Publish**:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /phuctam/{doc}  { allow read, write: if true; }
    match /tickets/{doc}  { allow read, write: if true; }
    match /calls/{doc}    { allow read, write: if true; }
    match /bookings/{doc} { allow read, write: if true; }
    match /bills/{doc}    { allow read, write: if true; }
    match /expenses/{doc} { allow read, write: if true; }
    match /deliveries/{doc} { allow read, write: if true; }
    match /images/{doc}   { allow read, write: if true; }
  }
}
```
(Quyền mở – chỉ dùng giai đoạn demo. Bản chính thức sẽ thêm đăng nhập nhân viên.)

## 3. Cài đặt ban đầu (quan-ly.html → tab Cài đặt)
1. **Tài khoản nhận chuyển khoản**: chọn ngân hàng, nhập số tài khoản, tên chủ tài khoản (KHÔNG DẤU, IN HOA) → Lưu.
   Quét mã thử 10.000đ bằng app ngân hàng, kiểm tra hiện đúng tên tài khoản.
2. **Thông tin in trên bill**: địa chỉ, SĐT, lời cảm ơn, khổ giấy 80mm hoặc 58mm.
3. **Thực đơn đang mở**: Ngày thường / Ngày chay.

## 4. Sửa thực đơn (tab Thực đơn)
- Chọn Ngày thường / Ngày chay ở trên cùng.
- Sửa trực tiếp tên, tên tiếng Anh, giá (vd `55k`, `10k/cuốn`), tick Must try.
- **Hết món**: bỏ tick "Còn" → khách thấy "Tạm hết", không gọi được. Có món lại thì tick lại.
- Thêm/xóa món, thêm/xóa/đổi thứ tự nhóm.
- Bấm **Lưu thực đơn** → app gọi món và website đổi ngay.
- **Cách nhanh bằng Excel**: "Tải file Excel" → sửa trong Excel (giữ nguyên tên cột) → "Nhập từ Excel" → kiểm tra → Lưu.
  Cột: Thực đơn | Nhóm | Tên món | Tên tiếng Anh | Giá | Must try (x) | Hết món (x).
- Nhóm món mới: vào tab **Phân công bếp** chọn trạm cho nhóm đó.
- **Ảnh món**: bấm "+ Thêm ảnh" ở cột Ảnh → chọn ảnh từ máy/điện thoại → ảnh tự nén nhỏ (~50–100KB) → bấm **Lưu thực đơn**.
  Ảnh hiện trên app gọi món, trang đặt giao hàng và website. Món Must try có ảnh tự vào mục "Món nên thử".
  Ảnh lưu miễn phí trong Firestore (không cần gói trả phí). Nên chụp ngang, món ở giữa, đủ sáng.

## 5. Đặt bàn
- Khách đặt trên website → trang Quản lý **hiện popup** (bấm "Bật âm báo" để có chuông), tab Đặt bàn có số đỏ.
- Gọi khách xác nhận → "Đã gọi – Xác nhận". Khách tới → "Khách đã đến". Hủy nếu khách báo hủy.
- Khách gọi điện đặt: "+ Thêm đặt bàn".
- Website chỉ nhận giờ 9:00–13:30 và 16:30–20:30.

## 6. Bếp – phân công không cần bấm từng món
Mỗi trạm 1 máy: `bep.html?tram=nong`, `?tram=nguoi`, `?tram=nuoc`, phục vụ `?tram=chaymon`.
- **Theo bàn**: mỗi thẻ là 1 lần gọi của 1 bàn → bấm **1 nút "Bắt đầu cả N món" / "Xong cả N món"**. Vẫn bấm riêng từng món được nếu cần.
- **Gom theo món**: món giống nhau từ nhiều bàn gộp lại (vd "Pad Thái × 5 – Bàn 2, Bàn 6…") → nấu một mẻ → **"Xong cả 5 phần"**.
- **Tự nhận món mới**: tick để món mới tự vào cột Đang làm, không cần bấm nhận.
- Popup món mới có nút **"Nhận tất cả & bắt đầu làm"**.
- Màn hình **Chạy món & khách gọi**: món xong gom theo bàn → "Đã mang ra hết"; khách bấm chuông → popup đỏ → "Đã xử lý".
- Bấm "Bật âm báo" (màn hình sẽ không tự tắt). Thêm vào màn hình chính cho tiện.

## 7. Thanh toán (tab Sơ đồ & thanh toán)
1. Bấm bàn → **Thanh toán** (hoặc "In tạm tính" – có in sẵn mã QR chuyển khoản).
2. Nhập giảm giá nếu có. Màn hình hiện số tiền khách cần trả.
3. Chọn:
   - **Chuyển khoản**: hiện mã VietQR đúng số tiền → đưa khách quét → thấy app ngân hàng báo tiền về → "Đã nhận chuyển khoản & in bill".
   - **Tiền mặt**: nhập/bấm số tiền khách đưa → hiện tiền thối → "Đã thu tiền & in bill".
4. Bàn được dọn, hóa đơn lưu vào báo cáo.

## 8. Máy in bill
Dùng máy in nhiệt khổ 80mm/58mm có cổng USB hoặc LAN (Xprinter, Epson TM, Antech…).
1. Cắm máy in vào máy tính thu ngân, cài driver của hãng.
2. Windows → Máy in → đặt máy in nhiệt làm **mặc định**; khổ giấy 80mm (hoặc 58mm), lề 0.
3. Lần đầu bấm "In bill": trong hộp thoại in chọn máy in nhiệt, Lề = Không, bỏ "Đầu trang và chân trang" → In.
4. **In không cần bấm xác nhận** (máy thu ngân dùng Chrome): chuột phải shortcut Chrome → Properties → ô Target thêm
   ` --kiosk-printing` vào cuối → OK → mở Chrome bằng shortcut này để vào quan-ly.html. Bill sẽ in thẳng ra máy mặc định.
5. Điện thoại/máy tính bảng Android: cài app in của hãng hoặc "RawBT", chọn in qua Bluetooth/LAN từ hộp thoại in.

## 9. Báo cáo thu chi (tab Báo cáo thu chi)
- Chọn Hôm nay / Hôm qua / 7 ngày / Tháng này hoặc chọn từ ngày – đến ngày.
- Xem: doanh thu, số bill, trung bình/bill, tiền mặt, chuyển khoản, chi phí, **Thu – Chi**.
- **Món bán chạy** (số phần, doanh thu), doanh thu theo nhóm món, theo giờ (hoặc theo ngày).
- **Ghi chi phí**: nguyên liệu, nhân công, điện nước gas… → tính vào Thu – Chi.
- Danh sách hóa đơn, **In lại** bill. **Xuất Excel** (3 sheet: hóa đơn, chi tiết món, chi phí).

## 10. Đặt món giao hàng (thanh toán trước)
Luồng: Khách chọn món → nhập địa chỉ, khu vực → **chuyển khoản theo mã QR** → quán xác nhận tiền → bếp làm → đóng gói → giao → xong.

| Trạng thái | Ai làm | Thao tác |
|---|---|---|
| Chờ xác nhận thanh toán | Thu ngân | Popup "Đơn mới" / "Khách báo đã CK" → mở app ngân hàng kiểm tra đúng số tiền và **nội dung CK (vd PTE2XD 5678)** → "Đã nhận tiền → chuyển bếp". Không thấy tiền → "Hủy" (ghi lý do) |
| Bếp đang làm | Bếp | Món hiện như bình thường, có nhãn **GIAO HÀNG** |
| Chờ giao | Phục vụ | Màn hình Chạy món → đóng gói → "Đã đóng gói xong" (đơn tự chuyển sang Chờ giao). Thu ngân "In phiếu giao" dán lên túi |
| Đang giao | Thu ngân | "Giao cho shipper" → nhập tên/SĐT shipper (nhân viên quán, Grab, Be…) |
| Hoàn thành | Thu ngân | "Đã giao xong" |

- Khách thấy trạng thái từng bước trên điện thoại (trang tự cập nhật). Đơn chưa chuyển khoản được giữ 15 phút.
- Cài đặt → **Giao hàng**: bật/tắt nhận đơn, đơn tối thiểu, thời gian chuẩn bị, khu vực & phí ship (mỗi dòng `Tên khu vực | Phí`). **Phí ship mặc định là số mẫu – sửa lại theo thực tế.**
- Chỉ nhận đơn 9:00–13:30 và 16:30–20:30 và khi đã cài tài khoản ngân hàng.
- Đơn đã thanh toán mà phải hủy: "Hủy & hoàn tiền" → hệ thống ghi khoản hoàn vào chi phí; nhớ chuyển trả khách.
- Doanh thu giao hàng tính vào báo cáo ngay khi xác nhận tiền (có ô "Giao hàng" riêng).

## 11. Vận hành hằng ngày
- Đầu ca: máy bếp mở bep.html + bật âm báo; máy thu ngân mở quan-ly.html + bật âm báo.
- Rằm / mùng Một: Cài đặt → Ngày chay. Hôm sau chuyển lại.
- Món hết giữa ca: Thực đơn → bỏ tick "Còn" → Lưu.
- Cuối ngày: Báo cáo → Hôm nay → nhập chi phí → Xuất Excel lưu trữ.

## Gỡ lỗi
| Hiện tượng | Cách xử lý |
|---|---|
| Đặt bàn/thanh toán báo lỗi "permission" | Chưa cập nhật Firestore Rules (Bước 2) |
| Không hiện mã QR chuyển khoản | Chưa cài tài khoản ở Cài đặt, hoặc mất mạng |
| In bill bị lề/chữ nhỏ | Hộp thoại in: Lề = Không, Tỷ lệ 100%, khổ giấy đúng 80mm |
| Sửa thực đơn chưa thấy đổi | Chưa bấm "Lưu thực đơn"; tải lại trang khách |
| Popup không kêu | Bấm "Bật âm báo" mỗi lần mở trang |
