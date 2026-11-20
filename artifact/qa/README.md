# Bộ kiểm thử app Sorbonne Copilot

Chạy toàn bộ kịch bản (người dùng mới, gia sư, flashcards, mail, kiểm tra tin, tải PDF, lỗi mạng, tiến độ học (3 vòng mục tiêu, tiến độ từng môn, phiên tập trung có mục tiêu và ghi chú), luyện đề (đề tương tự, chấm cách trình bày), nhập lịch Moodle (.ics), trang Hôm nay (việc nên làm ngay, 3 mục tiêu ngày, màn chờ), bố cục 320–820px sáng/tối, kiểm tra truy cập axe):

```bash
cd artifact/qa
npm install marked@12.0.2 dompurify@3.1.6 mathjax@3.2.2 pdfjs-dist@3.11.174 axe-core@4.10.2 playwright
node qa.cjs
```

`mock.js` giả lập `window.claude` (db, user, sample, Gmail) nên không tốn lượt Claude thật.
