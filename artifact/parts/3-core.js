(() => {
"use strict";
// ================= tiện ích =================
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const uid8 = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;
const NEED_CLAUDE = "Mở app trên claude.ai (đã đăng nhập) để dùng Claude.";
const FEYN = "[EXPLICATION FEYNMAN] ";
const icon = (n, cls = "") => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${n}"></use></svg>`;
const thinking = (label = "") => `<span class="typing" role="status"><i></i><i></i><i></i>${label ? `<span>${esc(label)}</span>` : ""}</span>`;
function lsGet(k, d = "") { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch {} }
function mascot(cls = "", mood = "happy") { return kitten(mood, cls); } // bé mèo Elec (vẽ ở 9-adv-art.js)

// ================= ngày giờ (giờ Paris) =================
const TZ = "Europe/Paris";
const todayISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diffDays = (iso) => Math.round((new Date(iso + "T12:00:00Z") - new Date(todayISO() + "T12:00:00Z")) / 86400000);
const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const wdOf = (iso) => WD[new Date(iso + "T12:00:00Z").getUTCDay()];
const longDate = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
function countdown(iso) {
  if (!iso) return "";
  const d = diffDays(iso);
  if (d === 0) return "hôm nay";
  if (d === 1) return "ngày mai";
  if (d === -1) return "hôm qua";
  if (d < 0) return `${-d} ngày trước`;
  return d < 14 ? `còn ${d} ngày` : `còn ${Math.round(d / 7)} tuần`;
}
function timeAgo(ts) {
  const m = Math.round((Date.now() - new Date(ts)) / 60000);
  if (!isFinite(m)) return "";
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.round(h / 24)} ngày trước`;
}
const hhmm = (ts) => new Date(ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
function shortDT(ts) { const d = new Date(ts); return isNaN(d) ? "" : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", timeZone: TZ }) + " · " + hhmm(ts); }
const parisHour = () => Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(new Date()));
function greeting() {
  const h = parisHour();
  if (h >= 23 || h < 5) return { pre: "Khuya rồi,", word: "ngủ sớm nha", mood: "sleep" };
  return { pre: "Chào buổi", word: h < 11 ? "sáng" : h < 14 ? "trưa" : h < 18 ? "chiều" : "tối", mood: "happy" };
}

// ================= Markdown + công thức =================
function md(text) {
  const maths = [];
  const keep = (tex, display) => `@@M${maths.push({ tex, display }) - 1}@@`;
  const src = String(text || "")
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => keep(t, true))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => keep(t, true))
    .replace(/\\\((.+?)\\\)/g, (_, t) => keep(t, false))
    .replace(/(^|[^\\$\w])\$([^\s$](?:[^$\n]*?[^\s$])?)\$/g, (_, pre, t) => pre + keep(t, false));
  const raw = window.marked ? window.marked.parse(src) : esc(src).replace(/\n/g, "<br>");
  const clean = window.DOMPurify ? window.DOMPurify.sanitize(raw) : esc(src);
  return clean.replace(/@@M(\d+)@@/g, (_, i) => { const m = maths[+i]; return m.display ? `\\[${esc(m.tex)}\\]` : `\\(${esc(m.tex)}\\)`; })
    .replace(/<a /g, '<a target="_blank" rel="noopener" ');
}
function typeset(el) { if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([el]).catch(() => {}); }
function setMd(el, text) { el.innerHTML = md(text); typeset(el); }

// ================= thông báo nhỏ & bảng trượt =================
function toast(msg, ms = 3000) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), ms);
}
function showNotice(msg) { const n = $("#notice"); n.textContent = msg; n.hidden = !msg; }
const sheetRoot = $("#sheetRoot");
function openSheet({ title, html, onMount }) {
  sheetRoot.innerHTML = `<div class="backdrop" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="grab"></div><header class="sheet-h"><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Đóng">${icon("x")}</button></header><div class="sheet-b">${html}</div></div>`;
  sheetRoot.hidden = false;
  sheetRoot.classList.remove("open");
  document.body.classList.add("noscroll");
  const el = sheetRoot.querySelector(".sheet");
  onMount?.(el);
  requestAnimationFrame(() => requestAnimationFrame(() => sheetRoot.classList.add("open")));
  if (finePointer) el.querySelector("input[type=text], textarea")?.focus();
  return el;
}
function closeSheet() {
  if (sheetRoot.hidden) return;
  sheetRoot.classList.remove("open"); sheetRoot.hidden = true; sheetRoot.innerHTML = "";
  document.body.classList.remove("noscroll");
}
sheetRoot.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeSheet(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
function openConfirm({ title, text, yes, danger = false, onYes }) {
  openSheet({ title, html: `<p class="muted">${esc(text)}</p><div class="two"><button class="btn" data-close>Thôi</button><button class="btn ${danger ? "danger" : "primary"}" id="cfYes">${esc(yes)}</button></div>`,
    onMount: (el) => $("#cfYes", el).addEventListener("click", () => { closeSheet(); onYes(); }) });
}
async function copyText(text, label) {
  try { await navigator.clipboard.writeText(text); toast(`Đã chép ${label}. Dán vào Claude và bật Tìm kiếm web nhé.`, 4200); }
  catch {
    openSheet({ title: "Chép thủ công", html: `<p class="muted small">Không tự chép được. Chọn hết chữ trong ô dưới rồi sao chép.</p><textarea readonly rows="9" id="cpBox"></textarea>`,
      onMount: (el) => { const ta = $("#cpBox", el); ta.value = text; ta.focus(); ta.select(); } });
  }
}

// ================= dữ liệu (riêng tư theo người dùng) =================
const state = { agenda: [], courses: [], decks: {}, chats: {}, mail: { seen: [], recent: [], lastRun: "" }, status: null, stats: { days: {} }, atoms: {}, focus: {}, facts: {}, prefs: {}, sessions: [], adv: null, cur: null, view: "home", seg: "mail", mailMsg: null };
let base = null, dataReady = false, loadFailed = false;
const writeQueue = new Map();
function queue(docId, op) {
  const next = (writeQueue.get(docId) || Promise.resolve()).then(op).catch((e) => {
    if (e?.code === "quota_exceeded") showNotice("Bộ nhớ của app đã đầy. Hãy xoá bớt tài liệu cũ.");
    else if (e?.code === "invalid_argument") showNotice("Có dữ liệu quá lớn nên chưa lưu được. Thử chia nhỏ tài liệu.");
    else console.warn("db", docId, e);
  });
  writeQueue.set(docId, next);
  return next;
}
const save = (docId, data) => (base ? queue(docId, () => base.doc(docId).set(data)) : Promise.resolve());
const removeDoc = (docId) => (base ? queue(docId, () => base.doc(docId).delete()) : Promise.resolve());
const saveAgenda = () => save("agenda", { items: state.agenda });
const saveCourses = () => save("courses", { list: state.courses.map(({ _pages, ...c }) => c) });
const saveDeck = (id) => save("deck-" + id, { cards: state.decks[id] || [] });
const saveMail = () => save("mail", state.mail);
const saveStatus = () => save("status", state.status || {});
const saveStats = () => save("stats", state.stats);
// ghi lại hoạt động trong ngày: r = thẻ đã ôn, m = tin nhắn với gia sư
function bump(kind, n = 1) {
  const t = todayISO(), days = state.stats.days;
  (days[t] ||= { r: 0, m: 0 })[kind] = (days[t][kind] || 0) + n;
  const keep = addDays(t, -120);
  for (const d of Object.keys(days)) if (d < keep) delete days[d];
  saveStats();
}
const activeOn = (d) => { const x = state.stats.days[d]; return !!x && (x.r > 0 || x.m > 0); };
function streak() {
  let day = todayISO(), n = 0;
  if (!activeOn(day)) day = addDays(day, -1);
  while (activeOn(day)) { n++; day = addDays(day, -1); }
  return n;
}
function saveChat(id) {
  const chat = state.chats[id] || { turns: [] };
  while (chat.turns.length > 2 && new Blob([JSON.stringify(chat)]).size > 200000) chat.turns.splice(0, 2);
  return save("chat-" + id, chat);
}
async function loadData() {
  const timer = setTimeout(() => showNotice("Đang chờ kết nối dữ liệu…"), 10000);
  try {
    const db = await (window.claude?.use?.("db") ?? null);
    const user = await (window.claude?.use?.("user") ?? null);
    const id = user ? await user.id() : null;
    if (!db || !id) { showNotice("Đăng nhập claude.ai để app lưu được dữ liệu. Hiện dữ liệu chỉ giữ tới khi đóng trang."); return; }
    base = db.collection("data/users/" + id);
    const snap = await base.get();
    for (const d of snap.docs) {
      const v = d.data() || {};
      if (d.id === "agenda") state.agenda = v.items || [];
      else if (d.id === "courses") state.courses = (v.list || []).map(({ _pages, ...c }) => c);
      else if (d.id.startsWith("deck-")) state.decks[d.id.slice(5)] = v.cards || [];
      else if (d.id.startsWith("chat-")) state.chats[d.id.slice(5)] = { turns: v.turns || [] };
      else if (d.id === "mail") state.mail = { seen: v.seen || [], recent: v.recent || [], lastRun: v.lastRun || "" };
      else if (d.id === "status") state.status = v.date ? v : null;
      else if (d.id === "stats") state.stats = { days: v.days || {} };
      else if (d.id === "atoms") state.atoms = v.list || {};
      else if (d.id === "focus") state.focus = v.endAt ? v : {};
      else if (d.id === "facts") state.facts = v.list || {};
      else if (d.id === "prefs") state.prefs = v || {};
      else if (d.id === "sessions") state.sessions = Array.isArray(v.list) ? v.list : [];
      else if (d.id === "adv") { const z = ADV0(); state.adv = { ...z, ...v, own: v.own || {}, choice: v.choice || {}, aff: v.aff || {}, day: v.day || {}, furni: v.furni || z.furni, equip: v.equip || z.equip }; }
    }
    showNotice("");
  } catch (e) {
    console.warn(e);
    base = null; loadFailed = true; // đọc lỗi thì tạm không ghi gì, để không đè lên dữ liệu thật
    showNotice("Không đọc được dữ liệu đã lưu. Thử tải lại trang sau.");
  } finally {
    clearTimeout(timer);
    dataReady = true;
    hideSplash();
    const cur = lsGet("cur");
    if (cur && state.courses.some((c) => c.id === cur)) state.cur = cur;
    if (state.focus?.endAt && state.focus.endAt <= Date.now()) finishFocus(true);
    if (START === "course" && state.cur && state.view !== "course") show("course"); else render();
  }
}
async function loadCourseText(c) {
  if (c._pages) return c._pages;
  const pages = [];
  if (base) for (let i = 0; i < (c.chunks || 0); i++) {
    const s = await base.doc(`text-${c.id}-${i}`).get();
    if (s.exists) pages.push(...(s.data().pages || []));
  }
  c._pages = pages;
  return pages;
}

// ================= Claude & Gmail =================
let samplePromise = null, limitsPromise = null;
const getSample = () => (samplePromise ||= Promise.resolve(window.claude?.use?.("sample") ?? null));
const getLimits = () => (limitsPromise ||= getSample().then((s) => (s ? s.limits().catch(() => null) : null)));
const getMcp = () => Promise.resolve(window.claude?.use?.("mcp") ?? null);
function sampleErr(e) {
  const c = e?.code;
  return ({
    not_granted: "Bạn chưa cho phép trang dùng Claude. Tải lại trang và bấm Cho phép.",
    rate_limited: "Đã chạm giới hạn dùng Claude của gói. Đợi một lúc rồi thử lại.",
    invalid_json: "Claude trả lời sai định dạng, thử lại nhé.",
    refused: "Claude từ chối yêu cầu này.",
    prompt_too_large: "Tài liệu quá dài cho một lần hỏi. Chọn ít trang hơn.",
    session_expired: "Phiên đăng nhập hết hạn. Tải lại trang.",
    images_unavailable: "Thiết bị này chưa gửi ảnh cho Claude được.",
    image_rejected: "Claude không nhận ảnh này. Thử ảnh PNG hoặc JPG khác.",
  })[c] || "Có lỗi khi hỏi Claude" + (c ? ` (${c})` : "") + ". Thử lại sau nhé.";
}
function mcpErr(e) {
  return ({
    needs_reauth: "Kết nối Gmail đã hết hạn. Vào claude.ai → Cài đặt → Connectors → Gmail để kết nối lại.",
    server_not_connected: "Chưa kết nối Gmail. Vào claude.ai → Cài đặt → Connectors → Gmail → Connect.",
    server_not_found: "Chưa kết nối Gmail. Vào claude.ai → Cài đặt → Connectors → Gmail → Connect.",
    approval_required: "Trang cần bạn cho phép đọc Gmail. Mở app trên claude.ai rồi bấm Cho phép.",
    consent_required: "Trang cần bạn cho phép đọc Gmail. Bấm lại nút và chọn Cho phép.",
    not_granted: "Bạn đã từ chối quyền đọc Gmail. Tải lại trang để được hỏi lại.",
    blocked_by_policy: "Tài khoản của bạn không cho trang này đọc Gmail.",
    server_unavailable: "Gmail đang không phản hồi. Thử lại sau ít phút.",
    upstream_error: "Gmail đang không phản hồi. Thử lại sau ít phút.",
    rate_limited: "Đọc mail quá nhiều lần liền. Đợi một chút rồi thử lại.",
  })[e?.code] || "Không đọc được Gmail" + (e?.code ? ` (${e.code})` : "") + ".";
}

// ================= lịch =================
const TYPE = {
  exam: { label: "Thi", cls: "c-exam" },
  deadline: { label: "Hạn nộp", cls: "c-deadline" },
  closure: { label: "Đóng cửa", cls: "c-closure" },
  holiday: { label: "Nghỉ", cls: "c-holiday" },
  event: { label: "Sự kiện", cls: "c-event" },
  other: { label: "Khác", cls: "c-event" },
};
const typeOf = (t) => TYPE[t] || TYPE.other;
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
function validDate(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d || "")) return "";
  const t = new Date(d + "T12:00:00Z");
  return !isNaN(t) && t.toISOString().slice(0, 10) === d ? d : "";
}
function cleanEvents(list) {
  return (Array.isArray(list) ? list : []).filter((e) => e && typeof e.title === "string" && e.title.trim())
    .map((e) => ({ ...e, title: e.title.trim(), date: validDate(e.date), time: typeof e.time === "string" ? e.time : "", type: TYPE[e.type] ? e.type : "other" }));
}
function mergeEvents(events, source) {
  let added = 0;
  for (const e of events || []) {
    if (!e?.title) continue;
    const date = validDate(e.date);
    const dup = state.agenda.find((a) => a.date === date && norm(a.title) === norm(e.title));
    if (dup) { for (const k of ["time", "course", "location", "to_submit", "exam_content", "details"]) if (!dup[k] && e[k]) dup[k] = e[k]; continue; }
    state.agenda.push({ id: uid8(), type: TYPE[e.type] ? e.type : "other", title: String(e.title).trim(), date, time: e.time || "", course: e.course || "", location: e.location || "",
      to_submit: e.to_submit || "", exam_content: e.exam_content || "", details: e.details || "", presence: e.presence || "", source, done: false });
    added++;
  }
  state.agenda.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999") || (a.time || "").localeCompare(b.time || ""));
  saveAgenda();
  return added;
}
const byDate = (a, b) => (a.date || "9999").localeCompare(b.date || "9999") || (a.time || "").localeCompare(b.time || "");
function upcoming(days) { const t = todayISO(), end = addDays(t, days); return state.agenda.filter((a) => !a.done && a.date && a.date >= t && a.date <= end).sort(byDate); }
function agendaText(items) {
  return items.length ? items.map((a) => `- [${a.type}] ${a.date || "?"} ${a.time || ""} — ${a.title}${a.course ? " — " + a.course : ""}${a.to_submit ? " — à rendre : " + a.to_submit : ""}${a.exam_content ? " — programme : " + a.exam_content : ""}`).join("\n") : "(agenda vide)";
}
const EVENT_JSON = `{"type": "exam|deadline|event|closure|holiday|other", "title": "...", "date": "AAAA-MM-JJ ou ''", "time": "HH:MM ou ''", "course": "", "location": "", "to_submit": "ce qu'il faut rendre et où", "exam_content": "chapitres au programme", "details": "", "presence": "oui|non|inconnu"}`;
function openEventsSheet(evs, source, title = "Tìm thấy các mốc thời gian") {
  openSheet({ title, html: `
    <p class="muted small">Bỏ chọn những mốc bạn không cần, rồi thêm vào lịch.</p>
    <div class="pick">${evs.map((ev, i) => `<label class="pick-row"><input type="checkbox" data-i="${i}" checked><span class="tag ${typeOf(ev.type).cls}">${typeOf(ev.type).label}</span><span class="pick-t"><strong>${esc(ev.title)}</strong><span class="faint small">${esc(ev.date ? longDate(ev.date) : "chưa rõ ngày")}${ev.time ? " · " + esc(ev.time) : ""}</span></span></label>`).join("")}</div>
    <button class="btn primary block" id="evAdd">${icon("calendar")} Thêm vào lịch</button>`,
    onMount: (el) => $("#evAdd", el).addEventListener("click", () => {
      const chosen = $$("input[data-i]", el).filter((c) => c.checked).map((c) => evs[+c.dataset.i]);
      const n = mergeEvents(chosen, source);
      closeSheet(); render();
      toast(n ? `Đã thêm ${n} mốc vào lịch` : "Các mốc này đã có trong lịch");
    }) });
}

