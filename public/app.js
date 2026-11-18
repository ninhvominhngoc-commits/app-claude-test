import { marked } from "/vendor/marked/marked.esm.js";
import DOMPurify from "/vendor/dompurify/purify.es.mjs";
import katex from "/vendor/katex/katex.mjs";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ---------- Markdown + công thức toán ----------
function md(text) {
  const maths = [];
  const keep = (tex, display) => `@@M${maths.push({ tex, display }) - 1}@@`;
  let src = String(text || "")
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => keep(t, true))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => keep(t, true))
    .replace(/\\\((.+?)\\\)/g, (_, t) => keep(t, false))
    .replace(/(^|[^\\$])\$([^\s$](?:[^$\n]*?[^\s$])?)\$/g, (_, pre, t) => pre + keep(t, false));
  let html = DOMPurify.sanitize(marked.parse(src), { ADD_ATTR: ["target"] });
  html = html.replace(/@@M(\d+)@@/g, (_, i) => {
    const m = maths[+i];
    try {
      return katex.renderToString(m.tex, { displayMode: m.display, throwOnError: false });
    } catch {
      return esc(m.tex);
    }
  });
  return html.replace(/<a /g, '<a target="_blank" rel="noopener" ');
}

function toast(msg, ms = 3500) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.add("hidden"), ms);
}

