// ================= phiêu lưu: Hành trình Mạch Lớn =================
// furni/equip: đồ nội thất đã có và món đang đặt ở từng chỗ trong phòng (tặng sẵn thảm + chồng sách)
const ADV0 = () => ({ gems: 0, welcome: 0, pulls: 0, p5: 0, p4: 0, guar: 0, own: {}, furni: { rug: 1, books: 1 }, equip: { rug: "rug", corner: "books" }, party: [], comp: "", done: [], choice: {}, aff: {}, prog: null, day: {}, hist: [] });
const adv = () => (state.adv ||= ADV0());
const saveAdv = () => save("adv", state.adv);
const owned = (id) => adv().own[id] !== undefined;
const ADV_SEG = { adv: "story", wish: "wish", team: "team" };
const COST = 100;
let advSeg = "story";
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmtN = (n) => Math.round(n).toLocaleString("vi-VN");
const speakerName = (c) => (c === "elec" ? prefs().name : CHARS[c]?.name || SPEAKER[c] || "");
const elChip = (el) => `<span class="el-chip" style="--ec:${ELEM[el][1]}">${esc(ELEM[el][0])}</span>`;

// --- ví Tinh thể ✦: kiếm được khi học ---
function advDay() { const a = adv(), t = todayISO(); if (a.day?.d !== t) a.day = { d: t, fe: 0, tr: 0, q: [], gold: 0, gift: 0, visit: 0 }; return a.day; }
function earn(n) {
  n = Math.round(n); if (!(n > 0)) return 0;
  adv().gems += n; saveAdv(); gemPop(n); paintGems();
  return n;
}
function gemPop(n) {
  if (reduceMotion) return;
  const el = document.createElement("div"); el.className = "gem-pop"; el.setAttribute("aria-hidden", "true");
  el.style.marginTop = `${Math.min(4, $$(".gem-pop").length) * 40}px`; // nhiều phần thưởng cùng lúc thì xếp xuống dưới
  el.innerHTML = `+${fmtN(n)} <b>✦</b>`;
  document.body.append(el); setTimeout(() => el.remove(), 1500);
}
function paintGems() {
  const n = fmtN(adv().gems);
  $$("[data-gems]").forEach((el) => { el.textContent = n; el.closest(".gem")?.setAttribute("aria-label", `${n} Tinh thể`); });
}
const advFocus = (minutes) => {
  if (minutes <= 0) return 0;
  const a = adv(); if (a.comp && minutes >= 15) a.aff[a.comp] = (a.aff[a.comp] || 0) + 1;
  return earn(minutes * 2);
};
const advCard = () => earn(1);
function advFeyn() { const d = advDay(); if (d.fe >= 5) return; d.fe++; earn(20); }
function advQuests() { // +30 ✦ cho mỗi nhiệm vụ hằng ngày hoàn thành, +60 ✦ cho ngày hoàn hảo
  const d = advDay();
  quests().forEach((q, i) => { if (q.p >= 1 && !d.q.includes(i)) { d.q.push(i); earn(30); } });
  if (state.stats.days[todayISO()]?.gold && !d.gold) { d.gold = 1; earn(60); }
}
function gemPill() { return `<span class="gem" role="img" aria-label="${fmtN(adv().gems)} Tinh thể"><b aria-hidden="true">✦</b><span data-gems aria-hidden="true">${fmtN(adv().gems)}</span></span>`; }

// --- nhân vật & đội ---
function grantChar(id) { // trả về true nếu là nhân vật mới
  const a = adv();
  if (owned(id)) { if (a.own[id] < 6) a.own[id]++; else a.gems += CHARS[id].r === 5 ? 50 : 20; return false; }
  a.own[id] = 0;
  if (a.party.length < 3 && !a.party.includes(id)) a.party.push(id);
  if (!a.comp) a.comp = id;
  return true;
}
function grantFurni(id) { // cầu nguyện 3★: món nội thất nhỏ; trùng thì hoàn 15 ✦
  const a = adv(), f = furniOf(id); if (!f) return false;
  if (a.furni[id]) { a.gems += 15; return false; }
  a.furni[id] = 1;
  if (!a.equip[f.slot]) a.equip[f.slot] = id;
  return true;
}
function pickSmallFurni(a) { const pool = FURNI.filter((f) => f.small), fresh = pool.filter((f) => !a.furni[f.id]); return pickOne(fresh.length ? fresh : pool).id; }
const partyOf = () => adv().party.filter((id) => owned(id) && CHARS[id]);
const affHearts = (id) => Math.min(5, Math.floor((adv().aff[id] || 0) / 3));

// --- chương truyện ---
const chapterOf = (id) => STORY.find((c) => c.id === id);
const isDone = (id) => adv().done.includes(id);
function chapterState(ch) {
  const i = STORY.indexOf(ch), prev = STORY[i - 1], lv = levelInfo();
  if (prev && !isDone(prev.id)) return { lock: "prev", text: `Hoàn thành ${prev.no} trước` };
  if (lv.n < ch.req) {
    const need = LEVELS[ch.req - 1][0] - lv.t;
    return { lock: "level", text: `Cần Cấp ${ch.req} · còn ${need} phút tập trung` };
  }
  return { lock: "" };
}
function currentChapter() { return STORY.find((c) => !isDone(c.id)) || STORY[STORY.length - 1]; }
function chapArt(ch, h = 158) {
  return `<div class="chap-art" style="height:${h}px">${sceneArt(ch.scene)}<div class="actor sticker" style="left:6%">${chibi(ch.cover, { mood: "happy" })}</div><div class="actor" style="right:4%;width:96px;bottom:8px">${bossArt(ch.boss)}</div></div>`;
}
// chỉ ghi chỗ đọc dở cho chương chưa xong (chơi lại chương cũ không đè lên tiến độ chương mới)
function setProg(p) { if (p && isDone(p.ch)) return; adv().prog = p; saveAdv(); }

