// ================= Luyện đề: đề tương tự + chấm cách trình bày; Nhập việc từ Moodle (.ics) =================
let studySeg = "docs";
const examData = {}; // mã đề → { exercises, style } (tải khi cần)
const dr = { examId: null, n: 0, phase: "", problem: null, result: null, photos: [], err: "" };
const saveExams = () => save("exams", { list: state.exams });
const saveDrill = () => { state.drill.list = state.drill.list.slice(-80); return save("drill", state.drill); };
const examOf = (id) => state.exams.find((e) => e.id === id);
async function loadExam(id) {
  if (examData[id]) return examData[id];
  if (base) { const s = await base.doc("exam-" + id).get(); if (s.exists) examData[id] = s.data(); }
  return examData[id] || { exercises: [], style: [] };
}

// --- danh sách đề ở tab Học ---
function renderStudySeg() {
  $$("#sdSeg button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.sseg === studySeg)));
  $("#sdAdd").setAttribute("data-act", studySeg === "exams" ? "add-exam" : "add-course");
  $("#sdAdd").setAttribute("aria-label", studySeg === "exams" ? "Thêm đề thi" : "Thêm tài liệu");
}
function renderExams() {
  const el = $("#sList");
  const intro = `<p class="muted small">Tải đề thi cũ (PDF hoặc ảnh chụp). Claude soạn bài <b>tương tự</b> (khác số liệu, cùng dạng), bạn làm bài rồi được chấm như giám khảo, nhất là <b>cách trình bày</b>: định luật, biểu thức chữ trước khi thay số, đơn vị, kết luận.</p>`;
  if (!state.exams.length) {
    el.innerHTML = `<div class="empty">${emptyIc("upload")}<h3>Chưa có đề thi nào</h3>${intro}<button class="btn primary" data-act="add-exam">${icon("upload")} Thêm đề thi</button></div>`;
    return;
  }
  el.innerHTML = intro + state.exams.map((e) => {
    const tries = state.drill.list.filter((a) => a.examId === e.id && a.score != null), last = tries[tries.length - 1];
    return `<article class="exam-card"><div class="ex-ic" aria-hidden="true">${icon("pages")}</div><div class="ex-body"><strong>${esc(e.title)}</strong>
      <span class="small muted">${esc(subjOf(e.subj).name)} · ${e.count || 0} bài${last ? ` · lần gần nhất ${last.score}/${last.total}` : ""}${tries.length ? ` · đã luyện ${tries.length} lần` : ""}</span>
      <div class="row" style="gap:8px;margin-top:6px"><button class="btn sm primary" data-act="ex-pick" data-id="${esc(e.id)}">${icon("pencil")} Luyện bài tương tự</button><button class="btn sm ghost" data-act="ex-del" data-id="${esc(e.id)}" aria-label="Xoá đề ${esc(e.title)}">${icon("trash")}</button></div></div></article>`;
  }).join("") + `<button class="btn ghost block" data-act="add-exam">${icon("plus")} Thêm đề thi</button>`;
}
function subjOptions(sel) { return subjects().map((s) => `<option value="${esc(s.id)}" ${s.id === sel ? "selected" : ""}>${esc(s.name)}</option>`).join(""); }
function openAddExam() {
  openSheet({ title: "Thêm đề thi", html: `
    <label class="field"><span>Tên đề</span><input type="text" id="aeT" placeholder="vd: Partiel Électrocinétique 2024"></label>
    <label class="field"><span>Thuộc môn</span><select id="aeS">${subjOptions(lastSubject().id)}</select></label>
    <label class="drop">${icon("upload")}<span id="aeDrop">Chọn PDF đề thi hoặc ảnh chụp đề</span><input type="file" id="aeF" class="vh" multiple accept="application/pdf,image/*,.txt,.md"></label>
    <div class="progress" id="aeP" hidden><i></i></div>
    <p class="small muted" id="aeMsg">Claude đọc đề, tách từng bài và ghi lại cách trình bày mà giám khảo chờ đợi.</p>
    <button class="btn primary block" id="aeGo">Tải lên &amp; phân tích</button>`,
    onMount: (el) => {
      const files = $("#aeF", el);
      files.addEventListener("change", () => { const l = [...files.files]; $("#aeDrop", el).textContent = l.length ? l.map((f) => f.name).join(", ") : "Chọn PDF đề thi hoặc ảnh chụp đề"; if (!$("#aeT", el).value && l[0]) $("#aeT", el).value = l[0].name.replace(/\.[^.]+$/, ""); });
      $("#aeGo", el).addEventListener("click", async (ev) => {
        const list = [...files.files]; if (!list.length) return toast("Chọn file đề thi trước nhé");
        const sample = await getSample(); if (!sample) return toast(NEED_CLAUDE);
        const btn = ev.currentTarget, msg = $("#aeMsg", el), prog = $("#aeP", el), bar = prog.querySelector("i");
        btn.disabled = true; prog.hidden = false;
        const onProg = (d, t, label) => { if (el.isConnected) { bar.style.width = Math.round((d / t) * 100) + "%"; msg.textContent = `${label}: ${d}/${t}`; } };
        try {
          const pages = [], images = [];
          for (const f of list) {
            if (f.type === "application/pdf") pages.push(...(await pdfToPages(f, onProg)).pages);
            else if (f.type.startsWith("image/")) images.push(f);
            else pages.push(await f.text());
          }
          if (images.length) pages.push(...(await ocrImages(images, onProg)));
          const text = pages.join("\n\n").trim().slice(0, 60000);
          if (!text) throw new Error("Không lấy được chữ nào từ đề này.");
          if (el.isConnected) msg.innerHTML = thinking("Claude đang đọc đề…");
          const title = $("#aeT", el).value.trim() || list[0].name.replace(/\.[^.]+$/, "");
          const r = await sample.json(`Voici le texte d'un sujet d'examen (L1 EEA, Sorbonne Université) : « ${title} ».
Découpe-le en exercices. Pour chacun : numéro, titre court, barème s'il est indiqué, notions évaluées, et l'énoncé COMPLET (Markdown, formules en LaTeX entre \\( \\)).
Ajoute les conventions de rédaction attendues pour ce type d'épreuve (5 points max, en français : loi énoncée avant le calcul, expression littérale avant l'application numérique, unités, chiffres significatifs, schéma avec conventions, phrase de conclusion…).
Réponds UNIQUEMENT avec un JSON : {"subject": "matière", "exercises": [{"n": 1, "title": "…", "points": "…", "topics": ["…"], "statement": "…"}], "style": ["…"]}

Sujet :
"""${text}"""`, { cache: false });
          const exercises = (Array.isArray(r?.exercises) ? r.exercises : []).filter((x) => x && typeof x.statement === "string" && x.statement.trim())
            .map((x, i) => ({ n: +x.n || i + 1, title: String(x.title || `Bài ${i + 1}`).slice(0, 120), points: String(x.points || ""), topics: (Array.isArray(x.topics) ? x.topics : []).map(String).slice(0, 6), statement: x.statement.slice(0, 12000) }));
          if (!exercises.length) throw { code: "invalid_json" };
          const e = { id: uid8(), title, subj: $("#aeS", el).value, count: exercises.length, createdAt: new Date().toISOString() };
          examData[e.id] = { exercises, style: (Array.isArray(r?.style) ? r.style : []).map(String).slice(0, 6) };
          await save("exam-" + e.id, examData[e.id]);
          state.exams.push(e); await saveExams();
          closeSheet(); studySeg = "exams"; render(); toast(`Đã thêm đề “${title}” (${exercises.length} bài)`);
        } catch (err) { if (el.isConnected) { msg.innerHTML = `<span class="err">${esc(err?.code ? sampleErr(err) : err.message || "Không đọc được đề.")}</span>`; btn.disabled = false; prog.hidden = true; } }
      });
    } });
}
async function openExamPick(id) {
  const e = examOf(id); if (!e) return;
  const d = await loadExam(id);
  openSheet({ title: e.title, html: `<p class="small muted">Chọn một bài để luyện. Claude giữ nguyên dạng bài nhưng đổi số liệu, bối cảnh.</p>
    <div class="menu">${d.exercises.map((x, i) => `<button class="menu-i" data-act="ex-go" data-id="${esc(id)}" data-n="${i}"><span class="badge-ic" style="--tint: var(--t-sky); --tk: var(--k-sky)">${x.n}</span><span><strong>${esc(x.title)}</strong><span class="faint small">${esc([x.points, x.topics.join(", ")].filter(Boolean).join(" · "))}</span></span></button>`).join("")}</div>
    ${d.exercises.length > 1 ? `<button class="btn soft block" data-act="ex-go" data-id="${esc(id)}" data-n="-1">${icon("sparkle")} Chọn ngẫu nhiên giúp mình</button>` : ""}` });
}
function deleteExam(id) {
  const e = examOf(id); if (!e) return;
  openConfirm({ title: "Xoá đề này?", text: `“${e.title}” và lịch sử luyện của nó sẽ bị xoá.`, yes: "Xoá", danger: true, onYes: () => {
    state.exams = state.exams.filter((x) => x.id !== id); saveExams(); removeDoc("exam-" + id); delete examData[id];
    state.drill.list = state.drill.list.filter((a) => a.examId !== id); if (state.drill.cur?.examId === id) delete state.drill.cur; saveDrill();
    render(); toast("Đã xoá đề");
  } });
}

// --- luyện: soạn bài tương tự → làm bài → chấm ---
async function startDrill(id, n) {
  const d = await loadExam(id); if (!d.exercises.length) return toast("Đề này chưa có bài nào");
  closeSheet();
  Object.assign(dr, { examId: id, n: n < 0 ? Math.floor(Math.random() * d.exercises.length) : n, phase: "gen", problem: null, result: null, photos: [], err: "" });
  show("drill");
  genProblem();
}
async function genProblem() {
  const e = examOf(dr.examId), d = await loadExam(dr.examId), ex = d.exercises[dr.n];
  const sample = await getSample();
  if (!sample) { dr.phase = "err"; dr.err = NEED_CLAUDE; return renderDrill(); }
  dr.phase = "gen"; dr.problem = null; dr.result = null; dr.photos = []; renderDrill();
  try {
    const r = await sample.json(`Tu es enseignant·e de L1 EEA à Sorbonne Université. Voici un exercice d'un ancien sujet d'examen (« ${e.title} ») :
"""${ex.statement}"""
Conventions de rédaction attendues : ${d.style.join(" ; ") || "loi citée, expression littérale avant application numérique, unités, conclusion"}.
Crée UN exercice NOUVEAU du même type et de même difficulté (autres valeurs numériques, autre contexte, mêmes compétences), rédigé en français comme à l'examen.
Donne aussi un barème sur 20 qui note AUSSI la présentation (loi citée, expression littérale avant l'application numérique, unités, schéma, conclusion…).
Réponds UNIQUEMENT avec un JSON : {"statement": "énoncé Markdown + LaTeX entre \\( \\)", "rubric": [{"item": "critère", "points": 2}], "tips_vi": ["2 ou 3 conseils de présentation en vietnamien"]}`, { cache: false });
    const rubric = (Array.isArray(r?.rubric) ? r.rubric : []).filter((x) => x?.item).map((x) => ({ item: String(x.item), points: Math.max(0, +x.points || 0) }));
    if (typeof r?.statement !== "string" || !r.statement.trim() || !rubric.length) throw { code: "invalid_json" };
    dr.problem = { statement: r.statement, rubric, total: rubric.reduce((n, x) => n + x.points, 0) || 20, tips: (Array.isArray(r.tips_vi) ? r.tips_vi : []).map(String).slice(0, 4) };
    state.drill.cur = { examId: dr.examId, n: dr.n, problem: dr.problem, answer: "" }; saveDrill();
    dr.phase = "work";
  } catch (err) { dr.phase = "err"; dr.err = sampleErr(err); }
  if (state.view === "drill") renderDrill();
}
function renderDrill() {
  const e = examOf(dr.examId), body = $("#drBody");
  if (!e) { body.innerHTML = `<div class="empty"><p>Chọn một đề trong tab Học → Luyện đề.</p></div>`; return; }
  $("#drTitle").textContent = e.title;
  $("#drSub").textContent = `Bài tương tự · bài ${(examData[e.id]?.exercises[dr.n]?.n) || dr.n + 1}`;
  $("#drNew").disabled = dr.phase === "gen" || dr.phase === "grading";
  if (dr.phase === "gen") { body.innerHTML = `<div class="card center">${emptyIc("pencil")}${thinking("Claude đang soạn bài tương tự…")}</div>`; return; }
  if (dr.phase === "err") { body.innerHTML = `<div class="card"><p class="err">${esc(dr.err)}</p><button class="btn primary" id="drRetryGen">Thử lại</button></div>`; return; }
  const p = dr.problem;
  const prob = `<article class="card dr-prob"><span class="label">Đề luyện</span><div class="md" id="drStatement">${md(p.statement)}</div></article>
    <details class="card dr-rub"${dr.phase === "work" ? "" : " open"}><summary class="label">Barème (trên ${p.total}) &amp; mẹo trình bày</summary>
      <ul class="dr-list">${p.rubric.map((x) => `<li><span>${esc(x.item)}</span><b>${x.points}</b></li>`).join("")}</ul>
      ${p.tips.length ? `<ul class="dr-tips">${p.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}</details>`;
  if (dr.phase === "work" || dr.phase === "grading") {
    const busy = dr.phase === "grading";
    body.innerHTML = prob + `<div class="card"><label class="field"><span>Bài làm của bạn</span><textarea id="drAns" rows="9" placeholder="Viết như trong phòng thi: định luật dùng, biểu thức chữ, thay số, đơn vị, kết luận…" ${busy ? "disabled" : ""}></textarea></label>
      <label class="drop" id="drDrop">${icon("image")}<span id="drPhText">Hoặc chụp bài làm viết tay (tối đa 4 ảnh)</span><input type="file" id="drPhotos" class="vh" accept="image/*" multiple ${busy ? "disabled" : ""}></label>
      <div class="thumbs" id="drThumbs">${dr.photos.map((f) => `<img alt="" src="${URL.createObjectURL(f)}">`).join("")}</div>
      <button class="btn primary block" id="drSubmit" ${busy ? "disabled" : ""}>${busy ? "Đang chấm…" : "Nộp bài để chấm"}</button>
      ${busy ? `<div>${thinking("Claude đang chấm như giám khảo…")}</div>` : ""}</div>`;
    $("#drAns").value = state.drill.cur?.answer || "";
    getLimits().then((l) => { const d = $("#drDrop"); if (d && !l?.images) d.hidden = true; });
  } else if (dr.phase === "done") {
    const r = dr.result;
    body.innerHTML = `<article class="card dr-score"><div class="big-stat"><b>${r.score}/${r.total}</b><span class="muted">${esc(r.advice)}</span></div>
      <table class="data-table"><tbody>${r.criteria.map((c) => `<tr><td>${esc(c.item)}<br><span class="small muted">${esc(c.comment)}</span></td><td>${c.got}/${c.max}</td></tr>`).join("")}</tbody></table></article>
      ${r.errors.length ? `<article class="card"><span class="label">Lỗi trình bày cần sửa</span><ul class="dr-errs">${r.errors.map((x) => `<li><p class="wrong">${esc(x.wrong)}</p><p class="right">${esc(x.right)}</p><p class="small muted">${esc(x.why)}</p></li>`).join("")}</ul>
        <button class="btn soft block" id="drCards" ${r.carded ? "disabled" : ""}>${icon("cards")} ${r.carded ? "Đã lưu thành flashcards" : "Lưu các lỗi thành flashcards"}</button></article>` : ""}
      <details class="card" open><summary class="label">Corrigé type (cách trình bày mẫu)</summary><div class="md" id="drModel">${md(r.model)}</div></details>` + prob
      + `<div class="two"><button class="btn" id="drRetry">Làm lại bài này</button><button class="btn primary" id="drNext">Bài tương tự khác</button></div>`;
  }
  typeset(body);
}
async function submitDrill() {
  const ans = ($("#drAns")?.value || "").trim();
  if (!ans && !dr.photos.length) return toast("Viết bài làm hoặc chụp ảnh bài viết tay trước nhé");
  const sample = await getSample(); if (!sample) return toast(NEED_CLAUDE);
  const p = dr.problem, e = examOf(dr.examId);
  state.drill.cur.answer = ans; saveDrill();
  dr.phase = "grading"; renderDrill();
  try {
    const opts = { cache: false };
    if (dr.photos.length) opts.images = dr.photos;
    const r = await sample.json(`Tu corriges la copie d'un·e étudiant·e de L1 EEA (Sorbonne Université) comme un correcteur d'examen exigeant sur la rédaction.
Énoncé :
"""${p.statement}"""
Barème (sur ${p.total}) :
${p.rubric.map((x) => `- ${x.item} (${x.points} pt)`).join("\n")}
Copie de l'étudiant·e${dr.photos.length ? ` (${dr.photos.length} photo(s) de la copie manuscrite jointe(s)${ans ? ", plus le texte ci-dessous" : ""})` : ""} :
"""${ans || "(voir les photos)"}"""
Pour chaque critère, donne les points obtenus et un commentaire court en vietnamien. Relève les erreurs de PRÉSENTATION (rédaction, notations, unités, chiffres significatifs, justification, schéma). Puis écris le corrigé type, rédigé exactement comme attendu à l'examen (en français, Markdown + LaTeX entre \\( \\)).
Réponds UNIQUEMENT avec un JSON : {"score": 0, "total": ${p.total}, "criteria": [{"item": "…", "got": 0, "max": 0, "comment_vi": "…"}], "errors": [{"wrong": "ce que l'étudiant a écrit ou omis", "right": "la bonne présentation", "why_vi": "pourquoi, en vietnamien"}], "model": "corrigé type", "advice_vi": "1 ou 2 phrases d'encouragement et de conseil"}`, opts);
    const total = +r?.total > 0 ? +r.total : p.total;
    const result = {
      score: clamp(Math.round((+r?.score || 0) * 2) / 2, 0, total), total,
      criteria: (Array.isArray(r?.criteria) ? r.criteria : []).filter((c) => c?.item).map((c) => ({ item: String(c.item), got: +c.got || 0, max: +c.max || 0, comment: String(c.comment_vi || "") })),
      errors: (Array.isArray(r?.errors) ? r.errors : []).filter((x) => x?.wrong && x?.right).slice(0, 8).map((x) => ({ wrong: String(x.wrong), right: String(x.right), why: String(x.why_vi || "") })),
      model: String(r?.model || ""), advice: String(r?.advice_vi || ""),
    };
    if (!result.model && !result.criteria.length) throw { code: "invalid_json" };
    dr.result = result; dr.phase = "done";
    state.drill.list.push({ id: uid8(), examId: dr.examId, subj: e.subj, n: dr.n, date: todayISO(), score: result.score, total, nErr: result.errors.length });
    delete state.drill.cur; saveDrill();
    bump("p");
    sfx("chime"); checkGold();
  } catch (err) { dr.phase = "work"; toast(sampleErr(err), 4000); }
  if (state.view === "drill") renderDrill();
}
function drillCards() {
  const r = dr.result; if (!r || r.carded || !r.errors.length) return;
  addCards("redac", r.errors.map((x) => ({ front: `Trình bày thế này đúng chưa?\n\n❌ ${x.wrong}`, back: `✅ ${x.right}`, mnemonic: x.why })));
  r.carded = true; toast(`Đã lưu ${r.errors.length} lỗi trình bày vào Ôn tập`); renderDrill();
}
$("#drBody").addEventListener("click", (e) => {
  if (e.target.closest("#drSubmit")) return submitDrill();
  if (e.target.closest("#drNext") || e.target.closest("#drRetryGen")) return genProblem();
  if (e.target.closest("#drRetry")) { dr.phase = "work"; dr.result = null; dr.photos = []; state.drill.cur = { examId: dr.examId, n: dr.n, problem: dr.problem, answer: "" }; saveDrill(); return renderDrill(); }
  if (e.target.closest("#drCards")) return drillCards();
});
$("#drBody").addEventListener("change", (e) => {
  if (e.target.id !== "drPhotos") return;
  dr.photos = [...e.target.files].slice(0, 4);
  $("#drThumbs").innerHTML = dr.photos.map((f) => `<img alt="" src="${URL.createObjectURL(f)}">`).join("");
  $("#drPhText").textContent = dr.photos.length ? `${dr.photos.length} ảnh bài làm` : "Hoặc chụp bài làm viết tay (tối đa 4 ảnh)";
});
let drSaveT = 0;
$("#drBody").addEventListener("input", (e) => { if (e.target.id !== "drAns" || !state.drill.cur) return; state.drill.cur.answer = e.target.value; clearTimeout(drSaveT); drSaveT = setTimeout(saveDrill, 800); });
$("#drNew").addEventListener("click", () => genProblem());
$("#drBack").addEventListener("click", () => { studySeg = "exams"; show("study"); });
$("#sdSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-sseg]"); if (!b) return; studySeg = b.dataset.sseg; renderStudy(); sfx("tick"); });

// --- Moodle: đọc file lịch .ics xuất từ Moodle ---
const icsText = (s) => String(s || "").replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " ").trim();
function icsWhen(v) {
  const m = String(v || "").match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
  if (!m) return { date: "", time: "" };
  if (!m[4]) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: "" };
  if (m[7]) { const p = parisParts(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))); return { date: p.date, time: `${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}` }; }
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` };
}
function parseICS(text) {
  const lines = String(text || "").replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const out = []; let cur = null;
  for (const raw of lines) {
    if (raw === "BEGIN:VEVENT") { cur = {}; continue; }
    if (raw === "END:VEVENT") { if (cur) out.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = raw.indexOf(":"); if (i < 0) continue;
    cur[raw.slice(0, i).split(";")[0].toUpperCase()] = raw.slice(i + 1);
  }
  return out.map((e) => {
    const title = icsText(e.SUMMARY); if (!title) return null;
    const { date, time } = icsWhen(e.DUE || e.DTSTART || e.DTEND);
    const low = norm(title);
    const type = /examen|partiel|exam|controle|qcm|quiz|test|epreuve/.test(low) ? "exam" : /a remettre|a rendre|est du|depot|devoir|echeance|ferme|fermeture|due|close/.test(low) ? "deadline" : "event";
    const desc = icsText(e.DESCRIPTION).slice(0, 600);
    return { type, title, date, time, course: icsText(e.CATEGORIES).slice(0, 60), location: icsText(e.LOCATION).slice(0, 80), to_submit: type === "deadline" ? "Xem hướng dẫn trên Moodle" : "", details: desc };
  }).filter(Boolean);
}
function openMoodle() {
  openSheet({ title: "Nhập việc từ Moodle", html: `
    <p class="small muted">App không tự đăng nhập Moodle được (Moodle chỉ cho chính bạn vào). Cách nhanh nhất: xuất lịch Moodle một lần mỗi tuần, app đọc hết hạn nộp, quiz, thi rồi xếp vào Lịch.</p>
    <ol class="loop"><li><span>Mở Moodle → <b>Calendrier</b> → nút <b>Exporter le calendrier</b>.</span></li><li><span>Chọn <b>Tous les cours</b> và <b>Événements récents et à venir</b>, bấm <b>Exporter</b> để tải file .ics.</span></li><li><span>Chọn file đó ở đây. Thông báo Moodle gửi qua mail cũng tự vào app khi bạn bấm Đọc mail.</span></li></ol>
    <label class="drop">${icon("upload")}<span id="mdDrop">Chọn file .ics từ Moodle</span><input type="file" id="mdFile" class="vh" accept=".ics,text/calendar"></label>
    <div class="small" id="mdMsg"></div>`,
    onMount: (el) => $("#mdFile", el).addEventListener("change", async (ev) => {
      const f = ev.target.files[0]; if (!f) return;
      const t = todayISO();
      const evs = parseICS(await f.text()).filter((x) => !x.date || x.date >= addDays(t, -1)).sort(byDate).slice(0, 80);
      if (!evs.length) { $("#mdMsg", el).innerHTML = `<span class="err">Không thấy việc nào sắp tới trong file này. Kiểm tra lại bạn đã chọn “Événements récents et à venir” chưa nhé.</span>`; return; }
      openEventsSheet(evs, "moodle", `Moodle có ${evs.length} việc sắp tới`);
    }) });
}
async function openGuide(id) {
  const a = state.agenda.find((x) => x.id === id); if (!a) return;
  const el = openSheet({ title: "Hướng dẫn làm việc này", html: `<p class="small muted">${esc(a.title)}${a.date ? ` · ${esc(longDate(a.date))}${a.time ? " " + esc(a.time) : ""} (${esc(countdown(a.date))})` : ""}</p><div class="md" id="gdOut">${a.guide ? md(a.guide) : thinking("Claude đang chia nhỏ công việc…")}</div>
    <div class="two"><button class="btn" data-act="focus-open">${icon("play")} Tập trung làm luôn</button><button class="btn primary" data-act="ev-done" data-id="${esc(id)}">${icon("check")} Đã xong</button></div>` });
  const out = $("#gdOut", el);
  if (a.guide) { typeset(out); return; }
  const sample = await getSample(); if (!sample) { out.innerHTML = `<p class="err">${esc(NEED_CLAUDE)}</p>`; return; }
  try {
    const r = await sample(`Tu aides un·e étudiant·e vietnamien·ne de L1 EEA (Sorbonne Université) à organiser son travail. Réponds en vietnamien (garde les termes officiels en français entre parenthèses).
Tâche : ${a.title}${a.course ? ` — cours ${a.course}` : ""}${a.date ? ` — échéance ${a.date} ${a.time || ""}` : ""} (aujourd'hui : ${todayISO()}).
Détails : ${a.details || a.to_submit || a.exam_content || "(aucun)"}
Ses cours importés : ${state.courses.map((c) => c.title).join(", ") || "(aucun)"}
Donne en Markdown court : 1) ce qu'il faut rendre ou faire concrètement, 2) les étapes avec un temps estimé (sessions de 25 à 45 min), 3) quand commencer pour finir sans stress, 4) les pièges de présentation à éviter si c'est un devoir ou un examen. N'invente pas de consignes : si une information manque, dis ce qu'il faut vérifier sur Moodle.`,
      { onText: ({ text }) => { if (out.isConnected) out.innerHTML = md(text); }, cache: false });
    a.guide = r.text; saveAgenda();
    if (out.isConnected) setMd(out, r.text);
  } catch (err) { if (out.isConnected) out.innerHTML = (err?.text ? md(err.text) : "") + `<p class="err">${esc(sampleErr(err))}</p>`; }
}
