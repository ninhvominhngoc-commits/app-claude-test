
// ================= tài liệu: PDF → chữ, ảnh scan → Claude đọc =================
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("load " + src)); document.head.appendChild(s); }); }
let pdfReady = null;
function getPdf() {
  return (pdfReady ||= (async () => {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"); // chạy trên luồng chính
    return window.pdfjsLib;
  })());
}
const MAX_OCR_PAGES = 40;
async function ocrImages(blobs, onProg) {
  const sample = await getSample();
  const max = Math.min((await getLimits())?.images?.maxCount || 0, 5);
  if (!sample || !max) throw new Error("no-images");
  const out = [];
  for (let i = 0; i < blobs.length; i += max) {
    const batch = blobs.slice(i, i + max);
    const r = await sample.json(`Ces ${batch.length} images sont des pages de cours (slides ou polycopié de L1 EEA). Transcris fidèlement le contenu de chaque page en Markdown, formules en LaTeX ($...$), et décris brièvement les schémas entre [Schéma : ...]. Réponds UNIQUEMENT avec un tableau JSON de ${batch.length} chaînes, une par image, dans l'ordre.`, { images: batch, modelTier: "default" });
    batch.forEach((_, j) => out.push(String(Array.isArray(r) ? r[j] ?? "" : "")));
    onProg?.(Math.min(i + max, blobs.length), blobs.length, "Claude đọc trang ảnh");
  }
  return out;
}
async function pdfToPages(file, onProg) {
  const pdfjs = await getPdf();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [], scanned = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    let s = "", lastY = null;
    for (const it of tc.items) { const y = it.transform?.[5]; if (lastY !== null && Math.abs(y - lastY) > 4) s += "\n"; else if (s && !s.endsWith(" ")) s += " "; s += it.str; lastY = y; }
    s = s.replace(/[ \t]+/g, " ").trim();
    pages.push(s);
    if (s.length < 40) scanned.push(p);
    onProg?.(p, doc.numPages, "Đọc PDF");
  }
  let skipped = 0;
  if (scanned.length) {
    const todo = scanned.slice(0, MAX_OCR_PAGES);
    skipped = scanned.length - todo.length;
    const blobs = [];
    for (const p of todo) {
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale: 1.6 });
      const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
      await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
      blobs.push(await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.82)));
    }
    try { const texts = await ocrImages(blobs, onProg); todo.forEach((p, i) => (pages[p - 1] = texts[i] || pages[p - 1])); }
    catch { skipped = scanned.length; }
  }
  return { pages, skipped };
}
async function createCourse({ files, title, exam }, onProg) {
  const pages = [], notes = [], images = [];
  for (const f of files) {
    if (f.type === "application/pdf") { const r = await pdfToPages(f, onProg); pages.push(...r.pages); if (r.skipped) notes.push(`${r.skipped} trang ảnh chưa đọc được`); }
    else if (f.type.startsWith("image/")) images.push(f);
    else pages.push(await f.text());
  }
  if (images.length) { try { pages.push(...(await ocrImages(images, onProg))); } catch { notes.push("không đọc được ảnh trên thiết bị này"); } }
  if (!pages.some((p) => p.trim())) throw new Error("Không lấy được chữ nào từ tài liệu này.");
  const c = { id: uid8(), title, examContent: exam, pageCount: pages.length, chunks: 0, createdAt: new Date().toISOString() };
  let chunk = [], size = 0;
  const flush = async () => { if (!chunk.length) return; await save(`text-${c.id}-${c.chunks}`, { pages: chunk }); c.chunks++; chunk = []; size = 0; };
  for (const p of pages) { const b = new Blob([p]).size + 8; if (size + b > 200000) await flush(); chunk.push(p); size += b; }
  await flush();
  c._pages = pages;
  state.courses.push(c);
  await saveCourses();
  return { c, notes };
}
function openAddCourse() {
  openSheet({ title: "Thêm tài liệu", html: `
    <label class="field"><span>Tên môn / chương</span><input type="text" id="acTitle" placeholder="vd: Électrocinétique – ch.2"></label>
    <label class="field"><span>Nội dung thi (nếu biết)</span><textarea id="acExam" rows="2" placeholder="vd: Lois de Kirchhoff, diviseur de tension"></textarea></label>
    <label class="drop">${icon("upload")}<span id="acDropText">Chọn PDF, ảnh chụp slide hoặc file .txt</span><input type="file" id="acFiles" class="vh" multiple accept="application/pdf,image/*,.txt,.md"></label>
    <div class="progress" id="acProg" hidden><i></i></div>
    <p class="small muted" id="acStatus">PowerPoint hay Word thì “Xuất ra PDF” trước. Slide dạng ảnh scan sẽ được Claude đọc giúp.</p>
    <button class="btn primary block" id="acGo">Tải lên</button>`,
    onMount: (el) => {
      const files = $("#acFiles", el);
      files.addEventListener("change", () => {
        const list = [...files.files];
        $("#acDropText", el).textContent = list.length ? list.map((f) => f.name).join(", ") : "Chọn PDF, ảnh chụp slide hoặc file .txt";
        if (!$("#acTitle", el).value && list[0]) $("#acTitle", el).value = list[0].name.replace(/\.[^.]+$/, "");
      });
      $("#acGo", el).addEventListener("click", async (ev) => {
        const list = [...files.files];
        if (!list.length) return toast("Chọn ít nhất một file nhé");
        const btn = ev.currentTarget, prog = $("#acProg", el), bar = prog.querySelector("i"), status = $("#acStatus", el);
        btn.disabled = true; prog.hidden = false;
        const onProg = (d, t, label) => { if (!el.isConnected) return; bar.style.width = Math.round((d / t) * 100) + "%"; status.textContent = `${label}: ${d}/${t}`; };
        try {
          const title = $("#acTitle", el).value.trim() || list[0].name.replace(/\.[^.]+$/, "");
          const { c, notes } = await createCourse({ files: list, title, exam: $("#acExam", el).value.trim() }, onProg);
          closeSheet();
          state.cur = c.id; lsSet("cur", c.id);
          show("course");
          toast(`Đã thêm “${title}” (${c.pageCount} trang)` + (notes.length ? " · " + notes.join(", ") : ""), 5000);
        } catch (err) {
          if (el.isConnected) { status.innerHTML = `<span class="err">${esc(err?.code ? sampleErr(err) : err.message || "Lỗi khi đọc tài liệu.")}</span>`; btn.disabled = false; prog.hidden = true; }
        }
      });
    } });
}
async function deleteCourse(c) {
  for (let i = 0; i < (c.chunks || 0); i++) removeDoc(`text-${c.id}-${i}`);
  removeDoc("chat-" + c.id); removeDoc("deck-" + c.id);
  delete state.chats[c.id]; delete state.decks[c.id];
  state.courses = state.courses.filter((x) => x.id !== c.id);
  saveCourses();
  if (state.cur === c.id) { state.cur = null; lsSet("cur", ""); }
}

