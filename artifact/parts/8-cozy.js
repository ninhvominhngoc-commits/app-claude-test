
// ================= cozy: bé mèo biết nói, cài đặt, âm thanh, thống kê =================
const PREF_DEFAULT = { name: "Elec", sfx: true, wake: true, strict: false, dur: 25 };
const prefs = () => ({ ...PREF_DEFAULT, ...(state.prefs || {}) });

// --- âm thanh nhỏ (không có nhạc nền) ---
let actx = null;
function audioCtx() {
  try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; actx ||= new AC(); if (actx.state === "suspended") actx.resume(); return actx; } catch { return null; }
}
document.addEventListener("pointerdown", () => { if (prefs().sfx) audioCtx(); }, { capture: true });
const TUNES = {
  pop: [[880, 0, 0.12]], flip: [[520, 0, 0.08], [780, 0.06, 0.1]], tick: [[1200, 0, 0.05]],
  chime: [[660, 0, 0.5], [880, 0.18, 0.5], [1320, 0.36, 0.6]],
  unlock: [[523, 0, 0.25], [659, 0.1, 0.25], [784, 0.2, 0.25], [1047, 0.3, 0.5]],
  fail: [[392, 0, 0.3], [311, 0.18, 0.45]],
};
function sfx(kind) {
  if (!prefs().sfx || !actx) return;
  try {
    const now = actx.currentTime;
    for (const [fq, d, len] of TUNES[kind] || []) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = kind === "fail" ? "triangle" : "sine"; o.frequency.value = fq;
      g.gain.setValueAtTime(0.0001, now + d); g.gain.exponentialRampToValueAtTime(0.18, now + d + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, now + d + len);
      o.connect(g).connect(actx.destination); o.start(now + d); o.stop(now + d + len + 0.05);
    }
  } catch {}
}

// --- cảnh trời ở Hôm nay ---
let lineIdx = 0;
function buddyLines() {
  const h = parisHour(), due = totalDue(), d = state.stats.days[todayISO()] || {};
  const soon = upcoming(3).filter((a) => a.type === "exam" || a.type === "deadline")[0];
  const L = [];
  if (state.focus?.endAt) L.push("Đang tập trung nè, cố lên! Mình ngồi học cùng bạn đây.");
  if (h >= 23 || h < 5) L.push("Khuya rồi đó… ngủ sớm, mai mình học tiếp nha.");
  if (d.gold) L.push("Hôm nay hoàn hảo luôn! Tự hào về bạn ghê.");
  if (soon) L.push(`${soon.type === "exam" ? "Sắp thi" : "Sắp tới hạn"} “${soon.title}” (${countdown(soon.date)}). Mình ôn cùng nhau nha!`);
  if (due) L.push(`Có ${due} thẻ đang chờ bạn ôn đó~`);
  if (!d.f) L.push(h < 11 ? "Bắt đầu ngày mới bằng 25 phút tập trung nhé? Ghi mục tiêu phiên là làm nhanh hơn đó!" : "Hôm nay mình chưa học phiên nào… tập trung 25 phút không?");
  L.push("Mỗi phút tập trung là 2 Tinh thể ✦ để trang trí phòng đó!", "Học kiểu Feynman: giảng lại cho mình nghe đi, meo!", "Nhớ uống nước nha.", "Viết tiếng Pháp sai cũng không sao, mình sửa cho!");
  const g = greeting();
  if (g.mood !== "sleep") L[0] = `${g.pre} ${g.word}! ${L[0]}`;
  return L;
}
function updateClock() {
  const el = $("#hClock"); if (!el) return;
  const t = todayISO();
  el.textContent = `${hhmm(Date.now())} · ${wdOf(t)} ${+t.slice(8)}/${+t.slice(5, 7)}`;
}
function renderHero() {
  const p = prefs(), g = greeting();
  $("#buddyName").textContent = p.name;
  updateClock();
  const L = buddyLines();
  $("#hBubble").textContent = L[lineIdx % L.length];
  void g;
  const f = state.focus?.endAt ? state.focus : null;
  $("#wFocus").classList.toggle("on", !!f);
  $("#wFocusLabel").textContent = f ? "Đang tập trung" : "Tập trung";
  $("#wFocus [data-left]").textContent = f ? fmtLeft(f.endAt - Date.now()) : `${p.dur}:00 · +${p.dur * 2} ✦`;
  renderRoom();
}
setInterval(updateClock, 20000);

