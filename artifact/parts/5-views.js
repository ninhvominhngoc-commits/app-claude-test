
// ================= flashcards (SM-2) =================
const FR = "francais";
function addCards(deckId, cards) {
  const t = todayISO();
  (state.decks[deckId] ||= []).push(...cards.map((k) => ({ id: uid8(), front: String(k.front), back: String(k.back), mnemonic: String(k.mnemonic || ""), ef: 2.5, interval: 0, reps: 0, lapses: 0, due: t })));
  saveDeck(deckId);
  renderBadges();
}
function grade(card, g) {
  if (g < 3) { card.reps = 0; card.interval = 0; card.lapses = (card.lapses || 0) + 1; }
  else {
    card.reps++;
    card.interval = card.reps === 1 ? 1 : card.reps === 2 ? 4 : Math.round(Math.max(1, card.interval) * card.ef);
    if (g === 5) card.interval = Math.max(card.interval + 1, Math.round(card.interval * 1.3));
  }
  card.ef = Math.max(1.3, card.ef + (0.1 - (5 - g) * (0.08 + (5 - g) * 0.02)));
  card.due = addDays(todayISO(), card.interval);
}
const ivLabel = (n) => (n === 0 ? "ngay" : n < 30 ? `${n} ngày` : n < 365 ? `${Math.round(n / 30)} tháng` : `${Math.round(n / 365)} năm`);
function dueCards(deckId) { const t = todayISO(); return (state.decks[deckId] || []).filter((c) => c.due <= t); }
function deckList() {
  return [{ id: FR, title: "Ngữ pháp tiếng Pháp" }, ...state.courses.map((c) => ({ id: c.id, title: c.title }))]
    .map((d) => ({ ...d, total: (state.decks[d.id] || []).length, due: dueCards(d.id).length }));
}
const totalDue = () => deckList().reduce((n, d) => n + d.due, 0);
function renderBadges() { const n = totalDue(), b = $("#tabDue"); b.hidden = !n; b.textContent = n > 99 ? "99+" : n; }

