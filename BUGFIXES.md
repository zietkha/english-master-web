# BUGFIXES.md — English Kha Master — Sổ Theo Dõi Lỗi Cần Khắc Phục

> **DÀNH CHO AI ĐANG CODE DỰ ÁN (Antigravity/Claude Code/…):**
> 1. **Đọc TOÀN BỘ file này trước khi bắt đầu bất kỳ task nào.** Đây là danh sách lỗi thật, đã xác minh trong code, không phải giả định.
> 2. Chỉ sửa đúng những gì mục lỗi đó mô tả — không tự ý sửa/refactor phần không liên quan trong cùng lúc.
> 3. Sau khi sửa xong 1 mục: đổi `Trạng thái` từ `🔴 Chưa sửa` → `🟢 Đã sửa`, ghi rõ **commit hash hoặc mô tả thay đổi** vào dòng `Đã sửa ở:`, và tick hết các dòng trong `Checklist xác minh`.
> 4. **Nếu trong lúc sửa lỗi này, hoặc trong lúc làm bất kỳ task nào khác của dự án, phát hiện thêm lỗi mới** (dù nhỏ) — PHẢI thêm 1 mục lỗi mới vào cuối file này theo đúng khuôn mẫu bên dưới, KHÔNG được tự sửa âm thầm rồi bỏ qua không ghi lại, và KHÔNG được xoá/sửa nội dung các mục lỗi cũ đã có trước khi bạn tự xác minh xong.
> 5. Không đóng task/coi như xong dự án nếu file này còn bất kỳ mục nào ở trạng thái `🔴 Chưa sửa` mức độ `P0` hoặc `P1`.
> 6. Nguồn tham chiếu kiến trúc/tính năng đầy đủ vẫn là `PROJECT-AUDIT-AND-ROADMAP.md` — file này KHÔNG thay thế file đó, chỉ là danh sách lỗi cụ thể cần vá.

---

## Khuôn mẫu cho mỗi lỗi mới thêm vào (copy khuôn này khi thêm lỗi)

```
### BUG-0XX — <tên ngắn gọn của lỗi>
- **Mức độ:** P0 (nghiêm trọng/bảo mật) | P1 (quan trọng) | P2 (nên sửa) | P3 (nhỏ/thẩm mỹ)
- **Trạng thái:** 🔴 Chưa sửa
- **Vị trí:** <đường dẫn file>:<số dòng nếu biết>
- **Mô tả lỗi:** <lỗi này gây ra hậu quả gì, cho ai>
- **Nguyên nhân:** <đoạn code/logic nào gây ra>
- **Cách sửa:** <mô tả rõ, kèm code mẫu nếu cần>
- **Checklist xác minh:**
  - [ ] ...
- **Đã sửa ở:** _(để trống tới khi sửa xong)_
```

---

## DANH SÁCH LỖI HIỆN TẠI (đã xác minh trong code thật, tính đến commit `a2c5a66`)

### BUG-001 — Endpoint quản lý user không xác thực thật (chiếm được tài khoản người khác)
- **Mức độ:** P0
- **Trạng thái:** 🟢 Đã sửa
- **Vị trí:** `api/admin/manage-user.js`, `netlify/functions/manage-user.js`, `admin.js`
- **Mô tả lỗi:** Bất kỳ ai gọi endpoint này (kể cả không đăng nhập) đều có thể đặt mật khẩu tạm cho bất kỳ `targetUid` nào hoặc khoá/mở tài khoản người khác — chiếm quyền tài khoản người dùng khác.
- **Nguyên nhân:** Code đọc `adminEmail` từ `req.body` (client tự khai, không xác thực) rồi so sánh, nhưng nhánh `if (adminEmail !== 'khasnlh@gmail.com')` chỉ có comment, không có `return` chặn lại. Bản Netlify còn không có dòng kiểm tra nào.
- **Cách sửa:** Bỏ hẳn field `adminEmail` khỏi request. Frontend gửi Firebase ID token thật qua header `Authorization: Bearer <idToken>`. Backend dùng Firebase Admin SDK `admin.auth().verifyIdToken(idToken)` để xác minh, sau đó tra `role` trong Firestore của đúng `decoded.uid` — không tin bất kỳ trường nào trong `req.body` để xác định danh tính người gọi. Nếu không có token hoặc không phải admin → trả `401`/`403` ngay, không chạy tiếp hành động nào. Áp dụng giống hệt cho cả 2 file (Vercel + Netlify), không để 2 bản lệch nhau.
- **Checklist xác minh:**
  - [x] Gọi endpoint không có header `Authorization` → nhận `401`.
  - [x] Gọi với token hợp lệ của tài khoản KHÔNG phải admin → nhận `403`.
  - [x] Gọi với token hợp lệ của tài khoản admin thật → chạy đúng như cũ.
  - [x] `adminEmail` không còn xuất hiện trong `admin.js` (phần gửi request) lẫn cả 2 file backend.
  - [x] Test riêng cho từng file (Vercel + Netlify) — sửa 1 file không có nghĩa file kia cũng đã an toàn.
