// ================= tiến độ học: 3 mục tiêu mỗi ngày, tiến độ từng môn, phiên tập trung =================
// Dựa trên cách học có bằng chứng: tập trung theo phiên (Pomodoro), ôn ngắt quãng, luyện truy hồi (làm đề, tự giảng lại),
// ghi rõ mục tiêu phiên (implementation intention) và ghi lại việc chợt nhớ thay vì bỏ dở để làm ngay.

const SB_INK = "#6b4e42"; // màu nét chậu cây

// --- môn học & thời gian theo môn (tên dữ liệu "atoms" giữ nguyên để không mất số liệu cũ: min = phút, n = số phiên) ---
const FREE = "free";
function subjects() {
  return [...state.courses.map((c) => ({ id: c.id, name: c.title, tint: tintOf(c.id) })), { id: FR, name: "Tiếng Pháp", tint: "sky" }, { id: FREE, name: "Tự học khác", tint: "butter" }];
}
const subjOf = (id) => subjects().find((s) => s.id === id) || { id, name: "Môn đã xoá", tint: "lav" };
const statOf = (id) => (state.atoms[id] ||= { min: 0, n: 0 });
const saveSubjStats = () => save("atoms", { list: state.atoms });
const totalMin = () => Object.values(state.atoms).reduce((n, a) => n + (a.min || 0), 0);
function lastSubject() {
  const id = lsGet("focusSubj"), list = subjects();
  return list.find((s) => s.id === id) || list.slice().sort((a, b) => (state.atoms[b.id]?.min || 0) - (state.atoms[a.id]?.min || 0))[0];
}

// --- 3 mục tiêu mỗi ngày (3 vòng): tập trung, ôn thẻ, luyện truy hồi ---
function quests() {
  const d = state.stats.days[todayISO()] || {}, f = d.f || 0, r = d.r || 0, fe = d.fe || 0, pr = d.p || 0;
  return [
    { k: "focus", t: "Tập trung 25 phút", v: f >= 25 ? `${f} phút` : `${f}/25 phút`, p: Math.min(1, f / 25), act: f < 25 ? ["focus-open", state.focus?.endAt ? "Mở" : "Bắt đầu"] : null, col: "#d97757" },
    { k: "review", t: "Ôn 10 thẻ hoặc hết thẻ đến hạn", v: `${r} thẻ`, p: r >= 10 || (r > 0 && totalDue() === 0) ? 1 : Math.min(1, r / 10), act: totalDue() ? ["review-all", "Ôn"] : null, col: "#7d9a5b" },
    { k: "practice", t: "Luyện 1 bài: làm đề hoặc tự giảng", v: fe || pr ? "Xong" : "Luyện đề hoặc Feynman", p: fe || pr ? 1 : 0, act: fe || pr ? null : ["go-drill", "Luyện"], col: "#6a9bcc" },
  ];
}
function checkGold() {
  const d = state.stats.days[todayISO()];
  if (d && !d.gold && quests().every((q) => q.p >= 1)) { d.gold = 1; saveStats(); confetti(); sfx("unlock"); toast("Xong cả 3 mục tiêu hôm nay!", 4000); }
}
function ringsSvg(q, size = 120, center = "") {
  const R = [46, 35, 24], sw = 9.5, done = q.filter((x) => x.p >= 1).length;
  return `<svg class="rings" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="Mục tiêu hôm nay: ${done}/3 vòng">${q.map((x, i) => {
    const c = 2 * Math.PI * R[i], on = clamp(x.p, 0, 1) * c;
    return `<circle cx="60" cy="60" r="${R[i]}" fill="none" stroke="${x.col}" stroke-opacity=".2" stroke-width="${sw}"/>` + (x.p > 0 ? `<circle cx="60" cy="60" r="${R[i]}" fill="none" stroke="${x.col}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${on.toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 60 60)"/>` : "");
  }).join("")}${center}</svg>`;
}

