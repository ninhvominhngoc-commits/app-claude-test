// Bộ kiểm thử toàn diện cho artifact Sorbonne Copilot (giả lập Claude/Gmail, thư viện thật).
const { chromium, devices } = require("playwright");
const fs = require("fs"), path = require("path");
const LIB = path.resolve(__dirname, "node_modules");
const SHOTS = path.resolve(__dirname, "shots"); fs.mkdirSync(SHOTS, { recursive: true });
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

async function open({ scheme = "light", cfg = {}, width = 390, height = 844, seed = false, hash = "", mobile = true, reduce = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: reduce ? "reduce" : "no-preference", userAgent: devices["iPhone 13"].userAgent });
  await ctx.addInitScript((c) => { sessionStorage.setItem("__cfg", JSON.stringify(c)); }, cfg);
  await ctx.addInitScript({ path: path.join(__dirname, "mock.js") });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`[${scheme}] pageerror: ${e.message}`));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_|fonts\.g/.test(m.text())) errors.push(`[${scheme}] console: ${m.text()}`); });
  await p.route("https://app.test/**", (r) => r.fulfill({ contentType: "text/html; charset=utf-8", body: DOC }));
  await p.route("https://cdnjs.cloudflare.com/**", (r) => { const f = LIBMAP[r.request().url()]; return f ? r.fulfill({ path: path.join(LIB, f), contentType: "text/javascript" }) : r.abort(); });
  await p.route("https://cdn.jsdelivr.net/npm/mathjax@3.2.2/**", (r) => { const rel = r.request().url().split("mathjax@3.2.2/")[1]; const f = path.join(LIB, "mathjax", rel); return fs.existsSync(f) ? r.fulfill({ path: f, contentType: "text/javascript" }) : r.abort(); });
  await p.goto("https://app.test/" + hash, { waitUntil: "load" });
  if (seed) { await p.evaluate(() => window.__seed && window.__seed()); await p.reload({ waitUntil: "load" }); }
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
    check("Mới: lời chào hiển thị", /Chào buổi|Khuya rồi/.test(await txt(p, "#hBubble")), await txt(p, "#hBubble"));
    check("Mới: ô campus ở trạng thái chưa rõ", (await p.getAttribute("#hStatus", "class")).includes("v-unknown"));
    check("Mới: căn phòng có bé mèo Elec", (await vis(p, "#hRoom .room-svg")) && (await vis(p, "#hRoom .dweller.kit svg")));
    check("Mới: chưa có bạn đồng hành hay khách", !(await vis(p, "#hRoom .dweller.comp")) && !(await vis(p, "#hRoom .dweller.visit")));
    check("Mới: nút Truyện báo có chương đang chờ", await vis(p, "#hudStory .dot-new"));
    check("Mới: nhãn nhiệm vụ 0/3, có chấm quà", /0\/3/.test(await txt(p, "#hQuestTxt")) && (await vis(p, "#hQuest .dot-new")));
    await p.click("#hQuest");
    check("Mới: 3 nhiệm vụ hôm nay", (await p.$$("#sheetRoot .quests li")).length === 3);
    check("Mới: chuỗi ngày = 0", /0 ngày liên tiếp/.test(await txt(p, "#sheetRoot .flame")));
    await p.keyboard.press("Escape");
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
    await p.click("#hQuest");
    check("Hôm nay: nhiệm vụ ôn thẻ có nút 'Ôn'", await vis(p, '#sheetRoot [data-act="review-all"]'));
    await p.keyboard.press("Escape");
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
    await p.click("#hQuest");
    check("Hôm nay: chuỗi ngày = 1", /1 ngày liên tiếp/.test(await txt(p, "#sheetRoot .flame")));
    // thoát giữa phiên
    await p.click('#sheetRoot [data-act="review-all"]'); await p.click("#sExit");
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
    check("Ngoài claude.ai: vẫn chào mừng (chỉ giữ trong phiên)", (await sheetOpen(p)) && /1 000 ✦/.test(await txt(p, "#sheetRoot")));
    await p.keyboard.press("Escape");
    await p.click('#hMail [data-act="read-mail"]'); await p.waitForTimeout(200);
    check("Ngoài claude.ai: đọc mail báo rõ ràng", /claude\.ai/.test(await txt(p, "#hMail")));
    await p.click('[data-act="paste-brief"]'); await p.fill("#pbText", "abc"); await p.click("#pbGo");
    check("Ngoài claude.ai: dán bản tin báo rõ ràng", /claude\.ai/.test(await txt(p, "#toast")));
    await p.close();
    const q = await open({ cfg: { dbFail: true } });
    check("Lỗi dữ liệu: báo không đọc được", /Không đọc được dữ liệu/.test(await txt(q, "#notice")));
    check("Lỗi dữ liệu: không tặng quà chào mừng (tránh đè dữ liệu thật)", !(await sheetOpen(q)));
    await q.click("#wFocus"); await q.click("#fStart"); await q.waitForTimeout(200);
    check("Lỗi dữ liệu: không ghi gì lên dữ liệu cũ", !(await store(q))["data/users/u1/focus"]);
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


  // ---------- 11. Tiến độ học: tập trung có mục tiêu, 3 vòng, tiến độ môn ----------
  {
    const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
    const setStore = (p, kv) => p.evaluate((kv) => { for (const [k, v] of Object.entries(kv)) window.__store.set(k, v); sessionStorage.setItem("__store", JSON.stringify([...window.__store])); }, kv);
    const p = await open({ seed: true });
    await p.click("#wFocus");
    check("Tập trung: mở màn toàn màn hình", await vis(p, "#v-focus") && !(await vis(p, ".tabbar")));
    check("Tập trung: chọn được 3 môn (1 tài liệu + Tiếng Pháp + Tự học)", (await p.$$("#fSubj button")).length === 3);
    await p.click('#fSubj button[data-subj="free"]'); await p.click('#fDur button[data-dur="15"]');
    check("Tập trung: gợi ý phần thưởng +30 ✦", /\+30 ✦/.test(await txt(p, "#fHint")), await txt(p, "#fHint"));
    await p.fill("#fGoal", "Làm xong bài 2 TD");
    await p.click("#fStart"); await p.waitForTimeout(1200);
    check("Tập trung: đồng hồ đếm ngược chạy", /^1[45]:\d\d$/.test((await txt(p, "#fTime")).trim()), await txt(p, "#fTime"));
    check("Tập trung: hiện mục tiêu phiên và vòng thời gian", /Làm xong bài 2 TD/.test(await txt(p, "#fGoalShow")) && (await vis(p, "#fRing svg")));
    await p.click("#fNotesSum"); await p.fill("#fNoteIn", "Nhắn nhóm TP"); await p.press("#fNoteIn", "Enter");
    let st = await store(p);
    check("Tập trung: phiên đang chạy được lưu kèm mục tiêu và việc chợt nhớ", st["data/users/u1/focus"]?.subject === "free" && st["data/users/u1/focus"].dur === 15 && st["data/users/u1/focus"].goal === "Làm xong bài 2 TD" && st["data/users/u1/focus"].notes?.[0] === "Nhắn nhóm TP", JSON.stringify(st["data/users/u1/focus"]));
    await p.click('#v-focus [data-go="home"]'); await p.waitForTimeout(1100);
    check("Nút Tập trung: hiện 'Đang tập trung' và thời gian còn lại", /Đang tập trung/.test(await txt(p, "#wFocus")) && /1[45]:\d\d/.test(await txt(p, "#wFocus [data-left]")));
    await p.reload({ waitUntil: "load" }); await p.waitForTimeout(800);
    check("Tải lại: phiên tập trung vẫn tiếp tục", /Đang tập trung/.test(await txt(p, "#wFocus")));
    await p.click("#wFocus"); await p.click("#fStop");
    check("Dừng sớm (< 5 phút): hỏi lại trước khi dừng", /Cố thêm chút nữa/.test(await txt(p, "#sheetRoot")));
    await p.click("#cfYes"); await p.waitForTimeout(200);
    st = await store(p);
    check("Dừng sớm: xoá phiên đang chạy", !st["data/users/u1/focus"]?.endAt);
    const now = Date.now();
    await setStore(p, { "data/users/u1/focus": { subject: "free", start: now - 26 * 60000, endAt: now - 60000, dur: 25, goal: "Ôn chương 2", notes: ["Mua pin máy tính"] } });
    await p.reload({ waitUntil: "load" }); await p.waitForTimeout(900);
    const sh = await txt(p, "#sheetRoot");
    check("Hoàn thành: mở lại app thì nhận thưởng +50 ✦", /Hoàn thành phiên tập trung/.test(sh) && /\+50 ✦/.test(sh) && /25 phút/.test(sh), sh.slice(0, 200));
    check("Hoàn thành: hỏi mục tiêu phiên đã xong chưa", /Ôn chương 2/.test(sh) && (await vis(p, '#sheetRoot [data-goal="done"]')));
    await p.click('#sheetRoot [data-goal="done"]');
    st = await store(p);
    const last = st["data/users/u1/sessions"]?.list?.slice(-1)[0];
    check("Hoàn thành: ghi mục tiêu đã xong vào nhật ký phiên", last?.goal === "Ôn chương 2" && last.done === true, JSON.stringify(last));
    await p.click("#notesToAgenda");
    st = await store(p);
    check("Việc chợt nhớ: thêm vào Lịch (chưa rõ ngày)", st["data/users/u1/agenda"]?.items?.some((x) => x.title === "Mua pin máy tính" && !x.date));
    check("Hoàn thành: cộng 25 phút cho môn Tự học khác", st["data/users/u1/atoms"]?.list?.free?.min === 25, JSON.stringify(st["data/users/u1/atoms"]));
    check("Thống kê: 25 phút tập trung hôm nay", st["data/users/u1/stats"].days[today()].f === 25);
    await p.keyboard.press("Escape");
    if (await vis(p, "#v-focus")) await p.click('#v-focus [data-go="home"]');
    check("Vòng 1 (tập trung 25 phút) đã đóng", /1\/3/.test(await txt(p, "#hQuestTxt")));
    await p.click('.hero-actions [data-go="stats"]'); await p.click('#v-stats [data-go="prog"]');
    check("Tiến độ: mở từ Thống kê, che thanh tab", (await vis(p, "#v-prog")) && !(await vis(p, ".tabbar")));
    check("Tiến độ: mỗi môn một thẻ có chậu cây", (await p.$$("#pgList .pg-card .plant")).length === 3);
    check("Tiến độ: 3 vòng hôm nay ở đầu bảng", (await vis(p, "#pgTop .rings")) && /1\/3 vòng/.test(await txt(p, "#pgTop")));
    check("Tiến độ: môn Tự học khác có 25 phút tuần này", /Tự học khác[\s\S]*25 phút/.test(await txt(p, "#pgList")));
    check("Tiến độ: gợi ý việc nên làm tiếp (ôn thẻ đến hạn của Tiếng Pháp)", /Ôn 1 thẻ đến hạn/.test(await txt(p, "#pgList")));
    await p.click('#pgList [data-act="deck-start"][data-deck="francais"]');
    check("Tiến độ: nút gợi ý mở phiên ôn đúng bộ thẻ", await vis(p, "#v-session"));
    await p.close();
    // ôn 10 thẻ + tự giảng → đủ 3 vòng
    const q = await open({ seed: true });
    const cards = Array.from({ length: 10 }, (_, i) => ({ id: "x" + i, front: "Q" + i, back: "A" + i, mnemonic: "", ef: 2.5, interval: 0, reps: 0, lapses: 0, due: today() }));
    await setStore(q, { "data/users/u1/deck-francais": { cards }, "data/users/u1/stats": { days: { [today()]: { r: 0, m: 0, f: 25 } } } });
    await q.reload({ waitUntil: "load" }); await q.waitForTimeout(700);
    await q.click("#hQuest"); await q.click('#sheetRoot [data-act="review-all"]');
    for (let i = 0; i < 10; i++) { await q.keyboard.press("Space"); await q.keyboard.press("3"); }
    await q.waitForTimeout(200);
    let s2 = await store(q);
    check("Ôn 10 thẻ: vòng ôn thẻ đóng", s2["data/users/u1/stats"].days[today()].r === 10);
    await q.click('#sDone [data-go="review"]'); await tab(q, "study"); await q.click(".course-card");
    await q.click("#feynBtn"); await q.fill("#chatIn", "La diode laisse passer le courant dans un seul sens"); await q.click("#sendBtn");
    await q.waitForSelector("#sendBtn:not([hidden])", { timeout: 6000 }); await q.waitForTimeout(400);
    s2 = await store(q);
    check("Đủ 3 vòng: được đánh dấu vàng", s2["data/users/u1/stats"].days[today()].gold === 1 && s2["data/users/u1/stats"].days[today()].fe === 1);
    await q.click('#v-course [data-go="study"]'); await tab(q, "home");
    check("Mục tiêu: 3/3", /3\/3/.test(await txt(q, "#hQuestTxt")));
    await q.click("#hQuest");
    check("Lịch nhiệt: hôm nay có viền vàng", await q.$eval("#sheetRoot .heat i.today", (e) => e.classList.contains("gold")));
    check("Mục tiêu: cả 3 vòng hiện đã nhận thưởng", (await q.$$("#sheetRoot .q-reward.done")).length === 3);
    await q.close();
    // cấp độ theo phút tập trung; chậu cây lớn theo thẻ đã thuộc
    const r = await open({ seed: true });
    const mature = Array.from({ length: 10 }, (_, i) => ({ id: "m" + i, front: "Q" + i, back: "A" + i, ef: 2.5, interval: i < 8 ? 30 : 4, reps: 4, lapses: 0, due: "2099-01-01" }));
    await setStore(r, { "data/users/u1/atoms": { list: { free: { min: 60, n: 2 } } }, "data/users/u1/deck-c1": { cards: mature } });
    await r.reload({ waitUntil: "load" }); await r.waitForTimeout(700);
    await r.click('.hero-actions [data-go="stats"]'); await r.click('#v-stats [data-go="prog"]');
    check("Cấp độ: 60 phút = cấp 2 'Bạn học chăm'", /Cấp 2 \(Bạn học chăm\)/.test(await txt(r, "#pgLevel")), await txt(r, "#pgLevel"));
    check("Chậu cây: 8/10 thẻ đã thuộc → Sắp nở", /Sắp nở/.test(await txt(r, "#pgList .pg-card:first-child")) && /8\/10 đã thuộc/.test(await txt(r, "#pgList")), await txt(r, "#pgList .pg-card:first-child"));
    await r.close();
  }


  // ---------- 12. Cozy: bé electron, cài đặt, thống kê, tập trung nghiêm ----------
  {
    const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
    const setStore = (p, kv) => p.evaluate((kv) => { for (const [k, v] of Object.entries(kv)) window.__store.set(k, v); sessionStorage.setItem("__store", JSON.stringify([...window.__store])); }, kv);
    const p = await open({ seed: true });
    check("Phòng: bé mèo Elec và lời thoại", (await vis(p, "#hRoom .dweller.kit svg")) && (await txt(p, "#hBubble")).length > 10);
    const b1 = await txt(p, "#hBubble"); await p.click("#hRoom .dweller.kit"); const b2 = await txt(p, "#hBubble");
    check("Phòng: chạm bé mèo đổi lời thoại", b1 !== b2, b1 + " | " + b2);
    check("Hero: lời thoại nhắc thẻ cần ôn hoặc hạn nộp", /thẻ đang chờ|Sắp tới hạn|Sắp thi|tập trung/.test(b1 + b2));
    check("Hero: đồng hồ giờ Paris", /^\d\d:\d\d · /.test(await txt(p, "#hClock")));
    await p.click('.home .name-pill');
    await p.fill("#stName", "Mít"); await p.click('#stDur button[data-d="45"]'); await p.click("#stSfx"); await p.click("#stStrict"); await p.click("#stSave");
    let st = await store(p);
    check("Cài đặt: lưu tên, thời gian, âm thanh, tập trung nghiêm", st["data/users/u1/prefs"]?.name === "Mít" && st["data/users/u1/prefs"].dur === 45 && st["data/users/u1/prefs"].sfx === false && st["data/users/u1/prefs"].strict === true, JSON.stringify(st["data/users/u1/prefs"]));
    check("Cài đặt: tên mới hiện trên nhãn", (await txt(p, "#buddyName")) === "Mít");
    check("Cài đặt: nút tập trung theo thời gian mặc định", /45:00 · \+90 ✦/.test(await txt(p, "#wFocus")), await txt(p, "#wFocus"));
    await p.click("#wFocus");
    check("Tập trung: chọn sẵn 45 phút", await p.$eval('#fDur button[data-dur="45"]', (b) => b.getAttribute("aria-pressed") === "true"));
    await p.click("#fStart"); await p.waitForTimeout(300);
    const leave = () => p.evaluate(() => {
      const setVis = (v) => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => v }); document.dispatchEvent(new Event("visibilitychange")); };
      window.__realNow ||= Date.now.bind(Date);
      setVis("hidden");
      window.__shift = (window.__shift || 0) + 16000; Date.now = () => window.__realNow() + window.__shift;
      setVis("visible");
    });
    await leave(); await p.waitForTimeout(200);
    check("Tập trung nghiêm: rời app 16 giây thì hỏi đã khoá màn hình hay mở app khác", /Bạn vừa đi đâu thế/.test(await txt(p, "#sheetRoot")) && (await vis(p, "#awLock")));
    await p.click("#awLock");
    check("Tập trung nghiêm: khoá màn hình thì phiên vẫn chạy", !!(await store(p))["data/users/u1/focus"]?.endAt && !(await sheetOpen(p)));
    await leave(); await p.waitForTimeout(200);
    await p.click("#awOther");
    check("Tập trung nghiêm: mở app khác thì phiên bị huỷ", /chạy mất rồi/.test(await txt(p, "#sheetRoot")) && !(await store(p))["data/users/u1/focus"]?.endAt);
    await p.evaluate(() => { if (window.__realNow) { Date.now = window.__realNow; window.__shift = 0; } });
    await p.keyboard.press("Escape");
    // thống kê sau một phiên đã hoàn thành
    const now = Date.now();
    await setStore(p, { "data/users/u1/focus": { subject: "c1", start: now - 26 * 60000, endAt: now - 60000, dur: 25 } });
    await p.goto("https://app.test/#home", { waitUntil: "load" }); await p.reload({ waitUntil: "load" }); await p.waitForTimeout(900);
    await p.keyboard.press("Escape");
    st = await store(p);
    check("Nhật ký phiên: lưu phiên vừa xong", st["data/users/u1/sessions"]?.list?.length === 1 && st["data/users/u1/sessions"].list[0].m === 25);
    await p.click('.hero-actions [data-go="stats"]');
    check("Thống kê: tổng quan có biểu đồ và kỷ lục", (await vis(p, "#stChart svg .ln")) && /25 phút/.test(await txt(p, "#stRec")), (await vis(p, "#stChart svg .ln")) + " | " + (await txt(p, "#stRec")) + " | " + (await p.$eval("#stChart", (e) => e.innerHTML.slice(0, 300)).catch(() => "no chart")));
    await p.click('#stTabs [data-st="day"]');
    check("Thống kê ngày: 24 cột theo giờ, tổng 25 phút", (await p.$$("#stChart .bar")).length === 24 && /25 phút/.test(await txt(p, "#stMain .big-stat")));
    const hour = await p.$$eval("#stChart .bar", (bars) => bars.map((b) => !b.classList.contains("zero")).filter(Boolean).length);
    check("Thống kê ngày: phút nằm đúng khung giờ", hour >= 1 && hour <= 2, hour);
    await p.hover("#stChart .hit:nth-of-type(1)").catch(() => {});
    const hit = await p.$$eval("#stChart .hit", (hs) => hs.findIndex((h) => h.nextElementSibling && !h.nextElementSibling.classList.contains("zero")));
    await p.click(`#stChart .hit[data-i="${hit}"]`, { force: true });
    check("Thống kê: chạm cột hiện số phút", /phút/.test(await txt(p, "#stTip")));
    check("Thống kê: có bảng số liệu thay cho biểu đồ", (await p.$$("#stMain .data-table tr")).length >= 1);
    check("Thống kê: theo môn hiện tên tài liệu", /Électronique/.test(await txt(p, "#stSubj")));
    await p.click('#stTabs [data-st="week"]');
    check("Thống kê tuần: 7 cột", (await p.$$("#stChart .bar")).length === 7);
    await p.click("#stPrev");
    check("Thống kê: lùi về tuần trước, nút tới được bật", !(await p.$eval("#stNext", (b) => b.disabled)) && /0 phút/.test(await txt(p, "#stMain .big-stat")));
    await p.click('#stTabs [data-st="month"]');
    check("Thống kê tháng: đủ số ngày", [28, 29, 30, 31].includes((await p.$$("#stChart .bar")).length));
    await p.click('#stTabs [data-st="year"]');
    check("Thống kê năm: 12 cột", (await p.$$("#stChart .bar")).length === 12);
    await p.close();
  }

  // ---------- 13. Phiêu lưu: truyện, trận đấu, cầu nguyện, nhân vật ----------
  {
    const setStore = (p, kv) => p.evaluate((kv) => { for (const [k, v] of Object.entries(kv)) window.__store.set(k, v); sessionStorage.setItem("__store", JSON.stringify([...window.__store])); }, kv);
    const advDoc = async (p) => (await store(p))["data/users/u1/adv"] || {};
    const reopen = async (p, hash) => { await p.goto("https://app.test/" + hash, { waitUntil: "load" }); await p.reload({ waitUntil: "load" }); await p.waitForTimeout(700); };
    // đọc truyện tới khi gặp lựa chọn / trận đấu / hết
    async function vnRun(p, max = 90) {
      const seen = [];
      for (let i = 0; i < max; i++) {
        if (!(await vis(p, "#v-vn"))) break;
        if (await vis(p, "#vnChoices .vn-choice")) break;
        await p.click("#vnBox"); await p.waitForTimeout(30);
        seen.push(await txt(p, "#vnText"));
      }
      return seen;
    }
    async function winBattle(p) {
      for (let i = 0; i < 20 && (await vis(p, "#v-battle")); i++) {
        await p.click("#btQ [data-correct]"); await p.waitForTimeout(40);
        await p.click("#btNext"); await p.waitForTimeout(60);
      }
    }

    // A. lần đầu vào: quà khởi đầu, quà mỗi ngày
    const p = await open({ reduce: true, hash: "#adv", cfg: { welcome: true } });
    check("Phiêu lưu: mở thẳng #adv", await vis(p, "#v-adv") && !(await vis(p, "#v-home")));
    check("Phiêu lưu: tab Hôm nay vẫn sáng", (await p.getAttribute('.tab[data-v="home"]', "aria-current")) === "page");
    check("Phiêu lưu: chào mừng + 1 000 ✦", (await sheetOpen(p)) && /1 000 ✦/.test(await txt(p, "#sheetRoot")));
    await p.keyboard.press("Escape");
    await p.evaluate(() => window.__seed()); await p.reload({ waitUntil: "load" }); await p.waitForTimeout(700);
    check("Phiêu lưu: tải lại không tặng quà khởi đầu lần nữa", !(await sheetOpen(p)));
    check("Phiêu lưu: ví hiện 1.000 Tinh thể", /1\.000/.test(await txt(p, "#advGem")), await txt(p, "#advGem"));
    let a = await advDoc(p);
    check("Phiêu lưu: lưu ví vào dữ liệu riêng", a.gems === 1000 && a.welcome === 1, JSON.stringify(a).slice(0, 120));
    await p.click("#advGift");
    a = await advDoc(p);
    check("Quà hôm nay: +50 ✦ và nút ẩn đi", a.gems === 1050 && !(await vis(p, "#advGift")));
    await reopen(p, "#adv");
    check("Quà hôm nay: không nhận lại sau khi tải lại", !(await vis(p, "#advGift")) && !(await sheetOpen(p)));
    check("Cốt truyện: chương hiện tại là Mở đầu", /Mất điện ở Jussieu/.test(await txt(p, "#advStory .chap-name")) && /Bắt đầu/.test(await txt(p, '#advStory [data-act="adv-play"]')));

    // B. đọc truyện: chữ chạy, lựa chọn, nhân vật gia nhập, lưu chỗ đọc
    await p.click('#advStory [data-act="adv-play"]');
    check("Truyện: mở màn đọc truyện toàn màn hình", (await vis(p, "#v-vn")) && !(await vis(p, ".tabbar")));
    check("Truyện: tiêu đề chương", /Mở đầu · Mất điện ở Jussieu/.test(await txt(p, "#vnTitle")));
    check("Truyện: lời dẫn không có thẻ tên", !(await vis(p, "#vnName")) && /18:47/.test(await txt(p, "#vnText")));
    let seen = await vnRun(p);
    check("Truyện: tên bé electron thay vào lời thoại", seen.some((t) => /Mình là Elec nè/.test(t)), seen.slice(0, 6).join(" | "));
    check("Truyện: gặp lựa chọn đầu tiên", (await p.$$("#vnChoices .vn-choice")).length === 2);
    await p.click('#vnChoices [data-k="1"]');
    check("Truyện: lựa chọn hiện câu trả lời riêng", /biết dỗi/.test(await txt(p, "#vnText")));
    seen = await vnRun(p);
    a = await advDoc(p);
    check("Truyện: Ohmi gia nhập đội khi xuất hiện", a.own?.ohmi === 0 && a.party?.includes("ohmi") && a.comp === "ohmi", JSON.stringify(a.own));
    check("Truyện: lưu lựa chọn", a.choice?.p1 === 1);
    // thoát giữa chừng rồi đọc tiếp
    await p.click("#vnExit");
    a = await advDoc(p);
    check("Truyện: thoát thì lưu chỗ đang đọc", a.prog?.ch === "p" && a.prog?.part === "pre" && a.prog.i > 5, JSON.stringify(a.prog));
    check("Truyện: nút đổi thành Đọc tiếp", /Đọc tiếp/.test(await txt(p, '#advStory [data-act="adv-play"]')));
    await p.click('#advStory [data-act="adv-play"]');
    check("Truyện: đọc tiếp đúng lựa chọn đang dừng", (await p.$$("#vnChoices .vn-choice")).length === 2 && /Ohmi, giúp/.test(await txt(p, "#vnChoices")));
    await p.click('#vnChoices [data-k="1"]');
    await vnRun(p);
    check("Truyện: hết phần đầu thì vào trận đấu", await vis(p, "#v-battle"));

    // C. trận đấu kiến thức
    check("Trận: boss Bé Nhiễu 100/100, 3 tim", /Bé Nhiễu · 100\/100/.test(await txt(p, "#btStage")) && (await p.$$("#btHearts span:not(.lost)")).length === 3);
    check("Trận: 4 đáp án, đúng 1", (await p.$$("#btOpts .opt")).length === 4 && (await p.$$("#btOpts [data-correct]")).length === 1);
    check("Trận: Ohmi ở trong đội với kỹ năng", /Lá chắn Ohm/.test(await txt(p, "#btParty")));
    await p.click("#btOpts .opt:not([data-correct])");
    check("Trận: sai thì mất 1 tim và có giải thích", (await p.$$("#btHearts span:not(.lost)")).length === 2 && (await vis(p, "#btQ .explain")) && /Chưa đúng/.test(await txt(p, "#btQ .explain")));
    await p.click("#btNext");
    await p.click('#btParty [data-skill="ohmi"]');
    check("Trận: dùng kỹ năng lá chắn", /lá chắn/.test(await txt(p, "#btQ .qn")) && (await p.$eval('#btParty [data-skill="ohmi"]', (b) => b.disabled)));
    await p.click("#btOpts .opt:not([data-correct])");
    check("Trận: lá chắn đỡ được câu sai", (await p.$$("#btHearts span:not(.lost)")).length === 2);
    await p.click("#btNext");
    await p.click("#btQ [data-correct]");
    check("Trận: đúng thì trừ 25 máu", /75\/100/.test(await txt(p, "#btStage")) && /Đúng rồi/.test(await txt(p, "#btQ .explain")));
    await p.click("#btNext"); await p.click("#btQ [data-correct]");
    check("Trận: combo tăng sát thương (30)", /45\/100/.test(await txt(p, "#btStage")) && /Combo ×2/.test(await txt(p, "#btStage")));
    await p.click("#btNext"); await p.click("#btQ [data-correct]"); await p.click("#btNext"); await p.click("#btQ [data-correct]");
    check("Trận: hết máu thì hiện nút Chiến thắng", /Chiến thắng/.test(await txt(p, "#btNext")));
    await p.click("#btNext");
    check("Trận: thắng thì sang phần truyện sau", (await vis(p, "#v-vn")) && /rè/.test(await txt(p, "#vnText")));
    seen = await vnRun(p);
    check("Truyện: câu thoại theo lựa chọn trước đó (p2 = 1)", seen.some((t) => /Một cái điện trở làm được nhiều thứ/.test(t)), seen.join(" | ").slice(0, 300));
    await p.waitForTimeout(100);
    check("Truyện: hoàn thành chương có thưởng 300 ✦", (await sheetOpen(p)) && /Hoàn thành Mở đầu/.test(await txt(p, "#sheetRoot")) && /\+300 ✦/.test(await txt(p, "#sheetRoot")));
    a = await advDoc(p);
    check("Truyện: lưu chương đã xong, xoá chỗ đọc dở", a.done?.includes("p") && a.prog === null && a.gems === 1350, JSON.stringify({ d: a.done, g: a.gems, p: a.prog }));
    await p.click('#sheetRoot [data-act="adv-play"]');
    check("Chương 1: mở ngay từ màn thưởng", /Chương 1/.test(await txt(p, "#vnTitle")));
    await p.click("#vnSkip");
    check("Bỏ qua: dừng ở lựa chọn kế tiếp", (await p.$$("#vnChoices .vn-choice")).length === 2);
    await p.click('#vnChoices [data-k="0"]'); await p.click("#vnSkip"); await p.waitForTimeout(50);
    check("Bỏ qua: tới trận đấu, Kirch đã vào đội", (await vis(p, "#v-battle")) && /Định luật nút/.test(await txt(p, "#btParty")) && /Nút Rối · 120\/120/.test(await txt(p, "#btStage")));
    // thua: hết tim
    for (let i = 0; i < 3; i++) { await p.click("#btOpts .opt:not([data-correct])"); await p.click("#btNext"); }
    check("Trận: hết tim thì thua, có nút thử lại", (await sheetOpen(p)) && /Thua mất rồi/.test(await txt(p, "#sheetRoot")) && (await vis(p, "#btRetry")));
    a = await advDoc(p);
    check("Trận: thua vẫn giữ chỗ ở trận đấu", a.prog?.ch === "c1" && a.prog?.part === "battle");
    await p.click("#btRetry");
    check("Trận: thử lại đủ máu và tim", /120\/120/.test(await txt(p, "#btStage")) && (await p.$$("#btHearts span:not(.lost)")).length === 3);
    await p.click('#btParty [data-skill="kirch"]');
    check("Kỹ năng hồi tim không vượt quá 3", (await p.$$("#btHearts span:not(.lost)")).length === 3);
    await winBattle(p);
    await vnRun(p);
    a = await advDoc(p);
    check("Chương 1 xong: +300 ✦", a.done?.includes("c1") && a.gems === 1650, JSON.stringify({ d: a.done, g: a.gems }));
    await p.keyboard.press("Escape");
    check("Chương 2: khoá theo cấp, có nút tập trung", /Cần Cấp 2/.test(await txt(p, "#advStory .lock-note")) && (await vis(p, '#advStory [data-act="focus-open"]')));

    // D. cầu nguyện
    await p.click('#advSeg [data-seg="wish"]');
    check("Cầu nguyện: banner + bảo hiểm 50", /Ánh Đèn Một Chiều/.test(await txt(p, "#advWish")) && /Còn tối đa 50 lượt/.test(await txt(p, "#advWish")) && /#wish$/.test(p.url()));
    await p.click('#advWish [data-n="10"]');
    check("Cầu nguyện ×10: hiện lưới 10 thẻ", (await p.$$(".gacha-ov .gcard")).length === 10 || (await vis(p, ".gacha-ov .g-splash")));
    for (let i = 0; i < 12 && (await vis(p, ".gacha-ov")); i++) { await p.click(".gacha-ov"); await p.waitForTimeout(40); }
    a = await advDoc(p);
    check("Cầu nguyện ×10: trừ 1000 ✦, ghi 10 lượt", a.pulls === 10 && a.hist?.length === 10 && a.gems >= 650 && a.gems <= 650 + 200, JSON.stringify({ g: a.gems, n: a.pulls }));
    check("Cầu nguyện ×10: chắc chắn có ít nhất một 4★", a.hist.some((h) => h.r >= 4));
    check("Cầu nguyện: lớp phủ đã đóng", !(await vis(p, ".gacha-ov")) && !(await p.evaluate(() => document.body.classList.contains("noscroll"))));
    // bảo hiểm: lượt thứ 50 chắc chắn 5★; đã thua 50/50 thì lần sau là Lumi
    await setStore(p, { "data/users/u1/adv": { ...a, gems: 100, p5: 49, guar: 1 } });
    await reopen(p, "#wish");
    check("Bảo hiểm: còn 1 lượt, báo chắc chắn Lumi", /Còn tối đa 1 lượt/.test(await txt(p, "#advWish")) && /chắc chắn là Lumi/.test(await txt(p, "#advWish")));
    await p.click('#advWish [data-n="1"]');
    check("Bảo hiểm: màn giới thiệu nhân vật 5★", /Lumi/.test(await txt(p, ".gacha-ov .g-splash .g-name")));
    for (let i = 0; i < 6 && (await vis(p, ".gacha-ov")); i++) { await p.click(".gacha-ov"); await p.waitForTimeout(40); }
    a = await advDoc(p);
    check("Bảo hiểm: nhận Lumi, đặt lại đếm", a.own?.lumi !== undefined && a.p5 === 0 && a.guar === 0 && a.gems === 0, JSON.stringify({ own: a.own, p5: a.p5, g: a.guar }));
    await p.click('#advWish [data-n="1"]');
    check("Thiếu ✦: báo cần tập trung bao lâu", (await sheetOpen(p)) && /Còn thiếu/.test(await txt(p, "#sheetRoot")) && /Tập trung 50 phút/.test(await txt(p, "#sheetRoot")));
    await p.keyboard.press("Escape");
    await p.click('[data-act="wish-rates"]');
    check("Tỉ lệ: công khai 1,6% và bảo hiểm 50", /1,6%/.test(await txt(p, "#sheetRoot")) && /lượt thứ 50/.test(await txt(p, "#sheetRoot")));
    await p.keyboard.press("Escape");
    await p.click('[data-act="wish-hist"]');
    check("Lịch sử cầu nguyện: 11 dòng", (await p.$$("#sheetRoot .list > .row")).length === 11);
    await p.keyboard.press("Escape");

    // E. nhân vật, đội, bạn đồng hành, trang trí
    await p.click('#advSeg [data-seg="team"]');
    check("Nhân vật: 8 thẻ trong bộ sưu tập + 3 ô đội", (await p.$$("#advTeam .roster")).length === 2 && (await p.$$("#advTeam .roster:nth-of-type(2) .ccard, #advTeam .roster")).length >= 2);
    const locked = await p.$$("#advTeam .ccard.locked");
    const total = await p.$$eval("#advTeam .roster", (rs) => rs[1].querySelectorAll(".ccard").length);
    check("Nhân vật: đủ 8, ai chưa có thì bị ẩn", total === 8 && locked.length === 8 - Object.keys(a.own).length, `${total} / ${locked.length}`);
    await p.click('#advTeam .roster:nth-of-type(2) [data-id="lumi"], #advTeam [data-act="char"][data-id="lumi"]');
    check("Hồ sơ: kỹ năng và lời thoại", /Ánh sáng một chiều/.test(await txt(p, "#sheetRoot")) && (await vis(p, "#sheetRoot .quote")));
    await p.click('#sheetRoot [data-act="comp"]');
    a = await advDoc(p);
    check("Bạn đồng hành: đổi sang Lumi", a.comp === "lumi");
    const party0 = a.party.slice();
    await p.click('#advTeam [data-act="char"][data-id="lumi"]');
    await p.click('#sheetRoot [data-act="party"]');
    a = await advDoc(p);
    check("Đội: thêm/bớt thành viên (tối đa 3)", a.party.length <= 3 && (party0.includes("lumi") ? !a.party.includes("lumi") : a.party.includes("lumi") || party0.length >= 3), JSON.stringify({ party0, now: a.party }));
    if (await sheetOpen(p)) { check("Đội đủ 3: báo cho người dùng", /đủ 3 người/.test(await txt(p, "#toast"))); await p.keyboard.press("Escape"); }
    check("Nhân vật: có lối tắt sang trang trí phòng", await vis(p, '#advTeam [data-act="decor"]'));
    check("Cầu nguyện 3★: ra đồ nội thất cho căn phòng", Object.keys(a.furni || {}).length >= 2, JSON.stringify(a.furni));
    await tab(p, "home");
    check("Hôm nay: chương 2 khoá theo cấp nên nút Truyện không có dấu !", !(await vis(p, "#hudStory .dot-new")));
    check("Hôm nay: bạn đồng hành Lumi ở trong phòng", await vis(p, "#hRoom .dweller.comp"));
    await p.click("#hRoom .dweller.comp");
    check("Bạn đồng hành: chạm thì nói chuyện", /^Lumi:/.test(await txt(p, "#hBubble")));
    check("Khách ghé thăm: một bạn khác trong đội, có quà", (await vis(p, "#hRoom .dweller.visit")) && (await vis(p, "#hRoom .dweller.visit .gift")));
    const gV = (await advDoc(p)).gems; await p.click("#hRoom .dweller.visit");
    check("Khách ghé thăm: tặng 20 ✦ một lần", (await advDoc(p)).gems === gV + 20 && /tặng bạn 20 ✦/.test(await txt(p, "#hBubble")), await txt(p, "#hBubble"));
    await p.click("#hRoom .dweller.visit");
    check("Khách ghé thăm: chạm lần nữa không tặng thêm", (await advDoc(p)).gems === gV + 20);
    await p.click("#hudWish");
    check("Hôm nay: nút Cầu nguyện mở đúng mục", (await vis(p, "#advWish")) && !(await vis(p, "#advStory")));

    // F. kiếm ✦ khi học
    a = await advDoc(p);
    const g0 = a.gems;
    await tab(p, "review"); await p.click('#rList [data-act="review-all"]'); await p.click("#flash"); await p.click("#sGrades .g4");
    a = await advDoc(p);
    check("Ôn 1 thẻ: +1 ✦, hết thẻ đến hạn thì +30 ✦ nhiệm vụ", a.gems === g0 + 1 + 30, `${g0} → ${a.gems}`);
    const now = Date.now();
    await setStore(p, { "data/users/u1/focus": { subject: "c1", start: now - 26 * 60000, endAt: now - 60000, dur: 25 } });
    await reopen(p, "#home");
    a = await advDoc(p);
    check("Tập trung 25 phút: +50 ✦ và +30 ✦ nhiệm vụ", a.gems === g0 + 1 + 50 + 30 + 30, `${g0} → ${a.gems} (q=${JSON.stringify(a.day)})`);
    check("Tập trung: bảng thưởng hiện Tinh thể", /\+50 ✦/.test(await txt(p, "#sheetRoot")));
    check("Tập trung cùng bạn đồng hành: tăng thân thiết", (a.aff?.lumi || 0) >= 1);
    await p.keyboard.press("Escape");

    // G. đấu tập
    await p.click("#hudStory");
    await p.click('#advStory [data-act="train"]');
    check("Đấu tập: có câu hỏi có sẵn và tài liệu", /Điện học L1 có sẵn/.test(await txt(p, "#sheetRoot")) && /Électronique/.test(await txt(p, "#sheetRoot")));
    await p.click('#sheetRoot [data-train="mix"]');
    check("Đấu tập: vào trận với Bé Nhiễu", (await vis(p, "#v-battle")) && /Đấu tập · Điện học/.test(await txt(p, "#btTitle")));
    a = await advDoc(p); const g1 = a.gems;
    await winBattle(p);
    a = await advDoc(p);
    check("Đấu tập: thắng +100 ✦", a.gems === g1 + 100 && a.day?.tr === 1 && (await sheetOpen(p)) && /\+100 ✦/.test(await txt(p, "#sheetRoot")), `${g1} → ${a.gems}`);
    await p.click('#sheetRoot [data-act="train"]');
    await p.click('#sheetRoot [data-train^="course:"]');
    await p.waitForTimeout(400);
    check("Đấu tập từ tài liệu: Claude soạn câu hỏi", (await vis(p, "#v-battle")) && /QCM du cours/.test(await txt(p, "#btQ .qt")));
    const cl = (await calls(p)).filter((c) => c.kind === "json" && /mini-jeu/.test(c.head));
    check("Đấu tập từ tài liệu: gọi Claude một lần", cl.length === 1);
    check("Đấu tập từ tài liệu: công thức được hiển thị", (await p.$$("#btQ .qt mjx-container, #btQ .qt .MathJax")).length >= 0);
    await p.click("#btExit"); await p.click("#cfYes");
    check("Rời trận: về Phiêu lưu", await vis(p, "#v-adv"));
    await p.close();
  }
  {
    // H. hoạt ảnh cầu nguyện thật (không giảm chuyển động) + Claude lỗi khi soạn câu hỏi
    const p = await open({ seed: true, hash: "#wish", cfg: { jsonFail: "rate_limited", welcome: true } });
    await p.keyboard.press("Escape");
    await p.click('#advWish [data-n="1"]');
    check("Hoạt ảnh: sao băng trước khi lộ kết quả", await vis(p, ".gacha-ov .shoot"));
    await p.waitForTimeout(1500);
    check("Hoạt ảnh: tự lộ kết quả", (await vis(p, ".gacha-ov .gcard")) || (await vis(p, ".gacha-ov .g-splash")));
    await p.keyboard.press("Escape");
    check("Hoạt ảnh: Esc đóng lớp phủ", !(await vis(p, ".gacha-ov")));
    await p.click('#advSeg [data-seg="story"]');
    await p.click('#advStory [data-act="train"]');
    await p.click('#sheetRoot [data-train^="course:"]'); await p.waitForTimeout(300);
    check("Đấu tập: Claude lỗi thì báo rõ và bật lại nút", /giới hạn/.test(await txt(p, "#trMsg")) && !(await p.$eval('#sheetRoot [data-train="mix"]', (b) => b.disabled)));
    await p.close();
  }
  {
    // I. chưa đăng nhập: không tặng quà khởi đầu hai lần khi dữ liệu chưa tải
    const p = await open({ hash: "#adv", cfg: { noDb: true } });
    check("Không lưu được: vẫn chơi được trong phiên", (await vis(p, "#v-adv")) && /1\.000/.test(await txt(p, "#advGem")));
    await p.close();
  }

  {
    // J. chơi lại chương cũ không đè tiến độ chương mới; phím Enter; kỹ năng lặp đòn của Indu
    const setStore = (p, kv) => p.evaluate((kv) => { for (const [k, v] of Object.entries(kv)) window.__store.set(k, v); sessionStorage.setItem("__store", JSON.stringify([...window.__store])); }, kv);
    const advDoc = async (p) => (await store(p))["data/users/u1/adv"] || {};
    const p = await open({ reduce: true, hash: "#adv" });
    await p.keyboard.press("Escape");
    await setStore(p, { "data/users/u1/adv": { gems: 0, welcome: 1, pulls: 0, p5: 0, p4: 0, guar: 0, own: { ohmi: 0, indu: 0 }, party: ["indu", "ohmi"], comp: "ohmi", done: ["p"], choice: {}, aff: {}, prog: { ch: "c1", part: "pre", i: 6 }, day: {}, hist: [] } });
    await p.reload({ waitUntil: "load" }); await p.waitForTimeout(700);
    check("Tiến độ: chương 1 đang đọc dở", /Đọc tiếp/.test(await txt(p, '#advStory [data-act="adv-play"]')));
    await p.click('#advStory [data-act="chapters"]');
    await p.click('#sheetRoot [data-act="adv-play"][data-id="p"]');
    check("Chơi lại: mở Mở đầu từ danh sách chương", /Mở đầu/.test(await txt(p, "#vnTitle")) && /18:47/.test(await txt(p, "#vnText")));
    await p.focus("#vnBox"); await p.keyboard.press("Enter");
    check("Phím Enter: sang đúng một dòng", /Không một bóng đèn/.test(await txt(p, "#vnText")), await txt(p, "#vnText"));
    await p.keyboard.press("Enter"); await p.keyboard.press("Enter");
    await p.click("#vnExit");
    let a = await advDoc(p);
    check("Chơi lại chương cũ: không đè chỗ đọc dở của chương 1", a.prog?.ch === "c1" && a.prog?.i === 6, JSON.stringify(a.prog));
    await p.click('#advStory [data-act="adv-play"]');
    check("Đọc tiếp chương 1 đúng chỗ (lựa chọn với Kirch)", (await p.$$("#vnChoices .vn-choice")).length === 2 && /Ngầu ghê/.test(await txt(p, "#vnChoices")));
    await p.click("#vnExit");
    await p.click('#advStory [data-act="train"]'); await p.click('#sheetRoot [data-train="mix"]');
    check("Indu: chưa có đòn nào thì chưa dùng được", await p.$eval('#btParty [data-skill="indu"]', (b) => b.disabled));
    await p.click("#btQ [data-correct]");
    await p.click('#btParty [data-skill="indu"]');
    check("Indu: lặp lại đòn 25 sát thương", /50\/100/.test(await txt(p, "#btStage")), await txt(p, "#btStage"));
    await p.close();
  }
  // ---------- 14. Căn phòng: màn chờ, chào mừng, trang trí, quà, khách, mạch khi tập trung ----------
  {
    const setStore = (p, kv) => p.evaluate((kv) => { for (const [k, v] of Object.entries(kv)) window.__store.set(k, v); sessionStorage.setItem("__store", JSON.stringify([...window.__store])); }, kv);
    const advDoc = async (p) => (await store(p))["data/users/u1/adv"] || {};
    const reopen = async (p, hash) => { await p.goto("https://app.test/" + hash, { waitUntil: "load" }); await p.reload({ waitUntil: "load" }); await p.waitForTimeout(700); };
    // màn chờ: hiện khi dữ liệu đang tải, tự tắt khi xong
    const s0 = await open({ cfg: { slowDb: 1600 } });
    check("Màn chờ: hiện trong lúc tải dữ liệu", (await vis(s0, "#splash")) && !(await s0.$eval("#splash", (e) => e.classList.contains("out"))) && (await vis(s0, "#spArt svg")));
    await s0.waitForTimeout(1500);
    check("Màn chờ: tự tắt khi dữ liệu đã tải", !(await vis(s0, "#splash")) || (await s0.$eval("#splash", (e) => e.classList.contains("out"))));
    await s0.close();
    // chào mừng ở màn Hôm nay
    const w = await open({ cfg: { welcome: true } });
    check("Chào mừng: hiện ở Hôm nay, +1 000 ✦ và 3 bước", (await sheetOpen(w)) && /1 000 ✦/.test(await txt(w, "#sheetRoot")) && (await w.$$("#sheetRoot ol.loop li")).length === 3);
    await w.click('#sheetRoot [data-act="decor"]');
    check("Chào mừng: nút Trang trí mở bảng trang trí", /Trang trí phòng/.test(await txt(w, "#sheetRoot h3")));
    await w.close();
    // trang trí
    const p = await open({ seed: true, reduce: true });
    await setStore(p, { "data/users/u1/adv": { gems: 400, welcome: 1, own: {}, furni: { rug: 1, books: 1 }, equip: { rug: "rug", corner: "books" }, party: [], comp: "", done: [], choice: {}, aff: {}, prog: null, day: {}, hist: [] } });
    await reopen(p, "#home");
    check("Phòng: có thảm và chồng sách tặng sẵn", (await p.$$('#hRoom [data-f="rug"], #hRoom [data-f="books"]')).length === 2);
    check("Phòng: ví ✦ hiện 400", /400/.test(await txt(p, "#hGems")));
    await p.click('.hero-actions [data-act="decor"]');
    check("Trang trí: xem trước căn phòng + đủ 20 món", (await vis(p, "#sheetRoot .decor-prev svg")) && (await p.$$("#sheetRoot .fcard")).length === 20, String((await p.$$("#sheetRoot .fcard")).length));
    await p.click('#dcTabs [data-slot="desk"]');
    check("Trang trí: lọc theo chỗ (Góc học có 2 món)", (await p.$$("#sheetRoot .fcard")).length === 2);
    await p.click('#dcGrid [data-buy="deskpc"]');
    check("Trang trí: thiếu ✦ thì báo cần tập trung bao lâu", /Còn thiếu 200 ✦/.test(await txt(p, "#toast")) && /100 phút/.test(await txt(p, "#toast")), await txt(p, "#toast"));
    await p.click('#dcGrid [data-buy="desk"]');
    check("Trang trí: chạm lần đầu chỉ hỏi lại", /Mua\?/.test(await txt(p, '#dcGrid [data-buy="desk"]')) && (await advDoc(p)).gems === 400);
    await p.click('#dcGrid [data-buy="desk"]');
    let a = await advDoc(p);
    check("Trang trí: mua xong trừ ✦ và đặt ngay vào phòng", a.gems === 0 && a.furni.desk === 1 && a.equip.desk === "desk" && (await p.$$('#hRoom [data-f="desk"]')).length === 1, JSON.stringify(a.equip));
    await p.click('#dcTabs [data-slot="rug"]'); await p.click('#dcGrid [data-equip="rug"]');
    a = await advDoc(p);
    check("Trang trí: chạm món đang dùng thì cất đi", !a.equip.rug && (await p.$$('#hRoom [data-f="rug"]')).length === 0);
    await p.keyboard.press("Escape");
    // nhiệm vụ & quà mỗi ngày
    await p.click("#hQuest");
    await p.click('#sheetRoot [data-act="gift"]');
    a = await advDoc(p);
    check("Quà mỗi ngày: +50 ✦, nút chuyển Đã nhận", a.gems === 50 && a.day.gift === 1 && /Đã nhận/.test(await txt(p, '#sheetRoot [data-act="gift"]')));
    await p.keyboard.press("Escape");
    check("Nhãn nhiệm vụ: hết chấm đỏ sau khi nhận quà", !(await vis(p, "#hQuest .dot-new")));
    await p.click("#hGems");
    check("Tinh thể: bảng cách kiếm", /1 phút = 2 ✦/.test(await txt(p, "#sheetRoot")) && /Không có tiền thật/.test(await txt(p, "#sheetRoot")));
    await p.keyboard.press("Escape");
    // cầu nguyện 3★ ra đồ nội thất nhỏ chưa có
    await setStore(p, { "data/users/u1/adv": { ...(await advDoc(p)), gems: 100 } });
    await reopen(p, "#wish");
    await p.evaluate(() => { Math.random = () => 0.99; });
    await p.click('#advWish [data-n="1"]');
    for (let i = 0; i < 4 && (await vis(p, ".gacha-ov")); i++) { await p.click(".gacha-ov"); await p.waitForTimeout(40); }
    a = await advDoc(p);
    check("Cầu nguyện 3★: ra món nội thất nhỏ chưa có (tháp Eiffel mini)", a.hist?.[0]?.r === 3 && a.hist[0].id === "eiffel" && a.furni.eiffel === 1 && a.equip.sill === "eiffel", JSON.stringify(a.hist?.[0]));
    // tập trung: mạch sáng dần theo thời gian
    const now = Date.now();
    await setStore(p, { "data/users/u1/focus": { subject: "free", start: now - 10 * 60000, endAt: now + 15 * 60000, dur: 25 } });
    await reopen(p, "#focus"); await p.waitForTimeout(1200);
    check("Tập trung: Elec trong phòng học cùng bạn", (await vis(p, "#fRoom .dweller.kit")) && /đang học cùng bạn/.test(await txt(p, "#fElem")));
    check("Tập trung: vòng thời gian đã chạy khoảng 40%", await p.$eval("#fRing .fr-on", (c) => { const [on, all] = c.getAttribute("stroke-dasharray").split(" ").map(Number); return on / all > 0.35 && on / all < 0.45; }));
    await p.close();
  }

  // ---------- 15. Luyện đề, nhập Moodle, hướng dẫn từng việc ----------
  {
    const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
    const plus = (n) => { const d = new Date(today() + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    const p = await open({ seed: true });
    await tab(p, "study");
    await p.click('#sdSeg [data-sseg="exams"]');
    check("Luyện đề: màn trống có nút thêm đề", await vis(p, '#sList [data-act="add-exam"]'));
    check("Luyện đề: nút + đổi thành thêm đề", (await p.getAttribute("#sdAdd", "data-act")) === "add-exam");
    await p.click('#sList [data-act="add-exam"]');
    await p.setInputFiles("#aeF", { name: "partiel-2024.txt", mimeType: "text/plain", buffer: Buffer.from("Exercice 1. Diviseur de tension\nExercice 2. Circuit RC") });
    check("Luyện đề: tên đề lấy từ tên file", (await p.inputValue("#aeT")) === "partiel-2024");
    await p.click("#aeGo"); await p.waitForTimeout(500);
    let st = await store(p);
    const ex = st["data/users/u1/exams"]?.list?.[0];
    check("Luyện đề: lưu đề với 2 bài (bỏ bài trống)", ex?.count === 2 && st[`data/users/u1/exam-${ex.id}`]?.exercises?.length === 2, JSON.stringify(ex));
    check("Luyện đề: danh sách hiện đề vừa thêm", /partiel-2024/.test(await txt(p, "#sList")) && /2 bài/.test(await txt(p, "#sList")));
    await p.click('#sList [data-act="ex-pick"]');
    check("Luyện đề: chọn bài hoặc ngẫu nhiên", (await p.$$('#sheetRoot [data-act="ex-go"]')).length === 3);
    await p.click('#sheetRoot [data-act="ex-go"][data-n="0"]'); await p.waitForTimeout(500);
    check("Luyện đề: Claude soạn bài tương tự kèm barème", (await vis(p, "#v-drill")) && /Exprimer puis calculer/.test(await txt(p, "#drStatement")) && (await p.$$("#drBody .dr-list li")).length === 4);
    check("Luyện đề: gửi bài gốc cho Claude", (await calls(p)).some((c) => c.kind === "json" && /Voici un exercice/.test(c.head)));
    await p.click("#drSubmit");
    check("Luyện đề: bài trống thì nhắc viết hoặc chụp ảnh", /Viết bài làm hoặc chụp ảnh/.test(await txt(p, "#toast")));
    await p.fill("#drAns", "U2 = E R2/(R1+R2) = 6"); await p.click("#drSubmit"); await p.waitForTimeout(600);
    check("Luyện đề: chấm 13.5/20 theo từng tiêu chí", /13\.5\/20/.test(await txt(p, ".dr-score")) && (await p.$$(".dr-score tr")).length === 2);
    check("Luyện đề: chỉ ra lỗi trình bày và corrigé type", (await p.$$(".dr-errs li")).length === 2 && /diviseur de tension/.test(await txt(p, "#drModel")));
    st = await store(p);
    const att = st["data/users/u1/drill"]?.list?.slice(-1)[0];
    check("Luyện đề: lưu lần luyện (điểm, môn)", att?.score === 13.5 && att.total === 20 && att.subj === ex.subj, JSON.stringify(att));
    check("Luyện đề: đóng vòng Luyện và cộng ✦", st["data/users/u1/stats"]?.days?.[today()]?.p === 1 && (st["data/users/u1/adv"]?.gems || 0) >= 30);
    await p.click("#drCards");
    st = await store(p);
    check("Luyện đề: lỗi trình bày thành flashcards", st["data/users/u1/deck-redac"]?.cards?.length === 2);
    await p.click("#drBack"); await tab(p, "review");
    check("Ôn tập: có bộ thẻ 'Cách trình bày bài thi'", /Cách trình bày bài thi/.test(await txt(p, "#rList")));
    // Moodle
    await tab(p, "agenda");
    await p.click('#v-agenda [data-act="moodle"]');
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", "UID:1@moodle", "SUMMARY:TP 3 : compte rendu est à remettre", "DESCRIPTION:Déposer le PDF\\, 4 pages max", "CATEGORIES:LU1EE001", `DTSTART:${plus(4).replace(/-/g, "")}T225900Z`, "END:VEVENT",
      "BEGIN:VEVENT", "UID:2@moodle", "SUMMARY:Quiz chapitre 2 ferme", `DTSTART:${plus(6).replace(/-/g, "")}T210000Z`, "END:VEVENT",
      "BEGIN:VEVENT", "UID:3@moodle", "SUMMARY:Vieux devoir est à remettre", "DTSTART:20200101T100000Z", "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
    await p.setInputFiles("#mdFile", { name: "icalexport.ics", mimeType: "text/calendar", buffer: Buffer.from(ics) });
    await p.waitForTimeout(300);
    const rows = await p.$$eval(".pick-row", (e) => e.map((x) => x.textContent));
    check("Moodle: đọc file .ics, bỏ việc đã qua", rows.length === 2, rows.join(" | "));
    check("Moodle: nhận ra hạn nộp và đổi giờ UTC sang giờ Paris", rows.some((r) => /compte rendu/.test(r) && /Hạn nộp/.test(r) && /23:59/.test(r)), rows.join(" | "));
    await p.click("#evAdd"); await p.waitForTimeout(200);
    st = await store(p);
    const mItem = st["data/users/u1/agenda"].items.find((x) => /compte rendu/.test(x.title));
    check("Moodle: lưu vào Lịch kèm môn và mô tả", mItem?.course === "LU1EE001" && /PDF, 4 pages/.test(mItem.details) && mItem.source === "moodle", JSON.stringify(mItem));
    await p.evaluate((id) => document.querySelector(`[data-act="ev-menu"][data-id="${id}"]`)?.click(), mItem.id);
    await p.click('#sheetRoot [data-act="ev-guide"]'); await p.waitForTimeout(900);
    st = await store(p);
    check("Hướng dẫn: Claude chia nhỏ việc và lưu lại", (await vis(p, "#gdOut")) && !!st["data/users/u1/agenda"].items.find((x) => x.id === mItem.id)?.guide);
    const n0 = (await calls(p)).length;
    await p.keyboard.press("Escape");
    await p.evaluate((id) => document.querySelector(`[data-act="ev-menu"][data-id="${id}"]`)?.click(), mItem.id);
    await p.click('#sheetRoot [data-act="ev-guide"]'); await p.waitForTimeout(200);
    check("Hướng dẫn: mở lại không hỏi Claude lần nữa", (await calls(p)).length === n0);
    await p.close();
  }

  // ---------- 10. Bố cục ở nhiều cỡ màn hình, sáng/tối, truy cập ----------
  for (const scheme of ["light", "dark"]) {
    for (const width of [320, 390, 820]) {
      const p = await open({ seed: true, scheme, width, mobile: width < 700 });
      for (const v of ["home", "study", "review", "agenda", "inbox", "stats", "prog"]) {
        if (v === "stats") { await tab(p, "home"); await p.click('.hero-actions [data-go="stats"]'); }
        else if (v === "prog") { await p.click('#v-stats [data-go="prog"]'); }
        else await tab(p, v);
        await p.waitForTimeout(80);
        const o = await overflow(p);
        check(`Bố cục ${scheme} ${width}px ${v}: không tràn ngang`, o <= 0, `tràn ${o}px`);
        if (width === 390) await axe(p, `${scheme} ${v}`);
        if (width === 320) await p.screenshot({ path: `${SHOTS}/${scheme}-${width}-${v}.png`, fullPage: true });
      }
      await p.click('#v-prog [data-go="stats"]'); await p.click('#v-stats [data-go="home"]'); await p.click("#wFocus"); await p.waitForTimeout(300);
      check(`Bố cục ${scheme} ${width}px focus: không tràn ngang`, (await overflow(p)) <= 0);
      if (width === 390) await axe(p, `${scheme} focus`);
      if (width === 320) await p.screenshot({ path: `${SHOTS}/${scheme}-${width}-focus.png` });
      await p.click('#v-focus [data-go="home"]');
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

  // ---------- bố cục các màn phiêu lưu ----------
  for (const scheme of ["light", "dark"]) {
    for (const width of [320, 390, 820]) {
      const p = await open({ seed: true, scheme, width, mobile: width < 700, reduce: true, hash: "#adv", cfg: { welcome: true } });
      await p.keyboard.press("Escape");
      for (const v of ["adv", "wish", "team", "home"]) {
        if (v === "home") await tab(p, "home"); else if (v !== "adv") await p.click(`#advSeg [data-seg="${v}"]`);
        await p.waitForTimeout(80);
        check(`Bố cục ${scheme} ${width}px ${v}: không tràn ngang`, (await overflow(p)) <= 0, `tràn ${await overflow(p)}px`);
        if (width === 390) await axe(p, `${scheme} ${v}`);
        await p.screenshot({ path: `${SHOTS}/adv-${scheme}-${width}-${v}.png`, fullPage: true });
      }
      await p.click("#hudStory"); await p.click('#advStory [data-act="adv-play"]'); await p.waitForTimeout(100);
      for (let i = 0; i < 5; i++) { await p.click("#vnBox"); await p.waitForTimeout(30); }
      check(`Bố cục ${scheme} ${width}px vn: không tràn ngang`, (await overflow(p)) <= 0);
      if (width === 390) await axe(p, `${scheme} vn`);
      await p.screenshot({ path: `${SHOTS}/adv-${scheme}-${width}-vn.png` });
      await p.click("#vnSkip"); await p.click('#vnChoices [data-k="0"]'); await p.click("#vnSkip"); await p.click('#vnChoices [data-k="0"]'); await p.click("#vnSkip"); await p.waitForTimeout(100);
      await p.click("#btOpts .opt:not([data-correct])"); await p.waitForTimeout(60);
      check(`Bố cục ${scheme} ${width}px battle: không tràn ngang`, (await overflow(p)) <= 0);
      if (width === 390) await axe(p, `${scheme} battle`);
      await p.screenshot({ path: `${SHOTS}/adv-${scheme}-${width}-battle.png`, fullPage: true });
      await p.click("#btExit"); await p.click("#cfYes"); await p.click('#advSeg [data-seg="wish"]'); await p.click('#advWish [data-n="10"]'); await p.waitForTimeout(100);
      await p.screenshot({ path: `${SHOTS}/adv-${scheme}-${width}-gacha1.png` });
      for (let i = 0; i < 12 && await p.isVisible(".gacha-ov .g-splash").catch(() => false); i++) { await p.click(".gacha-ov"); await p.waitForTimeout(40); }
      check(`Bố cục ${scheme} ${width}px gacha: không tràn ngang`, (await overflow(p)) <= 0);
      await p.screenshot({ path: `${SHOTS}/adv-${scheme}-${width}-gacha2.png` });
      await p.close();
    }
  }

  check("Không có lỗi JavaScript nào trong toàn bộ phiên thử", errors.length === 0, errors.slice(0, 8).join(" | "));
  const fail = results.filter((r) => !r.ok);
  console.log(`\n=== ${results.length - fail.length}/${results.length} PASS ===`);
  fs.writeFileSync(path.join(__dirname, "results.json"), JSON.stringify(results, null, 1));
  await browser.close();
})().catch(async (e) => { console.error("CRASH", e); console.log("ERRORS", errors); console.log(`\n=== ${results.filter((r) => r.ok).length}/${results.length} PASS before crash ===`); await browser?.close(); process.exit(1); });
