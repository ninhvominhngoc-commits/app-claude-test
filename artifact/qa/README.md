# Bộ kiểm thử app Sorbonne Copilot

Chạy toàn bộ kịch bản (người dùng mới, gia sư, flashcards, mail, kiểm tra tin, tải PDF, lỗi mạng, trò chơi nguyên tử, căn phòng của bé mèo Elec (trang trí, nhiệm vụ, quà, khách ghé thăm, màn chờ), phiêu lưu: truyện, trận đấu, cầu nguyện và bảo hiểm 50 lượt, bố cục 320–820px sáng/tối, kiểm tra truy cập axe):

```bash
cd artifact/qa
npm install marked@12.0.2 dompurify@3.1.6 mathjax@3.2.2 pdfjs-dist@3.11.174 axe-core@4.10.2 playwright
node qa.cjs
```

`mock.js` giả lập `window.claude` (db, user, sample, Gmail) nên không tốn lượt Claude thật.
