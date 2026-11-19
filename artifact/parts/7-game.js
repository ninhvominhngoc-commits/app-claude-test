
// ================= trò chơi: mỗi môn là một nguyên tử =================
const EL_SYM = "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(" ");
const EL_FR = ("Hydrogène|Hélium|Lithium|Béryllium|Bore|Carbone|Azote|Oxygène|Fluor|Néon|Sodium|Magnésium|Aluminium|Silicium|Phosphore|Soufre|Chlore|Argon|Potassium|Calcium|"
  + "Scandium|Titane|Vanadium|Chrome|Manganèse|Fer|Cobalt|Nickel|Cuivre|Zinc|Gallium|Germanium|Arsenic|Sélénium|Brome|Krypton|Rubidium|Strontium|Yttrium|Zirconium|"
  + "Niobium|Molybdène|Technétium|Ruthénium|Rhodium|Palladium|Argent|Cadmium|Indium|Étain|Antimoine|Tellure|Iode|Xénon|Césium|Baryum|Lanthane|Cérium|Praséodyme|Néodyme|"
  + "Prométhium|Samarium|Europium|Gadolinium|Terbium|Dysprosium|Holmium|Erbium|Thulium|Ytterbium|Lutécium|Hafnium|Tantale|Tungstène|Rhénium|Osmium|Iridium|Platine|Or|Mercure|"
  + "Thallium|Plomb|Bismuth|Polonium|Astate|Radon|Francium|Radium|Actinium|Thorium|Protactinium|Uranium|Neptunium|Plutonium|Américium|Curium|Berkélium|Californium|Einsteinium|Fermium|"
  + "Mendélévium|Nobélium|Lawrencium|Rutherfordium|Dubnium|Seaborgium|Bohrium|Hassium|Meitnerium|Darmstadtium|Roentgenium|Copernicium|Nihonium|Flérovium|Moscovium|Livermorium|Tennesse|Oganesson").split("|");
function elPos(z) { // [hàng, cột] trong bảng tuần hoàn 18 cột; hàng 9–10 là họ Lantan/Actini
  if (z === 1) return [1, 1]; if (z === 2) return [1, 18];
  if (z <= 10) return [2, z <= 4 ? z - 2 : z + 8];
  if (z <= 18) return [3, z <= 12 ? z - 10 : z];
  if (z <= 36) return [4, z - 18];
  if (z <= 54) return [5, z - 36];
  if (z <= 56) return [6, z - 54];
  if (z <= 71) return [9, z - 54];
  if (z <= 86) return [6, z - 68];
  if (z <= 88) return [7, z - 86];
  if (z <= 103) return [10, z - 86];
  return [7, z - 100];
}
const CAT = {
  alkali: ["#ff9bb7", "Kim loại kiềm"], alkaline: ["#ffb38a", "Kim loại kiềm thổ"], transition: ["#93b6ff", "Kim loại chuyển tiếp"],
  post: ["#9fd8e6", "Kim loại yếu"], metalloid: ["#7fd9ab", "Á kim"], nonmetal: ["#f1c75e", "Phi kim"], halogen: ["#d3f07a", "Halogen"],
  noble: ["#b8adff", "Khí hiếm"], lan: ["#f7a8e0", "Họ Lantan"], act: ["#ffa6a6", "Họ Actini"],
};
function elCat(z) {
  const [r, c] = elPos(z);
  if (r === 9) return "lan"; if (r === 10) return "act";
  if (c === 18) return "noble"; if (c === 17) return "halogen";
  if ([1, 6, 7, 8, 15, 16, 34].includes(z)) return "nonmetal";
  if (c === 1) return "alkali"; if (c === 2) return "alkaline";
  if (c <= 12) return "transition";
  if ([5, 14, 32, 33, 51, 52].includes(z)) return "metalloid";
  return "post";
}
const elName = (z) => (z >= 1 && z <= 118 ? `${EL_FR[z - 1]} (${EL_SYM[z - 1]})` : "Chưa có electron");