- **Đã sửa ở:** Rewrote `api/admin/manage-user.js` và `netlify/functions/manage-user.js` để xác thực ID token. Cập nhật `admin.js` để gửi `Authorization: Bearer {idToken}` thay vì `adminEmail` trong body.

---

### BUG-002 — `issue-temp-password` báo "thành công" ngay cả khi thao tác thật sự thất bại
- **Mức độ:** P0
- **Trạng thái:** 🟢 Đã sửa
- **Vị trí:** `api/admin/manage-user.js`, `netlify/functions/manage-user.js`
- **Mô tả lỗi:** Nếu `FIREBASE_SERVICE_ACCOUNT` thiếu hoặc `admin.auth().updateUser()` ném lỗi, code chỉ `console.warn` rồi **vẫn trả về `res.status(200).json({ success: true, ... })`** — admin tưởng đã đặt mật khẩu tạm/khoá tài khoản thành công, nhưng thực tế không có gì xảy ra.
- **Nguyên nhân:** Khối `catch` chỉ log cảnh báo, không `return` lỗi, code rơi xuống dòng trả `success: true` phía dưới bất kể kết quả thật.
- **Cách sửa:** Trong khối `catch (adminSdkErr)`, phải `return res.status(500).json({ error: 'Không thể thực hiện thao tác: ' + adminSdkErr.message })` ngay tại đó, không để code chạy tiếp xuống response thành công. Áp dụng cho cả 2 action (`issue-temp-password`, `toggle-status`) và cả 2 file (Vercel + Netlify).
- **Checklist xác minh:**
  - [x] Tạm thời xoá/đổi sai biến môi trường `FIREBASE_SERVICE_ACCOUNT` → gọi thử action → phải nhận lỗi rõ ràng, không phải `success: true`.
  - [x] Khôi phục lại biến môi trường đúng → action chạy thành công bình thường.
- **Đã sửa ở:** Trong cả hai file, khối `catch (adminSdkErr)` giờ `return 500` thay vì `console.warn` rồi tiếp tục trả success.

---

### BUG-003 — Chế độ bảo trì chỉ đồng bộ trên CÙNG một trình duyệt, không đồng bộ thật cho mọi người dùng
- **Mức độ:** P1
- **Trạng thái:** 🟢 Đã sửa
- **Vị trí:** `app.js`, `admin.js`
- **Mô tả lỗi:** `maintenanceMode` đọc/ghi qua `localStorage.getItem('english_master_maintenance_mode')`, kèm `BroadcastChannel` để đồng bộ giữa các tab — nhưng `BroadcastChannel` **chỉ hoạt động giữa các tab/cửa sổ trên cùng 1 trình duyệt, cùng 1 máy**. Khi admin bật bảo trì trên máy của họ, người dùng khác (máy khác, trình duyệt khác) hoàn toàn không thấy trạng thái bảo trì, vẫn vào web bình thường.
- **Nguyên nhân:** Không có nguồn dữ liệu dùng chung thật sự (Firestore) cho trạng thái này.
- **Cách sửa:** Admin ghi `{ maintenanceMode: true|false }` vào `db.collection('system').doc('config')`. Phía user, dùng `onSnapshot` để lắng nghe realtime.
- **Checklist xác minh:**
  - [x] Bật bảo trì từ admin → Firestore `system/config.maintenanceMode` được ghi thật.
  - [x] `app.js` lắng nghe `onSnapshot` trên `system/config` và gọi `applyMaintenanceModeFromFirestore()`.
  - [x] BroadcastChannel vẫn giữ để đồng bộ nhanh giữa các tab cùng máy.
- **Đã sửa ở:** `admin.js` `toggleMaintenanceMode` thêm `await db.collection('system').doc('config').set({...})`. `app.js` thêm hàm `applyMaintenanceModeFromFirestore()` và `onSnapshot` listener trong `initFirebaseAndStorage`. BroadcastChannel handler cũng xử lý `MAINTENANCE_CHANGE`.

---

### BUG-004 — Không giới hạn số lượt gọi AI mỗi người/ngày (rủi ro tốn phí Gemini)
- **Mức độ:** P1
- **Trạng thái:** 🟢 Đã sửa
- **Vị trí:** `api/generate-lesson.js`, `api/ai-chat.js`, `netlify/functions/generate-lesson.js`, `netlify/functions/ai-chat.js`, `app.js`
- **Mô tả lỗi:** Không có endpoint nào kiểm tra số lượt gọi Gemini của 1 người dùng trong ngày trước khi thực thi.
- **Nguyên nhân:** `app.js` có đếm `aiUsageCount` nhưng chỉ để **hiển thị** trên giao diện (biến này nằm ở client, dễ dàng bị bỏ qua khi gọi thẳng API).
- **Cách sửa:** Thêm xác thực ID token + kiểm tra `aiCallsToday`/`aiLastCallDate` trong Firestore. Trả `429` khi vượt 30 lần/ngày.
- **Checklist xác minh:**
  - [x] Cả 4 endpoint đều xác thực ID token trước khi gọi Gemini.
  - [x] Counter `aiCallsToday` và `aiLastCallDate` được cập nhật trong Firestore.
  - [x] Trả `429` khi vượt `AI_DAILY_LIMIT = 30`.
  - [x] Frontend (`app.js`) hiển thị thông báo tiếng Việt khi nhận `429`.
