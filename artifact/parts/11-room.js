// ================= căn phòng: bé mèo Elec, bạn đồng hành, khách ghé thăm, trang trí, nhiệm vụ =================
// Vòng chơi: Tập trung → Elec lắp mạch cùng bạn → nhận Tinh thể ✦ → trang trí phòng / cầu nguyện gặp bạn mới
function hideSplash() {
  const s = $("#splash"); if (!s || s.classList.contains("out")) return;
  s.classList.add("out"); setTimeout(() => { s.hidden = true; }, 380);
}
setTimeout(hideSplash, 4500); // phòng khi dữ liệu tải quá lâu

function maybeWelcome() {
  const a = adv();
  if (a.welcome || !dataReady || loadFailed) return;
  a.welcome = 1; a.gems += 1000; saveAdv(); paintGems();
  const n = esc(prefs().name);
  setTimeout(() => openSheet({ title: `Chào mừng tới phòng của ${prefs().name}!`, html: `<div class="reward">
    <div style="width:130px">${kitten("party")}</div>
    <p class="gain gems">+1 000 ✦</p>
    <ol class="loop"><li><span><b>Bấm Tập trung</b>: ${n} lắp mạch cùng bạn.</span></li><li><span><b>Xong phiên nhận Tinh thể ✦</b>: 1 phút = 2 ✦.</span></li><li><span><b>Trang trí phòng</b> hoặc <b>cầu nguyện</b> để gặp các Linh Kiện tai mèo, rồi đọc truyện cùng họ.</span></li></ol>
    <div class="two" style="width:100%"><button class="btn" data-act="decor">Trang trí</button><button class="btn primary" data-act="focus-open">Tập trung</button></div></div>` }), 60);
}

// --- ai đang ở trong phòng ---
function kitMood() { const h = parisHour(); return state.focus?.endAt ? "think" : h >= 23 || h < 6 ? "sleep" : state.stats.days[todayISO()]?.gold ? "party" : "happy"; }
function visitorToday() { // mỗi ngày một bạn trong đội hình ghé chơi (không phải bạn đồng hành)
  const a = adv(), pool = Object.keys(a.own).filter((id) => CHARS[id] && id !== a.comp).sort();
  return pool.length ? pool[hashOf(todayISO()) % pool.length] : null;
}
function roomHtml({ focus = false, mood } = {}) {
  const a = adv(), name = prefs().name, comp = a.comp && owned(a.comp) ? a.comp : "", vis = focus ? null : visitorToday(), d = advDay();
  return roomArt({ equip: a.equip, hour: parisHour() })
    + `<button class="dweller kit" data-act="buddy" aria-label="Chạm vào ${esc(name)}">${kitten(mood || kitMood())}</button>`
    + (comp ? `<button class="dweller comp" data-act="comp-talk" aria-label="Chạm vào ${esc(CHARS[comp].name)}">${chibi(comp)}</button>` : "")
    + (vis ? `<button class="dweller visit" data-act="visitor" aria-label="${esc(CHARS[vis].name)} ghé thăm${d.visit ? "" : ", có quà"}">${chibi(vis, { mood: "wink" })}${d.visit ? "" : `<span class="gift" aria-hidden="true">🎁</span>`}</button>` : "");
}
function renderRoom() {
  const box = $("#hRoom"); if (!box) return;
  box.innerHTML = roomHtml();
  const q = quests(), done = q.filter((x) => x.p >= 1).length, d = advDay(), qb = $("#hQuest");
  $("#hQuestTxt").textContent = `Nhiệm vụ ${done}/3`;
  qb.setAttribute("aria-label", `Nhiệm vụ ${done}/3${d.gift ? "" : ", có quà hôm nay"}`);
  qb.querySelector(".dot-new")?.remove();
  if (!d.gift) qb.insertAdjacentHTML("beforeend", `<span class="dot-new" aria-hidden="true">1</span>`);
  const ch = currentChapter(), avail = !isDone(ch.id) && !chapterState(ch).lock, sb = $("#hudStory");
  sb.querySelector(".dot-new")?.remove();
  if (avail) sb.insertAdjacentHTML("beforeend", `<span class="dot-new" aria-hidden="true">!</span>`);
  sb.setAttribute("aria-label", `Truyện${avail ? `: ${ch.no} đang chờ bạn` : ""}`);
  paintGems();
}
function hopEl(el) { el.classList.remove("hop"); void el.offsetWidth; el.classList.add("hop"); audioCtx(); }
function tapVisitor(el) {
  const id = visitorToday(); if (!id) return;
  const c = CHARS[id], d = advDay();
  if (!d.visit) { d.visit = 1; earn(20); el.querySelector(".gift")?.remove(); $("#hBubble").textContent = `${c.name} ghé chơi và tặng bạn 20 ✦! “${pickOne(c.quotes)}”`; sfx("chime"); }
  else { $("#hBubble").textContent = `${c.name}: ${pickOne(c.quotes)}`; sfx("pop"); }
  hopEl(el);
}