// --- môn học & điểm ---
const FREE = "free";
function subjects() {
  return [...state.courses.map((c) => ({ id: c.id, name: c.title, tint: tintOf(c.id) })), { id: FR, name: "Tiếng Pháp", tint: "sky" }, { id: FREE, name: "Tự học khác", tint: "butter" }];
}
const subjOf = (id) => subjects().find((s) => s.id === id) || { id, name: "Môn đã xoá", tint: "lav" };
const atomOf = (id) => (state.atoms[id] ||= { e: 0, min: 0, n: 0, rc: 0 });
const zOf = (id) => Math.min(118, state.atoms[id]?.e || 0);
const saveAtoms = () => save("atoms", { list: state.atoms });
const totalE = () => Object.values(state.atoms).reduce((n, a) => n + Math.min(118, a.e || 0), 0);
const maxZ = () => Object.values(state.atoms).reduce((m, a) => Math.max(m, Math.min(118, a.e || 0)), 0);
const LEVELS = [[0, "Hạt quark"], [10, "Proton tò mò"], [30, "Nguyên tử nhỏ"], [60, "Phân tử chăm chỉ"], [100, "Kỹ sư tập sự"], [160, "Thợ mạch điện"], [240, "Nhà vật lý trẻ"], [340, "Giáo sư Jussieu"], [460, "Huyền thoại Sorbonne"]];
function levelInfo() {
  const t = totalE(); let i = 0;
  while (i + 1 < LEVELS.length && t >= LEVELS[i + 1][0]) i++;
  const next = LEVELS[i + 1];
  return { i, n: i + 1, title: LEVELS[i][1], t, base: LEVELS[i][0], next: next ? next[0] : null, pct: next ? (t - LEVELS[i][0]) / (next[0] - LEVELS[i][0]) : 1 };
}
function addElectrons(id, n) {
  if (n <= 0) return { news: [], levelUp: 0 };
  const lv0 = levelInfo().i, a = atomOf(id), z0 = Math.min(118, a.e);
  a.e = Math.min(118, a.e + n);
  saveAtoms();
  const news = [];
  for (let z = z0 + 1; z <= a.e; z++) news.push(z);
  const lv1 = levelInfo().i;
  return { news, levelUp: lv1 > lv0 ? lv1 + 1 : 0 };
}
function lastSubject() {
  const id = lsGet("focusSubj");
  const list = subjects();
  return list.find((s) => s.id === id) || list.slice().sort((a, b) => (state.atoms[b.id]?.min || 0) - (state.atoms[a.id]?.min || 0))[0];
}
// Ôn flashcards: cứ 10 thẻ = 1 electron cho môn của bộ thẻ
function rewardReview(deck) {
  const a = atomOf(deck); a.rc = (a.rc || 0) + 1;
  if (a.rc % 10) { saveAtoms(); return; }
  const r = addElectrons(deck, 1);
  toast(`+1 e⁻ cho ${subjOf(deck).name} (10 thẻ đã ôn)` + (r.news.length ? ` → ${elName(r.news[r.news.length - 1])}` : ""), 3600);
}
// --- nhiệm vụ hằng ngày ---
function quests() {
  const d = state.stats.days[todayISO()] || {}, f = d.f || 0, r = d.r || 0, fe = d.fe || 0;
  return [
    { t: "Tập trung 25 phút", v: `${f}/25 phút`, p: Math.min(1, f / 25), act: f < 25 ? ["focus-open", "Bắt đầu"] : null },
    { t: "Ôn 10 thẻ hoặc hết thẻ đến hạn", v: `${r} thẻ`, p: r >= 10 || (r > 0 && totalDue() === 0) ? 1 : r / 10, act: totalDue() ? ["review-all", "Ôn"] : null },
    { t: "Tự giảng lại 1 khái niệm", v: fe ? "Xong" : "Chế độ Feynman", p: fe ? 1 : 0, act: !fe && state.courses.length ? ["go-study", "Học"] : null },
  ];
}
function checkGold() {
  const d = state.stats.days[todayISO()];
  if (!d || d.gold || !quests().every((q) => q.p >= 1)) return;
  d.gold = 1; saveStats();
  confetti(); toast("Ngày hoàn hảo! Cả 3 nhiệm vụ đã xong", 4000);
}