// ================= tình hình campus (briefing) =================
const VERDICT = {
  go: { label: "Nên lên trường hôm nay", cls: "v-go" },
  stay: { label: "Hôm nay có thể ở nhà", cls: "v-stay" },
  partial: { label: "Lên trường một phần", cls: "v-partial" },
  unknown: { label: "Chưa rõ tình hình", cls: "v-unknown" },
};
function briefingPrompt() {
  return `Briefing du ${todayISO()} — utilise la recherche web.
Je suis étudiant·e en L1 EEA à Sorbonne Université, campus Pierre et Marie Curie (Jussieu, Paris 5e), surtout à distance. Réponds en vietnamien (noms officiels en français entre parenthèses).
Cherche les infos d'aujourd'hui et d'hier :
1. État du campus Jussieu : ouvert / fermé / blocus / filtrage, bâtiments accessibles, cours et examens maintenus ou passés à distance.
2. Mobilisations : AG, appels au blocage, manifestations (parcours déclarés à la Préfecture de police, horaires, passage près de Jussieu).
3. Transports : métro Jussieu (lignes 7 et 10), grèves RATP.
4. Calendrier : vacances, jours fériés, examens.
Sources prioritaires : sorbonne-universite.fr, sciences.sorbonne-universite.fr, Instagram @sorbonne_univ et @sorbonne_sciences_vieetudiante, syndicats étudiants, presse (Le Parisien, Le Monde, France Info). Si Instagram n'est pas accessible, dis-le.
Commence par UNE ligne : 🏫 CẦN lên trường / 🏠 KHÔNG cần lên trường / ⚖️ Một phần / ❓ Chưa chắc.
Puis sections courtes : Campus · Blocus / biểu tình · Giao thông · Sắp tới · Việc hôm nay · Nguồn. Date chaque info, sépare officiel et rumeur.

Mon agenda (14 jours) :
${agendaText(upcoming(14))}

Mails récents de l'université (résumés) :
${state.mail.recent.slice(0, 8).map((m) => `- ${String(m.date).slice(0, 10)} · ${m.subject} : ${m.resume}`).join("\n") || "(aucun)"}`;
}
function openPasteBrief() {
  openSheet({ title: "Dán bản tin hôm nay", html: `
    <p class="muted small">Dán toàn bộ câu trả lời briefing của Claude. App rút ra kết luận và lưu các mốc thời gian.</p>
    <textarea id="pbText" rows="8" placeholder="🏠 KHÔNG cần lên trường…"></textarea>
    <div class="small" id="pbStatus"></div>
    <button class="btn primary block" id="pbGo">Lưu bản tin</button>`,
    onMount: (el) => $("#pbGo", el).addEventListener("click", async (ev) => {
      const text = $("#pbText", el).value.trim();
      if (!text) return toast("Dán nội dung trước nhé");
      const sample = await getSample(); if (!sample) return toast(NEED_CLAUDE);
      const btn = ev.currentTarget; btn.disabled = true; $("#pbStatus", el).innerHTML = thinking("Claude đang đọc bản tin…");
      try {
        const r = await sample.json(`Voici un briefing sur l'état du campus Jussieu (Sorbonne Université) pour aujourd'hui (${todayISO()}). Extrais-en l'essentiel pour l'étudiant.
Réponds UNIQUEMENT avec un objet JSON :
{"verdict": "go|stay|partial|unknown" (go = doit aller au campus aujourd'hui, stay = pas besoin, partial = en partie, unknown = pas clair),
 "headline_vi": "une phrase de moins de 120 caractères en vietnamien",
 "points_vi": ["3 à 5 points clés très courts en vietnamien : campus, blocus, manifestations, transports, cours"],
 "events": [${EVENT_JSON}]}
Convertis les dates relatives en dates absolues. N'invente rien.

Briefing :
"""${text.slice(0, 60000)}"""`, { cache: false });
        state.status = { date: todayISO(), verdict: VERDICT[r?.verdict] ? r.verdict : "unknown", headline: String(r?.headline_vi || "").slice(0, 220),
          points: (Array.isArray(r?.points_vi) ? r.points_vi : []).slice(0, 5).map(String), updatedAt: new Date().toISOString() };
        saveStatus(); render();
        const evs = cleanEvents(r?.events);
        if (evs.length) openEventsSheet(evs, "briefing", "Bản tin có nhắc tới các mốc này");
        else { closeSheet(); toast("Đã cập nhật tình hình campus"); }
      } catch (err) { if (el.isConnected) { $("#pbStatus", el).innerHTML = `<span class="err">${esc(sampleErr(err))}</span>`; btn.disabled = false; } }
    }) });
}