// --- trang trí phòng: mua bằng ✦, mỗi chỗ đặt một món ---
let decorSlot = "all";
function openDecor() {
  openSheet({ title: "Trang trí phòng", html: `<div class="decor-prev" id="dcPrev"></div>
    <div class="row" style="justify-content:space-between;align-items:center;gap:8px"><span class="small muted">Mua bằng Tinh thể kiếm được khi học. Chạm món đã có để đặt hoặc cất đi.</span>${gemPill()}</div>
    <div class="slot-tabs" id="dcTabs" role="group" aria-label="Chỗ trong phòng"></div><div class="furni-grid" id="dcGrid"></div>`,
    onMount: (el) => { paintDecor(el); el.addEventListener("click", (e) => decorClick(e, el)); } });
}
function paintDecor(el) {
  const a = adv();
  $("#dcPrev", el).innerHTML = roomArt({ equip: a.equip, hour: parisHour() });
  $("#dcTabs", el).innerHTML = [["all", "Tất cả"], ...Object.entries(SLOTS)].map(([k, v]) => `<button data-slot="${k}" aria-pressed="${k === decorSlot}">${esc(v)}</button>`).join("");
  $("#dcGrid", el).innerHTML = FURNI.filter((f) => decorSlot === "all" || f.slot === decorSlot).map((f) => {
    const has = !!a.furni[f.id], on = a.equip[f.slot] === f.id;
    return `<div class="fcard ${on ? "on" : ""}" data-f="${f.id}">${furniThumb(f.id)}<span>${esc(f.name)}</span><span class="small muted" style="margin-top:-3px">${esc(SLOTS[f.slot])}</span>
      ${has ? `<button class="btn" data-equip="${f.id}" aria-pressed="${on}">${on ? "Đang dùng ✓" : "Đặt vào phòng"}</button>` : `<button class="btn buy" data-buy="${f.id}">${f.price} ✦</button>`}</div>`;
  }).join("");
  paintGems();
}
function decorClick(e, el) {
  const t = e.target.closest("[data-slot]");
  if (t) { decorSlot = t.dataset.slot; sfx("tick"); return paintDecor(el); }
  const q = e.target.closest("[data-equip]"), a = adv();
  if (q) {
    const f = furniOf(q.dataset.equip);
    if (a.equip[f.slot] === f.id) delete a.equip[f.slot]; else a.equip[f.slot] = f.id;
    saveAdv(); sfx("pop"); paintDecor(el); renderRoom(); return;
  }
  const b = e.target.closest("[data-buy]"); if (!b) return;
  const f = furniOf(b.dataset.buy);
  if (a.gems < f.price) return toast(`Còn thiếu ${fmtN(f.price - a.gems)} ✦ · tập trung ${Math.ceil((f.price - a.gems) / 2)} phút là đủ`);
  if (!b.classList.contains("armed")) { // chạm lần hai mới mua, tránh lỡ tay
    b.classList.add("armed"); b.textContent = `Mua? −${f.price} ✦`;
    setTimeout(() => { if (b.isConnected && b.classList.contains("armed")) { b.classList.remove("armed"); b.textContent = `${f.price} ✦`; } }, 3000);
    return;
  }
  a.gems -= f.price; a.furni[f.id] = 1; a.equip[f.slot] = f.id; saveAdv();
  sfx("unlock"); confetti(); toast(`Đã đặt “${f.name}” vào phòng!`);
  paintDecor(el); renderRoom();
}