// --- vẽ nguyên tử (canvas, chuyển động nhẹ) ---
const SPACE = { lav: "#b8adff", sky: "#93b6ff", mint: "#7fd9ab", peach: "#ffb38a", rose: "#ff9bb7", butter: "#f1c75e" };
const SHELLS = [2, 8, 18, 32, 32, 18, 8];
const atomViews = new Set();
let atomRaf = 0;
function mountAtom(host, { z, tint = "lav", seed = "x", scale = 1, cx = 0.5, cy = 0.55 }) {
  if (!host) return;
  host.querySelector(":scope > .atom-cv")?.remove();
  const cv = document.createElement("canvas"); cv.className = "atom-cv"; cv.setAttribute("aria-hidden", "true");
  host.prepend(cv);
  let h = hashOf(seed) || 7;
  const rnd = () => ((h = (Math.imul(h, 1103515245) + 12345) >>> 0) / 4294967296);
  atomViews.add({ cv, z, color: SPACE[tint] || SPACE.lav, scale, cx, cy, stars: Array.from({ length: 46 }, () => [rnd(), rnd(), rnd()]), t0: performance.now() - rnd() * 10000 });
  kickAtoms();
}
function kickAtoms() { if (!atomRaf) atomRaf = requestAnimationFrame(frameAtoms); }
function frameAtoms(now) {
  atomRaf = 0;
  let live = false;
  for (const v of atomViews) {
    if (!v.cv.isConnected) { atomViews.delete(v); continue; }
    if (v.cv.offsetParent === null) continue;
    drawAtom(v, reduceMotion ? 0 : (now - v.t0) / 1000);
    live = true;
  }
  if (live && !reduceMotion) atomRaf = requestAnimationFrame(frameAtoms);
}
function drawAtom(v, t) {
  const cv = v.cv, w = cv.clientWidth, hgt = cv.clientHeight;
  if (!w || !hgt) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hgt * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hgt * dpr); }
  const g = cv.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, hgt);
  for (const [x, y, s] of v.stars) {
    g.globalAlpha = 0.18 + 0.55 * Math.abs(Math.sin(t * (0.4 + s) + s * 20));
    g.fillStyle = "#ffffff"; const d = s > 0.88 ? 1.8 : 1; g.fillRect(x * w, y * hgt, d, d);
  }
  g.globalAlpha = 1;
  const z = v.z, shells = [];
  let left = z;
  for (const cap of SHELLS) { if (left <= 0) break; shells.push(Math.min(cap, left)); left -= cap; }
  const cx = w * v.cx, cy = hgt * v.cy, tilt = -0.34, sq = 0.36;
  const maxR = Math.min(w * 0.47, hgt * 1.05) * v.scale;
  const nucR = Math.max(5, Math.min(17, 4 + Math.sqrt(z + 1) * 1.35)) * Math.max(0.75, v.scale) * (1 + 0.04 * Math.sin(t * 2));
  const span = Math.max(shells.length, 2.4);
  const radii = shells.map((_, i) => nucR * 1.9 + (maxR - nucR * 1.9) * ((i + 1) / span));
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const pts = [];
  shells.forEach((n, i) => {
    const R = radii[i], dir = i % 2 ? -1 : 1, sp = 0.85 / (i + 1);
    g.beginPath(); g.ellipse(cx, cy, R, R * sq, tilt, 0, Math.PI * 2);
    g.strokeStyle = v.color; g.globalAlpha = 0.22; g.lineWidth = 1; g.stroke(); g.globalAlpha = 1;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + i * 0.7 + t * sp * dir;
      const ex = R * Math.cos(a), ey = R * sq * Math.sin(a);
      pts.push({ x: cx + ex * ct - ey * st, y: cy + ex * st + ey * ct, front: Math.sin(a) > 0 });
    }
  });
  const dot = (p) => { g.beginPath(); g.arc(p.x, p.y, (p.front ? 2.5 : 1.9) * Math.max(0.8, v.scale), 0, Math.PI * 2); g.fill(); };
  g.fillStyle = v.color; g.shadowColor = v.color; g.shadowBlur = 8;
  g.globalAlpha = 0.5; pts.filter((p) => !p.front).forEach(dot);
  g.globalAlpha = 1; g.shadowBlur = 0;
  const glow = g.createRadialGradient(cx, cy, 0, cx, cy, nucR * 3.4);
  glow.addColorStop(0, v.color); glow.addColorStop(0.35, v.color + "55"); glow.addColorStop(1, v.color + "00");
  g.fillStyle = glow; g.beginPath(); g.arc(cx, cy, nucR * 3.4, 0, Math.PI * 2); g.fill();
  const core = g.createRadialGradient(cx - nucR * 0.35, cy - nucR * 0.35, nucR * 0.1, cx, cy, nucR);
  core.addColorStop(0, "#ffffff"); core.addColorStop(0.55, v.color); core.addColorStop(1, v.color + (z ? "ee" : "66"));
  g.fillStyle = core; g.beginPath(); g.arc(cx, cy, nucR, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#ffffff"; g.shadowColor = v.color; g.shadowBlur = 10;
  pts.filter((p) => p.front).forEach(dot);
  g.shadowBlur = 0;
}