// ================= mail trường (qua kết nối Gmail) =================
// bắt cả mail gửi thẳng cho bạn lẫn danh sách chung (listes.sorbonne-universite.fr, Moodle…)
const MAIL_Q = (days) => `(to:sorbonne-universite.fr OR cc:sorbonne-universite.fr OR from:sorbonne-universite.fr OR list:sorbonne-universite.fr) newer_than:${days}d`;
let mailBusy = false;
function paintMailMsg() {
  const m = state.mailMsg;
  const html = m ? (m.kind === "busy" ? thinking(m.text) : `<span class="${m.kind === "err" ? "err" : "faint"}">${esc(m.text)}</span>`)
    : `<span class="faint">${state.mail.lastRun ? "Đọc lần cuối " + timeAgo(state.mail.lastRun) : "Chưa đọc lần nào"}</span>`;
  $$("[data-mailmsg]").forEach((el) => (el.innerHTML = html));
  $$('[data-act="read-mail"]').forEach((b) => (b.disabled = mailBusy));
}
function setMailMsg(text, kind = "") { state.mailMsg = { text, kind }; paintMailMsg(); }
async function runMail(days) {
  if (mailBusy) return;
  const [mcp, sample] = await Promise.all([getMcp(), getSample()]);
  if (!mcp || !sample) return setMailMsg(NEED_CLAUDE, "err");
  mailBusy = true;
  let phase = "gmail";
  try {
    setMailMsg("Đang tìm mail của trường…", "busy");
    const r = await mcp.callTool("Gmail", "search_threads", { query: MAIL_Q(days), pageSize: 25, view: "THREAD_VIEW_SUMMARY" });
    const threads = Array.isArray(r?.payload?.threads) ? r.payload.threads : [];
    const seen = new Set(state.mail.seen);
    const keyOf = (t) => `${t.id}:${t.messageCount || 1}`;
    const fresh = threads.filter((t) => t?.id && !seen.has(keyOf(t))).slice(0, 10);
    state.mail.lastRun = new Date().toISOString();
    if (!fresh.length) { saveMail(); setMailMsg(`Không có mail mới trong ${days} ngày qua.`, "ok"); return; }
    const mails = [];
    for (let i = 0; i < fresh.length; i++) {
      setMailMsg(`Đang đọc mail ${i + 1}/${fresh.length}…`, "busy");
      const t = fresh[i];
      try {
        const th = await mcp.callTool("Gmail", "get_thread", { threadId: t.id, messageFormat: "PLAIN_TEXT" });
        const msgs = Array.isArray(th?.payload?.messages) ? th.payload.messages : [];
        const last = msgs.slice(-3), lm = last[last.length - 1] || {};
        let body = last.map((m) => `De : ${m.sender || ""} — ${m.date || ""}\n${m.plaintextBody || m.snippet || ""}`).join("\n---\n");
        if (body.length > 7000) body = body.slice(0, 7000) + "\n[… mail tronqué …]";
        const att = last.flatMap((m) => (Array.isArray(m.attachments) ? m.attachments : []).map((a) => a?.filename || a?.name || a?.title).filter(Boolean));
        mails.push({ id: t.id, key: keyOf(t), subject: lm.subject || msgs[0]?.subject || "", from: lm.sender || "", date: lm.date || "", url: th?.payload?.viewUrl || t.viewUrl || "", body, att });
      } catch (err) { if (["needs_reauth", "server_not_connected", "not_granted", "approval_required", "blocked_by_policy"].includes(err?.code)) throw err; }
    }
    if (!mails.length) { setMailMsg("Không đọc được nội dung mail nào, thử lại sau.", "err"); return; }
    setMailMsg("Claude đang tóm tắt…", "busy");
    phase = "claude";
    const res = await sample.json(`Tu aides un·e étudiant·e vietnamien·ne de L1 EEA à Sorbonne Université (campus Pierre et Marie Curie). Date du jour : ${todayISO()}.
Voici ${mails.length} mails universitaires, chacun avec un numéro [ref]. Pour chacun : résumé clair en vietnamien (2-4 phrases), importance, action concrète attendue. Puis extrais TOUS les examens, rendus, fermetures, blocages, manifestations, vacances et événements (dates relatives → dates absolues ; n'invente rien).
Réponds UNIQUEMENT avec un JSON :
{"mails": [{"ref": 0, "resume_vi": "...", "importance": "haute|moyenne|basse", "action_vi": "action concrète ou ''"}],
 "events": [${EVENT_JSON}]}

${mails.map((m, i) => `[ref:${i}] Objet : ${m.subject}\nDe : ${m.from}\nDate : ${m.date}\nPièces jointes : ${m.att.join(", ") || "aucune"}\n\n${m.body}`).join("\n\n=====\n\n")}`, { cache: false });
    const sums = Array.isArray(res?.mails) ? res.mails : [];
    const added = mails.map((m, i) => {
      const s = sums.find((x) => +x?.ref === i) || {};
      return { id: m.id, subject: m.subject, from: m.from, date: m.date, url: m.url, resume: s.resume_vi || "", importance: ["haute", "moyenne", "basse"].includes(s.importance) ? s.importance : "basse", action: s.action_vi || "" };
    });
    state.mail.recent = [...added, ...state.mail.recent.filter((x) => !added.some((a) => a.id === x.id))].slice(0, 40);
    state.mail.seen = [...state.mail.seen, ...mails.map((m) => m.key)].slice(-600);
    saveMail();
    const evs = cleanEvents(res?.events);
    setMailMsg(`Đã đọc ${mails.length} mail mới${evs.length ? ` · ${evs.length} mốc thời gian` : ""}.`, "ok");
    if (evs.length) openEventsSheet(evs, "mail", `Mail mới có ${evs.length} mốc thời gian`);
  } catch (err) { setMailMsg(phase === "claude" ? sampleErr(err) : mcpErr(err), "err"); }
  finally { mailBusy = false; render(); }
}
