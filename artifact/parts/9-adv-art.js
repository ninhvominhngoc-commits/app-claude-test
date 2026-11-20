// ================= tranh SVG tối giản: bé mèo Elec, các Linh Kiện, quái vật, cảnh =================
// Nhân vật gốc của app, vẽ bằng khối phẳng: không viền, mắt chấm, má hồng nhạt.
// Mỗi Linh Kiện mang đúng hình linh kiện của mình: điện trở, tụ hoá, nút mạch, cuộn cảm, cổng AND, LED, transistor, op-amp.
const SB_INK = "#6b4e42", FACE = "#3b2f2b", FACE_LT = "#fff7ec", CHEEK = "#f29b8f", LEAD = "#b4aba1", LEAD_DK = "#978d84";
let svgN = 0;
const st = (w = 1.8) => `stroke="${SB_INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const ln = (d, col, w = 5) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const zzz = (x, y, k = 1, col = FACE) => `<text x="${x}" y="${y}" font-family="Baloo 2, sans-serif" font-weight="800" font-size="${20 * k}" fill="${col}" opacity=".6">z</text><text x="${x + 15 * k}" y="${y - 17 * k}" font-family="Baloo 2, sans-serif" font-weight="800" font-size="${14 * k}" fill="${col}" opacity=".6">z</text>`;
const spark = (x, y, r = 6, col = "#f2c14e") => { const q = r * 0.2; return `<path d="M${x} ${y - r}Q${x + q} ${y - q} ${x + r} ${y}Q${x + q} ${y + q} ${x} ${y + r}Q${x - q} ${y + q} ${x - r} ${y}Q${x - q} ${y - q} ${x} ${y - r}Z" fill="${col}"/>`; };

// mặt: (x, y) = giữa hai mắt; d = nửa khoảng cách hai mắt; k = tỉ lệ; ink = màu mắt (sáng trên thân tối)
function face(mood, x, y, { d = 17, k = 1, ink = FACE, cheek = true, mouth = true } = {}) {
  const L = x - d * k, R = x + d * k;
  const sw = (w) => `fill="none" stroke="${ink}" stroke-width="${(w * k).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"`;
  const dot = (cx) => `<ellipse cx="${cx}" cy="${y}" rx="${5 * k}" ry="${6.4 * k}" fill="${ink}"/>`;
  const up = (cx) => `<path d="M${cx - 6.5 * k} ${y + 2.5 * k}q${6.5 * k} ${-9 * k} ${13 * k} 0" ${sw(3.4)}/>`;
  const down = (cx) => `<path d="M${cx - 6.5 * k} ${y - 1 * k}q${6.5 * k} ${6.5 * k} ${13 * k} 0" ${sw(3.2)}/>`;
  const ring = (cx) => `<circle cx="${cx}" cy="${y}" r="${5.4 * k}" ${sw(3)}/>`;
  const eyes = { joy: up(L) + up(R), party: up(L) + up(R), sleep: down(L) + down(R), wink: dot(L) + up(R), shock: ring(L) + ring(R) }[mood] || dot(L) + dot(R);
  const my = y + 12.5 * k;
  const M = {
    joy: `<path d="M${x - 6 * k} ${my - 1.5 * k}q${6 * k} ${10 * k} ${12 * k} 0z" fill="${ink}"/>`,
    wow: `<ellipse cx="${x}" cy="${my + 1 * k}" rx="${3.4 * k}" ry="${4.4 * k}" fill="${ink}"/>`,
    sad: `<path d="M${x - 5 * k} ${my + 2.5 * k}q${5 * k} ${-5 * k} ${10 * k} 0" ${sw(2.8)}/>`,
    angry: `<path d="M${x - 5 * k} ${my + 1.5 * k}h${10 * k}" ${sw(2.8)}/>`,
    sleep: `<ellipse cx="${x}" cy="${my}" rx="${2.6 * k}" ry="${2.1 * k}" fill="${ink}"/>`,
    cat: `<path d="M${x - 7 * k} ${my - 1.5 * k}q${3.5 * k} ${5 * k} ${7 * k} 0q${3.5 * k} ${5 * k} ${7 * k} 0" ${sw(2.6)}/>`,
  };
  M.party = M.joy; M.shock = M.wow;
  const mo = mouth ? (M[mood] || `<path d="M${x - 4.5 * k} ${my - 1 * k}q${4.5 * k} ${4.5 * k} ${9 * k} 0" ${sw(2.8)}/>`) : "";
  const brow = mood === "angry" ? `<path d="M${L - 7 * k} ${y - 12 * k}l${11 * k} ${4.5 * k}M${R + 7 * k} ${y - 12 * k}l${-11 * k} ${4.5 * k}" ${sw(3)}/>`
    : mood === "sad" ? `<path d="M${L - 6 * k} ${y - 9 * k}l${10 * k} ${-4 * k}M${R + 6 * k} ${y - 9 * k}l${-10 * k} ${-4 * k}" ${sw(2.6)}/>` : "";
  const ch = cheek ? `<ellipse cx="${L - 5 * k}" cy="${y + 10 * k}" rx="${5.6 * k}" ry="${3.4 * k}" fill="${CHEEK}" opacity=".5"/><ellipse cx="${R + 5 * k}" cy="${y + 10 * k}" rx="${5.6 * k}" ry="${3.4 * k}" fill="${CHEEK}" opacity=".5"/>` : "";
  return ch + eyes + mo + brow;
}
const shadow = (rx = 44, y = 241) => `<ellipse cx="100" cy="${y}" rx="${rx}" ry="5" fill="${FACE}" opacity=".09"/>`;
const pin = (x, y) => `<circle cx="${x}" cy="${y}" r="4.2" fill="${LEAD_DK}"/>`; // đầu chân linh kiện
const feet = (col, a = 82, b = 118, y = 231) => `<ellipse cx="${a}" cy="${y}" rx="11" ry="7" fill="${col}"/><ellipse cx="${b}" cy="${y}" rx="11" ry="7" fill="${col}"/>`;

// các Linh Kiện (khung 200×256, mặt đất y ≈ 238). f = tâm mặt, dùng để phóng to làm chân dung
const MINI = {
  ohmi: { f: [100, 184], draw: (m, u) => { // điện trở 220 Ω: đỏ đỏ nâu, vạch vàng sai số
    const C = "#efc898", D = "#d6a873", shape = `<circle cx="62" cy="190" r="36"/><circle cx="138" cy="190" r="36"/><rect x="60" y="163" width="80" height="54"/>`;
    return shadow(62) + ln("M28 192Q15 194 11 206", LEAD) + pin(11, 207) + ln("M172 192Q185 194 189 206", LEAD) + pin(189, 207) + feet(D, 80, 120)
      + `<clipPath id="${u}">${shape}</clipPath><g fill="${C}">${shape}</g><g clip-path="url(#${u})"><rect x="36" y="150" width="8" height="90" fill="#d35d4f"/><rect x="50" y="150" width="8" height="90" fill="#d35d4f"/><rect x="142" y="150" width="8" height="90" fill="#8a5439"/><rect x="156" y="150" width="8" height="90" fill="#dcaa45"/></g>`
      + face(m, 100, 184, { k: 1.14 });
  } },
  capa: { f: [90, 140], draw: (m, u) => { // tụ hoá: vỏ trụ xanh, nắp bạc, sọc cực âm
    const C = "#8db3db", shape = `<rect x="58" y="76" width="84" height="144" rx="20"/>`;
    return shadow(46) + ln("M84 214V229", LEAD) + ln("M116 214V229", LEAD) + feet("#6d93be", 82, 118, 232)
      + `<clipPath id="${u}">${shape}</clipPath><g clip-path="url(#${u})"><rect x="50" y="70" width="100" height="160" fill="${C}"/><rect x="50" y="70" width="100" height="22" fill="#d9e1ea"/><rect x="118" y="92" width="18" height="140" fill="#d6e5f3"/><path d="M122 122h10M122 152h10M122 182h10" stroke="#6d93be" stroke-width="3.4" stroke-linecap="round"/></g>`
      + face(m, 90, 140, { d: 16 });
  } },
  kirch: { f: [100, 164], draw: (m) => { // nút mạch: dòng vào bằng dòng ra
    const C = "#93c59c", D = "#5f9b6c";
    return shadow(48) + feet(D) + ln("M100 116V88", D, 6) + `<path d="M89 92L100 72 111 92Z" fill="${D}" stroke="${D}" stroke-width="4" stroke-linejoin="round"/>`
      + ln("M46 168H14", D, 6) + `<path d="M24 158L36 168 24 178Z" fill="${D}" stroke="${D}" stroke-width="3" stroke-linejoin="round"/>`
      + ln("M154 168H180", D, 6) + `<path d="M178 158L190 168 178 178Z" fill="${D}" stroke="${D}" stroke-width="3" stroke-linejoin="round"/>`
      + `<circle cx="100" cy="168" r="58" fill="${C}"/>` + face(m, 100, 164);
  } },
  indu: { f: [84, 180], draw: (m, u) => { // cuộn cảm mèo: ổ bánh mì tím quấn dây đồng, đuôi lò xo
    const C = "#b6aadf", E = "#e3dbf7", W = "#d8956a", shape = `<rect x="32" y="136" width="136" height="98" rx="46"/>`;
    return shadow(66) + ln("M160 204l16 -6 -12 -9 16 -6 -12 -9 16 -6", W, 5)
      + `<path d="M44 160L50 118Q51 112 57 115L76 140Z" fill="${C}"/><path d="M124 160L118 118Q117 112 111 115L92 140Z" fill="${C}"/>`
      + `<path d="M52 146L54 125 66 138Z" fill="${E}"/><path d="M116 146L114 125 102 138Z" fill="${E}"/>`
      + `<clipPath id="${u}">${shape}</clipPath><g fill="${C}">${shape}</g><g clip-path="url(#${u})" fill="none" stroke="${W}" stroke-width="5" stroke-linecap="round"><path d="M130 128q-9 56 0 112M144 128q-9 56 0 112M158 128q-9 56 0 112"/></g>`
      + `<ellipse cx="64" cy="233" rx="11" ry="5.5" fill="${E}"/><ellipse cx="102" cy="233" rx="11" ry="5.5" fill="${E}"/>`
      + face(m === "happy" ? "cat" : m, 84, 180, { d: 17 });
  } },
  bobo: { f: [96, 160], draw: (m) => { // cổng AND đeo kính tròn
    const C = "#e8c26a", D = "#c49a42";
    return shadow(52) + ln("M52 131H30", LEAD) + pin(28, 131) + ln("M52 193H30", LEAD) + pin(28, 193) + ln("M162 162H184", LEAD) + pin(186, 162) + feet(D, 78, 114)
      + `<path d="M50 100H100A62 62 0 0 1 100 224H50Z" fill="${C}"/>` + face(m, 96, 160, { d: 18 })
      + `<circle cx="78" cy="160" r="14" fill="#fff" fill-opacity=".22" stroke="${FACE}" stroke-width="3"/><circle cx="114" cy="160" r="14" fill="#fff" fill-opacity=".22" stroke="${FACE}" stroke-width="3"/><path d="M92 157q4-3 8 0" fill="none" stroke="${FACE}" stroke-width="3" stroke-linecap="round"/>`;
  } },
  lumi: { f: [100, 152], draw: (m) => { // đèn LED hồng: mái vòm, vành, hai mũi tên ánh sáng
    const C = "#f3abbd", D = "#e48aa1", Y = "#f2c14e", glow = m === "joy" || m === "wow" || m === "happy";
    return shadow(48) + ln("M86 212V229", LEAD) + ln("M114 212V229", LEAD) + feet("#d77c94", 84, 116, 232)
      + (glow ? `<circle cx="100" cy="140" r="64" fill="#ffd6e0" opacity=".45"/>` : "")
      + `<path d="M64 204V134A36 36 0 0 1 136 134V204Z" fill="${C}"/><rect x="56" y="198" width="88" height="16" rx="7" fill="${D}"/><rect x="72" y="112" width="9" height="26" rx="4.5" fill="#fff" opacity=".5"/>`
      + ln("M140 104l13 -13", Y, 4) + `<path d="M148 84l11 -2 -2 11z" fill="${Y}" stroke="${Y}" stroke-width="2" stroke-linejoin="round"/>` + ln("M150 118l13 -13", Y, 4) + `<path d="M158 98l11 -2 -2 11z" fill="${Y}" stroke="${Y}" stroke-width="2" stroke-linejoin="round"/>`
      + face(m, 100, 152, { d: 16 });
  } },
  tranz: { f: [100, 148], draw: (m) => { // transistor vỏ TO-92: ba chân, một trái tim
    const C = "#625d9e", G = "#e7c26f";
    return shadow(46) + ln("M80 206V229", LEAD) + ln("M100 206V214L106 222V229", LEAD) + ln("M120 206V229", LEAD)
      + `<ellipse cx="78" cy="232" rx="8" ry="5.5" fill="#4a4580"/><ellipse cx="106" cy="232" rx="8" ry="5.5" fill="#4a4580"/><ellipse cx="124" cy="232" rx="8" ry="5.5" fill="#4a4580"/>`
      + `<path d="M58 212V122Q58 90 100 90Q142 90 142 122V212Z" fill="${C}"/><path d="M78 180h44" stroke="${G}" stroke-width="3.4" stroke-linecap="round" opacity=".8"/><path d="M100 204c-6.5-4.2-9.5-7.4-9.5-10.6a4.6 4.6 0 0 1 9.5-1.6 4.6 4.6 0 0 1 9.5 1.6c0 3.2-3 6.4-9.5 10.6z" fill="${G}"/>` + face(m, 100, 148, { ink: FACE_LT });
  } },
  ope: { f: [98, 150], draw: (m) => { // op-amp: tam giác bình tĩnh lơ lửng, cửa vào − và +
    const C = "#7fc4b8";
    return `<ellipse cx="100" cy="241" rx="34" ry="4.5" fill="${FACE}" opacity=".07"/>` + ln("M54 124H30", LEAD) + pin(28, 124) + ln("M54 180H30", LEAD) + pin(28, 180) + ln("M166 152H186", LEAD) + pin(188, 152)
      + `<path d="M62 94L62 206 162 150Z" fill="${C}" stroke="${C}" stroke-width="18" stroke-linejoin="round"/><path d="M66 124h10M66 180h10M71 175v10" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>`
      + face(m, 98, 150, { d: 15 });
  } },
};
const charSvg = (id, mood) => MINI[id].draw(mood, "mc" + (++svgN));

// nhân vật toàn thân (nhỏ): phòng, thẻ nhân vật, đội hình
function chibi(id, { mood = "happy", cls = "" } = {}) {
  if (!MINI[id]) return "";
  return `<svg class="chibi ${cls}" viewBox="0 -6 200 256" aria-hidden="true">${charSvg(id, mood)}${mood === "sleep" ? zzz(146, 70) : ""}</svg>`;
}
// chân dung: phóng to quanh khuôn mặt (truyện, màn ra nhân vật, hồ sơ)
function portrait(id, { mood = "happy", cls = "" } = {}) {
  const c = MINI[id]; if (!c) return "";
  const s = 1.45, [fx, fy] = c.f;
  return `<svg class="chibi portrait ${cls}" viewBox="0 6 240 296" aria-hidden="true"><g transform="translate(${(120 - fx * s).toFixed(1)} ${(150 - fy * s).toFixed(1)}) scale(${s})">${charSvg(id, mood)}</g>${mood === "sleep" ? zzz(170, 70) : ""}</svg>`;
}
// ảnh đại diện tròn: chỉ khuôn mặt
function faceIcon(id, mood = "happy") {
  const c = MINI[id]; if (!c) return "";
  const [fx, fy] = c.f;
  return `<svg class="chibi face-icon" viewBox="${fx - 62} ${fy - 58} 124 124" aria-hidden="true">${charSvg(id, mood)}</svg>`;
}

// bé mèo Elec: mèo gừng tối giản, vệt tia chớp kem trên trán; lúc học thì đeo kính tròn
function kitten(mood = "happy", cls = "") {
  const C = "#e8935f", E = "#f6c6a2", P = "#fde8d2";
  const fm = { happy: "cat", think: "happy", party: "joy", sleep: "sleep" }[mood] || "cat";
  return `<svg class="mascot kitten ${cls}" viewBox="0 0 120 120" aria-hidden="true">