// --- widget ở màn Hôm nay ---
const fmtLeft = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
function renderWidgets() {
  const box = $("#hWidgets"); if (!box) return;
  const f = state.focus?.endAt ? state.focus : null;
  const subj = f ? subjOf(f.subject) : lastSubject();
  const z = zOf(subj.id), a = state.atoms[subj.id] || { min: 0 };
  const lv = levelInfo(), n = streak(), t = todayISO();
  // lịch nhiệt tháng này
  const first = t.slice(0, 8) + "01", pad = (new Date(first + "T12:00:00Z").getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7), 0)).getUTCDate();
  let heat = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => `<span>${d}</span>`).join("") + "<i class=\"pad\"></i>".repeat(pad);
  for (let d = 1; d <= days; d++) {
    const iso = t.slice(0, 8) + String(d).padStart(2, "0"), x = state.stats.days[iso] || {};
    const score = (x.f || 0) + (x.r || 0) + (x.m || 0) * 2;
    heat += `<i class="${score >= 50 ? "l3" : score >= 20 ? "l2" : score > 0 ? "l1" : ""} ${x.gold ? "gold" : ""} ${iso === t ? "today" : ""}" title="${iso}"></i>`;
  }
  const q = quests(), done = q.filter((x) => x.p >= 1).length;
  box.innerHTML = `
    <button class="widget space" data-act="focus-open" id="wFocus" aria-label="${f ? "Đang tập trung, mở đồng hồ" : "Bắt đầu một phiên tập trung"}">
      <div><p class="w-title">${f ? "Đang tập trung" : "Tập trung"}</p><p class="w-sub">${esc(f ? subj.name : "Pomodoro · 1 e⁻ mỗi 5 phút")}</p></div>
      <div class="w-row"><span class="w-big" data-left>${f ? fmtLeft(f.endAt - Date.now()) : "25:00"}</span><span class="play ${f ? "on" : ""}">${icon(f ? "stop" : "play")}</span></div>
    </button>
    <button class="widget space" data-go="lab" id="wAtom" aria-label="Mở phòng thí nghiệm">
      <div><p class="w-title" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(subj.name)}</p><p class="w-sub">${z ? esc(EL_FR[z - 1]) : "Chưa có electron"}</p></div>
      <div class="w-row"><span class="w-foot"><b>${(a.min / 60).toFixed(1)}</b>giờ</span><span class="sym-chip">${z ? EL_SYM[z - 1] : "·"}</span></div>
    </button>
    <div class="widget space wide">
      <div class="heat-head"><p class="w-title">Tháng ${+t.slice(5, 7)}</p><span class="flame">${icon("flame")} ${n} ngày liên tiếp</span></div>
      <div class="heat">${heat}</div>
    </div>
    <div class="widget space wide">
      <div class="heat-head"><p class="w-title">Nhiệm vụ hôm nay</p><span class="w-sub">${done}/3</span></div>
      <ul class="quests">${q.map((x) => `<li><span class="qdot ${x.p >= 1 ? "done" : ""}" style="--p:${x.p.toFixed(2)}">${x.p >= 1 ? icon("check") : ""}</span><span>${esc(x.t)}<small>${esc(x.v)}</small></span>${x.act && x.p < 1 ? `<button class="btn space-btn" data-act="${x.act[0]}">${x.act[1]}</button>` : ""}</li>`).join("")}</ul>
      <button class="lvl" data-go="lab" style="all:unset;cursor:pointer;display:grid;gap:6px"><span class="lvl-top"><span>Cấp ${lv.n} · <b>${esc(lv.title)}</b></span><span>${lv.t} e⁻${lv.next ? " / " + lv.next : ""}</span></span><span class="xp"><i style="width:${Math.round(lv.pct * 100)}%"></i></span></button>
    </div>`;
  mountAtom($("#wFocus"), { z: Math.max(z, 1), tint: subj.tint, seed: "f" + subj.id, scale: 0.55, cx: 0.72, cy: 0.42 });
  mountAtom($("#wAtom"), { z, tint: subj.tint, seed: subj.id, scale: 0.62, cx: 0.66, cy: 0.5 });
}