// --- cài đặt ---
function openSettings() {
  const p = prefs();
  openSheet({ title: "Cài đặt", html: `
    <label class="field"><span>Tên bé mèo</span><input type="text" id="stName" maxlength="20" autocomplete="off"></label>
    <div class="set-grid">
      <label class="set-card">${icon("volume")}Âm thanh<input type="checkbox" class="switch" role="switch" id="stSfx" ${p.sfx ? "checked" : ""}></label>
      <label class="set-card peach">${icon("sun")}Giữ màn hình sáng<input type="checkbox" class="switch" role="switch" id="stWake" ${p.wake ? "checked" : ""}></label>
      <label class="set-card sky">${icon("lock")}Tập trung nghiêm<input type="checkbox" class="switch" role="switch" id="stStrict" ${p.strict ? "checked" : ""}></label>
    </div>
    <p class="small muted">Âm thanh chỉ là tiếng “ting” nhỏ khi lật thẻ, xong phiên, mở khoá nguyên tố. Tập trung nghiêm: khoá màn hình thì không sao; nếu rời app quá 15 giây, khi quay lại bé mèo sẽ hỏi bạn vừa khoá màn hình hay mở app khác (mở app khác thì phiên bị huỷ).</p>
    <div class="field"><span>Thời gian tập trung mặc định</span><div class="pills" id="stDur">${DURS.map((d) => `<button type="button" data-d="${d}" aria-pressed="${d === p.dur}">${d} phút</button>`).join("")}</div></div>
    <button class="btn primary block" id="stSave">Lưu</button>`,
    onMount: (el) => {
      $("#stName", el).value = p.name;
      let dur = p.dur;
      $$("#stDur button", el).forEach((b) => b.addEventListener("click", () => { dur = +b.dataset.d; $$("#stDur button", el).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
      $("#stSave", el).addEventListener("click", () => {
        state.prefs = { name: $("#stName", el).value.trim().slice(0, 20) || PREF_DEFAULT.name, sfx: $("#stSfx", el).checked, wake: $("#stWake", el).checked, strict: $("#stStrict", el).checked, dur };
        save("prefs", state.prefs);
        focusPick.dur = dur;
        if (state.prefs.sfx) { audioCtx(); sfx("pop"); }
        closeSheet(); render(); toast("Đã lưu cài đặt");
      });
    } });
}

// --- tập trung nghiêm: rời app quá 15 giây thì phiên bị huỷ ---
let hiddenAt = 0;
document.addEventListener("visibilitychange", () => {
  if (!state.focus?.endAt || !prefs().strict) { hiddenAt = 0; return; }
  if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
  const away = hiddenAt ? Date.now() - hiddenAt : 0;
  hiddenAt = 0;
  if (away > 15000 && Date.now() < state.focus.endAt) askAway(Math.round(away / 1000));
});
// Trên iPhone, trang web không phân biệt được "khoá màn hình" với "mở app khác", nên hỏi thẳng bạn
function askAway(sec) {
  sfx("tick");
  openSheet({ title: "Bạn vừa đi đâu thế?", html: `<div class="reward"><div style="width:110px">${kitten("think")}</div>
    <p>Bạn rời app <b>${sec} giây</b>. Khoá màn hình để làm bài trên giấy thì vẫn tính là đang tập trung.</p>
    <p class="muted small">Nếu lỡ mở app khác (mạng xã hội, game…), hãy thành thật nhé: phiên này sẽ dừng lại.</p>
    <div class="two" style="width:100%"><button class="btn" id="awOther">Mình mở app khác</button><button class="btn primary" id="awLock">Mình chỉ khoá màn hình</button></div></div>`,
    onMount: (el) => {
      $("#awLock", el).addEventListener("click", () => { closeSheet(); toast(`${prefs().name} vẫn đang làm việc cùng bạn!`); });
      $("#awOther", el).addEventListener("click", () => { closeSheet(); failFocus(sec); });
    } });
}
function failFocus(sec) {
  state.focus = {}; save("focus", {});
  try { wakeLock?.release?.(); } catch {} wakeLock = null;
  sfx("fail");
  if (state.view === "focus") renderFocus(); else render();
  openSheet({ title: `${prefs().name} chạy mất rồi!`, html: `<div class="reward">${mascot("lg", "sleep")}
    <p>Bạn rời app ${sec} giây nên phiên tập trung bị huỷ (đang bật chế độ Tập trung nghiêm).</p>
    <p class="muted small">Không sao cả, thử lại một phiên ngắn 15 phút nhé?</p>
    <div class="two" style="width:100%"><button class="btn" data-close>Để sau</button><button class="btn primary" data-act="focus-open">Thử lại</button></div></div>` });
}

// --- thống kê ---
const stv = { tab: "sum", off: 0 };
const TABS_ST = [["sum", "Tổng quan"], ["day", "Ngày"], ["week", "Tuần"], ["month", "Tháng"], ["year", "Năm"]];
function fmtMin(m) { m = Math.round(m); if (m < 60) return `${m} phút`; const h = Math.floor(m / 60), r = m % 60; return r ? `${h} giờ ${r} phút` : `${h} giờ`; }
const shortMin = (m) => (m < 60 ? `${Math.round(m)}p` : `${Math.floor(m / 60)}g${Math.round(m % 60) ? String(Math.round(m % 60)).padStart(2, "0") : ""}`);
const parisParts = (ts) => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date(ts)).map((x) => [x.type, x.value])); return { date: `${p.year}-${p.month}-${p.day}`, h: +p.hour, mi: +p.minute }; };
function dayMinutes() { // phút tập trung theo ngày: từ nhật ký phiên, bù bằng thống kê ngày cũ
  const map = {};
  for (const s of state.sessions) { const d = parisParts(s.s).date; map[d] = (map[d] || 0) + s.m; }
  for (const [d, x] of Object.entries(state.stats.days)) if ((x.f || 0) > (map[d] || 0)) map[d] = x.f;
  return map;
}
function periodOf(tab, off) {
  const t = todayISO(), WDL = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  if (tab === "day") {
    const d = addDays(t, -off);
    return { from: d, to: d, label: off === 0 ? "Hôm nay" : off === 1 ? "Hôm qua" : longDate(d), buckets: Array.from({ length: 24 }, (_, h) => ({ key: h, label: `${h}h`, axis: h % 6 === 0 || h === 23 ? String(h) : "" })) };
  }
  if (tab === "week") {
    const mon = addDays(t, -((new Date(t + "T12:00:00Z").getUTCDay() + 6) % 7) - 7 * off);
    const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
    return { from: days[0], to: days[6], label: `${+days[0].slice(8)}/${+days[0].slice(5, 7)} – ${+days[6].slice(8)}/${+days[6].slice(5, 7)}`, buckets: days.map((d, i) => ({ key: d, label: `${WDL[i]} ${+d.slice(8)}/${+d.slice(5, 7)}`, axis: WDL[i] })) };
  }
  if (tab === "month") {
    const base = new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1 - off, 1));
    const y = base.getUTCFullYear(), m = base.getUTCMonth(), n = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const days = Array.from({ length: n }, (_, i) => `${y}-${String(m + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`);
    return { from: days[0], to: days[n - 1], label: `Tháng ${m + 1}/${y}`, buckets: days.map((d, i) => ({ key: d, label: `${i + 1}/${m + 1}`, axis: [1, 8, 15, 22, 29].includes(i + 1) ? String(i + 1) : "" })) };
  }
  const y = +t.slice(0, 4) - off;
  return { from: `${y}-01-01`, to: `${y}-12-31`, label: `Năm ${y}`, buckets: Array.from({ length: 12 }, (_, i) => ({ key: `${y}-${String(i + 1).padStart(2, "0")}`, label: `Tháng ${i + 1}`, axis: String(i + 1) })) };
}
function bucketValues(tab, per) {
  if (tab === "day") {
    const v = Array(24).fill(0);
    for (const s of state.sessions) {
      let ts = s.s, left = s.m;
      while (left > 0) {
        const p = parisParts(ts); if (p.date !== per.from) { if (p.date > per.from) break; ts += 60000; left--; continue; }
        const take = Math.min(left, 60 - p.mi); v[p.h] += take; left -= take; ts += take * 60000;
      }
    }
    return v;
  }
  const dm = dayMinutes();
  if (tab === "year") return per.buckets.map((b) => Object.entries(dm).filter(([d]) => d.startsWith(b.key)).reduce((n, [, m]) => n + m, 0));
  return per.buckets.map((b) => dm[b.key] || 0);
}
// trục y: bước tròn (5, 10, 15, 30 phút, 1 giờ…) và tối đa 4 vạch
function axisOf(v) {
  const step = [5, 10, 15, 30, 60, 90, 120, 180, 240, 300, 600, 900, 1200, 1800, 3600, 6000].find((st) => Math.ceil(v / st) <= 4) || Math.ceil(v / 4 / 600) * 600;
  const n = Math.max(1, Math.ceil(v / step));
  return { max: n * step, n };
}
function barChart(values, buckets) {
  const W = Math.max(260, ($("#stMain").clientWidth || 340) - 36), H = 190, L = 34, B = 22, T = 8;
  const ax = axisOf(Math.max(1, ...values)), max = ax.max, band = (W - L) / values.length, bw = Math.max(3, Math.min(26, band * 0.64));
  const y = (v) => T + (H - T - B) * (1 - v / max);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Biểu đồ phút tập trung">`;
  for (let k = 0; k <= ax.n; k++) { const v = (max / ax.n) * k, yy = y(v); svg += `<line class="gl" x1="${L}" x2="${W}" y1="${yy}" y2="${yy}"/><text class="ax" x="${L - 6}" y="${yy + 3.5}" text-anchor="end">${v ? shortMin(v) : "0"}</text>`; }
  values.forEach((v, i) => {
    const x = L + band * i + (band - bw) / 2, yy = y(v), h = H - B - yy, r = Math.min(4, bw / 2, h);
    const d = v > 0 ? `M${x},${H - B} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + bw - r} Q${x + bw},${yy} ${x + bw},${yy + r} V${H - B} Z` : `M${x},${H - B - 3} h${bw} v3 h${-bw} Z`;
    svg += `<rect class="hit" data-i="${i}" x="${L + band * i}" y="${T}" width="${band}" height="${H - T}"/><path class="bar ${v > 0 ? "" : "zero"}" d="${d}"/>`;
    if (buckets[i].axis) svg += `<text class="ax" x="${L + band * i + band / 2}" y="${H - 6}" text-anchor="middle">${esc(buckets[i].axis)}</text>`;
  });
  return svg + "</svg>";
}
function areaChart(points) { // phút tích luỹ theo ngày
  const W = Math.max(260, ($("#stMain").clientWidth || 340) - 36), H = 170, L = 40, B = 22, T = 8;
  const ax = axisOf(Math.max(1, ...points.map((p) => p.v))), max = ax.max, n = points.length;
  const x = (i) => L + (W - L) * (n === 1 ? 0.5 : i / (n - 1)), y = (v) => T + (H - T - B) * (1 - v / max);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tổng thời gian tập trung tích luỹ">`;
  for (let k = 0; k <= ax.n; k++) { const v = (max / ax.n) * k; svg += `<line class="gl" x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 6}" y="${y(v) + 3.5}" text-anchor="end">${v ? shortMin(v) : "0"}</text>`; }
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  svg += `<path class="area" d="${line} L${x(n - 1).toFixed(1)},${H - B} L${x(0).toFixed(1)},${H - B} Z"/><path class="ln" d="${line}"/>`;
  points.forEach((p, i) => { svg += `<rect class="hit" data-i="${i}" x="${x(i) - (W - L) / Math.max(1, n - 1) / 2}" y="${T}" width="${(W - L) / Math.max(1, n - 1)}" height="${H - T}"/>`; });
  svg += `<text class="ax" x="${L}" y="${H - 6}">${esc(points[0].label)}</text><text class="ax" x="${W}" y="${H - 6}" text-anchor="end">${esc(points[n - 1].label)}</text>`;
  return svg + "</svg>";
}
function bestStreak() {
  const days = Object.keys(state.stats.days).filter(activeOn).sort();
  let best = 0, run = 0, prev = "";
  for (const d of days) { run = prev && addDays(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return best;
}
function renderStats() {
  $("#stTabs").innerHTML = TABS_ST.map(([k, l]) => `<button role="tab" data-st="${k}" aria-selected="${k === stv.tab}">${l}</button>`).join("");
  const main = $("#stMain");
  $("#stPeriod").hidden = stv.tab === "sum";
  let values, buckets, total, sessions;
  if (stv.tab === "sum") {
    const dm = dayMinutes(), days = Object.keys(dm).filter((d) => dm[d] > 0).sort();
    total = Object.values(dm).reduce((a, b) => a + b, 0); sessions = state.sessions.length;
    const start = !days[0] || days[0] > addDays(todayISO(), -6) ? addDays(todayISO(), -6) : days[0] < addDays(todayISO(), -59) ? addDays(todayISO(), -59) : days[0];
    let acc = Object.entries(dm).filter(([d]) => d < start).reduce((n, [, m]) => n + m, 0);
    const pts = []; for (let d = start; d <= todayISO(); d = addDays(d, 1)) { acc += dm[d] || 0; pts.push({ v: acc, label: `${+d.slice(8)}/${+d.slice(5, 7)}`, key: d }); }
    main.innerHTML = `<span class="label">Tổng quan</span><div class="big-stat"><b>${esc(fmtMin(total))}</b><span class="muted">tập trung · ${sessions} phiên</span></div><div class="chart" id="stChart">${areaChart(pts)}</div>`;
    main._points = pts.map((p) => ({ label: p.label, text: `tổng ${fmtMin(p.v)}` }));
    const allR = Object.values(state.stats.days).reduce((n, x) => n + (x.r || 0), 0);
    const bestDay = Math.max(0, ...Object.values(dm)), longest = Math.max(0, ...state.sessions.map((s) => s.m));
    const showed = Object.keys(state.stats.days).filter(activeOn).length;
    $("#stRec").hidden = false;
    $("#stRec").innerHTML = `<div class="rec"><b>${esc(fmtMin(bestDay))}</b><span>Ngày tốt nhất</span></div><div class="rec mint"><b>${esc(fmtMin(longest))}</b><span>Phiên dài nhất</span></div>
      <div class="rec sky"><b>${showed}</b><span>Ngày có học</span></div><div class="rec peach"><b>${bestStreak()}</b><span>Chuỗi ngày dài nhất</span></div>
      <div class="rec" style="grid-column:1/-1"><b>${allR}</b><span>Thẻ đã ôn</span></div>`;
    renderSubj(null);
    return;
  }
  $("#stRec").hidden = true;
  const per = periodOf(stv.tab, stv.off);
  $("#stLabel").textContent = per.label;
  $("#stNext").disabled = stv.off === 0;
  values = bucketValues(stv.tab, per); buckets = per.buckets;
  total = values.reduce((a, b) => a + b, 0);
  sessions = state.sessions.filter((s) => { const d = parisParts(s.s).date; return d >= per.from && d <= per.to; }).length;
  main.innerHTML = `<span class="label">${esc(TABS_ST.find((x) => x[0] === stv.tab)[1])}</span><div class="big-stat"><b>${esc(fmtMin(total))}</b><span class="muted">tập trung · ${sessions} phiên</span></div>
    <div class="chart" id="stChart">${barChart(values, buckets)}</div>
    <details><summary class="small muted">Xem dạng bảng</summary><table class="data-table"><tbody>${values.map((v, i) => (v ? `<tr><td>${esc(buckets[i].label)}</td><td>${esc(fmtMin(v))}</td></tr>` : "")).join("") || `<tr><td>Chưa có phiên nào</td><td></td></tr>`}</tbody></table></details>`;
  main._points = values.map((v, i) => ({ label: buckets[i].label, text: fmtMin(v) }));
  renderSubj(per);
}
function renderSubj(per) {
  const by = {};
  for (const s of state.sessions) { const d = parisParts(s.s).date; if (!per || (d >= per.from && d <= per.to)) by[s.subj] = (by[s.subj] || 0) + s.m; }
  const rows = Object.entries(by).sort((a, b) => b[1] - a[1]), max = rows[0]?.[1] || 1;
  $("#stSubj").innerHTML = `<span class="label">Theo môn</span>` + (rows.length ? `<ul class="subj-bars">${rows.map(([id, m]) => `<li><span>${esc(subjOf(id).name)}</span><span>${esc(fmtMin(m))}</span><span class="trk"><i style="width:${Math.max(4, Math.round((m / max) * 100))}%"></i></span></li>`).join("")}</ul>`
    : `<p class="muted small">Chưa có phiên tập trung nào trong khoảng này. Bấm “Tập trung” ở màn Hôm nay để bắt đầu.</p>`);
}
function showTip(target) {
  const main = $("#stMain"), chart = $("#stChart"); if (!chart || !main._points) return;
  const i = +target.dataset.i, p = main._points[i]; if (!p) return;
  $$("#stChart .hit.on").forEach((h) => h.classList.remove("on")); target.classList.add("on");
  const r = target.getBoundingClientRect(), c = chart.getBoundingClientRect();
  let tip = $("#stTip"); if (!tip) { tip = document.createElement("div"); tip.id = "stTip"; tip.className = "tip"; chart.appendChild(tip); }
  tip.textContent = `${p.label}: ${p.text}`;
  tip.style.left = clamp(r.left - c.left + r.width / 2, 50, c.width - 50) + "px"; tip.style.top = "0px";
}