<ellipse cx="60" cy="113" rx="30" ry="3.6" fill="${FACE}" opacity=".1"/>${ln("M84 104C101 106 109 93 104 80", C, 9)}
<path d="M30 52L33 16Q34 11 39 14L60 33Z" fill="${C}"/><path d="M90 52L87 16Q86 11 81 14L60 33Z" fill="${C}"/><path d="M37 37L38.5 22 50 32Z" fill="${E}"/><path d="M83 37L81.5 22 70 32Z" fill="${E}"/>
<rect x="23" y="28" width="74" height="58" rx="29" fill="${C}"/><rect x="31" y="62" width="58" height="48" rx="21" fill="${C}"/>
<path d="M61 31l-5.5 8.5h5.5l-3.5 7.5 9.5-10.5h-5.5l3.2-5.5z" fill="${P}"/>
<ellipse cx="47" cy="108.5" rx="8.5" ry="4.6" fill="${P}"/><ellipse cx="73" cy="108.5" rx="8.5" ry="4.6" fill="${P}"/>
${face(fm, 60, 59, { d: 17, k: 0.62 })}
${mood === "think" ? `<circle cx="49.5" cy="59" r="7.6" fill="#fff" fill-opacity=".25" stroke="${FACE}" stroke-width="1.8"/><circle cx="70.5" cy="59" r="7.6" fill="#fff" fill-opacity=".25" stroke="${FACE}" stroke-width="1.8"/><path d="M57.4 58q2.6-2 5.2 0" fill="none" stroke="${FACE}" stroke-width="1.8" stroke-linecap="round"/>` : ""}
${mood === "party" ? spark(14, 26, 7) + spark(106, 18, 5.5, "#f29b8f") + spark(110, 58, 4) : ""}${mood === "sleep" ? zzz(88, 30, 0.8) : ""}</svg>`;
}

const STAR_P = "M7 .8l1.9 3.9 4.3.6-3.1 3 .7 4.3L7 10.6 3.2 12.6l.7-4.3-3.1-3 4.3-.6z";
const starsSvg = (n, cls = "stars") => `<span class="${cls}" role="img" aria-label="${n} sao">${`<svg viewBox="0 0 14 14" aria-hidden="true"><path d="${STAR_P}" fill="#f6c445" stroke="${SB_INK}" stroke-width="1.2" stroke-linejoin="round"/></svg>`.repeat(n)}</span>`;

// --- quái vật (Nhiễu Trắng và đồng bọn), cùng lối vẽ khối phẳng ---
function bossArt(id, cls = "") {
  const u = "bo" + (++svgN);
  const W = (s, vb = "0 0 200 200") => `<svg class="chibi ${cls}" viewBox="${vb}" aria-hidden="true">${s}</svg>`;
  const sh = (rx = 52) => `<ellipse cx="100" cy="190" rx="${rx}" ry="6" fill="${FACE}" opacity=".12"/>`;
  const zap = (d, col = "#f2c14e") => ln(d, col, 4.5);
  if (id === "nhieu") { // Bé Nhiễu: đám mây nhiễu trắng lấm tấm
    const shape = `<path d="M44 130C26 126 24 100 42 94C38 72 58 58 76 66C82 48 110 44 120 60C136 50 160 62 156 84C174 90 176 118 158 126C164 148 144 166 124 156C116 172 86 172 78 158C58 168 38 152 44 130Z"/>`;
    let px = ""; for (let i = 0; i < 42; i++) { const x = 32 + ((i * 37) % 136), y = 50 + ((i * 53) % 118); px += `<rect x="${x}" y="${y}" width="${4 + (i % 3) * 3}" height="4" rx="1.5" fill="${i % 2 ? "#ffffff" : "#8f88a3"}" opacity=".5"/>`; }
    return W(sh(50) + `<clipPath id="${u}">${shape}</clipPath><g fill="#cbc5da">${shape}</g><g clip-path="url(#${u})">${px}</g>` + face("angry", 100, 110, { d: 20, k: 1.15 }) + zap("M24 66l10 8-8 4 10 8") + zap("M176 66l-10 8 8 4-10 8"));
  }
  if (id === "roi") { // Nút Rối: cuộn dây rối ba màu
    const loops = (o) => [["#e07a5f", 0], ["#7fb0dd", 60], ["#f2c14e", 120]].map(([c, r]) => `<ellipse cx="100" cy="104" rx="68" ry="24" transform="rotate(${r} 100 104)" fill="none" stroke="${c}" stroke-width="6.5" opacity="${o}"/>`).join("");
    return W(sh(56) + `<circle cx="100" cy="104" r="94" fill="#cbb8ff" opacity=".14"/>` + loops(1) + `<circle cx="100" cy="104" r="50" fill="#544b75"/>` + `<g clip-path="url(#${u})">${loops(1)}</g><clipPath id="${u}"><rect x="0" y="128" width="200" height="80"/></clipPath>`
      + face("angry", 100, 98, { ink: FACE_LT, k: 1.1 }) + ln("M150 150L172 174", "#4b4369", 6) + `<rect x="164" y="168" width="16" height="12" rx="3" fill="#f2c14e" transform="rotate(42 172 174)"/>` + ln("M50 150L28 174", "#4b4369", 6) + `<rect x="20" y="168" width="16" height="12" rx="3" fill="#f2c14e" transform="rotate(-42 28 174)"/>`);
  }
  if (id === "xa") { // Bóng Xả: con ma tụ điện vừa xả
    return W(sh(46) + `<path d="M52 178V98C52 64 74 42 100 42S148 64 148 98V178L132 166 116 180 100 166 84 180 68 166 52 178Z" fill="#d6e9f6"/><path d="M66 70Q76 56 92 54" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".8"/>`
      + face("wow", 100, 104, { d: 20, k: 1.2 }) + ln("M34 92V124M42 92V124", "#7fa6cc", 5) + ln("M166 92V124M158 92V124", "#7fa6cc", 5) + zap("M26 64l8 10-7 3 8 10", "#7fb0dd") + zap("M174 64l-8 10 7 3-8 10", "#7fb0dd"));
  }
  if (id === "dm") { // Ngài Đoản Mạch: mũ chóp cao, ria hình tia chớp, kính một mắt
    return W(sh(58) + `<circle cx="100" cy="104" r="94" fill="#cbb8ff" opacity=".16"/><rect x="46" y="72" width="108" height="118" rx="48" fill="#56497f"/><path d="M46 150Q100 176 154 150V160Q154 190 124 190H76Q46 190 46 160Z" fill="#483b70"/>`
      + `<rect x="60" y="62" width="80" height="12" rx="6" fill="#2a2244"/><rect x="71" y="6" width="58" height="60" rx="9" fill="#2a2244"/><path d="M78 14v30" stroke="#5d4f8f" stroke-width="4" stroke-linecap="round"/><rect x="71" y="46" width="58" height="10" fill="#9c7be0"/><path d="M104 14l-9 15h7l-5 13 13-18h-7l5-10z" fill="#f2c14e"/>`
      + face("angry", 100, 110, { d: 19, ink: FACE_LT, cheek: false, mouth: false }) + `<circle cx="119" cy="110" r="12" fill="none" stroke="#f2c14e" stroke-width="3"/>` + ln("M131 112Q138 128 132 142", "#f2c14e", 2)
      + `<path d="M70 136l11-7 9 8 10-8 10 8 9-8 11 7" fill="none" stroke="#f2c14e" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round"/>`, "0 -4 200 204");
  }
  if (id === "fuzo") { // Cầu Chì: ống thuỷ tinh, sợi dây bên trong đã đứt
    return W(sh(42) + `<rect x="60" y="48" width="80" height="126" rx="30" fill="#e3f1f9"/><path d="M74 70Q76 60 86 58" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`
      + ln("M100 60C94 68 106 74 100 82", "#c98a5a", 3.4) + ln("M100 152C106 158 94 164 100 172", "#c98a5a", 3.4)
      + `<rect x="54" y="30" width="92" height="28" rx="11" fill="#cdd5de"/><rect x="54" y="164" width="92" height="28" rx="11" fill="#cdd5de"/>`
      + face("sleep", 100, 114, { d: 17 }));
  }
  return "";
}