// --- phòng thí nghiệm ---
function renderLab() {
  const lv = levelInfo(), mz = maxZ();
  $("#labLevel").innerHTML = `<div class="lvl"><span class="lvl-top"><span>Cấp ${lv.n} · <b>${esc(lv.title)}</b></span><span>${lv.t} e⁻${lv.next ? " / " + lv.next : " · tối đa"}</span></span><span class="xp"><i style="width:${Math.round(lv.pct * 100)}%"></i></span>
    <span class="w-sub">${lv.next ? `Còn ${lv.next - lv.t} electron nữa để lên cấp ${lv.n + 1}` : "Bạn đã đạt cấp cao nhất!"}</span></div>`;
  const list = subjects();
  $("#labAtoms").innerHTML = list.map((s) => {
    const z = zOf(s.id), a = state.atoms[s.id] || { min: 0, n: 0 };
    return `<div class="widget space atom-card" data-atom="${esc(s.id)}">
      <div><p class="w-title" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.name)}</p><p class="w-sub">${z ? `${esc(EL_FR[z - 1])} · Z = ${z}` : "Chưa có electron"}</p></div>
      <div class="w-row"><span class="w-foot"><b>${(a.min / 60).toFixed(1)}</b>giờ · ${a.n || 0} phiên</span><button class="play" data-act="focus-subj" data-id="${esc(s.id)}" aria-label="Tập trung cho ${esc(s.name)}">${icon("play")}</button></div>
    </div>`;
  }).join("");
  $$("#labAtoms [data-atom]").forEach((el) => { const s = subjOf(el.dataset.atom); mountAtom(el, { z: zOf(s.id), tint: s.tint, seed: s.id, scale: 0.78, cx: 0.5, cy: 0.5 }); });
  let cells = "";
  for (let z = 1; z <= 118; z++) {
    const [r, c] = elPos(z), on = z <= mz;
    cells += `<button class="el ${on ? "on" : ""} ${z === mz ? "last" : ""}" style="grid-row:${r};grid-column:${c};--cat:${CAT[elCat(z)][0]}" data-act="el-info" data-z="${z}" aria-label="${esc(EL_FR[z - 1])}, số ${z}${on ? "" : ", chưa mở khoá"}" title="${esc(EL_FR[z - 1])}">${EL_SYM[z - 1]}<small>${z}</small></button>`;
  }
  $("#pt").innerHTML = cells + `<span class="pt-gap" style="grid-row:8"></span>`;
  $("#ptCount").textContent = `Đã tổng hợp ${mz}/118`;
  $("#ptLegend").innerHTML = Object.values(CAT).map(([col, name]) => `<span><i style="--cat:${col}"></i>${name}</span>`).join("");
}
function elemTile(z) { return `<div class="elem-tile" style="--cat:${CAT[elCat(z)][0]}"><span class="z">${z}</span><span class="s">${EL_SYM[z - 1]}</span><span class="n">${esc(EL_FR[z - 1])}</span></div>`; }
function openElement(z) {
  const on = z <= maxZ(), holder = subjects().find((s) => zOf(s.id) >= z);
  const best = subjects().reduce((m, s) => Math.max(m, zOf(s.id)), 0);
  openSheet({ title: EL_FR[z - 1], html: `${elemTile(z)}
    <p class="center muted small">${CAT[elCat(z)][1]} · số hiệu nguyên tử ${z}</p>
    <p class="center">${on ? `Đã tổng hợp nhờ môn <b>${esc(holder?.name || "")}</b>.` : `Chưa mở khoá: cần thêm <b>${z - best}</b> electron (${(z - best) * 5} phút tập trung) ở một môn.`}</p>
    <div class="md" id="elFact">${state.facts[z] ? md(state.facts[z]) : ""}</div>
    ${state.facts[z] ? "" : `<button class="btn soft block" id="elAsk">${icon("sparkle")} Kể chuyện thú vị về nguyên tố này</button>`}` ,
    onMount: (el) => $("#elAsk", el)?.addEventListener("click", async (ev) => {
      const sample = await getSample(); if (!sample) return toast(NEED_CLAUDE);
      const btn = ev.currentTarget, out = $("#elFact", el); btn.disabled = true; out.innerHTML = thinking("Claude đang kể…");
      try {
        const r = await sample(`Raconte en vietnamien, en 3 phrases courtes et drôles, un fait étonnant sur l'élément ${EL_FR[z - 1]} (${EL_SYM[z - 1]}, Z = ${z}), si possible lié à l'électronique, l'énergie électrique ou l'automatique (niveau L1 EEA). Garde le nom français de l'élément en gras.`, { modelTier: "quick" });
        state.facts[z] = r.text; save("facts", { list: state.facts });
        if (out.isConnected) { setMd(out, r.text); btn.remove(); }
      } catch (err) { if (out.isConnected) { out.innerHTML = `<span class="err">${esc(sampleErr(err))}</span>`; btn.disabled = false; } }
    }) });
}

