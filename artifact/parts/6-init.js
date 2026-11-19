
// ================= điều hướng =================
const TABS = ["home", "study", "review", "agenda", "inbox"];
const IMMERSIVE = ["course", "session"];
const START = location.hash.slice(1);
function show(v) {
  if (v === "course" && !curCourse()) v = "study";
  if (v === "session" && !sess.queue) v = "review";
  if (![...TABS, ...IMMERSIVE].includes(v)) v = "home";
  if (state.view === "course" && v !== "course" && chatAbort) chatAbort.abort();
  state.view = v;
  const imm = IMMERSIVE.includes(v);
  TABS.forEach((x) => ($("#v-" + x).hidden = x !== v));
  IMMERSIVE.forEach((x) => ($("#v-" + x).hidden = x !== v));
  $("#main").hidden = imm; $(".tabbar").hidden = imm;
  document.body.classList.toggle("immersive", imm);
  $$(".tab").forEach((b) => (b.dataset.v === v ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
  if (location.hash.slice(1) !== v) history.replaceState(null, "", "#" + v);
  if (v !== "session") render(v);
  if (v === "course") requestAnimationFrame(() => scrollToEnd(false)); else window.scrollTo(0, 0);
}
function render(v = state.view) {
  renderBadges();
  if (v === "home") renderHome();
  else if (v === "study") renderStudy();
  else if (v === "review") renderReview();
  else if (v === "agenda") renderAgenda();
  else if (v === "inbox") renderInbox();
  else if (v === "course" && !chatAbort) renderCourse();
}
window.addEventListener("hashchange", () => { const v = location.hash.slice(1); if (v && v !== state.view) show(v); });

// ================= hành động (một bộ lắng nghe cho cả trang) =================
const ACTIONS = {
  "copy-brief": () => copyText(briefingPrompt(), "lệnh briefing"),
  "paste-brief": openPasteBrief,
  "read-mail": () => runMail(+lsGet("mailDays", "7") || 7),
  "review-all": () => startSession(deckList().map((d) => d.id)),
  "deck-start": (el) => startSession([el.dataset.deck]),
  "add-course": openAddCourse,
  "open-course": (el) => { state.cur = el.dataset.id; lsSet("cur", state.cur); show("course"); },
  "add-event": openAddEvent,
  "plan": openPlan,
  "ev-menu": (el) => openEvMenu(el.dataset.id),
  "ev-done": (el) => { const a = state.agenda.find((x) => x.id === el.dataset.id); if (a) { a.done = !a.done; saveAgenda(); } closeSheet(); render(); },
  "ev-del": (el) => {
    const a = state.agenda.find((x) => x.id === el.dataset.id); if (!a) return;
    openConfirm({ title: "Xoá mốc này?", text: `“${a.title}” sẽ bị xoá khỏi lịch.`, yes: "Xoá", danger: true,
      onYes: () => { state.agenda = state.agenda.filter((x) => x.id !== a.id); saveAgenda(); render(); toast("Đã xoá khỏi lịch"); } });
  },
  "jump-day": (el) => jumpDay(el.dataset.date),
  "starter": (el) => send(STARTERS[+el.dataset.i].q, { canned: true }),
  "suggest": (el) => send(SUGGEST[+el.dataset.i][1], { canned: true }),
  "c-menu": openCourseMenu,
  "c-cards": openCardsSheet,
  "c-range": openRangeSheet,
  "c-exam": openExamSheet,
  "c-reset": () => openConfirm({ title: "Bắt đầu buổi học mới?", text: "Cuộc trò chuyện hiện tại sẽ bị xoá. Flashcards vẫn giữ nguyên.", yes: "Buổi mới",
    onYes: () => { const c = curCourse(); if (!c) return; state.chats[c.id] = { turns: [] }; saveChat(c.id); renderCourse(); } }),
  "c-delete": () => {
    const c = curCourse(); if (!c) return;
    const n = (state.decks[c.id] || []).length;
    openConfirm({ title: "Xoá tài liệu này?", text: `“${c.title}”, cuộc trò chuyện${n ? ` và ${n} flashcards` : ""} của nó sẽ bị xoá vĩnh viễn.`, yes: "Xoá", danger: true,
      onYes: () => { deleteCourse(c); show("study"); toast("Đã xoá tài liệu"); } });
  },
  "copy-check": () => copyText(lastCheck.prompt, "lệnh kiểm chứng"),
  "add-found": () => lastCheck.events.length && openEventsSheet(lastCheck.events, "kiểm tra"),
};
document.addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]");
  if (go && !e.target.closest("[data-act]")) { closeSheet(); show(go.dataset.go); return; }
  const a = e.target.closest("[data-act]");
  if (a && !a.disabled && ACTIONS[a.dataset.act]) ACTIONS[a.dataset.act](a, e);
});
$$(".tab").forEach((b) => b.addEventListener("click", () => show(b.dataset.v)));

// học
$("#suggest").innerHTML = SUGGEST.map(([l], i) => `<button class="chip" data-act="suggest" data-i="${i}">${esc(l)}</button>`).join("");
$("#chatIn").addEventListener("input", () => { autoGrow(); updateComposer(); });
$("#chatIn").addEventListener("keydown", (e) => { if (finePointer && e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send($("#chatIn").value); } });
$("#sendBtn").addEventListener("click", () => send($("#chatIn").value));
$("#stopBtn").addEventListener("click", () => chatAbort?.abort());
$("#feynBtn").addEventListener("click", () => { setFeyn(!feynOn); $("#chatIn").focus(); });
$("#feynOff").addEventListener("click", () => setFeyn(false));
$$("#cLang button").forEach((b) => b.addEventListener("click", () => {
  const c = curCourse(); if (!c) return;
  lsSet("lang:" + c.id, b.dataset.lang); lsSet("lang", b.dataset.lang);
  $$("#cLang button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  toast(b.dataset.lang === "vi" ? "Gia sư sẽ giảng bằng tiếng Việt" : "Gia sư giảng bằng tiếng Pháp");
}));
// ôn
$("#flash").addEventListener("click", flipCard);
$("#flash").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flipCard(); } });
$("#sFlip").addEventListener("click", flipCard);
$$("#sGrades .grade").forEach((b) => b.addEventListener("click", () => gradeCur(+b.dataset.g)));
document.addEventListener("keydown", (e) => {
  if (state.view !== "session" || !sheetRoot.hidden || e.target.closest("input, textarea")) return;
  const map = { 1: 0, 2: 3, 3: 4, 4: 5 };
  if (sess.flipped && map[e.key] !== undefined) gradeCur(map[e.key]);
});
$("#sExit").addEventListener("click", () => { sess.queue = null; sess.cur = null; show("review"); });
// hộp thư
$$("#iSeg button").forEach((b) => b.addEventListener("click", () => { state.seg = b.dataset.seg; renderInbox(); }));
$$("#mDays button").forEach((b) => b.addEventListener("click", () => { lsSet("mailDays", b.dataset.d); renderInbox(); }));
$("#ckFiles").addEventListener("change", (e) => { ckFiles = [...e.target.files]; renderThumbs(); });
$("#ckGo").addEventListener("click", (e) => runCheck(e.currentTarget));
getLimits().then((l) => { if (!l?.images) { $("#ckDrop").hidden = true; } else $("#ckFiles").accept = l.images.mediaTypes.join(","); });

show(START || "home");
loadData();
})();
