# 🎓 Sorbonne Copilot

Web app (cài được lên màn hình điện thoại như một app) dành cho sinh viên **L1 EEA – Sorbonne Université, campus Pierre et Marie Curie (Jussieu)**, chạy bằng Claude.

| Tab | Làm gì |
|---|---|
| 🏠 **Hôm nay** | Bản tin mỗi sáng (tự động 7h30 giờ Paris): campus mở/đóng, blocus, AG, đoàn biểu tình đi đến đâu, giao thông lines 7/10, deadline & thi sắp tới → **"Hôm nay có cần lên trường không?"**. Gửi thông báo về điện thoại. |
| 🔎 **Kiểm chứng** | Dán nội dung hoặc gửi **ảnh chụp mail / story Instagram / bài Facebook / tin tức** → Claude research web (nguồn chính thức → báo chí → mạng xã hội), cho verdict ✅⚠️❌❓ từng thông tin, kiểm tra tin cũ bị "xào lại", bổ sung bối cảnh, và tự thêm ngày thi/hạn nộp vào lịch. |
| 📬 **Đọc mail** | Kết nối hộp thư qua IMAP, lọc mail liên quan tới trường, tóm tắt và trích **cần nộp gì, ngày nào, thi gì**. |
| 📅 **Lịch & thi** | Tất cả hạn nộp / kỳ thi / ngày nghỉ / ngày đóng cửa, kèm **nội dung thi**. Xuất `.ics` sang Lịch iPhone/Google. Nút **"Lập kế hoạch ôn thi"**. |
| 🧠 **Học** | Upload slide / giáo trình (PDF, ảnh). Gia sư **Feynman**: giảng từng ý, liên tưởng vui, rồi bắt bạn **giải thích lại** và chấm điểm. Hỏi sâu "bản chất" → tra nguồn học thuật uy tín (MIT OCW, Feynman Lectures, HAL…). Bật **🇻🇳 "Tui không hiểu tiếng Pháp"** để chuyển sang tiếng Việt (giữ thuật ngữ Pháp). |
| ✏️ **Sửa tiếng Pháp** | Mỗi tin nhắn tiếng Pháp bạn gửi được kiểm tra ngữ pháp; lỗi được giải thích (FR + VI) với mẹo nhớ dí dỏm và **tự thành flashcard**. |
| 🃏 **Ôn tập** | Flashcards lặp lại ngắt quãng (SM-2): thẻ từ tài liệu + thẻ lỗi ngữ pháp. |

## Chạy thử trên máy

Cần Node.js ≥ 22.

```bash
npm install
cp .env.example .env      # rồi điền ANTHROPIC_API_KEY (và mail / ntfy nếu muốn)
npm start                 # mở http://localhost:3000
```

Trên iPhone: mở địa chỉ app bằng Safari → Chia sẻ → **Thêm vào MH chính**.

## Nhận thông báo mỗi sáng trên điện thoại

1. Cài app **ntfy** (miễn phí), bấm "+" và đăng ký một topic dài, khó đoán, vd `sorbonne-7xq2-8f3k2q`.
2. Đặt `NTFY_TOPIC=sorbonne-7xq2-8f3k2q` trong `.env`.
3. Server phải **chạy liên tục** để cron 7h30 hoạt động → nên deploy lên một dịch vụ như Render, Railway, Fly.io hoặc một VPS nhỏ (nhớ đặt `APP_PASSWORD` và giữ thư mục `data/` trên ổ lưu trữ bền).
   Cách khác: tắt cron (`DIGEST_CRON=off`) và gọi `npm run digest` từ cron hệ thống.

## Đọc mail tự động

- **iCloud**: `IMAP_HOST=imap.mail.me.com`, `IMAP_USER=` địa chỉ iCloud, `IMAP_PASS=` *mật khẩu cho ứng dụng* (tạo tại appleid.apple.com → Đăng nhập & Bảo mật).
- **Mail sinh viên Sorbonne** chạy trên Microsoft 365, thường không cho đăng nhập IMAP bằng mật khẩu. Cách đơn giản nhất: trong Outlook web của trường, bật **chuyển tiếp (forward)** sang iCloud/Gmail, rồi kết nối iCloud/Gmail như trên.
- Từ khoá lọc mail chỉnh trong tab ⚙️ Cài đặt (để trống = đọc hết).

## Giới hạn cần biết (nói thật)

- **Instagram / Facebook** chặn truy cập tự động, nên app chỉ thấy những gì đã được Google/Bing đánh chỉ mục. Story và bài mới đăng thường không thấy được → hãy **chụp màn hình gửi vào tab Kiểm chứng**; app sẽ nói rõ khi không xác minh được.
- Thông tin blocus thay đổi theo giờ: bản tin ghi rõ ngày của từng nguồn và tách "chính thức" khỏi "tin đồn". Với thi cử, luôn đối chiếu với mail/Moodle chính thức.
- Mỗi lần research dùng Claude API (tính phí theo token). Chi phí phụ thuộc số lần research và độ dài tài liệu — xem mục Usage trong console.anthropic.com và đặt giới hạn chi tiêu ở đó; tài liệu PDF được cache để các câu hỏi sau rẻ hơn.
- PowerPoint/Word: xuất ra PDF trước khi upload (giữ được hình vẽ, công thức).

## Cấu trúc

```
src/server.js   API + cron        src/digest.js  bản tin hằng ngày
src/claude.js   gọi Claude API    src/verify.js  kiểm chứng tin
src/mail.js     IMAP              src/tutor.js   gia sư Feynman, ngữ pháp, flashcards
src/agenda.js   lịch + .ics       src/srs.js     lặp lại ngắt quãng
src/prompts.js  prompt & schema   public/        giao diện web (PWA)
```

Dữ liệu lưu trong `data/` (JSON + file upload), không đưa lên git.
