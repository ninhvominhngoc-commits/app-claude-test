// Bộ kiểm thử toàn diện cho artifact Sorbonne Copilot (giả lập Claude/Gmail, thư viện thật).
const { chromium, devices } = require("playwright");
const fs = require("fs"), path = require("path");
const LIB = path.resolve(__dirname, "node_modules");
const SHOTS = path.resolve(__dirname, "shots"); fs.mkdirSync(SHOTS, { recursive: true }); // ảnh chụp kiểm tra (không commit)
const HTML = fs.readFileSync(path.join(__dirname, "..", "sorbonne-copilot.html"), "utf8");
const DOC = `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${HTML}</body></html>`;
const LIBMAP = {
  "https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js": "marked/marked.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js": "dompurify/dist/purify.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js": "pdfjs-dist/build/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js": "pdfjs-dist/build/pdf.worker.min.js",
};
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? "  → " + detail : ""}`); };
let browser;
const errors = [];

async function open({ scheme = "light", cfg = {}, width = 390, height = 844, seed = false, hash = "", mobile = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, userAgent: devices["iPhone 13"].userAgent });
  await ctx.addInitScript((c) => { sessionStorage.setItem("__cfg", JSON.stringify(c)); }, cfg);
  await ctx.addInitScript({ path: path.join(__dirname, "mock.js") });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`[${scheme}] pageerror: ${e.message}`));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_|fonts\.g/.test(m.text())) errors.push(`[${scheme}] console: ${m.text()}`); });
  await p.route("https://app.test/**", (r) => r.fulfill({ contentType: "text/html; charset=utf-8", body: DOC }));
  await p.route("https://cdnjs.cloudflare.com/**", (r) => { const f = LIBMAP[r.request().url()]; return f ? r.fulfill({ path: path.join(LIB, f), contentType: "text/javascript" }) : r.abort(); });
  await p.route("https://cdn.jsdelivr.net/npm/mathjax@3.2.2/**", (r) => { const rel = r.request().url().split("mathjax@3.2.2/")[1]; const f = path.join(LIB, "mathjax", rel); return fs.existsSync(f) ? r.fulfill({ path: f, contentType: "text/javascript" }) : r.abort(); });
  await p.goto("https://app.test/" + hash, { waitUntil: "load" });
  if (seed) { await p.evaluate(() => window.__seed && window.__seed()); await p.goto("https://app.test/" + hash, { waitUntil: "load" }); }
  await p.waitForTimeout(700);
  return p;
}
const vis = (p, sel) => p.isVisible(sel).catch(() => false);
const txt = (p, sel) => p.textContent(sel).catch(() => "");
const store = (p) => p.evaluate(() => Object.fromEntries([...window.__store]));
const calls = (p) => p.evaluate(() => window.__calls);
const tab = (p, v) => p.click(`.tab[data-v="${v}"]`);
const sheetOpen = (p) => p.evaluate(() => !document.querySelector("#sheetRoot").hidden);
async function overflow(p) { return p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); }
async function axe(p, label) {
  await p.addScriptTag({ path: path.join(LIB, "axe-core/axe.min.js") });
  const r = await p.evaluate(async () => { const res = await window.axe.run(document, { resultTypes: ["violations"], rules: { region: { enabled: false } } }); return res.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes.slice(0, 2).map((x) => x.target.join(" ") + " :: " + (x.failureSummary || "").split("\n")[1]) })); });
  const bad = r.filter((v) => ["serious", "critical"].includes(v.impact));
  check(`axe ${label}: không có lỗi truy cập nghiêm trọng`, !bad.length, JSON.stringify(bad));
  return r;
}

(async () => {
  browser = await chromium.launch();

  // ---------- 1. Người dùng mới (chưa có dữ liệu) ----------
  {
    const p = await open();
    check("Mới: lời chào hiển thị", /Chào buổi|Khuya rồi/.test(await txt(p, "#hGreet")));
    check("Mới: ô campus ở trạng thái chưa rõ", (await p.getAttribute("#hStatus", "class")).includes("v-unknown"));
    check("Mới: ô ôn tập báo chưa có thẻ", /Chưa có thẻ/.test(await txt(p, "#hReview")));
    check("Mới: chuỗi ngày = 0", /^0/.test((await txt(p, "#hStreak .tile-num")).trim()));
    check("Mới: mail 'Chưa đọc lần nào'", /Chưa đọc lần nào/.test(await txt(p, "#hMail")));
    for (const v of ["study", "review", "agenda", "inbox"]) { await tab(p, v); check(`Mới: tab ${v} có màn trống thân thiện`, await vis(p, `#v-${v} .empty`)); }
    await tab(p, "home");
    await p.click('[data-act="add-event"]').catch(() => {});
    await tab(p, "agenda"); await p.click('#v-agenda [data-act="add-event"]');
    await p.click("#aeGo"); check("Lịch: thiếu tiêu đề thì nhắc", /Nhập tiêu đề/.test(await txt(p, "#toast")));
    await p.fill("#aeTitle", "TP noté"); await p.fill("#aeDate", new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10)); await p.click("#aeGo");
    check("Lịch: thêm thủ công xuất hiện", /TP noté/.test(await txt(p, "#aList")));
    await p.close();
  }

  // ---------- 2. Có dữ liệu: Hôm nay, lịch, tải lại ----------
  {
    const p = await open({ seed: true });
    const dates = await p.$$eval("#hUpcoming .ev", (els) => els.map((e) => e.dataset.date));
    check("Hôm nay: 'Sắp tới' xếp đúng thứ tự ngày", dates.length === 2 && dates[0] < dates[1], dates.join(","));
    check("Hôm nay: không hiện mốc đã qua", !(await txt(p, "#hUpcoming")).includes("Toussaint"));
    check("Hôm nay: ô ôn tập có 1 thẻ", (await txt(p, "#hReview .ring b")).trim() === "1");
    check("Tab Ôn tập có huy hiệu 1", (await txt(p, "#tabDue")).trim() === "1");
    await tab(p, "agenda");
    check("Lịch: dải 14 ngày", (await p.$$("#aStrip .day")).length === 14);
    check("Lịch: mục 'Đã qua' gom mốc cũ", /Đã qua \(1\)/.test(await txt(p, "#aList")));
    const d1 = await p.$eval("#aList .ev[data-date]", (e) => e.dataset.date);
    await p.click(`#aStrip .day[data-date="${d1}"]`); await p.waitForTimeout(100);
    check("Lịch: bấm ngày có mốc thì làm nổi mốc đó", await p.$eval(`#aList .ev[data-date="${d1}"]`, (e) => e.classList.contains("flash")));
    const empty = await p.$$eval("#aStrip .day", (els) => els.find((e) => !e.querySelector(".dots i"))?.dataset.date);
    await p.click(`#aStrip .day[data-date="${empty}"]`); check("Lịch: bấm ngày trống thì báo trống", /trống/.test(await txt(p, "#toast")));
    await p.click('#aList .ev[data-id="e2"] [data-act="ev-menu"]'); await p.click('[data-act="ev-done"]');
    check("Lịch: đánh dấu xong", await p.$eval('#aList .ev[data-id="e2"]', (e) => e.classList.contains("done")));
    await p.click('#aList .ev[data-id="e2"] [data-act="ev-menu"]'); await p.click('[data-act="ev-del"]'); await p.click("#cfYes");
    check("Lịch: xoá có xác nhận", !(await p.$('#aList .ev[data-id="e2"]')));
    await p.click('[data-act="plan"]'); await p.waitForTimeout(1200);
    check("Lịch: kế hoạch ôn thi hiện markdown thật", await p.$eval("#planOut", (e) => !!e.querySelector("h2, strong")));
    await p.keyboard.press("Escape"); check("Sheet: phím Esc đóng", !(await sheetOpen(p)));
    await p.reload({ waitUntil: "load" }); await p.waitForTimeout(600);
    const st = await store(p);
    check("Tải lại: thay đổi lịch vẫn còn", !st["data/users/u1/agenda"].items.some((a) => a.id === "e2"));
    await p.close();
  }

  // ---------- 3. Gia sư Feynman ----------
  {
    const p = await open({ seed: true });
    await tab(p, "study");
    check("Học: thẻ môn có thanh tiến độ", await vis(p, ".course-card .bar"));
    await p.click(".course-card");
    check("Học: mở màn toàn màn hình, ẩn tab bar", (await vis(p, "#v-course")) && !(await vis(p, ".tabbar")));
    check("Học: lịch sử cũ hiển thị, phần sửa ngữ pháp kiểu cũ nằm dưới câu của bạn", await vis(p, ".msg.u .fix"));
    check("Học: markdown được dựng (chữ đậm tô dạ quang)", await vis(p, ".msg.a .md strong"));
    // buổi mới -> gợi ý khởi đầu
    await p.click('[data-act="c-menu"]'); await p.click('[data-act="c-reset"]'); await p.click("#cfYes"); await p.waitForTimeout(100);
    check("Buổi mới: hiện 4 gợi ý khởi đầu", (await p.$$("#thread .starter-grid button")).length === 4);
    await p.click('#thread [data-act="starter"][data-i="1"]');
    await p.waitForSelector("#sendBtn:not([hidden])", { timeout: 6000 }); await p.waitForTimeout(400);
    let c = await calls(p);
    const s1 = c.filter((x) => x.kind === "sample").pop();
    check("Gia sư: lượt đầu có chỉ dẫn + tài liệu + trang", s1 && /=== DOCUMENT DE COURS ===/.test(s1.input[0].content) && /\[p\. 1\]/.test(s1.input[0].content) && /Mon message :/.test(s1.input[0].content));
    check("Gia sư: gợi ý có sẵn không bị gắn nhãn Feynman", !/Mon message : \[EXPLICATION FEYNMAN\]/.test(s1.input[0].content));
    check("Gia sư: gợi ý có sẵn không gọi sửa ngữ pháp", !c.some((x) => x.kind === "json" && /correcteur/.test(x.head)));
    check("Gia sư: công thức được dựng bằng MathJax", (await p.$$(".msg.a mjx-container")).length > 0);
    check("Gia sư: gợi ý nhanh hiện sau khi có tin nhắn", await vis(p, "#suggest"));
    // chế độ Feynman + sửa ngữ pháp
    await p.click("#feynBtn"); check("Feynman: dải báo bật", await vis(p, "#feynBanner"));
    await p.fill("#chatIn", "Je comprends pas pourquoi la diode bloque le courant");
    await p.click("#sendBtn"); await p.waitForSelector("#sendBtn:not([hidden])", { timeout: 6000 }); await p.waitForTimeout(500);
    c = await calls(p);
    const s2 = c.filter((x) => x.kind === "sample").pop();
    check("Feynman: tin nhắn gửi đi có nhãn chấm điểm", /\[EXPLICATION FEYNMAN\] Je comprends/.test(s2.input[s2.input.length - 1].content + s2.input[0].content));
    check("Feynman: tự tắt sau khi gửi", !(await vis(p, "#feynBanner")));
    check("Ngữ pháp: ghi chú sửa lỗi mở ra dưới câu vừa viết", await p.$$eval(".msg.u .fix", (els) => els[els.length - 1].open));
    let st = await store(p);
    check("Ngữ pháp: lỗi thành flashcard", st["data/users/u1/deck-francais"].cards.length === 2);
    check("Lưu: tài liệu không còn _pages cồng kềnh", !JSON.stringify(st["data/users/u1/courses"]).includes("_pages"));
    check("Lưu: cuộc trò chuyện có 4 lượt", st["data/users/u1/chat-c1"].turns.length === 4);
    check("Thống kê: ghi nhận tin nhắn hôm nay", Object.values(st["data/users/u1/stats"].days)[0].m === 2);
    // tiếng Việt
    await p.click('#cLang button[data-lang="vi"]');
    await p.click('#suggest [data-act="suggest"][data-i="0"]'); await p.waitForSelector("#sendBtn:not([hidden])", { timeout: 6000 });
    const s3 = (await calls(p)).filter((x) => x.kind === "sample").pop();
    check("VI: yêu cầu trả lời tiếng Việt", /réponds en VIETNAMIEN/.test(s3.input[0].content) && /Réponds en vietnamien/.test(s3.input[s3.input.length - 1].content));
    // chọn trang
    await p.click("#cRange"); await p.fill("#rgFrom", "5"); await p.fill("#rgTo", "8"); await p.click("#rgGo");
    check("Trang: tiêu đề cập nhật 5–8", /Trang 5–8/.test(await txt(p, "#cRange")));
    await p.fill("#chatIn", "Et ensuite ?"); await p.click("#sendBtn"); await p.waitForSelector("#sendBtn:not([hidden])", { timeout: 6000 });
    const s4 = (await calls(p)).filter((x) => x.kind === "sample").pop();
    check("Trang: chỉ gửi trang 5–8", /\[p\. 5\]/.test(s4.input[0].content) && !/\[p\. 4\]/.test(s4.input[0].content) && !/\[p\. 9\]/.test(s4.input[0].content));
    check("Lịch sử: luôn bắt đầu bằng lượt của bạn", s4.input[0].role === "user" && s4.input.length % 2 === 1);
    // ô nhập: Enter trên điện thoại không gửi, nút gửi tắt khi trống
    check("Ô nhập: nút gửi tắt khi trống", await p.$eval("#sendBtn", (b) => b.disabled));
    await p.close();
  }

  // ---------- 4. Dừng giữa chừng, lỗi Claude, lịch sử dài ----------
  {
    const p = await open({ seed: true, cfg: { slow: true } });
    await tab(p, "study"); await p.click(".course-card");
    await p.fill("#chatIn", "Explique la diode"); await p.click("#sendBtn"); await p.waitForTimeout(500);
    check("Dừng: nút dừng hiện khi đang trả lời", await vis(p, "#stopBtn"));
    await p.click("#stopBtn"); await p.waitForTimeout(300);
    check("Dừng: báo 'Đã dừng' và ô nhập dùng lại được", /Đã dừng/.test(await txt(p, "#thread")) && (await vis(p, "#sendBtn")));
    // rời màn khi đang trả lời
    await p.fill("#chatIn", "Encore"); await p.click("#sendBtn"); await p.waitForTimeout(300);
    await p.click('#v-course [data-go="study"]'); await p.waitForTimeout(400);
    await p.click(".course-card"); await p.waitForTimeout(200);
    check("Rời màn khi đang trả lời: quay lại vẫn gửi được", await vis(p, "#sendBtn"));
    await p.close();
    const q = await open({ seed: true, cfg: { sampleFail: "rate_limited" } });
    await tab(q, "study"); await q.click(".course-card");
    await q.fill("#chatIn", "Bonjour, ça va ?"); await q.click("#sendBtn"); await q.waitForTimeout(400);
    check("Lỗi giới hạn: báo dễ hiểu", /giới hạn/.test(await txt(q, "#thread")));
    check("Lỗi giới hạn: ô nhập không bị kẹt", await vis(q, "#sendBtn"));
    // lịch sử dài
    await q.evaluate(() => { const t = []; for (let i = 0; i < 40; i++) t.push({ role: i % 2 ? "assistant" : "user", content: "msg " + i }); window.__store.set("data/users/u1/chat-c1", { turns: t }); sessionStorage.setItem("__store", JSON.stringify([...window.__store])); const c = JSON.parse(sessionStorage.getItem("__cfg")); delete c.sampleFail; sessionStorage.setItem("__cfg", JSON.stringify(c)); });
    await q.reload({ waitUntil: "load" }); await q.waitForTimeout(500);
    await q.evaluate(() => { location.hash = "#study"; }); await q.waitForTimeout(100);
    await q.click(".course-card"); await q.fill("#chatIn", "Résume"); await q.click("#sendBtn"); await q.waitForSelector("#sendBtn:not([hidden])", { timeout: 6000 });
    const s = (await calls(q)).filter((x) => x.kind === "sample").pop();
    check("Lịch sử dài: chỉ gửi ≤ 16 lượt gần nhất", s && s.input.length <= 16 && s.input[0].role === "user", s && s.input.length);
    await q.close();
  }

  // ---------- 5. Flashcards & phiên ôn ----------
  {
    const p = await open({ seed: true });
    await tab(p, "study"); await p.click(".course-card");
    await p.click('[data-act="c-menu"]'); await p.click('[data-act="c-cards"]'); await p.click("#fcGo");
    await p.waitForFunction(() => /Đã tạo/.test(document.querySelector("#fcStatus")?.textContent || ""), null, { timeout: 5000 });
    check("Flashcards: lọc thẻ hỏng, tạo đúng 2 thẻ", /Đã tạo 2 thẻ/.test(await txt(p, "#fcStatus")));
    await p.click("#fcGo");
    check("Flashcards: 'Ôn ngay' mở phiên ôn", await vis(p, "#v-session"));
    check("Phiên ôn: đếm 1/2", (await txt(p, "#sCount")).trim() === "1/2");
    check("Phiên ôn: nút chấm ẩn trước khi lật", !(await vis(p, "#sGrades")));
    await p.click("#flash"); await p.waitForTimeout(150);
    const labels = await p.$$eval("#sGrades .grade span", (e) => e.map((x) => x.textContent));
    check("Phiên ôn: mỗi nút ghi khoảng ôn lại", labels.join("|") === "ngay|1 ngày|1 ngày|2 ngày", labels.join("|"));
    await p.click(".grade.g0"); check("Phiên ôn: 'Quên' đưa thẻ về cuối phiên", (await txt(p, "#sCount")).trim() === "1/2");
    await p.keyboard.press("Space"); await p.keyboard.press("3");
    await p.keyboard.press("Space"); await p.keyboard.press("3");
    await p.waitForTimeout(200);
    check("Phiên ôn: hoàn thành → màn chúc mừng", await vis(p, "#sDone"));
    const st = await store(p);
    const deck = st["data/users/u1/deck-c1"].cards;
    check("Phiên ôn: thẻ được hẹn ngày ôn tiếp", deck.every((k) => k.reps >= 1 && k.due > new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date())), JSON.stringify(deck.map((k) => [k.reps, k.due])));
    check("Thống kê: ghi nhận lượt ôn", Object.values(st["data/users/u1/stats"].days)[0].r === 3);
    await p.click('#sDone [data-go="review"]');
    check("Ôn tập: bộ thẻ môn đã ôn xong", /đã ôn xong/.test(await txt(p, "#rList")));
    await tab(p, "home");
    check("Hôm nay: chuỗi ngày = 1", /^1/.test((await txt(p, "#hStreak .tile-num")).trim()));
    // thoát giữa phiên
    await p.click('#hReview [data-act="review-all"]'); await p.click("#sExit");
    check("Phiên ôn: thoát giữa chừng về Ôn tập", await vis(p, "#v-review"));
    // xoá tài liệu
    await tab(p, "study"); await p.click(".course-card"); await p.click('[data-act="c-menu"]'); await p.click('[data-act="c-delete"]'); await p.click("#cfYes"); await p.waitForTimeout(300);
    const st2 = await store(p);
    check("Xoá tài liệu: xoá sạch chữ, trò chuyện, thẻ", !st2["data/users/u1/text-c1-0"] && !st2["data/users/u1/chat-c1"] && !st2["data/users/u1/deck-c1"] && st2["data/users/u1/courses"].list.length === 0);
    check("Xoá tài liệu: về danh sách trống", await vis(p, "#v-study .empty"));
    await p.close();
  }

  // ---------- 6. Mail trường ----------
  {
    const p = await open({ seed: true });
    await p.click('#hMail [data-act="read-mail"]');
    await p.waitForSelector("#evAdd", { timeout: 6000 }).catch(async () => { console.log("DEBUG mail:", await txt(p, "#hMail"), JSON.stringify(await calls(p)).slice(0, 600), errors.join("|")); throw new Error("mail sheet"); });
    const rows = await p.$$eval(".pick-row", (e) => e.map((x) => x.textContent));
    check("Mail: bỏ mốc không có tiêu đề, giữ mốc ngày sai dưới dạng 'chưa rõ ngày'", rows.length === 3 && rows.some((r) => /Ngày sai/.test(r) && /chưa rõ ngày/.test(r)), rows.join(" / "));
    await p.click("#evAdd"); await p.waitForTimeout(100);
    check("Mail: thêm vào lịch", /Đã thêm 3 mốc/.test(await txt(p, "#toast")));
    check("Mail: ô Hôm nay hiện mail quan trọng", /Manifestation/.test(await txt(p, "#hMail")));
    await tab(p, "inbox");
    const mails = await p.$$eval("#mList .mail", (e) => e.map((x) => ({ t: x.querySelector("strong").innerHTML, link: !!x.querySelector("a") })));
    check("Mail: tiêu đề có thẻ HTML được hiển thị an toàn", mails[0] && mails[0].t.includes("&lt;b&gt;"), JSON.stringify(mails));
    check("Mail: link lạ (javascript:) không được hiện", mails.length === 2 && mails[0].link && !mails[1].link, JSON.stringify(mails));
    const c = (await calls(p)).find((x) => x.kind === "mcp" && x.tool === "search_threads");
    check("Mail: tìm cả danh sách chung của trường", /list:sorbonne-universite\.fr/.test(c.input.query) && /newer_than:7d/.test(c.input.query));
    await p.click('#mDays button[data-d="30"]'); await p.click('#iMail [data-act="read-mail"]'); await p.waitForTimeout(800);
    check("Mail: lần sau không đọc lại mail cũ", /Không có mail mới trong 30 ngày/.test(await txt(p, "#iMail [data-mailmsg]")));
    await p.close();
    const q = await open({ cfg: { mcpFail: "needs_reauth" } });
    await q.click('#hMail [data-act="read-mail"]'); await q.waitForTimeout(500);
    check("Mail lỗi: hướng dẫn kết nối lại Gmail", /kết nối lại/.test(await txt(q, "#hMail")));
    check("Mail lỗi: nút bấm lại được", !(await q.$eval('#hMail [data-act="read-mail"]', (b) => b.disabled)));
    await q.close();
  }

  // ---------- 7. Kiểm tra tin & briefing ----------
  {
    const p = await open({ seed: true });
    await p.click('[data-act="copy-brief"]');
    const clip = await p.evaluate(() => window.__clip || "");
    check("Briefing: chép lệnh có lịch và Instagram trường", /Partiel d'Électronique/.test(clip) && /@sorbonne_univ/.test(clip));
    await p.click('[data-act="paste-brief"]'); await p.click("#pbGo");
    check("Briefing: trống thì nhắc", /Dán nội dung/.test(await txt(p, "#toast")));
    await p.fill("#pbText", "🏠 KHÔNG cần lên trường. Blocus toute la journée."); await p.click("#pbGo");
    await p.waitForSelector("#evAdd", { timeout: 5000 });
    check("Briefing: ô campus chuyển màu 'ở nhà'", (await p.getAttribute("#hStatus", "class")).includes("v-stay"));
    await p.click("#evAdd");
    await tab(p, "inbox"); await p.click('#iSeg button[data-seg="check"]');
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await p.setInputFiles("#ckFiles", [{ name: "story.png", mimeType: "image/png", buffer: png }]);
    check("Kiểm tra: xem trước ảnh", (await p.$$("#ckThumbs img")).length === 1);
    await p.click("#ckGo"); await p.waitForSelector("#ckOut .card .tag", { timeout: 5000 });
    const j = (await calls(p)).filter((x) => x.kind === "json").pop();
    check("Kiểm tra: ảnh được gửi cho Claude", j.images === 1);
    check("Kiểm tra: hiện mức tin cậy 'Tin đồn'", /Tin đồn/.test(await txt(p, "#ckOut")));
    await p.click('[data-act="copy-check"]');
    check("Kiểm tra: chép lệnh kiểm chứng", /Vérifie avec la recherche web/.test(await p.evaluate(() => window.__clip)));
    await p.click('[data-act="add-found"]'); check("Kiểm tra: thêm mốc tìm được", await sheetOpen(p));
    await p.close();
    const q = await open({ cfg: { clipFail: true, noImages: true } });
    await q.click('[data-act="copy-brief"]'); await q.waitForTimeout(200);
    check("Chép lỗi: mở ô chép thủ công", (await sheetOpen(q)) && (await q.$eval("#cpBox", (t) => t.value.length > 100)));
    await q.keyboard.press("Escape");
    await tab(q, "inbox"); await q.click('#iSeg button[data-seg="check"]');
    check("Không gửi ảnh được: ẩn ô chọn ảnh", !(await vis(q, "#ckDrop")));
    await q.close();
  }

  // ---------- 8. Tải tài liệu: txt dài, ảnh, PDF có trang scan ----------
  {
    const gen = await (await browser.newContext()).newPage();
    await gen.setContent(`<style>section{page-break-after:always;font:20px serif}</style><section><h1>Chapitre 1</h1><p>La loi d'Ohm : U = R × I. ${"Le courant circule. ".repeat(20)}</p></section><section><h1>Chapitre 2</h1><p>Le condensateur stocke des charges. ${"Q = C U. ".repeat(20)}</p></section><section><canvas id=c width=600 height=300></canvas></section><script>const x=document.getElementById('c').getContext('2d');x.font='40px serif';x.fillText('Page scannée : U = RI',40,150);document.querySelector('section:last-child').innerHTML='<img src="'+document.getElementById('c').toDataURL()+'">';</script>`);
    const pdf = await gen.pdf({ format: "A4" });
    const p = await open();
    await tab(p, "study"); await p.click('#v-study .empty [data-act="add-course"]');
    await p.click("#acGo"); check("Tải lên: chưa chọn file thì nhắc", /Chọn ít nhất/.test(await txt(p, "#toast")));
    await p.setInputFiles("#acFiles", [{ name: "cours-ohm.pdf", mimeType: "application/pdf", buffer: pdf }]);
    check("Tải lên: tự điền tên từ file", (await p.inputValue("#acTitle")) === "cours-ohm");
    await p.click("#acGo");
    await p.waitForSelector("#v-course:not([hidden])", { timeout: 20000 }).catch(() => {});
    check("PDF: tạo xong và mở màn học", await vis(p, "#v-course"), await txt(p, "#acStatus"));
    let st = await store(p);
    const course = st["data/users/u1/courses"]?.list?.[0];
    const pages = Object.entries(st).filter(([k]) => k.includes("/text-")).flatMap(([, v]) => v.pages);
    check("PDF: đọc đủ 3 trang", course && course.pageCount === 3, course && course.pageCount);
    check("PDF: trang chữ được trích", /loi d'Ohm/.test(pages[0] || ""), (pages[0] || "").slice(0, 60));
    check("PDF: trang ảnh được gửi Claude đọc (OCR)", /Page scannée 1/.test(pages[2] || ""), (pages[2] || "").slice(0, 60));
    await p.click('#v-course [data-go="study"]');
    await p.click('#v-study [data-act="add-course"]');
    await p.setInputFiles("#acFiles", [{ name: "poly.txt", mimeType: "text/plain", buffer: Buffer.from(("Ligne de cours longue. ".repeat(40) + "\n").repeat(400)) }]);
    await p.click("#acGo"); await p.waitForSelector("#v-course:not([hidden])", { timeout: 10000 }).catch(() => {});
    st = await store(p);
    const sizes = Object.entries(st).filter(([k]) => k.includes("/text-")).map(([, v]) => JSON.stringify(v).length);
    check("TXT dài (~370 KB): chia trang và lưu được hết", sizes.length >= 3 && Math.max(...sizes) < 262144, sizes.join(","));
    check("TXT dài: không có cảnh báo lưu lỗi", !(await vis(p, "#notice")));
    await p.close();
  }

  // ---------- 9. Không đăng nhập / lỗi dữ liệu / mở thẳng #course ----------
  {
    const p = await open({ cfg: { noClaude: true } });
    check("Ngoài claude.ai: báo cần đăng nhập", /Đăng nhập claude\.ai/.test(await txt(p, "#notice")));
    await p.click('#hMail [data-act="read-mail"]'); await p.waitForTimeout(200);
    check("Ngoài claude.ai: đọc mail báo rõ ràng", /claude\.ai/.test(await txt(p, "#hMail")));
    await p.click('[data-act="paste-brief"]'); await p.fill("#pbText", "abc"); await p.click("#pbGo");
    check("Ngoài claude.ai: dán bản tin báo rõ ràng", /claude\.ai/.test(await txt(p, "#toast")));
    await p.close();
    const q = await open({ cfg: { dbFail: true } });
    check("Lỗi dữ liệu: báo không đọc được", /Không đọc được dữ liệu/.test(await txt(q, "#notice")));
    await q.close();
    const r = await open({ seed: true });
    await r.evaluate(() => localStorage.setItem("cur", "c1"));
    await r.goto("https://app.test/#course", { waitUntil: "load" }); await r.reload({ waitUntil: "load" }); await r.waitForTimeout(800);
    check("Mở thẳng #course: vào lại tài liệu đang học", await vis(r, "#v-course"));
    await r.goto("https://app.test/#session", { waitUntil: "load" }); await r.waitForTimeout(500);
    check("Mở thẳng #session: về Ôn tập", await vis(r, "#v-review"));
    await r.goto("https://app.test/#settings", { waitUntil: "load" }); await r.waitForTimeout(500);
    check("Hash lạ: về Hôm nay", await vis(r, "#v-home"));
    await r.close();
  }

  // ---------- 10. Bố cục ở nhiều cỡ màn hình, sáng/tối, truy cập ----------
  for (const scheme of ["light", "dark"]) {
    for (const width of [320, 390, 820]) {
      const p = await open({ seed: true, scheme, width, mobile: width < 700 });
      for (const v of ["home", "study", "review", "agenda", "inbox"]) {
        await tab(p, v); await p.waitForTimeout(80);
        const o = await overflow(p);
        check(`Bố cục ${scheme} ${width}px ${v}: không tràn ngang`, o <= 0, `tràn ${o}px`);
        if (width === 390) await axe(p, `${scheme} ${v}`);
        if (width === 320) await p.screenshot({ path: `${SHOTS}/${scheme}-${width}-${v}.png`, fullPage: true });
      }
      await tab(p, "study"); await p.click(".course-card"); await p.waitForTimeout(300);
      check(`Bố cục ${scheme} ${width}px course: không tràn ngang`, (await overflow(p)) <= 0);
      if (width === 390) await axe(p, `${scheme} course`);
      if (width === 320) await p.screenshot({ path: `${SHOTS}/${scheme}-${width}-course.png` });
      await p.click('#v-course [data-go="study"]'); await tab(p, "review"); await p.click('#rList [data-act="review-all"]'); await p.click("#flash"); await p.waitForTimeout(600);
      check(`Bố cục ${scheme} ${width}px session: không tràn ngang`, (await overflow(p)) <= 0);
      if (width === 390) await axe(p, `${scheme} session`);
      if (width === 320) await p.screenshot({ path: `${SHOTS}/${scheme}-${width}-session.png` });
      await p.close();
    }
  }

  check("Không có lỗi JavaScript nào trong toàn bộ phiên thử", errors.length === 0, errors.slice(0, 8).join(" | "));
  const fail = results.filter((r) => !r.ok);
  console.log(`\n=== ${results.length - fail.length}/${results.length} PASS ===`);
  fs.writeFileSync(path.join(__dirname, "results.json"), JSON.stringify(results, null, 1));
  await browser.close();
})().catch(async (e) => { console.error("CRASH", e); console.log(`\n=== ${results.filter((r) => r.ok).length}/${results.length} PASS before crash ===`); await browser?.close(); process.exit(1); });