// --- nhiệm vụ hằng ngày, quà, chuỗi ngày, cấp ---
function openQuests() {
  const q = quests(), d = advDay(), n = streak(), best = bestStreak(), lv = levelInfo(), t = todayISO();
  const first = t.slice(0, 8) + "01", pad = (new Date(first + "T12:00:00Z").getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7), 0)).getUTCDate();
  let heat = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((x) => `<span>${x}</span>`).join("") + '<i class="pad"></i>'.repeat(pad);
  for (let k = 1; k <= days; k++) {
    const iso = t.slice(0, 8) + String(k).padStart(2, "0"), x = state.stats.days[iso] || {};
    const score = (x.f || 0) + (x.r || 0) + (x.m || 0) * 2;
    heat += `<i class="${score >= 50 ? "l3" : score >= 20 ? "l2" : score > 0 ? "l1" : ""} ${x.gold ? "gold" : ""} ${iso === t ? "today" : ""}" title="${iso}"></i>`;
  }
  openSheet({ title: "Nhiệm vụ hôm nay", html: `<div class="qpanel">
    <div class="gift-row"><span aria-hidden="true" style="font-size:26px">🎁</span><span style="flex:1;min-width:0"><b>Quà mỗi ngày</b><br><span class="small">Ghé phòng mỗi ngày để nhận 50 ✦</span></span><button class="btn primary sm" data-act="gift" ${d.gift ? "disabled" : ""}>${d.gift ? "Đã nhận" : "Nhận +50 ✦"}</button></div>
    <ul class="quests">${q.map((x) => `<li><span class="qdot ${x.p >= 1 ? "done" : ""}" style="--p:${x.p.toFixed(2)}">${x.p >= 1 ? icon("check") : ""}</span><span>${esc(x.t)}<small>${esc(x.v)}</small></span>${x.p >= 1 ? `<span class="q-reward done">+30 ✦ ✓</span>` : x.act ? `<button class="btn space-btn" data-act="${x.act[0]}">${x.act[1]}</button>` : `<span class="q-reward">+30 ✦</span>`}</li>`).join("")}</ul>
    <p class="small muted" style="margin-top:-6px">Xong cả 3 nhiệm vụ là ngày hoàn hảo: thêm 60 ✦.</p>
    <button class="lvl" data-go="lab" style="all:unset;cursor:pointer;display:grid;gap:6px"><span class="lvl-top"><span>Cấp ${lv.n} · <b>${esc(lv.title)}</b></span><span>${lv.t} e⁻${lv.next ? " / " + lv.next : ""}</span></span><span class="xp"><i style="width:${Math.round(lv.pct * 100)}%"></i></span></button>
    <div class="heat-head"><p class="w-title">Tháng ${+t.slice(5, 7)}</p><span class="flame">${icon("flame")} ${n} ngày liên tiếp</span></div>
    <div class="heat">${heat}</div>
    <p class="small muted">Kỷ lục chuỗi ngày: ${best} ngày.</p></div>` });
}
function openEarnInfo() {
  openSheet({ title: "Tinh thể ✦", html: `<div class="stack">
    <p class="center"><span class="gem" style="font-size:22px;padding:6px 16px"><b>✦</b> ${fmtN(adv().gems)}</span></p>
    <ul class="earn-list">
      <li><b>Tập trung</b><span>1 phút = 2 ✦</span></li><li><b>Ôn flashcards</b><span>1 thẻ = 1 ✦</span></li>
      <li><b>Tự giảng Feynman</b><span>20 ✦ (5 lần/ngày)</span></li><li><b>Nhiệm vụ hằng ngày</b><span>30 ✦ mỗi cái · ngày hoàn hảo 60 ✦</span></li>
      <li><b>Quà mỗi ngày · khách ghé chơi</b><span>50 ✦ · 20 ✦</span></li><li><b>Thắng đấu tập</b><span>100 ✦ (3 lần/ngày)</span></li><li><b>Xong một chương truyện</b><span>300–500 ✦</span></li></ul>
    <p class="small muted">Không có tiền thật nào ở đây cả: mọi Tinh thể đều đến từ việc học.</p>
    <div class="two"><button class="btn" data-act="decor">Trang trí phòng</button><button class="btn primary" data-close data-go="wish">Cầu nguyện</button></div></div>` });
}

// --- màn tập trung: mạch 5 linh kiện sáng dần theo thời gian ---
const PARTS = [["r", "R"], ["c", "C"], ["l", "L"], ["d", "D"], ["led", "LED"]];
function circuitSvg() {
  const xs = [30, 90, 150, 210, 270];
  const shape = (k, x) => ({
    r: `<rect class="part r" x="${x - 16}" y="16" width="32" height="14" rx="5"/>`,
    c: `<path class="part c" d="M${x - 5} 9V37M${x + 5} 9V37" style="fill:none;stroke-width:4"/>`,
    l: `<path class="part l" d="M${x - 18} 23c0-10 9-10 9 0c0-10 9-10 9 0c0-10 9-10 9 0c0-10 9-10 9 0" style="fill:none"/>`,
    d: `<path class="part d" d="M${x - 9} 12L${x + 7} 23 ${x - 9} 34Z"/><path class="part d" d="M${x + 8} 12V34" style="fill:none"/>`,
    led: `<circle class="glow" cx="${x}" cy="23" r="20"/><path class="part led" d="M${x - 9} 12L${x + 7} 23 ${x - 9} 34Z"/><path class="part led" d="M${x + 8} 12V34M${x + 3} 7l5-5M${x + 10} 10l6-4" style="fill:none"/>`,
  })[k];
  let wires = `<path class="wire" data-w="0" d="M4 23H${xs[0] - 18}"/>`, parts = "";
  for (let i = 0; i < 5; i++) {
    parts += `<g data-p="${i}">${shape(PARTS[i][0], xs[i])}<text x="${xs[i]}" y="54">${PARTS[i][1]}</text></g>`;
    wires += i < 4 ? `<path class="wire" data-w="${i + 1}" d="M${xs[i] + 18} 23H${xs[i + 1] - 18}"/>` : `<path class="wire" data-w="5" d="M${xs[4] + 18} 23H296"/>`;
  }
  return `<svg viewBox="0 0 300 60" role="img" aria-label="Mạch đang lắp: 0/5 linh kiện">${wires}${parts}</svg>`;
}
function paintCircuit(p) {
  const box = $("#fCircuit"); if (!box) return;
  const n = Math.floor(clamp(p, 0, 1) * 5 + 1e-9);
  box.querySelectorAll("[data-p]").forEach((g, i) => g.querySelectorAll(".part, .glow").forEach((x) => x.classList.toggle("on", i < n)));
  box.querySelectorAll("[data-w]").forEach((w) => w.classList.toggle("on", n > 0 && +w.dataset.w <= n));
  box.querySelector("svg")?.setAttribute("aria-label", `Mạch đang lắp: ${n}/5 linh kiện`);
}