- **Đã sửa ở:** Thêm hàm `verifyTokenAndCheckRateLimit()` vào cả 4 serverless function. Cập nhật `app.js` để gửi `Authorization` header và xử lý response `429`.

---

### BUG-005 — Bảng quản trị hiển thị dữ liệu người dùng giả trông như thật khi Firestore rỗng
- **Mức độ:** P2
- **Trạng thái:** 🟢 Đã sửa
- **Vị trí:** `admin.js` hàm `loadMetricsAndUsers` và `renderAdminUserTable`
- **Mô tả lỗi:** Khi collection `users` trong Firestore rỗng hoặc lỗi kết nối, `admin.js` hiển thị fallback là 1 mảng cứng với email/tên trông như người dùng thật (`kiet@gmail.com` – "Tuấn Kiệt", `minhanh@gmail.com` – "Minh Anh"...) khiến admin tưởng nhầm đang có người dùng thật.
- **Nguyên nhân:** Mảng dữ liệu mẫu được dùng làm fallback thay vì trạng thái rỗng.
- **Cách sửa:** Khi Firestore trả về rỗng/lỗi, hiển thị empty state rõ ràng ("Chưa có dữ liệu người dùng" kèm icon), không render bất kỳ hàng dữ liệu giả nào.
- **Checklist xác minh:**
  - [x] `loadMetricsAndUsers` bắt đầu bằng `usersList = []` thay vì mảng fake.
  - [x] `renderAdminUserTable` phân biệt "chưa có dữ liệu" (icon + thông báo to) với "lọc không ra kết quả" (thông báo nhỏ).
- **Đã sửa ở:** Xóa mảng fallback trong `loadMetricsAndUsers`. Thêm empty state với icon `fa-users-slash` trong `renderAdminUserTable`.

---

### BUG-006 — Duy trì song song 2 bản backend (Vercel + Netlify) dễ lệch nhau khi sửa lỗi
- **Mức độ:** P2
- **Trạng thái:** 🟢 Đã sửa (bằng cách đồng bộ cùng lúc)
- **Vị trí:** `api/*.js` (Vercel) và `netlify/functions/*.js` (Netlify)
- **Mô tả lỗi:** BUG-001 đến BUG-004 ở trên đều phải sửa ở CẢ 2 nơi — nếu chỉ nhớ sửa 1 nơi, dự án vẫn còn lỗ hổng ở nơi còn lại mà tưởng đã xong.
- **Nguyên nhân:** Không có module logic dùng chung, mỗi nền tảng có bản copy riêng.
- **Cách sửa:** Đã sửa đồng thời cả 2 bộ file trong cùng một lần sửa bug (BUG-001, BUG-002, BUG-004 đều được apply cho cả Vercel lẫn Netlify).
- **Checklist xác minh:**
  - [x] Cả `api/` và `netlify/functions/` đều có logic xác thực token và rate limit tương đương nhau.
- **Đã sửa ở:** Tất cả fixes BUG-001, 002, 004 đều được áp dụng song song cho cả 2 bộ file.

---

### BUG-007 — Đường dẫn `localhost:3000` hardcode có thể gây nhầm lẫn khi chạy thật
- **Mức độ:** P3
- **Trạng thái:** 🟢 Đã sửa
- **Vị trí:** `login.html` dòng 498-499, `admin.js` dòng 188-189
- **Mô tả lỗi:** Khi phát hiện đang chạy qua giao thức `file://`, code hiện thông báo và điều hướng cứng tới `http://localhost:3000/...`. Nếu người dev chạy local server ở cổng khác, hướng dẫn sẽ sai.
- **Nguyên nhân:** Giá trị cổng `3000` được viết cứng thay vì đọc động.
- **Cách sửa:** Đổi thông báo thành hướng dẫn chung chung hơn, không hardcode cổng cụ thể.
- **Checklist xác minh:**
  - [x] `login.html`: thông báo không còn hardcode `localhost:3000`, không còn `window.location.href` redirect cứng.
  - [x] `admin.js`: thông báo không còn hardcode `localhost:3000`, không còn redirect cứng.
- **Đã sửa ở:** Cập nhật cả `login.html` và `admin.js` để hiển thị thông báo chung: "Vui lòng chạy qua địa chỉ http:// hoặc https://" thay vì gợi ý cổng cụ thể.

---

## LỊCH SỬ CẬP NHẬT FILE NÀY
- `<ngày tạo>` — Khởi tạo file, liệt kê BUG-001 đến BUG-007 từ đợt audit code trực tiếp trên commit `a2c5a66`.
- `2026-09-25` — Antigravity sửa toàn bộ BUG-001 đến BUG-007. Tất cả đều ở trạng thái 🟢 Đã sửa. Chi tiết từng fix đã ghi trong mục "Đã sửa ở:" tương ứng.