// --- phông nền các cảnh truyện ---
function sceneArt(kind, { dark = false } = {}) {
  const u = "sg" + (++svgN);
  const sv = (s) => `<svg class="bg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${s}${dark ? `<defs><linearGradient id="${u}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1238" stop-opacity=".72"/><stop offset="1" stop-color="#4a2f7a" stop-opacity=".45"/></linearGradient></defs><rect width="400" height="300" fill="url(#${u}d)"/>` : ""}</svg>`;
  const heart = (x, y, s, o = 0.6) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 6C-6 1.6-10-1.8-10-5.8a5 5 0 0 1 10-1.2 5 5 0 0 1 10 1.2C10-1.8 6 1.6 0 6z" fill="#fff" opacity="${o}"/>`;
  const stars = (n, seed = 3) => { let s = ""; for (let i = 0; i < n; i++) { const x = (i * 97 + seed * 31) % 400, y = (i * 53 + seed * 17) % 150; s += `<circle cx="${x}" cy="${y}" r="${1 + (i % 3) * 0.6}" fill="#fff" opacity="${0.5 + (i % 4) * 0.12}"/>`; } return s; };
  const tower = (lit, x = 238) => { let w = ""; for (let r = 0; r < 9; r++) for (let c = 0; c < 4; c++) w += `<rect x="${x + 8 + c * 13}" y="${70 + r * 17}" width="8" height="10" rx="1.5" fill="${lit ? ((r + c) % 3 ? "#fff6d6" : "#ffe08a") : "#3a3560"}"/>`; return `<rect x="${x}" y="58" width="64" height="170" rx="4" fill="${lit ? "#f3e6da" : "#56507e"}" stroke="${SB_INK}" stroke-width="2.2"/>${w}<rect x="${x - 4}" y="50" width="72" height="10" rx="3" fill="${lit ? "#e8d3c3" : "#46406c"}" stroke="${SB_INK}" stroke-width="2.2"/>`; };
  const gril = (lit) => { let s = ""; for (let i = 0; i < 4; i++) { const x = 18 + i * 56; s += `<rect x="${x}" y="178" width="50" height="34" rx="3" fill="${lit ? "#f7ece2" : "#4a4472"}" stroke="${SB_INK}" stroke-width="1.8"/><path d="M${x + 6} 212v18M${x + 44} 212v18" stroke="${SB_INK}" stroke-width="2.6"/>`; for (let k = 0; k < 4; k++) s += `<rect x="${x + 5 + k * 11}" y="186" width="7" height="8" rx="1" fill="${lit ? "#bfe1f5" : "#2f2a50"}"/>`; } return s; };
  const tree = (x, y, s = 1, col = "#a9d98b") => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0v22" stroke="${SB_INK}" stroke-width="3.4"/><circle cx="0" cy="-6" r="18" fill="${col}" stroke="${SB_INK}" stroke-width="2.2"/><circle cx="-8" cy="-12" r="5" fill="#fff" opacity=".4"/></g>`;
  if (kind === "campus" || kind === "night") {
    const lit = kind === "campus";
    return sv(`<defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lit ? "#ffd3df" : "#241d4a"}"/><stop offset="1" stop-color="${lit ? "#fff3df" : "#5b4a8a"}"/></linearGradient></defs><rect width="400" height="300" fill="url(#${u})"/>
${lit ? `<circle cx="340" cy="56" r="26" fill="#fff1a8" stroke="${SB_INK}" stroke-width="2.2"/>${heart(60, 50, 1.6)}${heart(140, 30, 1)}${heart(330, 120, 1.2)}<path d="M40 100q14-16 30 0 12-10 22 4H40z" fill="#fff" stroke="${SB_INK}" stroke-width="1.8"/>` : `${stars(36)}<path d="M346 40a22 22 0 1 0 14 38 18 18 0 1 1-14-38z" fill="#fff1bd" stroke="${SB_INK}" stroke-width="1.8"/>`}
${tower(lit)}${gril(lit)}${tree(320, 214, 1.1, lit ? "#a9d98b" : "#4f6f7f")}${tree(360, 222, 0.8, lit ? "#c3e6a0" : "#476574")}<rect y="228" width="400" height="72" fill="${lit ? "#d6efb9" : "#3c3a66"}" stroke="${SB_INK}" stroke-width="2.2"/><path d="M0 252H400" stroke="${lit ? "#bfe39a" : "#33305a"}" stroke-width="10" stroke-dasharray="26 18"/>`);
  }
  if (kind === "metro") {
    let tiles = ""; for (let r = 0; r < 8; r++) for (let c = 0; c < 14; c++) tiles += `<rect x="${c * 30 + (r % 2) * 15 - 15}" y="${40 + r * 18}" width="27" height="15" rx="5" fill="#fbf6ef" stroke="#e4d8cb" stroke-width="1.5"/>`;
    return sv(`<rect width="400" height="300" fill="#efe6dc"/>${tiles}<path d="M0 40Q200 -30 400 40V0H0Z" fill="#d9cbbd" stroke="${SB_INK}" stroke-width="2.2"/>
<rect x="120" y="70" width="160" height="38" rx="10" fill="#2f4a8a" stroke="${SB_INK}" stroke-width="2.6"/><rect x="126" y="76" width="148" height="26" rx="6" fill="none" stroke="#fff" stroke-width="1.6"/><text x="200" y="96" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="20" fill="#fff">Jussieu</text>
<circle cx="60" cy="88" r="10" fill="#ff6b7f" opacity=".85"/><circle cx="340" cy="88" r="10" fill="#ff6b7f" opacity=".85"/><rect y="186" width="400" height="16" fill="#f2c661" stroke="${SB_INK}" stroke-width="2.2"/><rect y="202" width="400" height="98" fill="#6b5d78"/><path d="M0 240H400M0 270H400" stroke="#c9bfd3" stroke-width="5"/><path d="M20 232v46M80 232v46M140 232v46M200 232v46M260 232v46M320 232v46M380 232v46" stroke="#4f4560" stroke-width="7"/>`);
  }
  if (kind === "lab") {
    const wave = Array.from({ length: 21 }, (_, i) => `${148 + i * 5},${118 - Math.sin(i / 3.2) * 13}`).join(" ");
    return sv(`<rect width="400" height="300" fill="#e3f2e6"/><path d="M0 60H400M0 120H400" stroke="#d2e8d6" stroke-width="2"/><rect x="26" y="34" width="92" height="104" rx="10" fill="#2e2a55" stroke="${SB_INK}" stroke-width="2.6"/>${stars(9, 5).replace(/cx="(\d+)"/g, (m, x) => `cx="${30 + (+x % 84)}"`).replace(/cy="(\d+)"/g, (m, y) => `cy="${40 + (+y % 92)}"`)}<path d="M72 34V138M26 86H118" stroke="${SB_INK}" stroke-width="2.6"/>
<rect x="138" y="88" width="118" height="62" rx="10" fill="#d9d3e3" stroke="${SB_INK}" stroke-width="2.6"/><rect x="146" y="96" width="102" height="44" rx="6" fill="#1f3b33" stroke="${SB_INK}" stroke-width="1.8"/><polyline points="${wave}" fill="none" stroke="#8ff0a4" stroke-width="2.6"/><circle cx="270" cy="104" r="6" fill="#f2c661" stroke="${SB_INK}" stroke-width="1.8"/><circle cx="270" cy="128" r="6" fill="#ef6f7f" stroke="${SB_INK}" stroke-width="1.8"/>
<path d="M300 150v-36l-10-24h30l-10 24v36z" fill="#d9ecf8" stroke="${SB_INK}" stroke-width="2.2"/><path d="M296 150v-22h18v22z" fill="#ffb6ca" opacity=".8"/><path d="M338 150v-22a12 12 0 0 1 24 0v22z" fill="#fff1bd" stroke="${SB_INK}" stroke-width="2.2"/>
<rect y="150" width="400" height="22" fill="#e2b98f" stroke="${SB_INK}" stroke-width="2.2"/><rect y="172" width="400" height="128" fill="#c99a70"/><path d="M40 172v128M360 172v128" stroke="#b5845c" stroke-width="8"/><rect x="40" y="128" width="80" height="22" rx="3" fill="#fffaf2" stroke="${SB_INK}" stroke-width="1.8"/><path d="M48 136h64M48 142h64" stroke="#d9cbbd" stroke-width="2" stroke-dasharray="2 3"/>`);
  }
  if (kind === "roof") {
    let city = ""; [[0, 40, 58], [36, 30, 76], [62, 44, 50], [104, 26, 88], [128, 50, 62], [176, 34, 72], [208, 42, 54], [248, 30, 92], [276, 48, 58], [322, 36, 70], [356, 44, 60]].forEach(([x, w, h]) => { city += `<rect x="${x}" y="${230 - h}" width="${w}" height="${h}" fill="#3d3366"/>`; for (let k = 0; k < 3; k++) city += `<rect x="${x + 6 + (k % 2) * 12}" y="${236 - h + k * 14}" width="5" height="6" fill="#ffe08a" opacity=".7"/>`; });
    return sv(`<defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2152"/><stop offset=".7" stop-color="#8f5c9e"/><stop offset="1" stop-color="#ffb3c1"/></linearGradient></defs><rect width="400" height="300" fill="url(#${u})"/>${stars(40, 7)}
<circle cx="80" cy="64" r="30" fill="#fff4cc" stroke="${SB_INK}" stroke-width="2.2"/><circle cx="70" cy="56" r="6" fill="#f3e3a8"/><circle cx="90" cy="74" r="4" fill="#f3e3a8"/>${city}
<path d="M318 230L330 108 342 230M322 186H338M326 150H334" fill="none" stroke="#2c2447" stroke-width="5" stroke-linejoin="round"/><circle cx="330" cy="104" r="3" fill="#ffe08a"/>
<rect y="230" width="400" height="70" fill="#9b8fb0" stroke="${SB_INK}" stroke-width="2.2"/><path d="M0 218H400" stroke="${SB_INK}" stroke-width="2.6"/>${Array.from({ length: 21 }, (_, i) => `<path d="M${i * 20} 218V232" stroke="${SB_INK}" stroke-width="2.6"/>`).join("")}`);
  }
  return sv(`<rect width="400" height="300" fill="#ffe0e8"/>${heart(80, 80, 2)}${heart(300, 60, 1.4)}${heart(200, 200, 1.8)}`);
}
