// ================= Hôm nay: một việc nên làm ngay, 3 mục tiêu ngày, nút Tập trung =================
// Không có trò chơi: app chỉ chọn giúp bạn việc quan trọng nhất lúc này và cho thấy hôm nay đã làm được gì.
function hideSplash() {
  const s = $("#splash"); if (!s || s.classList.contains("out")) return;
  s.classList.add("out"); setTimeout(() => { s.hidden = true; }, 380);
}
setTimeout(hideSplash, 4500); // phòng khi dữ liệu tải quá lâu

// việc quan trọng nhất lúc này: phiên đang chạy → thi/hạn nộp trong 3 ngày → thẻ đến hạn → tập trung → luyện
function nowAction() {
  if (state.focus?.endAt) return null; // đang tập trung: nút lớn đã hiện giờ còn lại
  const soon = upcoming(3).find((a) => a.type === "exam" || a.type === "deadline");
  if (soon) return { k: "soon", ic: soon.type === "exam" ? "pencil" : "calendar", t: `${soon.type === "exam" ? "Thi" : "Hạn nộp"} ${countdown(soon.date)}: ${soon.title}`,
    s: soon.guide ? "Đã có hướng dẫn từng bước, làm tiếp thôi" : "Chia nhỏ việc này rồi bắt đầu phần đầu tiên", acts: [["ev-guide", "Hướng dẫn", "", soon.id], ["focus-task", "Tập trung làm", "primary", soon.id]] };
  const due = totalDue();
  if (due) return { k: "review", ic: "cards", t: `Ôn ${due} thẻ đến hạn`, s: `Khoảng ${Math.max(2, Math.round(due * 0.4))} phút. Ôn đúng hạn thì nhớ lâu hơn hẳn đọc lại bài.`, acts: [["review-all", "Ôn ngay", "primary"]] };
  const q = quests(), p = prefs();
  if (q[0].p < 1) { const s = lsGet("focusSubj") ? lastSubject() : null; return { k: "focus", ic: "play", t: `Tập trung ${p.dur} phút`, s: s ? `Môn gần nhất: ${s.name}. Ghi trước mục tiêu phiên để làm nhanh hơn.` : "Ghi trước mục tiêu phiên để làm nhanh hơn.", acts: [["focus-open", "Bắt đầu", "primary"]] }; }
  if (q[2].p < 1) return { k: "practice", ic: "pencil", t: "Luyện 1 bài", s: "Làm một bài đề tương tự, hoặc tự giảng lại một khái niệm cho gia sư chấm.", acts: [["go-drill", "Luyện đề", "primary"]] };
  return { k: "rest", ic: "check", t: "Xong 3 mục tiêu hôm nay", s: "Nghỉ ngơi cho tốt, mai học tiếp nhé.", acts: [] };
}
const goalItems = (q) => q.map((x) => `<li><span class="qdot ${x.p >= 1 ? "done" : ""}" style="--p:${x.p.toFixed(2)};--chart:${x.col}">${x.p >= 1 ? icon("check") : ""}</span><span>${esc(x.t)}<small>${esc(x.v)}</small></span>${x.p < 1 && x.act ? `<button class="btn sm soft" data-act="${x.act[0]}">${x.act[1]}</button>` : ""}</li>`).join("");
function updateClock() {
  const el = $("#hClock"); if (!el) return;
  const t = todayISO();
  el.textContent = `${hhmm(Date.now())} · ${wdOf(t)} ${+t.slice(8)}/${+t.slice(5, 7)}`;
}
setInterval(updateClock, 20000);
function renderHero() {
  const g = greeting(), p = prefs();
  $("#hHello").textContent = g.mood === "sleep" ? "Khuya rồi, ngủ sớm nha" : `${g.pre} ${g.word}!`;
  updateClock();
  const n = nowAction(), box = $("#hNow");
  box.hidden = !n;
  if (n) box.className = "now-card k-" + n.k;
  if (n) box.innerHTML = `<span class="now-ic">${icon(n.ic)}</span><div class="now-txt"><span class="label">Việc nên làm bây giờ</span><strong>${esc(n.t)}</strong><span class="small">${esc(n.s)}</span></div>`
    + (n.acts.length ? `<div class="now-acts">${n.acts.map(([a, l, c, id]) => `<button class="btn sm ${c}" data-act="${a}"${id ? ` data-id="${esc(id)}"` : ""}>${esc(l)}</button>`).join("")}</div>` : "");
  // đồng hồ LCD: chưa chạy thì hiện số phút đã chọn, đang chạy thì đếm ngược
  const f = state.focus?.endAt ? state.focus : null, dur = focusPick.dur || p.dur;
  if (!focusPick.subject || !subjects().some((s) => s.id === focusPick.subject)) focusPick.subject = lastSubject().id;
  const shown = f ? fmtLeft(f.endAt - Date.now()) : `${dur}:00`;
  $("#wFocus").classList.toggle("on", !!f);
  $("#wFocusLabel").textContent = f ? `Đang tập trung · ${subjOf(f.subject).name}` : `Tập trung · ${subjOf(focusPick.subject).name}`;
  $("#wFocusState").textContent = f ? "Đang tập trung" : "Tập trung";
  $("#wFocus [data-left]").textContent = shown;
  $("#wLcd").innerHTML = lcdSvg(shown);
  $("#hStepper").hidden = !!f; $("#hCustom").hidden = !!f;
  $("#hDur").textContent = `${dur} phút`;
  $("#hStartTxt").textContent = f ? "Mở đồng hồ" : "Bắt đầu";
  const day = state.stats.days[todayISO()] || {}, fm = day.f || 0;
  $("#hStats").innerHTML = `<span><small>Tập trung</small><b>${fm < 60 ? `${fm}p` : `${Math.floor(fm / 60)}g${String(fm % 60).padStart(2, "0")}`}</b></span><span><small>Thẻ đến hạn</small><b>${totalDue()}</b></span><span><small>Chuỗi ngày</small><b>${streak()}</b></span>`;
  const q = quests(), done = q.filter((x) => x.p >= 1).length;
  $("#hGoals").innerHTML = `<div class="goals-head">${ringsSvg(q, 52)}<div><span class="label">Mục tiêu hôm nay</span><strong id="hGoalsTxt">${done}/3 đã xong</strong></div>
    <button class="btn sm ghost" data-act="quests" aria-label="Chuỗi ${streak()} ngày, xem lịch học">${icon("flame")} ${streak()} ngày</button></div><ul class="quests">${goalItems(q)}</ul>`;
}