// --- phiên tập trung (Pomodoro) ---
const DURS = [15, 25, 45, 60];
let focusPick = { subject: null, dur: 25 }, wakeLock = null, audio = null;
function chime() {
  try {
    if (!audio) return;
    const now = audio.currentTime;
    [[660, 0], [880, 0.18], [1320, 0.36]].forEach(([fq, d]) => {
      const o = audio.createOscillator(), gn = audio.createGain();
      o.type = "sine"; o.frequency.value = fq;
      gn.gain.setValueAtTime(0.0001, now + d); gn.gain.exponentialRampToValueAtTime(0.22, now + d + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, now + d + 0.6);
      o.connect(gn).connect(audio.destination); o.start(now + d); o.stop(now + d + 0.65);
    });
  } catch {}
}
function renderFocus() {
  const f = state.focus?.endAt ? state.focus : null;
  if (!focusPick.subject || !subjects().some((s) => s.id === focusPick.subject)) focusPick.subject = lastSubject().id;
  const subj = subjOf(f ? f.subject : focusPick.subject), z = zOf(subj.id), lv = levelInfo();
  $("#fLevel").textContent = `Cấp ${lv.n} · ${lv.title}`;
  $("#fSetup").hidden = !!f; $("#fRun").hidden = !f;
  $("#fElem").textContent = z ? `${EL_FR[z - 1]} · ${EL_SYM[z - 1]}` : subj.name;
  $("#fElemSub").textContent = z ? `${subj.name} · ${z} electron` : "Nguyên tử đang chờ electron đầu tiên";
  if (!f) {
    $("#fSubj").innerHTML = subjects().map((s) => `<button data-subj="${esc(s.id)}" aria-pressed="${s.id === focusPick.subject}">${esc(s.name)}</button>`).join("");
    $("#fDur").innerHTML = DURS.map((d) => `<button data-dur="${d}" aria-pressed="${d === focusPick.dur}">${d} phút</button>`).join("");
    const gain = Math.floor(focusPick.dur / 5), target = Math.min(118, z + gain);
    $("#fHint").textContent = `Xong phiên: +${gain} e⁻ → ${elName(target)}. Màn hình được giữ sáng; khoá máy thì đồng hồ vẫn chạy.`;
  } else {
    $("#fRunHint").textContent = `Đang nuôi nguyên tử “${subj.name}”. Cứ 5 phút trọn vẹn = 1 electron, dừng sớm vẫn giữ phần đã có.`;
    tickFocus();
  }
  mountAtom($("#fStage"), { z: f ? Math.max(z, 1) : z, tint: subj.tint, seed: "stage" + subj.id, scale: 0.95, cx: 0.5, cy: 0.46 });
}
async function startFocus() {
  const subj = subjOf(focusPick.subject);
  state.focus = { subject: subj.id, start: Date.now(), endAt: Date.now() + focusPick.dur * 60000, dur: focusPick.dur };
  save("focus", state.focus); lsSet("focusSubj", subj.id);
  try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) { audio ||= new AC(); audio.resume?.(); } } catch {}
  try { wakeLock = await navigator.wakeLock?.request("screen"); } catch { wakeLock = null; }
  renderFocus();
}
function tickFocus() {
  const f = state.focus;
  if (!f?.endAt) return;
  const left = f.endAt - Date.now();
  if (left <= 0) { finishFocus(true); return; }
  const s = fmtLeft(left);
  if (state.view === "focus") $("#fTime").textContent = s;
  $$("[data-left]").forEach((el) => (el.textContent = s));
}
function finishFocus(complete) {
  const f = state.focus; if (!f?.endAt) return;
  const minutes = complete ? f.dur : Math.min(f.dur, Math.floor((Date.now() - f.start) / 60000));
  state.focus = {}; save("focus", {});
  try { wakeLock?.release?.(); } catch {} wakeLock = null;
  const a = atomOf(f.subject); a.min += minutes; a.n = (a.n || 0) + (minutes >= 5 ? 1 : 0);
  if (minutes > 0) bump("f", minutes);
  const res = addElectrons(f.subject, Math.floor(minutes / 5));
  saveAtoms();
  if (complete) chime();
  const subj = subjOf(f.subject), gain = Math.floor(minutes / 5);
  if (state.view === "focus") renderFocus(); else render();
  if (gain) {
    confetti();
    const z = res.news[res.news.length - 1];
    openSheet({ title: complete ? "Hoàn thành phiên tập trung!" : "Đã dừng phiên tập trung", html: `<div class="reward">
      ${z ? elemTile(z) : ""}
      <p class="gain">+${gain} e⁻</p>
      <p>${esc(subj.name)}: ${minutes} phút${z ? ` · nguyên tử đã thành <b>${esc(EL_FR[z - 1])}</b>` : ""}${res.news.length > 1 ? ` (mở khoá ${res.news.length} nguyên tố mới)` : ""}.</p>
      ${res.levelUp ? `<p class="tag c-holiday">Lên cấp ${res.levelUp}: ${esc(LEVELS[res.levelUp - 1][1])}!</p>` : ""}
      <p class="muted small">Nghỉ 5 phút, uống nước rồi quay lại nhé.</p>
      <div class="two" style="width:100%"><button class="btn" data-close>Nghỉ đã</button><button class="btn primary" data-act="focus-open">Phiên mới</button></div></div>` });
  } else toast(minutes ? `Đã ghi ${minutes} phút. Cần đủ 5 phút để có 1 electron.` : "Đã dừng phiên tập trung");
  checkGold();
}
function openFocus() { closeSheet(); show("focus"); }
setInterval(tickFocus, 1000);
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible") return;
  tickFocus(); kickAtoms();
  if (state.focus?.endAt && !wakeLock) { try { wakeLock = await navigator.wakeLock?.request("screen"); } catch {} }
});