// --- màn Phiêu lưu ---
function renderAdv() {
  maybeWelcome();
  $$("#advSeg button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.seg === advSeg)));
  $("#advGem").innerHTML = gemPill();
  const d = advDay();
  $("#advGift").hidden = !!d.gift;
  $("#advStory").hidden = advSeg !== "story"; $("#advWish").hidden = advSeg !== "wish"; $("#advTeam").hidden = advSeg !== "team";
  if (advSeg === "story") renderAdvStory(); else if (advSeg === "wish") renderWish(); else renderTeam();
}
function renderAdvStory() {
  const ch = currentChapter(), cs = chapterState(ch), a = adv(), allDone = STORY.every((c) => isDone(c.id));
  const resume = a.prog?.ch === ch.id && !isDone(ch.id);
  const path = STORY.map((c, i) => `${i ? "<span></span>" : ""}<i class="${isDone(c.id) ? "done" : c === ch && !allDone ? "now" : ""}" aria-hidden="true">${i || "★"}</i>`).join("");
  const d = advDay(), tr = Math.max(0, 3 - d.tr);
  $("#advStory").innerHTML = `
    <article class="sb-card chap-card">
      ${chapArt(ch)}
      <div class="chap-body">
        <span class="chap-no">${esc(ch.no)}${allDone ? " · đã hoàn thành" : ""}</span>
        <h2 class="chap-name">${esc(ch.title)}</h2>
        <p class="small" style="color:var(--sb-ink-2)">${esc(allDone ? "Bạn đã cứu cả campus Jussieu! Phần 2 “Thành phố Xoay Chiều” đang được viết." : ch.blurb)}</p>
        <div class="chap-path" role="img" aria-label="Tiến độ: ${a.done.length}/${STORY.length} chương">${path}</div>
        ${cs.lock && !allDone ? `<p class="lock-note">${icon("lock")} ${esc(cs.text)}</p>${cs.lock === "level" ? `<button class="adv-btn green block" data-act="focus-open">${icon("play")} Tập trung để mở khoá</button>` : ""}`
          : `<button class="adv-btn block" data-act="adv-play" data-id="${ch.id}">${icon("play")} ${allDone ? "Chơi lại chương cuối" : resume ? "Đọc tiếp" : isDone(ch.id) ? "Chơi lại" : "Bắt đầu"}</button>`}
      </div>
    </article>
    <div class="adv-grid">
      <button class="sb-card adv-tile" data-act="train" style="--bgc:#e2efc6"><span class="t">Đấu tập</span><span class="s">Đánh quái bằng câu hỏi từ tài liệu và thẻ của bạn${tr ? ` · còn ${tr} lần +100 ✦ hôm nay` : ""}</span><span class="mini">${bossArt("nhieu")}</span></button>
      <button class="sb-card adv-tile" data-act="chapters" style="--bgc:#ffe0e8"><span class="t">Các chương</span><span class="s">${a.done.length}/${STORY.length} chương đã xong · chơi lại để xem các lựa chọn khác</span><span class="mini">${bossArt("dm")}</span></button>
    </div>
    <p class="small muted center">Cách kiếm ✦: tập trung 1 phút = 2 · ôn 1 thẻ = 1 · tự giảng Feynman = 20 · nhiệm vụ hằng ngày = 30 · ngày hoàn hảo = 60 · thắng đấu tập = 100</p>`;
}
function openChapters() {
  openSheet({ title: "Hành trình Mạch Lớn", html: `<div class="stack">${STORY.map((c) => {
    const cs = chapterState(c);
    return `<div class="sb-card" style="display:grid;grid-template-columns:76px 1fr auto;gap:10px;align-items:center;padding:8px 10px">
      <div class="sticker" style="width:70px">${chibi(c.cover, { mood: isDone(c.id) ? "joy" : "happy" })}</div>
      <div style="min-width:0"><span class="chap-no">${esc(c.no)}</span><strong style="display:block;font:800 16px/1.2 var(--display)">${esc(c.title)}</strong><span class="small" style="color:var(--sb-ink-2)">${isDone(c.id) ? "Đã hoàn thành" : cs.lock ? esc(cs.text) : "Sẵn sàng"}</span></div>
      <button class="adv-btn" data-act="adv-play" data-id="${c.id}" ${cs.lock && !isDone(c.id) ? "disabled" : ""} aria-label="Chơi ${esc(c.no)}">${icon(cs.lock && !isDone(c.id) ? "lock" : "play")}</button></div>`;
  }).join("")}</div>` });
}
function claimGift() {
  const d = advDay(); if (d.gift) return;
  d.gift = 1; earn(50); sfx("chime"); toast("Quà hôm nay: +50 ✦. Mai quay lại nhận tiếp nhé!");
  if (!sheetRoot.hidden && $("#sheetRoot .qpanel")) openQuests(); render();
}

// --- cầu nguyện (gacha) ---
function rate5(n) { return n >= 50 ? 1 : n >= 36 ? Math.min(1, 0.016 + 0.07 * (n - 35)) : 0.016; }
function rollOne(a) {
  a.pulls++; a.p5++; a.p4++;
  const x = Math.random(), r5 = rate5(a.p5);
  if (x < r5) {
    a.p5 = 0; a.p4 = 0;
    let id; if (a.guar || Math.random() < 0.5) { id = BANNER.feat; a.guar = 0; } else { id = pickOne(BANNER.std5); a.guar = 1; }
    return { id, r: 5 };
  }
  if (a.p4 >= 10 || x < r5 + 0.13) { a.p4 = 0; return { id: pickOne(BANNER.four), r: 4 }; }
  return { id: pickSmallFurni(a), r: 3 };
}
function wish(n) {
  const a = adv(), cost = COST * n;
  if (a.gems < cost) {
    const miss = cost - a.gems;
    return openSheet({ title: "Chưa đủ Tinh thể", html: `<div class="reward"><div class="sticker" style="width:110px">${chibi("capa", { mood: "sad" })}</div>
      <p>Còn thiếu <b>${fmtN(miss)} ✦</b>. Tập trung ${Math.ceil(miss / 2)} phút là đủ đó!</p>
      <div class="two" style="width:100%"><button class="btn" data-close data-go="review">Ôn thẻ</button><button class="btn primary" data-act="focus-open">Tập trung</button></div></div>` });
  }
  a.gems -= cost;
  const res = [];
  for (let i = 0; i < n; i++) { const r = rollOne(a); r.isNew = r.r >= 4 ? grantChar(r.id) : grantFurni(r.id); res.push(r); }
  a.hist = [...res.map((r) => ({ id: r.id, r: r.r, t: Date.now() })).reverse(), ...a.hist].slice(0, 60);
  saveAdv(); paintGems();
  playWish(res);
}
const nameOf = (r) => (r.r >= 4 ? CHARS[r.id]?.name : furniOf(r.id)?.name) || r.id;
function gcard(r, i) {
  return `<div class="gcard r${r.r}" style="animation-delay:${(i * 0.07).toFixed(2)}s">${starsSvg(r.r, "st")}${r.isNew ? `<span class="new">MỚI</span>` : ""}${r.r >= 4 ? `<div class="g-art">${chibi(r.id, { mood: "joy" })}</div>` : `<span class="g-furni">${furniThumb(r.id)}</span>`}<span class="nm">${esc(nameOf(r))}</span></div>`;
}
function playWish(res) {
  const best = Math.max(...res.map((r) => r.r));
  const col = best === 5 ? "#ffd66e" : best === 4 ? "#b49cff" : "#9cc7ea";
  const ov = document.createElement("div");
  ov.className = "gacha-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Kết quả cầu nguyện"); ov.tabIndex = -1;
  ov.style.setProperty("--sc", col);
  document.body.append(ov); document.body.classList.add("noscroll"); ov.focus();
  const splashes = res.filter((r) => r.r === 5 || (r.r === 4 && r.isNew));
  let step = reduceMotion ? 1 : 0;
  const close = () => { ov.remove(); document.body.classList.remove("noscroll"); render(); };
  const paint = () => {
    if (step === 0) { ov.innerHTML = `<span class="shoot"></span>`; sfx(best === 5 ? "unlock" : "chime"); setTimeout(() => { if (step === 0) { step = 1; paint(); } }, 1300); return; }
    const k = step - 1;
    if (k < splashes.length) {
      const r = splashes[k], c = CHARS[r.id];
      ov.innerHTML = `<span class="g-burst"></span><div class="g-splash"><div class="sticker g-big">${portrait(r.id, { mood: "joy" })}</div>${starsSvg(r.r, "stars big")}<p class="g-name">${esc(c.name)}</p><p class="g-role">${esc(c.role)} · ${esc(ELEM[c.el][0])}${r.isNew ? " · Mới!" : ""}</p><p class="g-quote">“${esc(c.quotes[0])}”</p><p class="g-hint">Chạm để tiếp tục</p></div>`;
      if (r.r === 5) confetti();
      return;
    }
    if (k === splashes.length) { ov.innerHTML = `<div><div class="g-grid">${res.map(gcard).join("")}</div><p class="g-hint">Chạm để đóng · đã cầu nguyện ${fmtN(adv().pulls)} lần</p></div>`; return; }
    close();
  };
  ov.addEventListener("click", () => { step++; paint(); });
  ov.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); step++; paint(); } });
  paint();
}
function renderWish() {
  const a = adv(), left = 50 - a.p5, f = CHARS[BANNER.feat];
  $("#advWish").innerHTML = `
    <article class="sb-card wish-banner hearts-bg">
      <div class="who sticker">${portrait(BANNER.feat, { mood: "happy", rough: false })}</div>
      <div class="info">
        <span class="pill-note">Sự kiện cầu nguyện</span>
        <span class="logo-t" style="--lc:#ff9bb8">${esc(BANNER.name)}</span>
        <span class="small" style="font-weight:800">Tăng tỉ lệ: <b>${esc(f.name)}</b> ${starsSvg(5)}</span>
        ${elChip(f.el)}
        <span class="small" style="color:var(--sb-ink-2)">${esc(f.skill[0])}: ${esc(f.skill[1])}</span>
        <span class="pill-note pity">Còn tối đa ${left} lượt tới 5★${a.guar ? " · lần tới chắc chắn là Lumi" : ""}</span>
      </div>
    </article>
    <div class="wish-btns">
      <button class="wish-btn ${a.gems < COST ? "short" : ""}" data-act="wish" data-n="1">Cầu nguyện ×1<small>${COST} ✦${a.gems < COST ? ` · thiếu ${fmtN(COST - a.gems)}` : ""}</small></button>
      <button class="wish-btn ten ${a.gems < COST * 10 ? "short" : ""}" data-act="wish" data-n="10">Cầu nguyện ×10<small>${fmtN(COST * 10)} ✦${a.gems < COST * 10 ? ` · thiếu ${fmtN(COST * 10 - a.gems)}` : ""}</small></button>
    </div>
    <div class="row" style="justify-content:space-between"><button class="link" data-act="wish-rates">Tỉ lệ &amp; bảo hiểm</button><button class="link" data-act="wish-hist">Lịch sử (${a.hist.length})</button></div>
    <p class="small muted center">Tinh thể chỉ kiếm được bằng cách học. Không có tiền thật nào ở đây cả.</p>`;
}
function openRates() {
  openSheet({ title: "Tỉ lệ & bảo hiểm", html: `<div class="stack small" style="gap:8px">
    <p><b>5★</b> (Lumi, Tranz, Ope): 1,6% mỗi lượt. Từ lượt thứ 36 tỉ lệ tăng dần, lượt thứ 50 chắc chắn ra 5★.</p>
    <p><b>50/50:</b> 5★ đầu tiên có một nửa khả năng là Lumi. Nếu ra Tranz hoặc Ope thì 5★ kế tiếp chắc chắn là Lumi.</p>
    <p><b>4★</b> (Ohmi, Capa, Kirch, Indu, Bobo): 13%, và cứ 10 lượt chắc chắn có ít nhất một 4★.</p>
    <p><b>3★</b>: đồ nội thất nhỏ cho căn phòng ở màn Hôm nay. Trùng đồ được hoàn 15 ✦.</p>
    <p>Trùng nhân vật thì tăng Cung (C1 → C6). Từ C6, trùng 4★ hoàn 20 ✦, trùng 5★ hoàn 50 ✦.</p>
    <p class="muted">Đã cầu nguyện ${fmtN(adv().pulls)} lần · ${adv().p5} lượt kể từ 5★ gần nhất.</p></div>` });
}
function openHist() {
  const h = adv().hist;
  openSheet({ title: "Lịch sử cầu nguyện", html: h.length ? `<div class="list">${h.map((x) => `<div class="row" style="justify-content:space-between;padding:6px 2px;border-bottom:1.5px dashed var(--line, #e9dccb)"><span><b>${esc(nameOf(x))}</b> ${starsSvg(x.r)}</span><span class="small muted">${esc(shortDT(x.t))}</span></div>`).join("")}</div>` : `<p class="muted">Chưa cầu nguyện lần nào.</p>` });
}