// ================= phiên ôn =================
const sess = { queue: null, total: 0, done: 0, cur: null, flipped: false };
function startSession(deckIds) {
  const items = [];
  for (const id of deckIds) for (const card of dueCards(id)) items.push({ deck: id, card });
  if (!items.length) return toast("Không có thẻ nào cần ôn lúc này");
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  Object.assign(sess, { queue: items, total: items.length, done: 0, cur: null });
  $("#sCardWrap").hidden = false; $("#sDone").hidden = true;
  show("session");
  nextCard();
}
function deckTitle(id) { return id === FR ? "Ngữ pháp tiếng Pháp" : state.courses.find((c) => c.id === id)?.title || ""; }
function nextCard() {
  sess.cur = sess.queue?.shift() || null;
  $("#sProg").style.width = (sess.total ? Math.round((sess.done / sess.total) * 100) : 0) + "%";
  $("#sCount").textContent = `${Math.min(sess.done + 1, sess.total)}/${sess.total}`;
  if (!sess.cur) {
    $("#sCardWrap").hidden = true; $("#sDone").hidden = false;
    $("#sDoneMascot").innerHTML = mascot("lg", "party");
    confetti();
    $("#sDoneText").textContent = `Bạn đã ôn ${sess.total} thẻ. Những thẻ khó sẽ quay lại sớm hơn. Hẹn gặp lại ngày mai nhé.`;
    $("#sCount").textContent = `${sess.total}/${sess.total}`;
    renderBadges();
    return;
  }
  const { deck, card } = sess.cur;
  sess.flipped = false;
  $("#flash").classList.remove("flipped");
  $("#sDeck").textContent = deckTitle(deck);
  setMd($("#sFront"), card.front);
  setMd($("#sBack"), card.back);
  $("#sMnemo").hidden = !card.mnemonic;
  if (card.mnemonic) { $("#sMnemo").innerHTML = icon("bulb") + `<div class="md">${md(card.mnemonic)}</div>`; typeset($("#sMnemo")); }
  $$("#sGrades .grade").forEach((b) => { const copy = { ...card }; grade(copy, +b.dataset.g); b.querySelector("span").textContent = ivLabel(copy.interval); });
  $("#sGrades").hidden = true; $("#sFlip").hidden = false;
}
function confetti() {
  if (reduceMotion) return;
  const cs = getComputedStyle(document.documentElement);
  const colors = ["--k-rose", "--k-butter", "--k-mint", "--k-sky", "--accent", "--k-peach"].map((v) => cs.getPropertyValue(v).trim());
  for (let i = 0; i < 46; i++) {
    const el = document.createElement("i");
    el.className = "confetti";
    el.style.background = colors[i % colors.length];
    document.body.appendChild(el);
    const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 180;
    el.animate([{ transform: "translate(-50%, 0) rotate(0)", opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), ${Math.sin(a) * d * 0.6 + 260}px) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 }],
      { duration: 1300 + Math.random() * 900, easing: "cubic-bezier(.15,.7,.3,1)" }).onfinish = () => el.remove();
  }
}
function flipCard() {
  if (!sess.cur || sess.flipped) return;
  sess.flipped = true;
  sfx("flip");
  $("#flash").classList.add("flipped");
  $("#sGrades").hidden = false; $("#sFlip").hidden = true;
}
function gradeCur(g) {
  if (!sess.cur || !sess.flipped) return;
  const { deck, card } = sess.cur;
  grade(card, g); saveDeck(deck); bump("r"); sfx("pop"); rewardReview(deck); advCard(); checkGold();
  if (g < 3) sess.queue.push(sess.cur); else sess.done++;
  nextCard();
}
function renderReview() {
  const decks = deckList(), total = decks.reduce((n, d) => n + d.total, 0), due = decks.reduce((n, d) => n + d.due, 0);
  $("#rSub").textContent = total ? (due ? `Hôm nay có ${due} thẻ cần ôn` : "Hôm nay ôn xong rồi, giỏi quá!") : "Lặp lại ngắt quãng giúp nhớ lâu";
  if (!total) {
    $("#rList").innerHTML = `<div class="empty">${mascot("lg", "happy")}<h3>Chưa có thẻ nào</h3><p>Trong màn Học, bấm ⋯ → “Tạo flashcards”. Khi bạn viết tiếng Pháp sai, lỗi cũng tự thành thẻ ở đây.</p><button class="btn soft" data-go="study">Đi tới Học</button></div>`;
    return;
  }
  $("#rList").innerHTML = (due ? `<button class="btn primary block lg" data-act="review-all">${icon("cards")} Ôn tất cả · ${due} thẻ</button>` : "")
    + decks.filter((d) => d.total).map((d) => `<div class="deck-row" style="--tk: var(--k-${d.id === FR ? "sky" : tintOf(d.id)})">${d.id === FR ? `<span class="fr-glyph">Fr</span>` : resistor(d.id)}<div><strong>${esc(d.title)}</strong><span class="faint small">${d.total} thẻ · ${d.due ? d.due + " cần ôn" : "đã ôn xong hôm nay"}</span><span class="bar"><i style="width:${Math.round(((d.total - d.due) / d.total) * 100)}%"></i></span></div><button class="btn sm ${d.due ? "soft" : "ghost"}" data-act="deck-start" data-deck="${esc(d.id)}" ${d.due ? "" : "disabled"}>Ôn</button></div>`).join("")
    + `<p class="faint small center">Thẻ nhớ tốt quay lại sau 1, 4, 10… ngày. Thẻ quên quay lại ngay trong phiên.</p>`;
}

