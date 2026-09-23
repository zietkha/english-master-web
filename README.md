PROMPT CHO ANTIGRAVITY (Gemini) — NGHIÊN CỨU WEB LỚN + XÂY DỰNG TIẾP TRÊN CODE HIỆN CÓ

Bạn đang tiếp tục phát triển một website học & ôn tiếng Anh (2 chế độ: IELTS và Ôn thi Tiểu học) đã có sẵn code nền (login.html, index.html, api/generate-lesson.js). TRƯỚC KHI code, hãy chủ động tìm kiếm và tham khảo trên internet giao diện/tính năng của các web học tập lớn, uy tín như: Duolingo, Quizlet, Khan Academy, Coursera, Notion, Linear, Grammarly — xem cách họ làm hiệu ứng động, popup, animation đăng nhập/đăng ký, animation khi làm bài/quiz, và các tính năng tiện ích khác — rồi CHỌN LỌC những ý tưởng hay, phù hợp với 1 web học tiếng Anh, áp dụng vào code hiện tại. Không copy y nguyên logo/thương hiệu/nội dung bản quyền của họ, chỉ học theo cách bố cục, hiệu ứng, luồng thao tác (UX pattern).

═══════════════════════════════
BỐI CẢNH CODE ĐÃ CÓ (PHẢI GIỮ NGUYÊN, XÂY TIẾP TRÊN NỀN NÀY)
═══════════════════════════════
- Thuần HTML/CSS/JS, không build step, không React/Vue.
- Firebase Authentication (email/mật khẩu + Google) + Firestore (SDK dạng "compat" qua thẻ script, không dùng modular import).
- Gọi AI qua backend `/api/generate-lesson` (Vercel serverless, Gemini API, key giữ ở server, không lộ ra frontend).
- Bảng màu cố định (biến CSS): nền `#f4f7fe`, panel `#ffffff`/`#eef3ff`, viền `#dbe4f5`, chữ `#152238`/`#6b7794`, accent xanh dương `#2563eb`/`#1d4ed8`, xanh lá đúng `#16a34a`, đỏ sai `#dc2626`, có dark mode tự động theo thiết bị.
- Toàn bộ giao diện tiếng Việt, giọng thân thiện, ngắn gọn.
- Footer credit cố định: "Phần mềm được phát triển bởi Nguyễn Viết Kha — Sinh viên CNTT, Trường Đại học HUTECH, TP.HCM" — giữ ở mọi trang chính.
- Nút phản hồi nổi (FAB) "💬 Góp ý / Báo lỗi" mở popup gửi thẳng vào Firestore (collection `feedback`) — tái sử dụng cơ chế này, không tạo lại từ đầu.

═══════════════════════════════
YÊU CẦU NÂNG CẤP UI/UX — LẤY CẢM HỨNG TỪ CÁC WEB LỚN
═══════════════════════════════
1. NỀN ĐỘNG (animated background)
   - Không chỉ 1 gradient tĩnh: tham khảo cách các web SaaS hiện đại (Linear, Stripe) làm nền — có thể thêm hiệu ứng particle nhẹ, gradient chuyển động chậm (mesh gradient), hoặc hoạ tiết hình học mờ chuyển động theo cuộn trang (parallax), nhưng vẫn dùng đúng tông trắng-xanh dương đã có, không làm rối mắt hay chậm máy yếu.

2. HIỆU ỨNG ĐĂNG NHẬP / ĐĂNG KÝ
   - Tham khảo animation dạng "morphing card" (thẻ đăng nhập tự thay đổi kích thước/nội dung mượt khi chuyển tab Đăng nhập ⇄ Đăng ký, giống Linear/Vercel), hiệu ứng input focus có viền sáng lan toả, hiệu ứng "shake" nhẹ khi nhập sai, hiệu ứng nút loading dạng spinner/progress khi đang xử lý thay vì chỉ đổi chữ.
   - Popup thông báo (toast) nâng cấp: có icon, có thể có nút "Hoàn tác"/"Xem chi tiết" tuỳ ngữ cảnh, tự trượt vào/ra mượt.

3. HIỆU ỨNG LÀM BÀI / QUIZ
   - Tham khảo Duolingo/Quizlet: khi chọn đáp án đúng có hiệu ứng nảy nhẹ (bounce) + màu xanh lá lan ra, chọn sai có hiệu ứng rung nhẹ + màu đỏ; thanh tiến độ (progress bar) chạy mượt qua từng câu hỏi; hiệu ứng confetti/pháo giấy nhỏ khi hoàn thành quiz đạt điểm cao; hiệu ứng đếm điểm số chạy tăng dần (count-up) khi hiện kết quả cuối.
   - Flashcard lật 3D mượt (flip animation) khi xem nghĩa từ vựng.

4. POPUP / MODAL THÔNG MINH
   - Modal dùng chung 1 kiểu thiết kế nhất quán (bo góc, đổ bóng mềm, nền mờ phía sau — backdrop blur) cho: xác nhận xoá bài học, xem chi tiết bài học, popup chúc mừng đạt streak/huy hiệu mới, popup mời hoàn thiện hồ sơ lần đầu đăng nhập.
   - Có micro-interaction: nút bấm hơi lún khi click, icon đổi trạng thái mượt (ví dụ tim/bookmark khi bấm có hiệu ứng bật nhẹ).