// --- nhân vật, đội, bạn đồng hành, trang trí ---
function renderTeam() {
  const a = adv(), party = partyOf();
  const slots = [0, 1, 2].map((i) => { const id = party[i]; return id ? `<button class="sb-card ccard" data-act="char" data-id="${id}" style="--cbg:${CHARS[id].bg}"><div class="chibi-box">${chibi(id)}</div><span class="nm">${esc(CHARS[id].name)}</span></button>` : `<div class="sb-card ccard" style="--cbg:#fff;opacity:.7;cursor:default"><div class="chibi-box" style="height:82px;display:grid;place-items:center;font:800 26px var(--display)">+</div><span class="nm">Trống</span></div>`; }).join("");
  const ids = Object.keys(CHARS).sort((x, y) => CHARS[y].r - CHARS[x].r);
  $("#advTeam").innerHTML = `
    <div class="sec-head"><span class="label">Đội hình (tối đa 3)</span><span class="small muted">Mỗi người một kỹ năng / trận</span></div>
    <div class="roster">${slots}</div>
    <div class="sec-head"><span class="label">Nhân vật</span><span class="small muted">${Object.keys(a.own).length}/${ids.length}</span></div>
    <div class="roster">${ids.map((id) => {
      const c = CHARS[id], has = owned(id);
      return `<button class="sb-card ccard ${has ? "" : "locked"}" data-act="char" data-id="${id}" style="--cbg:${has ? c.bg : "#f3ece4"}" aria-label="${esc(c.name)}${has ? "" : ", chưa có"}">${a.party.includes(id) ? `<span class="tm">Đội</span>` : ""}${has && a.own[id] ? `<span class="cl">C${a.own[id]}</span>` : ""}<div class="chibi-box">${chibi(id)}</div><span class="nm">${has ? esc(c.name) : "???"}</span>${starsSvg(c.r)}</button>`;
    }).join("")}</div>
    <button class="btn soft block" data-act="decor">Trang trí phòng của ${esc(prefs().name)}</button>`;
}
function openChar(id) {
  const c = CHARS[id], a = adv(), has = owned(id);
  if (!has) return openSheet({ title: "Nhân vật bí ẩn", html: `<div class="reward"><div class="sticker" style="width:120px;filter:brightness(0) opacity(.2)">${chibi(id)}</div><p>${starsSvg(c.r)} ${elChip(c.el)}</p><p class="muted small">${c.r === 5 ? "Gặp được khi cầu nguyện." : "Gặp được trong truyện hoặc khi cầu nguyện."}</p></div>` });
  const inParty = a.party.includes(id), isComp = a.comp === id, h = affHearts(id);
  openSheet({ title: c.name, html: `<div class="prof">
    <div class="prof-art" style="--cbg:${c.bg}"><div class="chibi-box sticker">${portrait(id, { mood: "joy" })}</div></div>
    <div class="row" style="gap:6px;flex-wrap:wrap">${starsSvg(c.r)} ${elChip(c.el)} <span class="el-chip" style="--ec:#fff">${esc(c.role)}</span>${a.own[id] ? `<span class="el-chip" style="--ec:#fff1bd">Cung C${a.own[id]}</span>` : ""}</div>
    <p class="small">${esc(c.bio)}</p>
    <div class="explain"><b>${esc(c.skill[0])}</b>: ${esc(c.skill[1])}</div>
    <p class="quote">“${esc(pickOne(c.quotes))}”</p>
    <p class="small" aria-label="Thân thiết ${h}/5">Thân thiết: <span aria-hidden="true">${"♥".repeat(h)}${"♡".repeat(5 - h)}</span> <span class="muted">(tăng khi bạn tập trung cùng bạn đồng hành)</span></p>
    <div class="two"><button class="btn ${inParty ? "" : "primary"}" data-act="party" data-id="${id}">${inParty ? "Rời đội" : "Vào đội"}</button><button class="btn ${isComp ? "" : "soft"}" data-act="comp" data-id="${id}" ${isComp ? "disabled" : ""}>${isComp ? "Đang đồng hành" : "Làm bạn đồng hành"}</button></div></div>` });
}
function toggleParty(id) {
  const a = adv();
  if (a.party.includes(id)) { if (a.party.length <= 1) return toast("Đội cần ít nhất 1 người"); a.party = a.party.filter((x) => x !== id); }
  else { if (a.party.length >= 3) return toast("Đội đã đủ 3 người. Cho một bạn rời đội trước nhé"); a.party.push(id); }
  saveAdv(); closeSheet(); renderAdv();
}
function setComp(id) { adv().comp = id; saveAdv(); closeSheet(); render(); toast(`${CHARS[id].name} sẽ ở cạnh bạn ở màn Hôm nay`); }
// --- trình đọc truyện (visual novel) ---
const vn = { ch: null, part: "pre", lines: [], i: 0, cast: [], typing: 0, full: "", scene: "" };
function playChapter(id) {
  const ch = chapterOf(id); if (!ch) return;
  if (chapterState(ch).lock && !isDone(id)) return toast(chapterState(ch).text);
  const p = adv().prog;
  closeSheet();
  if (p?.ch === id && !isDone(id) && p.part === "battle") return startBattle({ mode: "story", ch: id });
  startVN(id, p?.ch === id && !isDone(id) ? p.part : "pre", p?.ch === id && !isDone(id) ? p.i || 0 : 0);
}
function startVN(id, part, from = 0) {
  const ch = chapterOf(id);
  vn.ch = id; vn.part = part; vn.cast = []; vn.scene = ch.scene;
  vn.lines = ch[part].map((l, o) => ({ ...l, o }));
  // dựng lại cảnh và nhân vật cho tới dòng bắt đầu
  for (let k = 0; k < Math.min(from, vn.lines.length); k++) { const l = vn.lines[k]; if (l.s) { vn.scene = l.s; vn.cast = []; } if (l.c && !l.ch) castIn(l.c); }
  vn.i = Math.min(from, vn.lines.length);
  show("vn");
  paintStage(); vnShow();
}
function castIn(c) { const k = vn.cast.indexOf(c); if (k >= 0) return; vn.cast.push(c); if (vn.cast.length > 2) vn.cast.shift(); }
function actorArt(c, mood) {
  if (c === "elec") return kitten(({ happy: "happy", party: "party", think: "think", sleep: "sleep" })[mood] || "happy");
  if (CHARS[c]) return portrait(c, { mood: mood || "happy" });
  return bossArt(c);
}
function paintStage(line) {
  const st = $("#vnStage");
  st.querySelector("svg.bg")?.remove();
  st.insertAdjacentHTML("afterbegin", sceneArt(vn.scene, { dark: false }));
  const box = $("#vnActors");
  box.innerHTML = vn.cast.map((c) => `<div class="vn-actor ${c === "elec" ? "elec" : ""} ${CHARS[c] ? "sticker" : ""} ${line?.c === c ? "speak" : line ? "dim" : ""}" data-c="${c}">${actorArt(c, line?.c === c ? line.m : "")}</div>`).join("");
}
function vnLine() {
  // bỏ qua các dòng có điều kiện không khớp
  while (vn.i < vn.lines.length) { const l = vn.lines[vn.i]; if (l.if && adv().choice[l.if[0]] !== l.if[1]) { vn.i++; continue; } return l; }
  return null;
}
function vnShow() {
  const l = vnLine();
  clearInterval(vn.typing); vn.typing = 0;
  $("#vnChoices").innerHTML = "";
  if (!l) return vnEnd();
  const ch = chapterOf(vn.ch);
  $("#vnTitle").textContent = `${ch.no} · ${ch.title}`;
  if (l.s && l.s !== vn.scene) { vn.scene = l.s; vn.cast = []; }
  if (l.join && !owned(l.join)) { grantChar(l.join); saveAdv(); sfx("unlock"); toast(`${CHARS[l.join].name} đã gia nhập đội!`, 3200); }
  if (l.c && !l.ch) castIn(l.c);
  paintStage(l);
  const st = $("#vnStage");
  if (l.fx === "flash" && !reduceMotion) st.insertAdjacentHTML("beforeend", `<span class="vn-flash"></span>`);
  if (l.fx === "shake" && !reduceMotion) { st.classList.remove("shake"); void st.offsetWidth; st.classList.add("shake"); }
  const name = l.c ? speakerName(l.c) : "";
  const tag = $("#vnName"); tag.hidden = !name; tag.textContent = name;
  tag.style.setProperty("--nc", CHARS[l.c]?.bg || (l.c === "elec" ? "#fff1bd" : "#e6dcfb"));
  const tx = $("#vnText");
  tx.className = "vn-text" + (l.c ? "" : " nar") + (l.g ? " glitch" : "");
  if (l.ch) {
    tx.textContent = l.q || "Bạn sẽ nói gì?"; tx.className = "vn-text nar"; tag.hidden = true; $("#vnNext").hidden = true;
    $("#vnLive").textContent = "Chọn một câu trả lời.";
    $("#vnChoices").innerHTML = l.ch.map((o, k) => `<button class="vn-choice" data-k="${k}">${esc(o.t)}</button>`).join("");
    $("#vnChoices").querySelector("button")?.focus({ preventScroll: true });
    return;
  }
  vn.full = String(l.t || "").replace(/\{name\}/g, prefs().name);
  $("#vnLive").textContent = (name ? name + ": " : "") + vn.full;
  $("#vnNext").hidden = false;
  if (reduceMotion) { tx.textContent = vn.full; return; }
  let n = 0; tx.textContent = "";
  vn.typing = setInterval(() => { n += 2; tx.textContent = vn.full.slice(0, n); if (n >= vn.full.length) { clearInterval(vn.typing); vn.typing = 0; } }, 28);
}
function vnNext() {
  const l = vnLine(); if (!l || l.ch) return;
  if (vn.typing) { clearInterval(vn.typing); vn.typing = 0; $("#vnText").textContent = vn.full; return; }
  vn.i++; vnShow();
}
function vnChoose(k) {
  const l = vnLine(); if (!l?.ch) return;
  const opt = l.ch[k]; if (!opt) return;
  const a = adv();
  if (l.id) a.choice[l.id] = k;
  for (const [id, n] of Object.entries(opt.a || {})) a.aff[id] = (a.aff[id] || 0) + n;
  vn.lines.splice(vn.i + 1, 0, ...(opt.r || []).map((x) => ({ ...x, o: l.o + 1 })));
  saveAdv(); setProg({ ch: vn.ch, part: vn.part, i: l.o + 1 });
  sfx("pop"); vn.i++; vnShow();
}
function vnSaveProg() {
  if (!vn.ch) return;
  const l = vn.lines[vn.i];
  setProg({ ch: vn.ch, part: vn.part, i: l ? l.o : vn.lines.length });
}
function vnExit() { vnSaveProg(); clearInterval(vn.typing); vn.typing = 0; vn.ch = null; show("adv"); }
function vnSkip() {
  const rest = vn.lines.slice(vn.i);
  if (rest.some((l) => l.ch)) {
    // dừng ở lựa chọn kế tiếp để không mất quyền chọn
    while (vn.i < vn.lines.length && !vn.lines[vn.i].ch) {
      const l = vn.lines[vn.i], skip = l.if && adv().choice[l.if[0]] !== l.if[1];
      if (l.join && !owned(l.join)) { grantChar(l.join); saveAdv(); }
      if (l.s) { vn.scene = l.s; vn.cast = []; }
      if (l.c && !skip) castIn(l.c);
      vn.i++;
    }
    return vnShow();
  }
  for (const l of rest) if (l.join && !owned(l.join)) { grantChar(l.join); saveAdv(); }
  vn.i = vn.lines.length; vnShow();
}
function vnEnd() {
  const id = vn.ch, ch = chapterOf(id); if (!ch) return;
  if (vn.part === "pre") { setProg({ ch: id, part: "battle", i: 0 }); return startBattle({ mode: "story", ch: id }); }
  // hết phần sau trận: hoàn thành chương
  const a = adv(), first = !isDone(id);
  if (first) { a.done.push(id); a.gems += ch.gems; }
  if (first || a.prog?.ch === id) a.prog = null;
  saveAdv();
  vn.ch = null;
  show("adv");
  const next = STORY[STORY.indexOf(ch) + 1];
  confetti(); sfx("unlock");
  openSheet({ title: first ? `Hoàn thành ${ch.no}!` : "Đã xem lại chương", html: `<div class="reward">
    <div class="sticker" style="width:120px">${chibi(ch.cover, { mood: "joy" })}</div>
    ${first ? `<p class="gain gems">+${fmtN(ch.gems)} ✦</p>` : ""}
    <p>${next ? `Tiếp theo: <b>${esc(next.no)} · ${esc(next.title)}</b>${chapterState(next).lock ? `<br><span class="small muted">${esc(chapterState(next).text)}</span>` : ""}` : "Bạn đã cứu cả campus Jussieu! Phần 2 đang được viết."}</p>
    <div class="two" style="width:100%"><button class="btn" data-close data-go="wish">Cầu nguyện</button>${next && !chapterState(next).lock ? `<button class="btn primary" data-act="adv-play" data-id="${next.id}">Chương tiếp</button>` : `<button class="btn primary" data-close>Tuyệt!</button>`}</div></div>` });
  paintGems();
}

// --- trận chiến kiến thức ---
const bt = { on: false };
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function prepQ([q, opts, x], md0 = false) { // trộn đáp án; đáp án đúng nằm ở vị trí 0 trong dữ liệu
  const order = shuffle([0, 1, 2, 3].slice(0, opts.length));
  return { q, o: order.map((k) => opts[k]), a: order.indexOf(0), x, md: md0 };
}
function startBattle({ mode, ch, qs, title, boss, src }) {
  const c = ch ? chapterOf(ch) : null;
  const bid = boss || c?.boss || "nhieu";
  const bank = qs || QB[c.topic];
  Object.assign(bt, { on: true, mode, ch, src: src || "", boss: bid, max: BOSS[bid].hp, hp: BOSS[bid].hp, hearts: 3, maxH: 3, bank, qs: shuffle(bank), qi: 0, cur: null, combo: 0, used: {}, shield: 0, mult: 1, last: 0, answered: false, over: false,
    scene: c?.scene || "lab", title: title || `${c.no} · ${BOSS[bid].name}`, n: 0 });
  show("battle");
  nextQ();
}
function nextQ() {
  if (bt.qi >= bt.qs.length) { bt.qs = shuffle(bt.bank); bt.qi = 0; }
  const raw = bt.qs[bt.qi++];
  bt.cur = Array.isArray(raw) ? prepQ(raw) : raw.o ? { ...raw } : prepQ([raw.q, raw.opts, raw.x], true);
  bt.answered = false; bt.note = ""; bt.n++;
  renderBattle();
}
function renderBattle() {
  if (!bt.on || !bt.cur) return;
  $("#btTitle").textContent = bt.title;
  $("#btHearts").innerHTML = Array.from({ length: bt.maxH }, (_, i) => `<span class="${i < bt.hearts ? "" : "lost"}">❤️</span>`).join("");
  $("#btHearts").setAttribute("aria-label", `Còn ${bt.hearts}/${bt.maxH} tim`);
  const st = $("#btStage");
  st.innerHTML = `${sceneArt(bt.scene, { dark: true })}<div class="hp-wrap"><b>${esc(BOSS[bt.boss].name)} · ${Math.max(0, bt.hp)}/${bt.max}</b><span class="hp" role="progressbar" aria-label="Máu của ${esc(BOSS[bt.boss].name)}" aria-valuemin="0" aria-valuemax="${bt.max}" aria-valuenow="${Math.max(0, bt.hp)}"><i style="width:${Math.max(0, (bt.hp / bt.max) * 100)}%"></i></span></div><div class="boss" id="btBoss">${bossArt(bt.boss)}</div>${bt.combo >= 2 ? `<span class="combo">Combo ×${bt.combo}</span>` : ""}`;
  const party = partyOf();
  $("#btParty").innerHTML = party.length ? party.map((id) => { const c = CHARS[id], used = bt.used[id], cutBlocked = (c.k === "cut1" || c.k === "cut2") && bt.answered, echoBlocked = c.k === "echo" && !bt.last;
    return `<div class="pm"><span class="av" style="--c:${c.bg}">${faceIcon(id)}</span><button data-skill="${id}" ${used || cutBlocked || echoBlocked || bt.over ? "disabled" : ""} class="${(c.k === "shield" && bt.shield) || ((c.k === "x2" || c.k === "x3") && bt.mult > 1 && bt.used[id]) ? "armed" : ""}" title="${esc(c.skill[1])}">${esc(c.skill[0])}</button></div>`; }).join("")
    : `<p class="small center" style="opacity:.85">Chưa có ai trong đội. Đọc truyện hoặc cầu nguyện để có đồng đội.</p>`;
  const q = bt.cur;
  const opt = (o) => (q.md ? md(o) : esc(o));
  $("#btQ").innerHTML = `<span class="qn">Câu ${bt.n}${bt.shield ? " · 🛡️ đang có lá chắn" : ""}${bt.mult > 1 ? ` · ✨ đòn kế ×${bt.mult}` : ""}</span><div class="qt">${q.md ? md(q.q) : esc(q.q)}</div>
    <div class="stack" style="gap:8px" id="btOpts">${q.o.map((o, i) => `<button class="opt ${q.gone?.includes(i) ? "gone" : ""} ${bt.answered && i === q.a ? "ok" : ""} ${bt.answered && i === q.pick && i !== q.a ? "bad" : ""}" data-opt="${i}" ${bt.answered || q.gone?.includes(i) ? "disabled" : ""} ${window.__QA && i === q.a ? "data-correct" : ""}>${opt(o)}</button>`).join("")}</div>
    ${bt.answered ? `<div class="explain">${q.pick === undefined ? esc(bt.note || "") : `${q.pick === q.a ? "Đúng rồi! " : "Chưa đúng. "}${q.md ? md(q.x || "") : esc(q.x || "")}`}</div><button class="adv-btn block" id="btNext">${bt.hp <= 0 ? "Chiến thắng!" : bt.hearts <= 0 ? "Xem kết quả" : "Câu tiếp"} ${icon("arrow")}</button>` : ""}`;
  if (q.md) typeset($("#btQ"));
}
function answer(i) {
  if (bt.answered || bt.over) return;
  const q = bt.cur; bt.answered = true; q.pick = i;
  if (i === q.a) {
    bt.combo++;
    const dmg = Math.round(25 * (1 + 0.2 * Math.min(bt.combo - 1, 3)) * bt.mult);
    bt.mult = 1; bt.last = dmg; bt.hp -= dmg;
    renderBattle(); hitFx(dmg); sfx("pop");
  } else {
    bt.combo = 0;
    if (bt.shield) { bt.shield = 0; renderBattle(); toast("Lá chắn của Ohmi đã đỡ đòn!"); sfx("tick"); }
    else { bt.hearts--; renderBattle(); const s = $("#btStage"); s.classList.remove("shake"); void s.offsetWidth; s.classList.add("shake"); sfx("fail"); }
  }
  $("#btNext")?.focus({ preventScroll: true });
}
function hitFx(dmg) {
  const boss = $("#btBoss"); if (!boss) return;
  if (bt.hp <= 0) boss.classList.add("down"); else { boss.classList.remove("hit"); void boss.offsetWidth; boss.classList.add("hit"); }
  if (reduceMotion) return;
  $("#btStage").insertAdjacentHTML("beforeend", `<span class="dmg">−${dmg}</span>`);
  setTimeout(() => $("#btStage .dmg")?.remove(), 1000);
}
function useSkill(id) {
  const c = CHARS[id]; if (!c || bt.used[id] || bt.over) return;
  const q = bt.cur;
  if ((c.k === "cut1" || c.k === "cut2") && bt.answered) return;
  if (c.k === "echo" && !bt.last) return toast("Chưa có đòn nào để lặp lại");
  bt.used[id] = 1; sfx("chime");
  if (c.k === "shield") { bt.shield = 1; toast(`${c.name}: câu sai kế tiếp không mất tim`); }
  else if (c.k === "x2" || c.k === "x3") { bt.mult = c.k === "x2" ? 2 : 3; toast(`${c.name}: đòn đúng kế tiếp ×${bt.mult}`); }
  else if (c.k === "heal") { bt.hearts = Math.min(bt.maxH, bt.hearts + 1); toast(`${c.name} hồi 1 tim`); }
  else if (c.k === "full") { bt.hearts = bt.maxH; toast(`${c.name} hồi đầy tim`); }
  else if (c.k === "cut1" || c.k === "cut2") {
    const wrong = shuffle(q.o.map((_, i) => i).filter((i) => i !== q.a && !q.gone?.includes(i)));
    q.gone = [...(q.gone || []), ...wrong.slice(0, c.k === "cut1" ? 1 : 2)];
    toast(`${c.name} đã loại ${c.k === "cut1" ? "1 đáp án sai" : "2 đáp án sai"}`);
  } else if (c.k === "echo") {
    bt.hp -= bt.last;
    if (bt.hp <= 0) { bt.answered = true; bt.note = `${c.name} lặp lại đòn ${bt.last} sát thương và hạ gục quái vật!`; }
    renderBattle(); hitFx(bt.last); toast(`${c.name} lặp lại đòn ${bt.last} sát thương!`);
    return;
  }
  renderBattle();
}
function battleNext() {
  if (bt.hp <= 0) return battleWin();
  if (bt.hearts <= 0) return battleLose();
  nextQ();
}
function battleWin() {
  bt.over = true; bt.on = false;
  if (bt.mode === "story") { const id = bt.ch; setProg({ ch: id, part: "post", i: 0 }); sfx("unlock"); toast("Chiến thắng!", 2200); return startVN(id, "post", 0); }
  const d = advDay(), big = d.tr < 3; d.tr++;
  const g = earn(big ? 100 : 20);
  show("adv"); confetti(); sfx("unlock");
  openSheet({ title: "Thắng trận đấu tập!", html: `<div class="reward"><div class="sticker" style="width:110px">${chibi(partyOf()[0] || "ohmi", { mood: "joy" })}</div><p class="gain gems">+${g} ✦</p><p>${big ? `Còn ${3 - d.tr} lần thưởng lớn hôm nay.` : "Hôm nay đã hết thưởng lớn, mỗi trận thắng vẫn được 20 ✦."}</p><div class="two" style="width:100%"><button class="btn" data-close>Nghỉ</button><button class="btn primary" data-act="train">Đấu tiếp</button></div></div>` });
}
function battleLose() {
  bt.over = true;
  sfx("fail");
  const retry = { mode: bt.mode, ch: bt.ch, qs: bt.mode === "train" ? bt.bank : null, title: bt.title, boss: bt.boss, src: bt.src };
  bt.on = false;
  show("adv");
  openSheet({ title: "Thua mất rồi…", html: `<div class="reward"><div class="sticker" style="width:110px">${chibi(partyOf()[0] || "ohmi", { mood: "sad" })}</div><p>Không sao! Đọc lại phần giải thích, ôn thêm một chút rồi thử lại nhé. Mỗi câu sai là một điều mới học được.</p><div class="two" style="width:100%"><button class="btn" data-close>Để sau</button><button class="btn primary" id="btRetry">Thử lại</button></div></div>`,
    onMount: (el) => $("#btRetry", el).addEventListener("click", () => { closeSheet(); startBattle(retry); }) });
}
function exitBattle() {
  openConfirm({ title: "Rời trận đấu?", text: bt.mode === "story" ? "Bạn có thể quay lại đánh tiếp bất cứ lúc nào." : "Trận đấu tập này sẽ không được tính.", yes: "Rời trận",
    onYes: () => { bt.on = false; show("adv"); } });
}

// --- đấu tập: câu hỏi có sẵn, từ flashcards, hoặc Claude soạn từ tài liệu ---
function deckQuiz(deckId) {
  const cards = (state.decks[deckId] || []).filter((c) => c.front && c.back);
  if (cards.length < 4) return null;
  return shuffle(cards).slice(0, 8).map((c) => {
    const others = shuffle(cards.filter((x) => x.id !== c.id && x.back !== c.back)).slice(0, 3).map((x) => x.back);
    return { q: c.front, opts: [c.back, ...others], x: c.mnemonic ? `Mẹo nhớ: ${c.mnemonic}` : "Lật lại thẻ này trong phần Ôn tập nếu bạn còn phân vân." };
  }).filter((x) => x.opts.length === 4);
}
function openTrain() {
  const decks = deckList().filter((d) => (state.decks[d.id] || []).length >= 4);
  const d = advDay();
  openSheet({ title: "Đấu tập", html: `<p class="small muted">Thắng một trận được ${d.tr < 3 ? `<b>+100 ✦</b> (còn ${3 - d.tr} lần hôm nay)` : "+20 ✦"}. Chọn nguồn câu hỏi:</p>
    <div class="stack" style="gap:8px">
      <button class="menu-i" data-train="mix"><span class="badge-ic" style="background:var(--t-butter)">${icon("bulb")}</span><span><strong>Điện học L1 có sẵn</strong><span class="faint small">32 câu: định luật Ohm, Kirchhoff, tụ điện, diode</span></span></button>
      ${decks.map((x) => `<button class="menu-i" data-train="deck:${esc(x.id)}"><span class="badge-ic" style="background:var(--t-sky)">${icon("cards")}</span><span><strong>${esc(x.title)}</strong><span class="faint small">Từ ${(state.decks[x.id] || []).length} flashcards của bạn</span></span></button>`).join("")}
      ${state.courses.map((c) => `<button class="menu-i" data-train="course:${esc(c.id)}"><span class="badge-ic" style="background:var(--t-mint)">${icon("sparkle")}</span><span><strong>${esc(c.title)}</strong><span class="faint small">Claude soạn 6 câu từ tài liệu (trang ${rangeOf(c).join("–")})</span></span></button>`).join("")}
      <div class="small" id="trMsg"></div>
    </div>`,
    onMount: (el) => el.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-train]"); if (!b || b.disabled) return;
      const [kind, id] = b.dataset.train.split(/:(.*)/s);
      if (kind === "mix") { closeSheet(); return startBattle({ mode: "train", qs: Object.values(QB).flat(), title: "Đấu tập · Điện học", boss: "nhieu" }); }
      if (kind === "deck") { const qs = deckQuiz(id); if (!qs?.length) return toast("Bộ thẻ cần ít nhất 4 thẻ khác nhau"); closeSheet(); return startBattle({ mode: "train", qs, title: `Đấu tập · ${deckTitle(id)}`, boss: "roi" }); }
      const c = state.courses.find((x) => x.id === id); if (!c) return;
      const msg = $("#trMsg", el); $$("[data-train]", el).forEach((x) => (x.disabled = true));
      msg.innerHTML = thinking("Claude đang soạn câu hỏi…");
      try {
        const qs = await courseQuiz(c);
        if (!el.isConnected) return;
        closeSheet(); startBattle({ mode: "train", qs, title: `Đấu tập · ${c.title}`, boss: "xa", src: c.id });
      } catch (err) { if (el.isConnected) { msg.innerHTML = `<span class="err">${esc(err?.code === "no_claude" ? NEED_CLAUDE : err?.code === "empty" ? "Tài liệu này chưa có chữ để soạn câu hỏi." : sampleErr(err))}</span>`; $$("[data-train]", el).forEach((x) => (x.disabled = false)); } }
    }) });
}
async function courseQuiz(c) {
  const sample = await getSample(); if (!sample) throw { code: "no_claude" };
  const pages = await loadCourseText(c);
  const [from, to] = rangeOf(c, pages.length || c.pageCount);
  let text = pages.slice(from - 1, to).map((p, i) => `--- page ${from + i} ---\n${p}`).join("\n");
  if (!text.trim()) throw { code: "empty" };
  text = text.slice(0, 40000);
  const r = await sample.json(`Tu prépares un mini-jeu de révision pour un·e étudiant·e vietnamien·ne de L1 EEA (Sorbonne Université).
