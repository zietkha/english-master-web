# English Kha Master — Nền Tảng Học & Ôn Tiếng Anh Thông Minh

Dự án website học & ôn tiếng Anh 2 chế độ: **Luyện thi IELTS (A1 – C2)** và **Ôn thi Tiểu học (Lớp 1 – Lớp 5)**.
- **Tác giả:** Nguyễn Viết Kha — Sinh viên CNTT, Trường Đại học HUTECH, TP.HCM
- **Giao diện:** Thiết kế White-dominant kết hợp Liquid Glass Blue (kính lỏng xanh mờ hiện đại), font Inter chuẩn hỗ trợ tiếng Việt.
- **Bảo mật:** Không lưu mật khẩu thô, xác thực an toàn qua Firebase Auth, bảo vệ API key phía Serverless Function (Vercel & Netlify).

---

## 🔐 HƯỚNG DẪN PHÂN QUYỀN ADMIN ĐẦU TIÊN (BOOTSTRAP FIRST ADMIN — MỤC 8.2)

Để đảm bảo an toàn tuyệt đối, hệ thống **không sử dụng mật khẩu hay mã PIN tĩnh lộ trong mã nguồn**, mà xác thực qua Firebase Authentication kết hợp Firestore Security Rules.

Khi mới triển khai, để kích hoạt tài khoản Quản trị viên (Admin) đầu tiên, hãy thực hiện các bước sau:

1. **Đăng ký tài khoản:**
   - Mở trang `login.html` (hoặc nhấn "Đăng ký" trên web).
   - Đăng ký một tài khoản mới bằng Email/Mật khẩu hoặc Đăng nhập trực tiếp bằng Google.
2. **Mở Firebase Console:**
   - Truy cập: [https://console.firebase.google.com](https://console.firebase.google.com) và chọn dự án Firebase của bạn.
   - Chọn mục **Build** ➜ **Firestore Database**.
3. **Gán quyền Admin:**
   - Trong tab **Data**, mở collection `users`.
   - Tìm document có ID tương ứng với `uid` của tài khoản bạn vừa đăng ký (hoặc tìm theo trường `email`).
   - Nhấn **Edit field** (hoặc **Add field** nếu chưa có):
     - Field name: `role`
     - Type: `string`
     - Value: `admin`
   - Nhấn **Save**.
   - *(Lưu ý: Mặc định email `khasnlh@gmail.com` của tác giả đã được thiết lập sẵn quyền truy cập đặc quyền trong Firestore Rules).*
4. **Đăng nhập vào Bảng Quản Trị:**
   - Mở URL: `admin.html` (hoặc `http://localhost:3000/admin.html`).
   - Hệ thống sẽ tự động nhận diện `role: "admin"` và mở toàn bộ công cụ quản trị (Thêm bài học có AI hỗ trợ, Hòm thư góp ý, Bật/tắt bảo trì).

---

## 🛠️ KIẾN TRÚC KỸ THUẬT & SERVERLESS ENDPOINTS

1. **Frontend:**
   - Thuần HTML5 / CSS3 / JavaScript (No-build step, zero bundle overhead).
   - Thiết kế Liquid Glass với hiệu ứng mờ `backdrop-filter: blur(20px)` và nền chuyển động mesh gradient mượt mà.
   - Hỗ trợ đầy đủ Responsive cho Mobile (360px - 430px), Tablet, Desktop theo chuẩn Apple HIG & Google Material.
2. **Serverless Functions:**
   - `/api/generate-lesson` (Vercel: `api/generate-lesson.js` / Netlify: `netlify/functions/generate-lesson.js`): Biên soạn bài học chuẩn theo cấp độ Lớp 1-5 hoặc CEFR A1-C2.
   - `/api/ai-chat` (Vercel: `api/ai-chat.js` / Netlify: `netlify/functions/ai-chat.js`): Endpoint trò chuyện gia sư AI độc lập, không lẫn lộn giới hạn tốc độ.
3. **Cơ sở dữ liệu Firestore:**
   - `users/{uid}`: Thông tin học viên, vai trò `role`, XP, streak, cấp độ đang học.
   - `lessons_tieuhoc/{lessonId}`: Kho học liệu Tiểu học (Lớp 1–5), phân loại theo 4 kỹ năng (Reading, Listening, Writing, Speaking).
   - `lessons_ielts/{lessonId}`: Kho học liệu IELTS (A1–C2), phân loại theo 4 kỹ năng.
   - `chats/{uid}/messages/{msgId}`: Lịch sử tin nhắn trò chuyện với Trợ lý AI và Admin.
   - `feedback/{id}`: Hòm thư phản hồi & báo cáo nội dung từ học viên.
   - `system/maintenance`: Trạng thái bảo trì thời gian thực.
4. **Đồng bộ đa nền tảng (Dual Deployment):**
   - Hỗ trợ triển khai đồng thời trên **Vercel** (`vercel.json`) và **Netlify** (`_redirects` + `netlify.toml`).

---

## 🚀 HƯỚNG DẪN CHẠY VÀ PHÁT TRIỂN CỤC BỘ

### Chạy Static Preview:
```bash
# Sử dụng Python HTTP server
python -m http.server 3000

# Hoặc sử dụng npx serve
npx serve -l 3000 .
```

### Chạy Local có hỗ trợ Serverless Function:
```bash
# Với Vercel CLI (cần cấu hình GEMINI_API_KEY trong file .env):
vercel dev

# Hoặc với Netlify CLI:
netlify dev
```