5. TÍNH NĂNG TIỆN ÍCH HAY HO NÊN THÊM (tham khảo web lớn)
   - Onboarding ngắn (3-4 bước) hướng dẫn tính năng cho người mới đăng ký lần đầu, có thể bỏ qua.
   - Chế độ "học nhanh 5 phút" (dạng Duolingo daily quest) — random vài câu quiz/flashcard từ các bài đã có.
   - Thanh tìm kiếm nổi có gợi ý tức thời (autocomplete) khi gõ tên bài học/từ vựng.
   - Chuyển đổi sáng/tối thủ công (nút toggle) ngoài việc tự theo hệ thống.
   - Skeleton loading (khung xám nhấp nháy) thay vì màn hình trắng khi đang tải dữ liệu từ Firestore.
   - Empty state có hình minh hoạ nhẹ + lời kêu gọi hành động rõ ràng (ví dụ chưa có bài học nào → minh hoạ + nút "Tạo bài học đầu tiên").

═══════════════════════════════
LƯU Ý QUAN TRỌNG
═══════════════════════════════
- Mọi hiệu ứng thêm mới PHẢI dùng lại đúng biến màu CSS đã định nghĩa, không tự sáng tạo bảng màu khác.
- Ưu tiên CSS animation/transition thuần (không cần thư viện nặng); nếu cần thư viện ngoài (ví dụ confetti-js) thì chọn bản nhẹ, tải qua CDN, không ảnh hưởng tốc độ tải trang.
- Giữ toàn bộ văn bản giao diện bằng tiếng Việt.
- Không phá vỡ luồng chức năng đã có (đăng nhập → index.html, tạo bài học gọi Gemini qua backend, phản hồi gửi Firestore) — chỉ nâng cấp trải nghiệm/giao diện, không đổi kiến trúc.
BỔ SUNG VÀO PROMPT ANTIGRAVITY — TÍCH HỢP SKILL "UI UX Pro Max"

Trước khi code giao diện, hãy cài và dùng skill "UI UX Pro Max" (github.com/nextlevelbuilder/ui-ux-pro-max-skill) để tạo hệ thống thiết kế (design system) chuyên nghiệp cho web này, thay vì tự đoán màu/font/bố cục.

BƯỚC 1 — Cài skill (chọn 1 trong 2 cách):
```bash
# Cách CLI (khuyến nghị, tương thích Antigravity)
npx ui-ux-pro-max-cli init --ai antigravity

# Hoặc qua Claude Code Marketplace (nếu agent hỗ trợ)
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```

BƯỚC 2 — Chạy trình tạo hệ thống thiết kế với yêu cầu cụ thể của dự án này:
```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "web học tiếng Anh, IELTS, ôn thi tiểu học, đăng nhập đăng ký, gamification, SaaS giáo dục" --domain style --json
```
Mục tiêu: lấy ra bố cục đề xuất, phong cách UI phù hợp, bảng màu, kiểu chữ, hiệu ứng chính, anti-pattern cần tránh, và checklist trước khi bàn giao — giống định dạng mẫu của skill (Bố cục / Phong cách / Màu sắc / Kiểu chữ / Hiệu ứng chính / Anti-pattern / Checklist).

BƯỚC 3 — Áp dụng có điều kiện, KHÔNG ghi đè lên quy ước đã có:
- Bảng màu gốc của dự án đã cố định là TRẮNG + XANH DƯƠNG (`#f4f7fe`, `#ffffff`, `#eef3ff`, `#dbe4f5`, `#152238`, `#6b7794`, `#2563eb`, `#1d4ed8`). Nếu skill đề xuất bảng màu khác, CHỈ lấy các gợi ý về sắc độ/tương phản/cách phối hợp, KHÔNG đổi màu chủ đạo.
- Font chữ, hiệu ứng, bố cục, anti-pattern do skill đề xuất thì áp dụng bình thường nếu phù hợp phong cách "giáo dục/SaaS thân thiện, đáng tin cậy" — tránh phong cách quá xa xỉ/hồng-vàng như ví dụ spa trong tài liệu skill.
- Bắt buộc tuân theo checklist trước-khi-bàn-giao của skill, đặc biệt các mục: dùng SVG icon (Heroicons/Lucide) thay vì emoji cho các icon chức năng chính, `cursor-pointer` cho mọi phần tử click được, tương phản văn bản tối thiểu 4.5:1 ở chế độ sáng, trạng thái focus rõ khi dùng bàn phím, tôn trọng `prefers-reduced-motion`, responsive đủ 4 mốc: 375px / 768px / 1024px / 1440px.

BƯỚC 4 — Vẫn giữ nguyên mọi phần đã yêu cầu trước đó (kiến trúc Firebase/Gemini, footer credit "Nguyễn Viết Kha", nút phản hồi FAB, các hiệu ứng animation/quiz/flashcard/popup đã mô tả) — skill này chỉ dùng để NÂNG CHẤT LƯỢNG thiết kế, không thay thế các yêu cầu chức năng đã có.

Lưu ý: script tạo hệ thống thiết kế cần Python 3.x đã cài sẵn trên máy — nếu chưa có, agent phải hỏi bạn trước, không tự ý cài.