// ================= điện trở: màu riêng cho mỗi môn =================
const BANDS = ["#8a5a3c", "#e05547", "#f08a3c", "#e9b93f", "#43a971", "#4c7fe0", "#8b6ae6", "#9a98a8"];
const TINTS = ["lav", "sky", "mint", "peach", "rose", "butter"];
const hashOf = (id) => { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
const tintOf = (id) => TINTS[hashOf(id) % TINTS.length];
function resistor(id) {
  const h = hashOf(id), t = tintOf(id);
  return `<span class="cover" style="--tint: var(--t-${t}); --tk: var(--k-${t})" aria-hidden="true"><i style="--b1:${BANDS[h % 8]};--b2:${BANDS[(h >>> 3) % 8]};--b3:${BANDS[(h >>> 6) % 8]}"></i></span>`;
}

// ================= màn Hôm nay =================
const VERDICT_IC = { go: "building", stay: "home", partial: "half", unknown: "question" };
function renderHome() {
  $("#hDate").textContent = longDate(todayISO());
  maybeWelcome();
  // campus
  const s = state.status, fresh = s && s.date === todayISO(), vk = fresh && VERDICT[s.verdict] ? s.verdict : "unknown", v = VERDICT[vk];
  const el = $("#hStatus");
  el.className = "tile tinted " + v.cls;
  el.innerHTML = `
    <div class="tile-head"><span class="badge-ic" style="background: color-mix(in srgb, var(--surface) 70%, transparent)">${icon(VERDICT_IC[vk])}</span><div><span class="label" style="color: var(--tk)">Campus Jussieu</span><span class="faint small">${s ? (fresh ? "Cập nhật lúc " + hhmm(s.updatedAt) : "Bản tin gần nhất: " + countdown(s.date)) : "Chưa có bản tin"}</span></div></div>
    <div class="stack" style="gap:4px"><p class="verdict">${esc(fresh ? v.label : "Hôm nay có cần lên trường không?")}</p>
    ${fresh && s.headline ? `<p class="verdict-sub">${esc(s.headline)}</p>` : `<p class="verdict-sub">Chép lệnh, dán vào Claude (bật Tìm kiếm web), rồi dán kết quả vào đây.</p>`}</div>
    ${fresh && s.points?.length ? `<div class="chips">${s.points.map((p) => `<span>${esc(p)}</span>`).join("")}</div>` : ""}
    <div class="row">
      <button class="btn glass sm" data-act="copy-brief">${icon("copy")} Chép lệnh</button>
      <a class="btn glass sm" href="https://claude.ai/new" target="_blank" rel="noopener">${icon("external")} Mở Claude</a>
      <button class="btn primary sm" data-act="paste-brief">${icon("paste")} ${fresh ? "Dán bản mới" : "Dán kết quả"}</button>
    </div>`;
  renderHero();
  // mail
  const m = state.mail, imp = m.recent.filter((x) => x.importance === "haute");
  const shown = (imp.length ? imp : m.recent).slice(0, 2);
  $("#hMail").innerHTML = `
    <div class="tile-head"><span class="badge-ic" style="${"--tint: var(--t-mint); --tk: var(--k-mint)"}">${icon("mail")}</span><div><span class="label">Hộp thư trường</span><span class="small" data-mailmsg></span></div></div>
    ${shown.length ? `<ul class="mini-mails">${shown.map((x) => `<li><span class="imp imp-${esc(x.importance)}"></span><div><strong>${esc(x.subject || "(không tiêu đề)")}</strong><p>${esc(x.action || x.resume)}</p></div></li>`).join("")}</ul>`
      : `<p class="muted small">Mail Moodle, giảng viên và danh sách [etudiants] sẽ được tóm tắt ở đây.</p>`}
    <div class="row"><button class="btn primary sm" data-act="read-mail">${icon("mail")} Đọc mail mới</button><button class="btn ghost sm" data-go="inbox">Xem tất cả</button></div>`;
  paintMailMsg();
  // sắp tới
  const up = upcoming(14).slice(0, 3);
  $("#hUpcoming").innerHTML = up.length ? up.map((a) => evRow(a, true)).join("")
    : `<div class="empty flat"><p>Không có kỳ thi hay hạn nộp nào trong 14 ngày tới. Đọc mail để cập nhật nhé.</p></div>`;
}

// ================= màn Lịch =================
function evRow(a, compact = false) {
  const t = typeOf(a.type), d = a.date ? diffDays(a.date) : null, urgent = d !== null && d >= 0 && d <= 2;
  const meta = [a.course, a.time, a.location].filter(Boolean).map(esc).join(" · ");
  return `<article class="ev ${t.cls} ${a.done ? "done" : ""}" data-id="${esc(a.id)}" data-date="${esc(a.date)}"${compact ? ' data-go="agenda"' : ""}>
    <div class="ev-date">${a.date ? `<span class="dn">${+a.date.slice(8)}</span><span class="wd">${wdOf(a.date)} · th${+a.date.slice(5, 7)}</span>` : `<span class="dn">?</span><span class="wd">chưa rõ</span>`}</div>
    <div class="ev-body">
      <div class="ev-top"><span class="tag">${t.label}</span>${a.date ? `<span class="count ${urgent ? "urgent" : ""}">${countdown(a.date)}</span>` : ""}</div>
      <h4>${esc(a.title)}</h4>
      ${meta ? `<p class="meta">${meta}</p>` : ""}
      ${!compact && a.to_submit ? `<p class="det"><b>Cần nộp</b>${esc(a.to_submit)}</p>` : ""}
      ${!compact && a.exam_content ? `<p class="det"><b>Nội dung thi</b>${esc(a.exam_content)}</p>` : ""}
      ${!compact && a.presence === "oui" ? `<p class="det"><b>Có mặt</b>Phải lên trường</p>` : ""}
      ${!compact && a.details ? `<p class="det">${esc(a.details)}</p>` : ""}
    </div>
    ${compact ? "" : `<button class="icon-btn" data-act="ev-menu" data-id="${esc(a.id)}" aria-label="Tuỳ chọn">${icon("more")}</button>`}
  </article>`;
}
function renderAgenda() {
  const t = todayISO();
  let strip = "";
  for (let i = 0; i < 14; i++) {
    const d = addDays(t, i), evs = state.agenda.filter((a) => a.date === d && !a.done);
    strip += `<button class="day ${i === 0 ? "today" : ""}" data-act="jump-day" data-date="${d}" aria-label="${esc(longDate(d))}"><span class="wd">${i === 0 ? "Nay" : wdOf(d)}</span><span class="dn">${+d.slice(8)}</span><span class="dots">${evs.slice(0, 3).map((a) => `<i class="${typeOf(a.type).cls}"></i>`).join("")}</span></button>`;
  }
  $("#aStrip").innerHTML = strip;
  const groups = { today: [], tomorrow: [], week: [], later: [], nodate: [], past: [] };
  for (const a of [...state.agenda].sort(byDate)) {
    if (!a.date) { groups.nodate.push(a); continue; }
    const d = diffDays(a.date);
    groups[d < 0 ? "past" : d === 0 ? "today" : d === 1 ? "tomorrow" : d <= 7 ? "week" : "later"].push(a);
  }
  const names = { today: "Hôm nay", tomorrow: "Ngày mai", week: "7 ngày tới", later: "Sau đó", nodate: "Chưa rõ ngày" };
  let html = Object.keys(names).filter((k) => groups[k].length).map((k) => `<p class="label group-h">${names[k]}</p>${groups[k].map((a) => evRow(a)).join("")}`).join("");
  if (!state.agenda.some((a) => !a.date || a.date >= t)) html = `<div class="empty">${mascot("lg")}<h3>Lịch còn trống</h3><p>Đọc mail trường hoặc dán một thông báo vào Hộp thư: app tự lấy ngày thi, hạn nộp. Bạn cũng có thể bấm + để thêm tay.</p></div>`;
  if (groups.past.length) html += `<details class="card"><summary class="label">Đã qua (${groups.past.length})</summary><div class="list" style="margin-top:10px">${groups.past.reverse().map((a) => evRow(a)).join("")}</div></details>`;
  $("#aList").innerHTML = html;
}
function jumpDay(d) {
  const el = $(`#aList .ev[data-date="${d}"]`);
  if (!el) return toast(`${longDate(d)}: trống, thảnh thơi`);
  el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1400);
}
function openEvMenu(id) {
  const a = state.agenda.find((x) => x.id === id); if (!a) return;
  openSheet({ title: a.title, html: `<div class="menu">
    <button class="menu-i" data-act="ev-done" data-id="${esc(id)}"><span class="badge-ic" style="--tint: var(--t-mint); --tk: var(--k-mint)">${icon("check")}</span><span><strong>${a.done ? "Bỏ đánh dấu đã xong" : "Đánh dấu đã xong"}</strong></span></button>
    <button class="menu-i danger" data-act="ev-del" data-id="${esc(id)}"><span class="badge-ic">${icon("trash")}</span><span><strong>Xoá khỏi lịch</strong></span></button></div>` });
}
function openAddEvent() {
  const kinds = ["exam", "deadline", "event", "closure", "holiday"];
  openSheet({ title: "Thêm mốc thời gian", html: `
    <div class="type-pick" id="tpick">${kinds.map((k, i) => `<button type="button" class="tag ${TYPE[k].cls}" data-t="${k}" aria-pressed="${i === 0}">${TYPE[k].label}</button>`).join("")}</div>
    <label class="field"><span>Tiêu đề</span><input type="text" id="aeTitle" placeholder="vd: Partiel d'Électronique"></label>
    <div class="two"><label class="field"><span>Ngày</span><input type="date" id="aeDate"></label><label class="field"><span>Giờ</span><input type="time" id="aeTime"></label></div>
    <label class="field"><span>Môn (UE)</span><input type="text" id="aeCourse" placeholder="vd: L1EE001"></label>
    <label class="field"><span>Cần nộp gì, ở đâu</span><input type="text" id="aeSubmit" placeholder="vd: Compte rendu de TP sur Moodle"></label>
    <label class="field"><span>Nội dung thi</span><textarea id="aeExam" rows="2" placeholder="vd: Chapitres 1 à 3"></textarea></label>
    <button class="btn primary block" id="aeGo">Thêm vào lịch</button>`,
    onMount: (el) => {
      let kind = "exam";
      $$("#tpick button", el).forEach((b) => b.addEventListener("click", () => { kind = b.dataset.t; $$("#tpick button", el).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
      $("#aeGo", el).addEventListener("click", () => {
        const title = $("#aeTitle", el).value.trim();
        if (!title) { $("#aeTitle", el).focus(); return toast("Nhập tiêu đề trước nhé"); }
        const n = mergeEvents([{ type: kind, title, date: $("#aeDate", el).value, time: $("#aeTime", el).value, course: $("#aeCourse", el).value.trim(), to_submit: $("#aeSubmit", el).value.trim(), exam_content: $("#aeExam", el).value.trim() }], "manuel");
        closeSheet(); render(); toast(n ? "Đã thêm vào lịch" : "Mốc này đã có trong lịch");
      });
    } });
}
async function openPlan() {
  const sample = await getSample(); if (!sample) return toast(NEED_CLAUDE);
  const el = openSheet({ title: "Kế hoạch ôn thi", html: `<div class="md" id="planOut">${thinking("Đang lập kế hoạch…")}</div>` });
  const out = $("#planOut", el);
  const courses = state.courses.map((c) => `- ${c.title}${c.examContent ? " — programme : " + c.examContent : ""} (${(state.decks[c.id] || []).length} flashcards)`).join("\n") || "(aucun)";
  try {
    const r = await sample(`Tu es un coach de révision pour un·e étudiant·e vietnamien·ne en L1 EEA à Sorbonne Université. Réponds en vietnamien (garde les noms des matières en français).
Date du jour : ${todayISO()}.
Échéances :\n${agendaText(state.agenda.filter((a) => !a.done && (!a.date || a.date >= todayISO())))}
Cours importés :\n${courses}
Fais un plan de révision réaliste jusqu'au dernier examen : sessions de 25-50 min, répétition espacée (J+1, J+3, J+7), priorités selon les dates et le programme. Markdown court, un tableau par semaine, ton motivant et un peu drôle.`,
      { onText: ({ text }) => { if (out.isConnected) out.innerHTML = md(text); }, cache: false });
    if (out.isConnected) setMd(out, r.text);
  } catch (err) { if (out.isConnected) out.innerHTML = (err?.text ? md(err.text) : "") + `<p class="err">${esc(sampleErr(err))}</p>`; }
}

// ================= màn Học (danh sách) =================
function renderStudy() {
  const el = $("#sList");
  if (!state.courses.length) {
    el.innerHTML = `<div class="empty">${mascot("lg")}<h3>Chưa có tài liệu nào</h3><p>Thêm slide hoặc giáo trình (PDF, ảnh). Gia sư giảng từng ý bằng ví dụ vui, rồi để bạn tự giảng lại.</p><button class="btn primary" data-act="add-course">${icon("upload")} Thêm tài liệu</button></div>`;
    return;
  }
  const sorted = [...state.courses].sort((a, b) => (b.lastStudied || b.createdAt || "").localeCompare(a.lastStudied || a.createdAt || ""));
  el.innerHTML = sorted.map((c) => {
    const n = (state.decks[c.id] || []).length;
    const meta = [`${c.pageCount} trang`, n ? `${n} thẻ` : "", c.lastStudied ? "học " + timeAgo(c.lastStudied) : "chưa học"].filter(Boolean).join(" · ");
    const pct = c.pageCount ? Math.min(100, Math.round(((c.maxPage || 0) / c.pageCount) * 100)) : 0;
    return `<button class="course-card" data-act="open-course" data-id="${esc(c.id)}" style="--tk: var(--k-${tintOf(c.id)})">${resistor(c.id)}<span class="cc-body"><span class="cc-title">${esc(c.title)}</span><span class="cc-meta">${esc(meta)}</span>${c.examContent ? `<span class="cc-meta" style="font-weight:600; color: var(--ink-2)">Thi: ${esc(c.examContent)}</span>` : ""}<span class="bar" title="Đã học tới trang ${c.maxPage || 0}"><i style="width:${pct}%"></i></span></span>${icon("chevron", "faint")}</button>`;
  }).join("") + `<button class="btn ghost block" data-act="add-course">${icon("plus")} Thêm tài liệu</button>`;
}

// ================= màn Hộp thư =================
function mailHtml(m) {
  return `<article class="mail"><div class="mail-top"><span class="imp imp-${esc(m.importance)}"></span><strong>${esc(m.subject || "(không tiêu đề)")}</strong><span class="faint small mono">${esc(shortDT(m.date))}</span></div>
    <p class="faint small">${esc(m.from)}</p>
    ${m.resume ? `<p>${esc(m.resume)}</p>` : ""}
    ${m.action ? `<p class="todo">${icon("arrow")}<span>${esc(m.action)}</span></p>` : ""}
    ${/^https:\/\/mail\.google\.com\//.test(m.url || "") ? `<a class="small" href="${esc(m.url)}" target="_blank" rel="noopener">Mở trong Gmail ${icon("external", "xs")}</a>` : ""}</article>`;
}
function renderInbox() {
  $$("#iSeg button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.seg === state.seg)));
  $("#iMail").hidden = state.seg !== "mail"; $("#iCheck").hidden = state.seg !== "check";
  const days = lsGet("mailDays", "7");
  $$("#mDays button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.d === days)));
  $("#mList").innerHTML = state.mail.recent.length ? state.mail.recent.map(mailHtml).join("")
    : `<div class="empty">${mascot()}<h3>Chưa có mail nào</h3><p>Bấm “Đọc mail mới”: app đọc mail trường đã chuyển sang Gmail, tóm tắt và tìm ngày thi, hạn nộp.</p></div>`;
  paintMailMsg();
}
let ckFiles = [], ckUrls = [], lastCheck = { prompt: "", events: [] };
function renderThumbs() {
  ckUrls.forEach((u) => URL.revokeObjectURL(u));
  ckUrls = ckFiles.map((f) => URL.createObjectURL(f));
  $("#ckThumbs").innerHTML = ckUrls.map((u) => `<img alt="" src="${u}">`).join("");
  $("#ckDropText").textContent = ckFiles.length ? `${ckFiles.length} ảnh đã chọn · chạm để đổi` : "Thêm ảnh chụp màn hình";
}
async function runCheck(btn) {
  const sample = await getSample(); if (!sample) return toast(NEED_CLAUDE);
  const text = $("#ckText").value.trim();
  const max = (await getLimits())?.images?.maxCount || 0;
  const files = ckFiles.slice(0, max);
  if (!text && !files.length) return toast("Dán nội dung hoặc chọn ảnh trước nhé");
  const out = $("#ckOut");
  out.innerHTML = `<div class="card">${thinking("Claude đang đọc…")}</div>`;
  btn.disabled = true;
  try {
    const r = await sample.json(`Tu aides un·e étudiant·e vietnamien·ne de L1 EEA à Sorbonne Université (campus Pierre et Marie Curie, Jussieu). Date du jour : ${todayISO()}.
Analyse le contenu ci-dessous${files.length ? " et les captures d'écran jointes (mails, stories Instagram, posts, articles)" : ""}. Tu n'as PAS accès au web : n'invente rien, signale ce qui doit être vérifié.
Réponds UNIQUEMENT avec un objet JSON :
{"resume_vi": "résumé clair en vietnamien, 3-6 phrases",
 "date_publication": "date de la publication si visible, sinon ''",
 "fiabilite": "officiel|probable|rumeur|inconnu",
 "points_a_verifier": ["affirmation à vérifier", ...],
 "impact_vi": "ce que ça change pour l'étudiant (aller au campus ? rendre quelque chose ?), en vietnamien",
 "events": [${EVENT_JSON}]}
Convertis les dates relatives en dates absolues.

Contenu :
${text || "(voir images)"}`, { images: files.length ? files : undefined, cache: false });
    const evs = cleanEvents(r?.events), checks = Array.isArray(r?.points_a_verifier) ? r.points_a_verifier.map(String) : [];
    const rel = { officiel: ["c-holiday", "Nguồn chính thức"], probable: ["c-event", "Có vẻ đáng tin"], rumeur: ["c-exam", "Tin đồn"] }[r?.fiabilite] || ["", "Chưa rõ nguồn"];
    lastCheck = { events: evs, prompt: `Vérifie avec la recherche web (date du jour ${todayISO()}) ces affirmations concernant Sorbonne Université / campus Jussieu, en priorisant les sources officielles, puis la presse, puis Instagram (@sorbonne_univ, @sorbonne_sciences_vieetudiante) et Facebook. Vérifie la date (vieille info recyclée ?). Verdict pour chacune : ✅ Đúng · ⚠️ Một phần · ❌ Sai · ❓ Chưa xác minh được, avec sources. Réponds en vietnamien.\n\n${checks.map((p) => "- " + p).join("\n")}\n\nContenu original :\n${text || r?.resume_vi || ""}` };
    out.innerHTML = `<article class="card">
      <div class="row"><span class="tag ${rel[0]}">${rel[1]}</span>${r?.date_publication ? `<span class="faint small">đăng ngày ${esc(r.date_publication)}</span>` : ""}</div>
      <div class="md">${md(r?.resume_vi || "")}</div>
      ${r?.impact_vi ? `<p class="todo">${icon("arrow")}<span>${esc(r.impact_vi)}</span></p>` : ""}
      ${checks.length ? `<div class="stack"><span class="label">Cần kiểm chứng</span><ul class="st-points">${checks.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
        <div class="row"><button class="btn soft sm" data-act="copy-check">${icon("copy")} Chép lệnh kiểm chứng</button><a class="btn ghost sm" href="https://claude.ai/new" target="_blank" rel="noopener">${icon("external")} Mở Claude</a></div></div>` : ""}
      ${evs.length ? `<button class="btn primary block" data-act="add-found">${icon("calendar")} Thêm ${evs.length} mốc vào lịch</button>` : ""}
    </article>`;
    typeset(out);
    $("#ckText").value = ""; ckFiles = []; $("#ckFiles").value = ""; renderThumbs();
  } catch (err) { out.innerHTML = `<div class="card"><span class="err">${esc(sampleErr(err))}</span></div>`; }
  finally { btn.disabled = false; }
}