async function api(url, opts = {}) {
  const init = { ...opts };
  if (opts.json !== undefined) {
    init.method ||= "POST";
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(opts.json);
  }
  const r = await fetch(url, init);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

async function busy(btn, label, fn) {
  const old = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spin"></span> ${label}`;
  try {
    return await fn();
  } catch (e) {
    toast("⚠️ " + e.message, 6000);
  } finally {
    btn.disabled = false;
    btn.innerHTML = old;
  }
}

const sourcesHtml = (sources) =>
  sources?.length
    ? `<details class="sources"><summary>🔗 ${sources.length} nguồn</summary><ul>${sources
        .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`)
        .join("")}</ul></details>`
    : "";

const TYPE = { exam: "📝 Thi", deadline: "📤 Hạn nộp", event: "📌 Sự kiện", closure: "🚧 Đóng cửa", holiday: "🌴 Nghỉ", other: "• Khác" };
const VERDICT = {
  OUI: ["go", "🏫 Hôm nay CẦN lên trường"],
  NON: ["stay", "🏠 Hôm nay KHÔNG cần lên trường"],
  PARTIEL: ["mid", "⚖️ Lên trường một phần — xem chi tiết"],
  INCERTAIN: ["mid", "❓ Chưa chắc — xem chi tiết"],
};

function dayDiff(date) {
  if (!date) return "";
  const d = Math.round((new Date(date + "T12:00") - new Date(state.today + "T12:00")) / 86400000);
  return d === 0 ? "hôm nay" : d === 1 ? "ngày mai" : d < 0 ? `${-d} ngày trước` : `còn ${d} ngày`;
}

function agendaItemHtml(a, withActions = false) {
  return `<div class="item ${a.type} ${a.done ? "done" : ""}" data-id="${a.id}">
    <div class="item-head"><span class="tag">${TYPE[a.type] || a.type}</span>
      <strong>${esc(a.title)}</strong>
      <span class="muted small">${esc(a.date || "chưa rõ ngày")} ${esc(a.time || "")} · ${dayDiff(a.date)}</span></div>
    ${a.course ? `<div class="small">📚 ${esc(a.course)}</div>` : ""}
    ${a.location ? `<div class="small">📍 ${esc(a.location)}</div>` : ""}
    ${a.to_submit ? `<div class="small">📤 <b>Cần nộp:</b> ${esc(a.to_submit)}</div>` : ""}
    ${a.exam_content ? `<div class="small">🎯 <b>Nội dung thi:</b> ${esc(a.exam_content)}</div>` : ""}
    ${a.requires_presence === "oui" ? `<div class="small">🏫 Phải có mặt tại trường</div>` : ""}
    ${a.details ? `<div class="small muted">${esc(a.details)}</div>` : ""}
    ${withActions ? `<div class="row small"><button data-act="done">${a.done ? "↩︎ Bỏ đánh dấu" : "✔︎ Xong"}</button><button data-act="del">🗑</button><span class="muted">nguồn: ${esc(a.source)}</span></div>` : ""}
  </div>`;
}

const state = { today: "", courses: [], current: null };

// ---------- Tabs ----------
$$("#tabs button").forEach((b) =>
  b.addEventListener("click", () => {
    $$("#tabs button").forEach((x) => x.classList.toggle("active", x === b));
    $$(".tab").forEach((t) => t.classList.toggle("active", t.id === "tab-" + b.dataset.tab));
    ({ home: loadHome, verify: loadVerifyHistory, agenda: loadAgenda, study: loadCourses, cards: loadDecks, settings: loadSettings })[b.dataset.tab]?.();
  }));

// ---------- Hôm nay ----------
function showDigest(d) {
  if (!d) return;
  const [cls, label] = VERDICT[d.verdict] || VERDICT.INCERTAIN;
  $("#verdict").className = "card verdict " + cls;
  $("#verdict").innerHTML = `<div class="big">${label}</div><div>${esc(d.resume)}</div><div class="muted small">Bản tin ${esc(d.date)} · ${new Date(d.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</div>`;
  $("#digest").innerHTML = md(d.markdown) + sourcesHtml(d.sources);
}

async function loadHome() {
  const s = await api("/api/status");
  state.today = s.today;
  $("#today").textContent = new Date(s.today + "T12:00").toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" });
  if (s.latestDigest) showDigest(s.latestDigest);
  $("#homeUpcoming").innerHTML = s.upcoming.map((a) => agendaItemHtml(a)).join("") || `<p class="muted">Chưa có gì trong lịch. Hãy đọc mail hoặc kiểm chứng một thông báo.</p>`;
  const hints = [];
  if (!s.mailConfigured) hints.push("Chưa kết nối mail (xem README).");
  if (!s.notifications.ntfy && !s.notifications.email) hints.push("Chưa bật thông báo điện thoại (NTFY_TOPIC).");
  if (s.dueCards) hints.push(`🃏 ${s.dueCards} thẻ cần ôn hôm nay.`);
  $("#homeHint").textContent = hints.join(" ");
  $("#syncMail").disabled = !s.mailConfigured;
  const hist = await api("/api/digests");
  $("#digestHistory").innerHTML = hist.slice(1).map((d) => `<details class="card"><summary>${esc(d.date)} — ${esc((VERDICT[d.verdict] || VERDICT.INCERTAIN)[1])}</summary><div class="md">${md(d.markdown)}</div></details>`).join("");
}

$("#runDigest").addEventListener("click", (e) =>
  busy(e.currentTarget, "Đang research (1-3 phút)…", async () => {
    showDigest(await api("/api/digest/run", { json: { notify: true } }));
    loadHome();
  }));

$("#syncMail").addEventListener("click", (e) =>
  busy(e.currentTarget, "Đang đọc mail…", async () => {
    const r = await api("/api/mail/sync", { json: { days: 7 } });
    toast(`📬 ${r.processed} mail mới, ${r.events.length} mốc thời gian được thêm vào lịch.`);
    loadHome();
  }));

// ---------- Kiểm chứng ----------
function verificationHtml(v) {
  return `<div class="card md">${md(v.markdown)}${sourcesHtml(v.sources)}${v.eventsAdded ? `<p class="small">📅 Đã thêm ${v.eventsAdded} mốc vào lịch.</p>` : ""}</div>`;
}
$("#verifyBtn").addEventListener("click", (e) =>
  busy(e.currentTarget, "Đang kiểm chứng (1-3 phút)…", async () => {
    const fd = new FormData();
    fd.append("text", $("#verifyText").value);
    fd.append("lang", $("#verifyLang").value);
    for (const f of $("#verifyFiles").files) fd.append("files", f);
    const v = await api("/api/verify", { method: "POST", body: fd });
    $("#verifyResult").innerHTML = verificationHtml(v);
    $("#verifyText").value = "";
    $("#verifyFiles").value = "";
  }));
async function loadVerifyHistory() {
  const list = await api("/api/verifications");
  $("#verifyHistory").innerHTML = list.map((v) => `<details class="card"><summary>${new Date(v.createdAt).toLocaleString("vi-VN")} — ${esc((v.summary || v.input || "").slice(0, 90))}</summary>${verificationHtml(v)}</details>`).join("");
}

// ---------- Agenda ----------
async function loadAgenda() {
  const items = await api("/api/agenda");
  const future = items.filter((a) => !a.date || a.date >= state.today);
  const past = items.filter((a) => a.date && a.date < state.today);
  $("#agendaList").innerHTML =
    (future.map((a) => agendaItemHtml(a, true)).join("") || `<p class="muted">Lịch trống.</p>`) +
    (past.length ? `<details><summary>Đã qua (${past.length})</summary>${past.map((a) => agendaItemHtml(a, true)).join("")}</details>` : "");
}
$("#agendaList").addEventListener("click", async (e) => {
  const act = e.target.dataset.act;
  if (!act) return;
  const id = e.target.closest(".item").dataset.id;
  if (act === "del") await api(`/api/agenda/${id}`, { method: "DELETE" });
  if (act === "done") {
    const item = (await api("/api/agenda")).find((a) => a.id === id);
    await api(`/api/agenda/${id}`, { method: "PATCH", json: { done: !item.done } });
  }
  loadAgenda();
});
$("#agendaForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  await api("/api/agenda", { json: { details: "", requires_presence: "inconnu", ...data } });
  e.target.reset();
  loadAgenda();
});
$("#planBtn").addEventListener("click", (e) =>
  busy(e.currentTarget, "Đang lập kế hoạch…", async () => {
    const r = await api("/api/revision-plan", { json: {} });
    $("#plan").classList.remove("hidden");
    $("#plan").innerHTML = md(r.markdown);
  }));

// ---------- Học (gia sư Feynman) ----------
async function loadCourses() {
  state.courses = await api("/api/courses");
  $("#courseList").innerHTML = state.courses
    .map((c) => `<div class="course ${state.current?.id === c.id ? "active" : ""}" data-id="${c.id}"><strong>${esc(c.title)}</strong><div class="small muted">${c.files.length} file · ${c.cards} thẻ</div></div>`)
    .join("") || `<p class="muted small">Chưa có tài liệu.</p>`;
  $("#newCourseBox").open = !state.courses.length;
  if (state.current) openCourse(state.current.id);
}
$("#courseList").addEventListener("click", (e) => {
  const el = e.target.closest(".course");
  if (el) openCourse(el.dataset.id);
});

function bubble(role, html) {
  const div = document.createElement("div");
  div.className = "msg " + role;
  div.innerHTML = html;
  $("#chatLog").appendChild(div);
  div.scrollIntoView({ block: "end", behavior: "smooth" });
  return div;
}

function openCourse(id) {
  const c = state.courses.find((x) => x.id === id);
  if (!c) return;
  state.current = c;
  $$(".course").forEach((el) => el.classList.toggle("active", el.dataset.id === id));
  $("#chatPane").classList.remove("hidden");
  $("#studyEmpty").classList.add("hidden");
  $("#courseTitle").textContent = c.title;
  $("#examEdit").innerHTML = `🎯 Nội dung thi: <span>${esc(c.examContent || "chưa nhập")}</span> <button class="link" id="editExam">sửa</button> · ${c.files.map((f) => esc(f.name)).join(", ")}`;
  $("#chatLog").innerHTML = "";
  for (const m of c.transcript) bubble(m.role, m.role === "user" ? esc(m.text) : md(m.text) + sourcesHtml(m.sources));
}

$("#examEdit").addEventListener("click", async (e) => {
  if (e.target.id !== "editExam") return;
  const v = prompt("Nội dung thi của môn này (chương, phần, dạng bài…)", state.current.examContent || "");
  if (v === null) return;
  await api(`/api/courses/${state.current.id}`, { method: "PATCH", json: { examContent: v } });
  await loadCourses();
});

$("#courseForm").addEventListener("submit", (e) => {
  e.preventDefault();
  busy(e.submitter, "Đang tải lên…", async () => {
    const c = await api("/api/courses", { method: "POST", body: new FormData(e.target) });
    e.target.reset();
    state.current = c;
    await loadCourses();
  });
});

$("#resetChat").addEventListener("click", async () => {
  if (!confirm("Bắt đầu buổi học mới? (cuộc trò chuyện hiện tại sẽ bị xoá, flashcards vẫn giữ)")) return;
  await api(`/api/courses/${state.current.id}/reset`, { method: "POST" });
  await loadCourses();
});

$("#mkCards").addEventListener("click", (e) =>
  busy(e.currentTarget, "Đang tạo…", async () => {
    const focus = prompt("Muốn tập trung vào phần nào? (để trống = toàn bộ tài liệu)", "");
    if (focus === null) return;
    const cards = await api(`/api/courses/${state.current.id}/flashcards`, { json: { focus } });
    toast(`🃏 Đã tạo ${cards.length} flashcards. Vào tab "Ôn tập" để học.`);
    loadCourses();
  }));

function grammarHtml(g) {
  if (!g || !g.is_french || !g.errors?.length) return "";
  return `<div class="grammar"><b>✏️ Petit point français</b> ${esc(g.encouragement)}<ul>${g.errors
    .map((x) => `<li><s>${esc(x.original)}</s> → <b>${esc(x.correction)}</b><br><span class="small">📘 ${esc(x.rule)}<br>🇻🇳 ${esc(x.explication_vi)}<br>💡 ${esc(x.astuce)}</span></li>`)
    .join("")}</ul><span class="small muted">Đã thêm vào bộ thẻ "Ngữ pháp tiếng Pháp" để ôn lại.</span></div>`;
}

async function sendChat(message) {
  if (!state.current || !message.trim()) return;
  const feynman = $("#feynmanMode").checked;
  const full = feynman ? "[EXPLICATION FEYNMAN] " + message : message;
  bubble("user", esc(message) + (feynman ? ' <span class="tag">Feynman</span>' : ""));
  const out = bubble("assistant", '<span class="spin"></span> <span class="muted small">đang suy nghĩ / tra cứu…</span>');
  $("#sendBtn").disabled = true;
  $("#chatInput").value = "";
  $("#feynmanMode").checked = false;
  let text = "";
  try {
    const r = await fetch(`/api/courses/${state.current.id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: full, lang: $("#viToggle").checked ? "vi" : "fr" }),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let raf = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const ev = chunk.match(/^event: (.+)$/m)?.[1];
        const data = JSON.parse(chunk.match(/^data: (.*)$/m)?.[1] || "null");
        if (ev === "text") {
          text += data;
          if (!raf) raf = requestAnimationFrame(() => { out.innerHTML = md(text); raf = 0; });
        } else if (ev === "grammar") {
          const g = grammarHtml(data);
          if (g) bubble("grammar-msg", g);
        } else if (ev === "done") {
          cancelAnimationFrame(raf);
          out.innerHTML = md(text) + sourcesHtml(data.sources);
        } else if (ev === "error") {
          throw new Error(data.error);
        }
      }
    }
  } catch (e) {
    out.innerHTML = (text ? md(text) : "") + `<p class="bad">⚠️ ${esc(e.message)}</p>`;
  } finally {
    $("#sendBtn").disabled = false;
  }
}
$("#chatForm").addEventListener("submit", (e) => {
  e.preventDefault();
  sendChat($("#chatInput").value);
});
$("#chatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChat($("#chatInput").value);
  }
});
$$(".quick button").forEach((b) => b.addEventListener("click", () => sendChat(b.dataset.q)));
$("#viToggle").addEventListener("change", () => {
  try { localStorage.setItem("vi", $("#viToggle").checked ? "1" : ""); } catch {}
});
try { $("#viToggle").checked = localStorage.getItem("vi") === "1"; } catch {}