// một chạm là tập trung ngay: môn gần nhất, số phút đang chọn, mục tiêu đã điền (nếu có)
function startNow() {
  if (state.focus?.endAt) return openFocus();
  if (!focusPick.subject || !subjects().some((s) => s.id === focusPick.subject)) focusPick.subject = lastSubject().id;
  if (!focusPick.dur) focusPick.dur = prefs().dur;
  $("#fGoal").value = focusPick.goal || "";
  startFocus(); show("focus");
}
function stepDur(d) { focusPick.dur = clamp((focusPick.dur || prefs().dur) + d, 5, 180); sfx("tick"); renderHero(); }

// --- bảng mục tiêu & chuỗi ngày ---
function openQuests() {
  const q = quests(), n = streak(), best = bestStreak(), t = todayISO();
  const first = t.slice(0, 8) + "01", pad = (new Date(first + "T12:00:00Z").getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7), 0)).getUTCDate();
  let heat = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((x) => `<span>${x}</span>`).join("") + '<i class="pad"></i>'.repeat(pad);
  for (let k = 1; k <= days; k++) {
    const iso = t.slice(0, 8) + String(k).padStart(2, "0"), x = state.stats.days[iso] || {};
    const score = (x.f || 0) + (x.r || 0) + (x.m || 0) * 2;
    heat += `<i class="${score >= 50 ? "l3" : score >= 20 ? "l2" : score > 0 ? "l1" : ""} ${x.gold ? "gold" : ""} ${iso === t ? "today" : ""}" title="${iso}"></i>`;
  }
  const done = q.filter((x) => x.p >= 1).length;
  openSheet({ title: "Mục tiêu hôm nay", html: `<div class="qpanel">
    <div class="q-rings">${ringsSvg(q, 128, `<text x="60" y="66" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="800" font-size="20" fill="currentColor">${done}/3</text>`)}<p class="small">Mỗi ngày 3 việc: <b>tập trung</b>, <b>ôn thẻ</b>, và <b>luyện</b> (làm đề hoặc tự giảng). Tự kiểm tra và ôn ngắt quãng giúp nhớ lâu hơn hẳn chỉ đọc lại bài.</p></div>
    <ul class="quests">${goalItems(q)}</ul>
    <button class="btn soft block" data-go="prog">${icon("target")} Xem tiến độ từng môn</button>
    <div class="heat-head"><p class="w-title">Tháng ${+t.slice(5, 7)}</p><span class="flame">${icon("flame")} ${n} ngày liên tiếp</span></div>
    <div class="heat">${heat}</div>
    <p class="small muted">Ô viền vàng: ngày đủ 3 mục tiêu. Kỷ lục chuỗi ngày: ${best} ngày. Tổng ${esc(fmtMin(totalMin()))} tập trung.</p></div>` });
}