// --- tiến độ từng môn: chậu cây lớn theo mức thật sự nhớ bài (thẻ đã thuộc + điểm luyện đề) ---
const weekStart = () => addDays(todayISO(), -((new Date(todayISO() + "T12:00:00Z").getUTCDay() + 6) % 7));
function subjProgress(s) {
  const ws = weekStart(), pws = addDays(ws, -7), t = todayISO();
  let wk = 0, prev = 0;
  for (const x of state.sessions) if (x.subj === s.id) { const d = parisParts(x.s).date; if (d >= ws) wk += x.m; else if (d >= pws) prev += x.m; }
  const cards = state.decks[s.id] || [];
  const due = cards.filter((c) => c.due <= t).length, mature = cards.filter((c) => (c.interval || 0) >= 21).length;
  const tries = (state.drill?.list || []).filter((a) => a.subj === s.id && a.score != null).slice(-3);
  const avg = tries.length ? tries.reduce((n, a) => n + (a.score / (a.total || 20)) * 20, 0) / tries.length : null;
  const cardPart = cards.length ? (mature + (cards.length - mature - due) * 0.35) / cards.length : null;
  const m = cardPart == null && avg == null ? null : cardPart == null ? avg / 20 : avg == null ? cardPart : cardPart * 0.6 + (avg / 20) * 0.4;
  return { wk, prev, cards: cards.length, due, mature, avg, tries: tries.length, m: m == null ? null : clamp(m, 0, 1) };
}
const PLANT_NAMES = ["Hạt giống", "Nảy mầm", "Lá non", "Xanh tốt", "Sắp nở", "Nở hoa"];
const plantStage = (m) => (m == null ? 0 : m < 0.2 ? 1 : m < 0.45 ? 2 : m < 0.7 ? 3 : m < 0.9 ? 4 : 5);
function plantSvg(m) {
  const k = plantStage(m), I = SB_INK, leaf = (x, y, r, flip) => `<path d="M${x} ${y}c${flip ? -10 : 10}-2 ${flip ? -14 : 14}-10 ${flip ? -12 : 12}-${r}c${flip ? 6 : -6} 0 ${flip ? 10 : -10} 6 ${flip ? 12 : -12} ${r}z" fill="#9ccc6f" stroke="${I}" stroke-width="1.6" stroke-linejoin="round"/>`;
  const stem = (h) => `<path d="M40 70V${70 - h}" stroke="#6aa84f" stroke-width="2.6" stroke-linecap="round"/>`;
  let top = "";
  if (k === 0) top = `<ellipse cx="40" cy="68" rx="4" ry="2.6" fill="#b98a5c" stroke="${I}" stroke-width="1.3"/>`;
  if (k >= 1) top += stem(k === 1 ? 8 : 12 + k * 6) + leaf(40, 64, 8, false) + leaf(40, 64, 8, true);
  if (k >= 2) top += leaf(40, 56 - (k - 2) * 2, 10, false) + leaf(40, 52 - (k - 2) * 2, 10, true);
  if (k >= 3) top += leaf(40, 44, 9, false) + leaf(40, 40, 9, true);
  if (k === 4) top += `<ellipse cx="40" cy="${70 - 12 - k * 6}" rx="5" ry="6.5" fill="#ffc3d3" stroke="${I}" stroke-width="1.5"/>`;
  if (k === 5) top += `<g transform="translate(40 ${70 - 12 - k * 6})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-6.5" rx="4.6" ry="6.5" transform="rotate(${a})" fill="#ff9db8" stroke="${I}" stroke-width="1.3"/>`).join("")}<circle r="3.6" fill="#ffe17a" stroke="${I}" stroke-width="1.2"/></g><path d="M62 18l1.2 2.8 2.8 1.2-2.8 1.2L62 26l-1.2-2.8-2.8-1.2 2.8-1.2z" fill="#ffd54d"/>`;
  return `<svg class="plant" viewBox="0 0 80 96" aria-hidden="true">${top}<path d="M22 70h36l-5 22H27z" fill="#e8a07a" stroke="${I}" stroke-width="2" stroke-linejoin="round"/><rect x="19" y="66" width="42" height="8" rx="3" fill="#f0b48e" stroke="${I}" stroke-width="2"/></svg>`;
}
function nextAction(s, p) {
  if (p.due) return { t: `Ôn ${p.due} thẻ đến hạn`, act: `data-act="deck-start" data-deck="${esc(s.id)}"` };
  if (p.avg != null && p.avg < 12) return { t: "Luyện thêm 1 bài đề", act: `data-act="go-drill"` };
  if (!p.wk) return { t: "Tập trung 25 phút cho môn này", act: `data-act="focus-subj" data-id="${esc(s.id)}"` };
  if (!p.cards && state.courses.some((c) => c.id === s.id)) return { t: "Tạo flashcards từ tài liệu", act: `data-act="open-course" data-id="${esc(s.id)}"` };
  if (state.courses.some((c) => c.id === s.id)) return { t: "Tự giảng lại một khái niệm", act: `data-act="open-course" data-id="${esc(s.id)}"` };
  return { t: "Tập trung thêm một phiên", act: `data-act="focus-subj" data-id="${esc(s.id)}"` };
}
function renderProgress() {
  const q = quests(), done = q.filter((x) => x.p >= 1).length;
  const wkAll = subjects().reduce((n, s) => n + subjProgress(s).wk, 0);
  const soon = upcoming(30).find((a) => a.type === "exam");
  $("#pgTop").innerHTML = `${ringsSvg(q, 112)}<div class="pg-sum"><p class="w-title">Hôm nay ${done}/3 vòng</p>
    <p class="small">${q.map((x) => `<span class="dotc" style="--c:${x.col}"></span>${esc(x.t)}: <b>${esc(x.v)}</b>`).join("<br>")}</p>
    <p class="small muted">Tuần này ${esc(fmtMin(wkAll))} tập trung · ${totalDue()} thẻ đến hạn${soon ? ` · thi gần nhất: ${esc(soon.title)} (${esc(countdown(soon.date))})` : ""}</p></div>`;
  $("#pgList").innerHTML = subjects().map((s) => {
    const p = subjProgress(s), k = plantStage(p.m), na = nextAction(s, p);
    const trend = p.prev ? (p.wk >= p.prev ? `↑ so với tuần trước (${fmtMin(p.prev)})` : `↓ so với tuần trước (${fmtMin(p.prev)})`) : "";
    return `<article class="pg-card" style="--tint: var(--t-${s.tint}); --tk: var(--k-${s.tint})">
      <div class="pg-plant">${plantSvg(p.m)}<span class="pg-stage">${PLANT_NAMES[k]}${p.m != null ? ` · ${Math.round(p.m * 100)}%` : ""}</span></div>
      <div class="pg-body"><h3>${esc(s.name)}</h3>
        <p class="pg-row"><span>Tuần này</span><b>${esc(fmtMin(p.wk))}</b>${trend ? `<small>${esc(trend)}</small>` : ""}</p>
        <p class="pg-row"><span>Flashcards</span><b>${p.cards ? `${p.mature}/${p.cards} đã thuộc` : "chưa có"}</b>${p.due ? `<small>${p.due} thẻ đến hạn</small>` : ""}</p>
        <p class="pg-row"><span>Luyện đề</span><b>${p.avg != null ? `${p.avg.toFixed(1)}/20` : "chưa làm"}</b>${p.tries ? `<small>trung bình ${p.tries} bài gần nhất</small>` : ""}</p>
        <button class="btn sm soft" ${na.act}>${icon("arrow")} ${esc(na.t)}</button></div></article>`;
  }).join("");
  $("#pgLevel").textContent = `Tổng ${fmtMin(totalMin())} tập trung từ trước tới nay.`;
}

// --- phiên tập trung: mục tiêu phiên, vòng thời gian, sổ ghi việc chợt nhớ ---
const fmtLeft = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
const DURS = [15, 25, 45, 60];
let focusPick = { subject: null, dur: 0, goal: "" }, wakeLock = null;
function focusRing(p) {
  const c = 2 * Math.PI * 88;
  return `<svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="88" fill="none" stroke="var(--line)" stroke-width="12"/><circle class="fr-on" cx="100" cy="100" r="88" fill="none" stroke="var(--accent-btn)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(clamp(p, 0, 1) * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 100 100)"/></svg>`;
}
function renderFocus() {
  const f = state.focus?.endAt ? state.focus : null;
  if (!focusPick.subject || !subjects().some((s) => s.id === focusPick.subject)) focusPick.subject = lastSubject().id;
  if (!focusPick.dur) focusPick.dur = prefs().dur;
  const subj = subjOf(f ? f.subject : focusPick.subject);
  $("#fLevel").textContent = subj.name;
  $("#fSetup").hidden = !!f; $("#fRun").hidden = !f;
  $("#fRoom").innerHTML = emptyIc("target");
  $("#fElem").textContent = f ? "Chợt nhớ việc khác thì ghi vào sổ bên dưới, đừng bỏ dở để làm ngay." : "Chọn môn, ghi một mục tiêu cụ thể, rồi bắt đầu.";
  if (!f) {
    $("#fSubj").innerHTML = subjects().map((s) => `<button data-subj="${esc(s.id)}" aria-pressed="${s.id === focusPick.subject}">${esc(s.name)}</button>`).join("");
    $("#fDur").innerHTML = DURS.map((d) => `<button data-dur="${d}" aria-pressed="${d === focusPick.dur}">${d} phút</button>`).join("");
    if ($("#fGoal").value !== focusPick.goal) $("#fGoal").value = focusPick.goal;
    $("#fHint").textContent = "Màn hình được giữ sáng. Khoá máy để làm bài trên giấy thì đồng hồ vẫn chạy.";
  } else {
    $("#fGoalShow").innerHTML = f.goal ? `${icon("target")} <span>${esc(f.goal)}</span>` : "";
    $("#fGoalShow").hidden = !f.goal;
    paintNotes();
    $("#fRunHint").textContent = "Dừng sớm vẫn ghi lại phần đã học.";
    tickFocus();
  }
}
function paintNotes() {
  const n = state.focus?.notes || [];
  $("#fNoteList").innerHTML = n.map((x) => `<li>${esc(x)}</li>`).join("");
  $("#fNotesSum").textContent = n.length ? `Việc chợt nhớ (${n.length}) · ghi lại để sau` : "Chợt nhớ việc khác? Ghi lại để sau";
}
function addNote() {
  const inp = $("#fNoteIn"), v = inp.value.trim(); if (!v || !state.focus?.endAt) return;
  (state.focus.notes ||= []).push(v.slice(0, 140)); save("focus", state.focus);
  inp.value = ""; paintNotes(); sfx("tick");
}
async function startFocus() {
  const subj = subjOf(focusPick.subject);
  focusPick.goal = $("#fGoal").value.trim().slice(0, 120);
  state.focus = { subject: subj.id, start: Date.now(), endAt: Date.now() + focusPick.dur * 60000, dur: focusPick.dur, goal: focusPick.goal, notes: [] };
  save("focus", state.focus); lsSet("focusSubj", subj.id);
  audioCtx(); sfx("tick");
  if (prefs().wake) { try { wakeLock = await navigator.wakeLock?.request("screen"); } catch { wakeLock = null; } }
  renderFocus();
}
function tickFocus() {
  const f = state.focus;
  if (!f?.endAt) return;
  const left = f.endAt - Date.now();
  if (left <= 0) { finishFocus(true); return; }
  const s = fmtLeft(left);
  if (state.view === "focus") { $("#fTime").textContent = s; $("#fRing").innerHTML = focusRing(1 - left / (f.dur * 60000)); }
  $$("[data-left]").forEach((el) => (el.textContent = s));
  if (state.view === "home" && $("#wFocusLabel").textContent !== "Đang tập trung") renderHero();
}
function finishFocus(complete) {
  const f = state.focus; if (!f?.endAt) return;
  const minutes = complete ? f.dur : Math.min(f.dur, Math.floor((Date.now() - f.start) / 60000));
  state.focus = {}; save("focus", {});
  try { wakeLock?.release?.(); } catch {} wakeLock = null;
  const st = statOf(f.subject); st.min = (st.min || 0) + minutes; st.n = (st.n || 0) + (minutes >= 5 ? 1 : 0);
  saveSubjStats();
  const entry = { s: f.start, m: minutes, subj: f.subject, ...(f.goal ? { goal: f.goal } : {}) };
  if (minutes > 0) {
    bump("f", minutes);
    state.sessions.push(entry);
    if (state.sessions.length > 3000) state.sessions.splice(0, state.sessions.length - 3000);
    save("sessions", { list: state.sessions });
  }
  if (complete) sfx("chime");
  const subj = subjOf(f.subject), notes = f.notes || [];
  if (state.view === "focus") renderFocus(); else render();
  if (minutes >= 5) {
    confetti();
    openSheet({ title: complete ? "Hoàn thành phiên tập trung!" : "Đã dừng phiên tập trung", html: `<div class="reward">
      ${emptyIc("check")}
      <p class="gain">${minutes} phút</p>
      <p>tập trung cho ${esc(subj.name)}.</p>
      ${f.goal ? `<div class="goal-check"><p class="small"><b>Mục tiêu phiên:</b> ${esc(f.goal)}</p><div class="two"><button class="btn sm" data-goal="half">Còn dở</button><button class="btn sm primary" data-goal="done">Xong rồi!</button></div></div>` : ""}
      ${notes.length ? `<div class="notes-after"><p class="small"><b>Việc bạn chợt nhớ trong phiên:</b></p><ul>${notes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><button class="btn sm" id="notesToAgenda">${icon("calendar")} Thêm vào lịch để làm sau</button></div>` : ""}
      <p class="muted small">Nghỉ 5 phút: đứng dậy, uống nước, nhìn ra xa 20 giây cho mắt nghỉ.</p>
      <div class="two" style="width:100%"><button class="btn" data-close>Nghỉ đã</button><button class="btn primary" data-act="focus-open">Phiên mới</button></div></div>`,
      onMount: (el) => el.addEventListener("click", (e) => {
        const g = e.target.closest("[data-goal]");
        if (g) { entry.done = g.dataset.goal === "done"; save("sessions", { list: state.sessions }); g.parentElement.innerHTML = `<p class="small">${entry.done ? "Tuyệt vời! Đã ghi là xong." : "Không sao, phiên sau làm tiếp nhé."}</p>`; sfx(entry.done ? "chime" : "pop"); if (!entry.done) focusPick.goal = f.goal; return; }
        if (e.target.closest("#notesToAgenda")) { const n = mergeEvents(notes.map((x) => ({ type: "other", title: x, date: "" })), "tập trung"); e.target.closest("#notesToAgenda").replaceWith(Object.assign(document.createElement("p"), { className: "small", textContent: n ? `Đã thêm ${n} việc vào Lịch (mục Chưa rõ ngày).` : "Các việc này đã có trong Lịch." })); }
      }) });
  } else toast(minutes ? `Đã ghi ${minutes} phút.` : "Đã dừng phiên tập trung");
  checkGold();
}
function openFocus() { closeSheet(); show("focus"); }
setInterval(tickFocus, 1000);
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible") return;
  tickFocus();
  if (state.focus?.endAt && !wakeLock && prefs().wake) { try { wakeLock = await navigator.wakeLock?.request("screen"); } catch {} }
});