À partir du cours « ${c.title} » ci-dessous, écris 6 QCM variés (définitions, calculs simples, pièges classiques), chacun avec exactement 4 options et UNE seule bonne réponse. Questions et options en français, comme à l'examen. Explication courte en vietnamien (garde les termes français entre parenthèses). Formules en LaTeX entre \\( \\). Base-toi uniquement sur le cours.
Réponds UNIQUEMENT avec un JSON : {"questions": [{"q": "...", "options": ["...", "...", "...", "..."], "answer": 0, "explain_vi": "..."}]}

Cours :
"""${text}"""`, { cache: false });
  const qs = (Array.isArray(r?.questions) ? r.questions : [])
    .filter((q) => q && typeof q.q === "string" && Array.isArray(q.options) && q.options.length === 4 && q.options.every((o) => typeof o === "string") && Number.isInteger(+q.answer) && +q.answer >= 0 && +q.answer < 4)
    .map((q) => { const opts = [q.options[+q.answer], ...q.options.filter((_, i) => i !== +q.answer)]; return { q: q.q, opts, x: String(q.explain_vi || "") }; });
  if (qs.length < 3) throw { code: "invalid_json" };
  return qs;
}

// --- ở màn Hôm nay: bạn đồng hành nói chuyện ---
function compTalk(el) {
  const id = adv().comp, c = CHARS[id]; if (!c) return;
  $("#hBubble").textContent = `${c.name}: ${pickOne(c.quotes)}`;
  hopEl(el); sfx("pop");
}

// --- trình đọc & trận đấu: sự kiện ---
$("#vnBox").addEventListener("click", vnNext);
$("#vnChoices").addEventListener("click", (e) => { e.stopPropagation(); const b = e.target.closest("[data-k]"); if (b) vnChoose(+b.dataset.k); });
$("#vnExit").addEventListener("click", vnExit);
$("#vnSkip").addEventListener("click", vnSkip);
document.addEventListener("keydown", (e) => {
  if (state.view !== "vn" || !sheetRoot.hidden || e.target.closest("button, input, textarea")) return;
  if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") { e.preventDefault(); vnNext(); }
});
$("#btQ").addEventListener("click", (e) => { const o = e.target.closest("[data-opt]"); if (o && !o.disabled) return answer(+o.dataset.opt); if (e.target.closest("#btNext")) battleNext(); });
$("#btParty").addEventListener("click", (e) => { const b = e.target.closest("[data-skill]"); if (b && !b.disabled) useSkill(b.dataset.skill); });
$("#btExit").addEventListener("click", exitBattle);
$("#advSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-seg]"); if (!b) return; advSeg = b.dataset.seg; const v = Object.keys(ADV_SEG).find((k) => ADV_SEG[k] === advSeg); state.view = v; history.replaceState(null, "", "#" + v); renderAdv(); sfx("tick"); });