// ================= gia sư Feynman =================
const curCourse = () => state.courses.find((c) => c.id === state.cur);
const chatOf = (id) => (state.chats[id] ||= { turns: [] });
const langOf = (c) => lsGet("lang:" + c.id, lsGet("lang", "fr"));
function rangeOf(c, n = c.pageCount) {
  const r = c.range || [1, Math.min(n, 30)];
  const from = clamp(+r[0] || 1, 1, Math.max(1, n));
  return [from, clamp(+r[1] || n, from, Math.max(1, n))];
}
const TUTOR = (c, pagesText, range, vi) => `Tu es mon tuteur / ma tutrice personnel·le pour ma L1 EEA à Sorbonne Université. J'étudie à distance avec des slides et polycopiés très denses. Je suis vietnamien·ne.
Cours : « ${c.title} » (pages ${range}).${c.examContent ? `\nProgramme de l'examen : ${c.examContent}` : ""}
Pédagogie (Feynman + répétition espacée) :
- Une notion à la fois : une analogie concrète et drôle de la vie quotidienne, puis la version rigoureuse (formules en LaTeX entre $...$ ou $$...$$), puis un mini-exemple chiffré. Cite la page du document ([p. N]).
- Après chaque notion, demande-moi de la réexpliquer avec MES mots.
- Si mon message commence par "[EXPLICATION FEYNMAN]", c'est mon explication : note /10, ce qui est juste, les trous, les contresens, une analogie plus simple, une question de suivi. Sinon, ne parle jamais de cette balise.
- Questions de fond (pourquoi, sens physique) : va au fond, en t'appuyant sur des connaissances académiques solides ; si tu n'es pas sûr, dis-le.
- De temps en temps, rappelle une notion vue plus tôt pour la consolider.
- Réponses courtes et vivantes, titres courts, pas de murs de texte. Ne corrige pas mon français (un autre module s'en charge).
- Langue : ${vi ? "réponds en VIETNAMIEN, garde les termes techniques français entre parenthèses" : "français simple"}.

=== DOCUMENT DE COURS ===
${pagesText}
=== FIN DU DOCUMENT ===`;
const STARTERS = [
  { t: "Bức tranh toàn cảnh", d: "Các ý chính, theo thứ tự", q: "Donne-moi une vue d'ensemble de ces pages : les grandes idées dans l'ordre, une phrase chacune, puis propose par où commencer." },
  { t: "Giảng ý đầu tiên", d: "Kèm ví dụ đời thường", q: "Explique-moi la première notion importante de ces pages, avec une analogie drôle de la vie quotidienne." },
  { t: "Quiz 5 câu", d: "Hỏi từng câu một", q: "Fais-moi un quiz de 5 questions sur ces pages, une question à la fois : attends ma réponse avant la suivante." },
  { t: "Bài tập kiểu thi", d: "Chưa kèm lời giải", q: "Donne-moi un exercice type examen sur ces pages, sans la correction. Je te donnerai ma réponse." },
];
const SUGGEST = [
  ["Chưa hiểu", "Je n'ai pas compris. Réexplique avec une autre analogie, plus simple."],
  ["Ví dụ khác", "Donne-moi un autre exemple concret, avec des chiffres."],
  ["Bản chất?", "Pourquoi c'est comme ça, physiquement ? Va au fond des choses."],
  ["Ý tiếp theo", "On passe à la notion suivante."],
  ["Bài tập", "Donne-moi un exercice type examen sur ce qu'on vient de voir, sans la correction."],
  ["Tóm tắt", "Fais-moi un résumé en 5 points de ce qu'on a vu, à retenir pour l'examen."],
];
function fixHtml(fix, open = false) {
  const n = fix?.errors?.length || 0;
  if (!n) return "";
  return `<details class="fix"${open ? " open" : ""}><summary>${icon("pencil")} Petit point français · ${n} lỗi</summary><ul>${fix.errors.map((x) => `<li><span><s>${esc(x.original)}</s> → <b>${esc(x.correction)}</b></span><span>${esc(x.rule)}</span><span class="vi">${esc(x.vi)}</span>${x.astuce ? `<span class="tip">${esc(x.astuce)}</span>` : ""}</li>`).join("")}</ul><p class="faint small">Đã lưu vào bộ thẻ Ngữ pháp để ôn lại.</p></details>`;
}
function userHtml(content, fix) {
  const feyn = content.startsWith(FEYN);
  return `<div class="msg u">${feyn ? `<span class="mode">${icon("speak")} Tự giảng lại</span>` : ""}<div class="bubble">${esc(feyn ? content.slice(FEYN.length) : content)}</div>${fix ? fixHtml(fix) : ""}</div>`;
}
const tutorHtml = (inner) => `<div class="msg a"><div class="who">${mascot("xs")} Gia sư</div><div class="md">${inner}</div></div>`;
function renderThread() {
  const c = curCourse(), box = $("#thread");
  const turns = chatOf(c.id).turns;
  if (!turns.length) {
    const [f, t] = rangeOf(c);
    box.innerHTML = `<div class="starter">${mascot("lg")}<h2>Học “${esc(c.title)}”</h2><p class="muted small">Đang chọn trang ${f}–${t}. Bắt đầu từ một gợi ý, hoặc tự hỏi. Viết bằng tiếng Pháp thì gia sư sửa ngữ pháp giúp bạn.</p>
      <div class="starter-grid">${STARTERS.map((s, i) => `<button data-act="starter" data-i="${i}"><strong>${s.t}</strong><span>${s.d}</span></button>`).join("")}</div></div>`;
  } else {
    // bản cũ lưu phần sửa ngữ pháp ở lượt gia sư: vẫn hiện dưới tin nhắn của bạn
    box.innerHTML = turns.map((t, i) => t.role === "user" ? userHtml(t.content, t.fix || turns[i + 1]?.fix) : tutorHtml(md(t.content))).join("");
    typeset(box);
  }
}
function renderCourse() {
  const c = curCourse(); if (!c) return;
  $("#cTitle").textContent = c.title;
  const [f, t] = rangeOf(c);
  $("#cRange").innerHTML = `Trang ${f}–${t} / ${c.pageCount} ${icon("down")}`;
  const lang = langOf(c);
  $$("#cLang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  renderThread();
  updateComposer();
}
let chatAbort = null, feynOn = false;
const nearBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;
const scrollToEnd = (smooth) => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth && !reduceMotion ? "smooth" : "auto" });
function autoGrow() { const ta = $("#chatIn"); ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 160) + "px"; }
function updateComposer() {
  const busy = !!chatAbort, c = curCourse();
  $("#sendBtn").hidden = busy; $("#stopBtn").hidden = !busy;
  $("#sendBtn").disabled = !$("#chatIn").value.trim();
  $("#suggest").hidden = busy || !(c && chatOf(c.id).turns.length);
}
function setFeyn(on) {
  feynOn = on;
  $("#feynBanner").hidden = !on;
  $("#inputRow").classList.toggle("feyn-on", on);
  $("#feynBtn").setAttribute("aria-pressed", String(on));
  $("#chatIn").placeholder = on ? "Giảng lại theo cách bạn hiểu…" : "Hỏi gia sư…";
}
async function grammarCheck(sample, message) {
  if (message.length < 12 || !/[a-zàâçéèêëîïôûùüÿœ]{3,}/i.test(message)) return null;
  try {
    const g = await sample.json(`Tu es un correcteur de français bienveillant et drôle pour un·e étudiant·e vietnamien·ne (niveau B1-B2). Analyse UNIQUEMENT ce message. Relève les vraies fautes (grammaire, accords, conjugaison, prépositions, genre, tournures non idiomatiques). Ignore les fautes de frappe évidentes, les accents manquants isolés et le style oral acceptable.
Réponds UNIQUEMENT avec un JSON : {"is_french": true|false, "errors": [{"original": "...", "correction": "...", "rule": "règle en français simple", "vi": "giải thích ngắn bằng tiếng Việt", "astuce": "moyen mnémotechnique drôle"}], "encouragement": "une phrase courte"}
Si le message n'est pas en français : {"is_french": false, "errors": [], "encouragement": ""}.

Message : """${message}"""`, { modelTier: "quick" });
    if (!g?.is_french || !Array.isArray(g.errors) || !g.errors.length) return null;
    const errors = g.errors.filter((x) => x?.original && x?.correction).map((x) => ({ original: String(x.original), correction: String(x.correction), rule: String(x.rule || ""), vi: String(x.vi || ""), astuce: String(x.astuce || "") }));
    if (!errors.length) return null;
    addCards(FR, errors.map((x) => ({ front: `Sửa câu này: « ${x.original} »`, back: `**${x.correction}**\n\n${x.rule}\n\n${x.vi}`, mnemonic: x.astuce })));
    return { errors, encouragement: String(g.encouragement || "") };
  } catch { return null; }
}
async function send(text, { canned = false } = {}) {
  text = String(text || "").trim();
  const c = curCourse();
  if (!text || !c || chatAbort) return;
  const sample = await getSample(); if (!sample) return toast(NEED_CLAUDE);
  const feyn = !canned && feynOn, vi = langOf(c) === "vi";
  const content = (feyn ? FEYN : "") + text;
  const chat = chatOf(c.id), box = $("#thread");
  if (!chat.turns.length) box.innerHTML = "";
  box.insertAdjacentHTML("beforeend", userHtml(content));
  const uEl = box.lastElementChild;
  box.insertAdjacentHTML("beforeend", tutorHtml(thinking("đang nghĩ…")));
  const aMd = box.lastElementChild.querySelector(".md");
  scrollToEnd(true);
  $("#chatIn").value = ""; autoGrow(); setFeyn(false);
  chatAbort = new AbortController(); updateComposer();

  // đầu vào: chỉ dẫn + tài liệu nằm trong lượt đầu tiên còn giữ, rồi lịch sử gần nhất
  const pages = await loadCourseText(c);
  const [from, to] = rangeOf(c, pages.length || c.pageCount);
  const lim = ((await getLimits())?.maxPromptBytes || 262144) - 40000;
  const history = [...chat.turns.map((t) => ({ role: t.role, content: t.content })), { role: "user", content }].slice(-16);
  while (history.length && history[0].role !== "user") history.shift();
  const histBytes = new Blob([history.map((t) => t.content).join("")]).size;
  let docText = "", used = 0;
  for (let p = from; p <= to; p++) {
    const s = `\n[p. ${p}]\n${pages[p - 1] || ""}`, b = new Blob([s]).size;
    if (used + b > lim - histBytes) { docText += `\n[… pages ${p}-${to} non incluses : trop long, choisis une plage plus petite]`; break; }
    docText += s; used += b;
  }
  const input = history.map((t, i) => (i === 0 ? { role: "user", content: TUTOR(c, docText, `${from}-${to}`, vi) + "\n\nMon message : " + t.content } : t));
  if (vi) input[input.length - 1] = { role: "user", content: input[input.length - 1].content + "\n\n(Réponds en vietnamien, termes techniques en français entre parenthèses.)" };

  const fixP = canned ? Promise.resolve(null) : grammarCheck(sample, text);
  let answer = "", raf = 0;
  try {
    const r = await sample(input, {
      onText: ({ text: t }) => { answer = t; if (!raf) raf = requestAnimationFrame(() => { raf = 0; const stick = nearBottom(); aMd.innerHTML = md(answer); if (stick) scrollToEnd(); }); },
      signal: chatAbort.signal, cache: false });
    cancelAnimationFrame(raf); raf = 0;
    answer = r.text;
    setMd(aMd, answer + (r.truncated ? "\n\n_(Câu trả lời bị cắt ngắn. Thử chọn ít trang hơn.)_" : ""));
  } catch (err) {
    cancelAnimationFrame(raf); raf = 0;
    if (err?.text) answer = err.text;
    aMd.innerHTML = (answer ? md(answer) : "") + (err?.code === "cancelled" ? `<p class="faint small">Đã dừng.</p>` : `<p class="err">${esc(sampleErr(err))}</p>`);
    typeset(aMd);
  } finally { chatAbort = null; updateComposer(); }
  const fix = await fixP;
  if (answer) {
    chat.turns.push({ role: "user", content, ...(fix ? { fix } : {}) }, { role: "assistant", content: answer });
    saveChat(c.id);
    c.lastStudied = new Date().toISOString(); saveCourses();
  }
  if (fix && uEl.isConnected) uEl.insertAdjacentHTML("beforeend", fixHtml(fix, true));
  renderBadges();
}
function openCourseMenu() {
  const c = curCourse(); if (!c) return;
  const [f, t] = rangeOf(c);
  openSheet({ title: c.title, html: `<div class="menu">
    <button class="menu-i" data-act="c-cards">${icon("cards")}<span><strong>Tạo flashcards</strong><span class="faint small">Từ trang ${f}–${t} đang học</span></span></button>
    <button class="menu-i" data-act="c-range">${icon("pages")}<span><strong>Chọn trang học</strong><span class="faint small">Đang chọn trang ${f}–${t} / ${c.pageCount}</span></span></button>
    <button class="menu-i" data-act="c-exam">${icon("target")}<span><strong>Nội dung thi</strong><span class="faint small">${esc(c.examContent || "Chưa nhập")}</span></span></button>
    <button class="menu-i" data-act="c-reset">${icon("refresh")}<span><strong>Buổi học mới</strong><span class="faint small">Xoá cuộc trò chuyện, giữ flashcards</span></span></button>
    <button class="menu-i danger" data-act="c-delete">${icon("trash")}<span><strong>Xoá tài liệu</strong><span class="faint small">Xoá tài liệu, trò chuyện và thẻ của nó</span></span></button>
  </div>` });
}
function openRangeSheet() {
  const c = curCourse(); if (!c) return;
  const [f, t] = rangeOf(c), n = c.pageCount, span = Math.max(10, t - f + 1);
  const presets = [];
  if (t < n) presets.push([t + 1, Math.min(n, t + span), `Phần tiếp: ${t + 1}–${Math.min(n, t + span)}`]);
  presets.push([1, Math.min(n, 10), `1–${Math.min(n, 10)}`]);
  if (n <= 60) presets.push([1, n, `Toàn bộ (${n} trang)`]);
  openSheet({ title: "Chọn trang học", html: `
    <p class="muted small">Tài liệu có ${n} trang. Mỗi lần học khoảng 10–30 trang là vừa: gia sư tập trung hơn và tốn ít lượt hơn.</p>
    <div class="two"><label class="field"><span>Từ trang</span><input type="number" id="rgFrom" min="1" max="${n}" value="${f}" inputmode="numeric"></label><label class="field"><span>Đến trang</span><input type="number" id="rgTo" min="1" max="${n}" value="${t}" inputmode="numeric"></label></div>
    <div class="pills">${presets.map(([a, b, l]) => `<button type="button" data-a="${a}" data-b="${b}" aria-pressed="false">${esc(l)}</button>`).join("")}</div>
    <button class="btn primary block" id="rgGo">Lưu</button>`,
    onMount: (el) => {
      $$(".pills button", el).forEach((b) => b.addEventListener("click", () => { $("#rgFrom", el).value = b.dataset.a; $("#rgTo", el).value = b.dataset.b; }));
      $("#rgGo", el).addEventListener("click", () => {
        const a = clamp(+$("#rgFrom", el).value || 1, 1, n), b = clamp(+$("#rgTo", el).value || n, a, n);
        c.range = [a, b]; saveCourses(); closeSheet(); renderCourse(); toast(`Gia sư sẽ dùng trang ${a}–${b}`);
      });
    } });
}
function openExamSheet() {
  const c = curCourse(); if (!c) return;
  openSheet({ title: "Nội dung thi", html: `
    <p class="muted small">Gia sư sẽ ưu tiên các phần này khi giảng và khi tạo flashcards.</p>
    <textarea id="exText" rows="4" placeholder="vd: Chapitres 1 à 3, lois de Kirchhoff, exercices type TD 2"></textarea>
    <button class="btn primary block" id="exGo">Lưu</button>`,
    onMount: (el) => {
      $("#exText", el).value = c.examContent || "";
      $("#exGo", el).addEventListener("click", () => { c.examContent = $("#exText", el).value.trim(); saveCourses(); closeSheet(); toast("Đã lưu nội dung thi"); });
    } });
}
function openCardsSheet() {
  const c = curCourse(); if (!c) return;
  const [f, t] = rangeOf(c);
  openSheet({ title: "Tạo flashcards", html: `
    <p class="muted small">Từ trang ${f}–${t} của “${esc(c.title)}”.</p>
    <label class="field"><span>Tập trung vào (không bắt buộc)</span><input type="text" id="fcFocus" placeholder="vd: loi d'Ohm, condensateur"></label>
    <div class="pills" id="fcCount">${[8, 12, 20].map((n) => `<button type="button" data-n="${n}" aria-pressed="${n === 12}">${n} thẻ</button>`).join("")}</div>
    <div class="small" id="fcStatus"></div>
    <button class="btn primary block" id="fcGo">${icon("sparkle")} Tạo thẻ</button>`,
    onMount: (el) => {
      let count = 12;
      $$("#fcCount button", el).forEach((b) => b.addEventListener("click", () => { count = +b.dataset.n; $$("#fcCount button", el).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
      $("#fcGo", el).addEventListener("click", async (ev) => {
        const btn = ev.currentTarget;
        if (btn.dataset.done) { closeSheet(); startSession([c.id]); return; }
        const sample = await getSample(); if (!sample) return toast(NEED_CLAUDE);
        btn.disabled = true; $("#fcStatus", el).innerHTML = thinking("Claude đang soạn thẻ…");
        try {
          const pages = await loadCourseText(c);
          let text = ""; for (let p = f; p <= t && text.length < 150000; p++) text += `\n[p. ${p}]\n${pages[p - 1] || ""}`;
          const existing = (state.decks[c.id] || []).map((k) => "- " + k.front).join("\n").slice(0, 20000);
          const focus = $("#fcFocus", el).value.trim();
          const cards = await sample.json(`Crée ${count} flashcards de répétition espacée en français à partir de ce cours de L1 EEA (pages ${f}-${t}). Chaque carte teste UNE idée et oblige à comprendre (pas juste réciter). Verso court et exact (formules en LaTeX $...$). "mnemonic" = image mentale ou analogie drôle pour retenir.${focus ? " Centre-toi sur : " + focus + "." : ""}${c.examContent ? " Priorité au programme d'examen : " + c.examContent : ""}
Évite ces cartes existantes :\n${existing || "(aucune)"}
Réponds UNIQUEMENT avec un tableau JSON : [{"front": "...", "back": "...", "mnemonic": "..."}]

=== COURS ===${text}`, { cache: false });
          const ok = (Array.isArray(cards) ? cards : []).filter((k) => k?.front && k?.back);
          addCards(c.id, ok);
          if (!el.isConnected) return toast(`Đã tạo ${ok.length} thẻ`);
          $("#fcStatus", el).innerHTML = `<span class="faint">Đã tạo ${ok.length} thẻ mới cho bộ “${esc(c.title)}”.</span>`;
          btn.disabled = false; btn.dataset.done = "1"; btn.innerHTML = `${icon("cards")} Ôn ngay`;
        } catch (err) { if (el.isConnected) { $("#fcStatus", el).innerHTML = `<span class="err">${esc(sampleErr(err))}</span>`; btn.disabled = false; } }
      });
    } });
}
