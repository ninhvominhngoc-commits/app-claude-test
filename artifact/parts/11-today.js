// ================= Hôm nay: một việc nên làm ngay, 3 mục tiêu ngày, nút Tập trung =================
// Không có trò chơi: app chỉ chọn giúp bạn việc quan trọng nhất lúc này và cho thấy hôm nay đã làm được gì.

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
  $("#wFocusLabel").innerHTML = f ? `Đang tập trung · ${esc(subjOf(f.subject).name)}` : `<span class="t-name">${esc(subjOf(focusPick.subject).name)}</span>${icon("down", "xs")}`;
  $("#wFocusLabel").setAttribute("aria-label", f ? "Mở đồng hồ tập trung" : `Môn: ${subjOf(focusPick.subject).name}. Đổi môn và ghi mục tiêu phiên`);
  $("#wFocusState").textContent = f ? "Đang tập trung" : "Tập trung";
  $("#wFocus [data-left]").textContent = shown;
  $("#wLcd").innerHTML = lcdSvg(shown);
  $("#hStepper").hidden = !!f;
  $("#hDur").textContent = `${dur} phút`;
  $("#hStartTxt").textContent = f ? "Mở đồng hồ" : "Bắt đầu";
  // 3 ô mục tiêu: vòng tiến độ nhỏ, con số, chạm là làm luôn
  const day = state.stats.days[todayISO()] || {}, q = quests(), done = q.filter((x) => x.p >= 1).length, due = totalDue(), sk = streak();
  $("#hGoalsTxt").textContent = `${done}/3`;
  $("#hStreak").innerHTML = `${icon("flame")} ${sk}`;
  $("#hStreak").setAttribute("aria-label", `Chuỗi ${sk} ngày học liên tiếp. Xem mục tiêu và lịch học`);
  const tile = (x, val, lab, attrs) => `<button class="g-tile ${x.p >= 1 ? "done" : ""}" ${attrs} style="--c:${x.col}" aria-label="${esc(x.t)}: ${esc(x.v)}"><span class="g-ring" style="--p:${x.p.toFixed(2)}">${x.p >= 1 ? icon("check") : ""}</span><b>${esc(val)}</b><small>${esc(lab)}</small></button>`;
  $("#hGoals").innerHTML = tile(q[0], `${day.f || 0}/25`, f ? "đang chạy" : "phút tập trung", `data-act="focus-open"`)
    + tile(q[1], `${day.r || 0}/10`, due ? `thẻ · ${due} đến hạn` : "thẻ đã ôn", due ? `data-act="review-all"` : `data-go="review"`)
    + tile(q[2], `${(day.fe || day.p) ? 1 : 0}/1`, "bài luyện", `data-act="go-drill"`);
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

// thanh tab dưới đáy: nếu vùng nhìn thấy thật ngắn hơn khung trang một chút (thanh của app che mép dưới), đẩy thanh lên cho thấy;
// chênh lệch lớn là bàn phím đang mở thì để yên như app bình thường
(() => {
  const vv = window.visualViewport; if (!vv) return;
  let raf = 0;
  const sync = () => {
    raf = 0;
    const gap = Math.round(window.innerHeight - (vv.height + vv.offsetTop));
    document.documentElement.style.setProperty("--vv-shift", gap > 0 && gap <= 140 ? `${-gap}px` : "0px");
  };
  const later = () => { if (!raf) raf = requestAnimationFrame(sync); };
  vv.addEventListener("resize", later); vv.addEventListener("scroll", later); window.addEventListener("scroll", later, { passive: true });
  sync();
})();