// ---------- Ôn tập (flashcards) ----------
const review = { queue: [], card: null, deck: null };
async function loadDecks() {
  const { decks } = await api("/api/cards");
  $("#decks").innerHTML = decks
    .map((d) => `<button class="deck" data-deck="${d.id}" ${d.total ? "" : "disabled"}>${esc(d.title)}<br><span class="small">${d.due} cần ôn / ${d.total}</span></button>`)
    .join("");
}
$("#decks").addEventListener("click", async (e) => {
  const b = e.target.closest(".deck");
  if (!b) return;
  review.deck = b.dataset.deck;
  review.queue = (await api(`/api/cards?deck=${encodeURIComponent(review.deck)}`)).due.sort(() => Math.random() - 0.5);
  nextCard();
});
function nextCard() {
  review.card = review.queue.shift();
  const has = Boolean(review.card);
  $("#reviewBox").classList.toggle("hidden", !has);
  $("#reviewDone").classList.toggle("hidden", has);
  if (!has) {
    $("#reviewDone").textContent = "🎉 Hết thẻ cần ôn trong bộ này. Quay lại vào ngày mai nhé!";
    loadDecks();
    return;
  }
  $("#reviewMeta").textContent = `Còn ${review.queue.length} thẻ · đã ôn ${review.card.reps} lần`;
  $("#cardFront").innerHTML = md(review.card.front);
  $("#cardBack").innerHTML = md(review.card.back) + (review.card.mnemonic ? `<p class="mnemo">💡 ${md(review.card.mnemonic)}</p>` : "");
  $("#cardBack").classList.add("hidden");
  $("#gradeRow").classList.add("hidden");
  $("#revealRow").classList.remove("hidden");
}
$("#revealBtn").addEventListener("click", () => {
  $("#cardBack").classList.remove("hidden");
  $("#gradeRow").classList.remove("hidden");
  $("#revealRow").classList.add("hidden");
});
$$("#gradeRow button").forEach((b) =>
  b.addEventListener("click", async () => {
    const grade = Number(b.dataset.g);
    const updated = await api(`/api/cards/${review.card.id}/review`, { json: { grade } });
    if (grade < 3) review.queue.push(updated); // quên → gặp lại cuối phiên
    nextCard();
  }));

// ---------- Cài đặt ----------
const LIST_FIELDS = ["watchSources", "mailFilters", "courses"];
async function loadSettings() {
  const s = await api("/api/settings");
  const f = $("#settingsForm");
  for (const [k, v] of Object.entries(s)) if (f.elements[k]) f.elements[k].value = Array.isArray(v) ? v.join("\n") : v;
  const st = await api("/api/status");
  $("#sysStatus").innerHTML = `📬 Mail: ${st.mailConfigured ? "✅ đã kết nối" : "❌ chưa cấu hình"}<br>🔔 ntfy: ${st.notifications.ntfy ? "✅" : "❌"} · Email: ${st.notifications.email ? "✅" : "❌"}<br>⏰ Bản tin tự động: <code>${esc(st.digestCron)}</code> (giờ Paris)`;
}
$("#settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  for (const k of LIST_FIELDS) data[k] = data[k].split("\n").map((x) => x.trim()).filter(Boolean);
  await api("/api/settings", { method: "PUT", json: data });
  toast("✅ Đã lưu");
});

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
loadHome().catch((e) => toast("⚠️ " + e.message));
