// ================= phiêu lưu: tranh chibi vẽ bằng SVG (nhân vật gốc của app) =================
const SB_INK = "#5b3f33", SKIN = "#ffe9de", SKIN_SH = "#f6cdbd";
let svgN = 0;
const ART = {
  ohmi: { hair: "#f2a56b", hair2: "#d9834b", eye: ["#8a4523", "#f4a25a"], cloth: "#ffd2b5", cloth2: "#f39a6b", shoe: "#c46f45", leg: SKIN, back: "bob", front: "side", outfit: "hoodie", acc: "resistor" },
  capa: { hair: "#93c9f0", hair2: "#5d9fd3", eye: ["#284f8c", "#8ccaf4"], cloth: "#ffffff", cloth2: "#5b80c6", shoe: "#4a6aa8", leg: "#ffffff", back: "twinlow", front: "even", outfit: "sailor", acc: "capacitor" },
  kirch: { hair: "#7fcf97", hair2: "#4ea86c", eye: ["#245f3e", "#93dcae"], cloth: "#e9f6e1", cloth2: "#5aac70", shoe: "#3f7f52", leg: "#5b6b8c", back: "short", front: "spiky", outfit: "jacket", acc: "arrow" },
  indu: { hair: "#bba6f0", hair2: "#8f78d9", eye: ["#55399a", "#cab8ff"], cloth: "#f1ebff", cloth2: "#9c84e0", shoe: "#7a63c2", leg: SKIN, back: "cat", front: "even", outfit: "bell", acc: "coil" },
  bobo: { hair: "#f5cf5f", hair2: "#d8a73a", eye: ["#71520f", "#f3cf72"], cloth: "#fff3c9", cloth2: "#e8b649", shoe: "#b98a2c", leg: "#e98f9c", back: "curly", front: "curly", outfit: "sweater", acc: "beret" },
  lumi: { hair: "#ffb6ca", hair2: "#f08aa6", eye: ["#bd3f6a", "#ffc3d6"], cloth: "#fff1f5", cloth2: "#f28aa6", shoe: "#e46f8f", leg: SKIN, back: "long", front: "even", outfit: "frill", acc: "led" },
  tranz: { hair: "#8b7cd9", hair2: "#5d4db0", eye: ["#35287f", "#ab9ef3"], cloth: "#463b70", cloth2: "#f2c661", shoe: "#2f2753", leg: "#463b70", back: "twinhigh", front: "side", outfit: "cape", acc: "transistor" },
  ope: { hair: "#f4f7f8", hair2: "#9fd8cd", eye: ["#2b7a6f", "#9fe5d8"], cloth: "#ffffff", cloth2: "#5fbcac", shoe: "#3f8f83", leg: "#5b6b8c", back: "pony", front: "center", outfit: "coat", acc: "opamp" },
};
const st = (w = 2.6) => `stroke="${SB_INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const limb = (d, col, w = 12) => `<path d="${d}" fill="none" stroke="${SB_INK}" stroke-width="${w + 5}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;

function hairBack(c) {
  const f = `fill="${c.hair}" ${st()}`;
  switch (c.back) {
    case "bob": return `<path d="M42 102C38 60 66 38 100 38S162 60 158 102L160 148C150 158 136 156 130 148H70C64 156 50 158 40 148Z" ${f}/><path d="M150 90C178 92 188 128 176 170 168 160 164 140 154 124Z" ${f}/>`;
    case "twinlow": return `<path d="M42 102C38 60 66 38 100 38S162 60 158 102L156 152H44Z" ${f}/><path d="M50 128C24 148 22 192 36 222 46 200 52 178 62 152Z" ${f}/><path d="M150 128C176 148 178 192 164 222 154 200 148 178 138 152Z" ${f}/>`;
    case "short": return `<path d="M44 104C40 64 66 40 100 40S160 64 156 104L150 132H50Z" ${f}/>`;
    case "cat": return `<path d="M42 102C38 60 66 38 100 38S162 60 158 102L162 170C150 178 140 172 136 162H64C60 172 50 178 38 170Z" ${f}/>`;
    case "curly": return `<path d="M38 122C22 112 26 88 38 82 30 62 50 44 66 46 74 32 96 28 106 36 118 28 140 32 146 46 162 46 176 64 166 82 180 92 178 116 162 124 166 142 150 154 136 148H64C50 154 34 142 38 122Z" ${f}/>`;
    case "long": return `<path d="M40 102C36 58 66 36 100 36S164 58 160 102L168 212C166 226 150 232 140 222 132 230 120 228 116 218H84C80 228 68 230 60 222 50 232 34 226 32 212Z" ${f}/><path d="M60 150C58 180 62 204 70 216M140 150C142 180 138 204 130 216" fill="none" stroke="${c.hair2}" stroke-width="3" stroke-linecap="round"/>`;
    case "twinhigh": return `<path d="M42 102C38 60 66 38 100 38S162 60 158 102L158 150H42Z" ${f}/><path d="M56 58C22 58 8 104 16 176 26 150 36 118 62 84Z" ${f}/><path d="M144 58C178 58 192 104 184 176 174 150 164 118 138 84Z" ${f}/>`;
    case "pony": return `<path d="M42 102C38 60 66 38 100 38S162 60 158 102L156 142H44Z" ${f}/><path d="M138 116C172 134 176 190 158 226 154 198 146 172 130 148Z" ${f}/>`;
  }
  return "";
}
function hairFront(c) {
  const f = `fill="${c.hair}" ${st()}`;
  const ring = `<path d="M64 60Q100 40 136 60" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>`;
  switch (c.front) {
    case "even": return `<path d="M40 110C36 60 64 34 100 34S164 60 160 110C154 102 150 94 148 82 142 92 132 98 122 100 126 92 126 84 124 78 116 90 106 96 96 98 100 90 100 82 98 76 90 88 78 96 66 98 68 92 68 86 66 80 60 92 52 102 40 110Z" ${f}/><path d="M44 98C40 124 42 144 52 160 56 148 58 130 56 108Z" ${f}/><path d="M156 98C160 124 158 144 148 160 144 148 142 130 144 108Z" ${f}/>${ring}`;
    case "side": return `<path d="M40 110C36 60 64 34 100 34S164 60 160 110C156 98 152 88 146 78 136 94 116 102 90 102 104 94 110 86 112 76 98 90 76 100 56 102 50 104 44 106 40 110Z" ${f}/><path d="M44 98C40 122 44 140 52 154 56 142 58 126 56 106Z" ${f}/>${ring}`;
    case "spiky": return `<path d="M40 108L44 82 34 78 54 62 48 50 72 50 74 36 92 46 100 30 110 46 128 36 130 50 152 50 146 62 166 78 156 82 160 108C152 100 146 94 142 86L134 100 124 88 114 100 104 86 94 100 84 88 74 100 66 88C60 96 50 102 40 108Z" ${f}/>${ring}`;
    case "curly": return `<path d="M42 110C30 100 36 82 46 78 42 62 58 48 72 52 80 40 96 38 104 46 114 38 132 42 136 54 150 52 162 66 156 80 166 88 166 104 158 110 152 100 144 96 138 98 134 88 124 86 116 92 110 84 98 84 92 92 84 86 72 88 70 98 62 96 52 100 42 110Z" ${f}/>${ring}`;
    case "center": return `<path d="M40 110C36 60 64 34 100 34S164 60 160 110C152 98 142 84 124 74 116 70 106 66 100 60 94 66 84 70 76 74 58 84 48 98 40 110Z" ${f}/><path d="M44 98C40 122 44 140 52 156 56 144 58 128 56 106ZM156 98C160 122 156 140 148 156 144 144 142 128 144 106Z" ${f}/><path d="M100 62V80" stroke="${c.hair2}" stroke-width="3" stroke-linecap="round"/>${ring}`;
  }
  return "";
}
function eyesOf(c, mood, gid) {
  const [dk] = c.eye;
  const open = (x, y, s) => `<ellipse cx="${x}" cy="${y}" rx="12.5" ry="15" fill="#fff"/><ellipse cx="${x}" cy="${y + 1.5}" rx="10.8" ry="13.4" fill="url(#${gid})"/><ellipse cx="${x}" cy="${y + 3}" rx="5.4" ry="6.8" fill="${dk}" opacity=".85"/><circle cx="${x - 4}" cy="${y - 4.5}" r="4.6" fill="#fff"/><circle cx="${x + 4.3}" cy="${y + 6.5}" r="2.1" fill="#fff"/><path d="M${x - 13.5} ${y - 6}Q${x} ${y - 20} ${x + 13.5} ${y - 7}" fill="none" ${st(3.8)}/><path d="M${x + s * 13} ${y - 6.5}l${s * 5} -4" fill="none" ${st(3)}/>`;
  const shut = (x, y) => `<path d="M${x - 11} ${y + 3}Q${x} ${y - 9} ${x + 11} ${y + 3}" fill="none" ${st(3.6)}/>`;
  const down = (x, y) => `<path d="M${x - 11} ${y - 1}Q${x} ${y + 8} ${x + 11} ${y - 1}" fill="none" ${st(3.4)}/>`;
  const dot = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="11" ry="13" fill="#fff" ${st(2.4)}/><circle cx="${x}" cy="${y + 1}" r="3.6" fill="${SB_INK}"/>`;
  const L = 78, R = 122, Y = 113;
  if (mood === "joy") return shut(L, Y) + shut(R, Y);
  if (mood === "sleep") return down(L, Y) + down(R, Y);
  if (mood === "wink") return open(L, Y, -1) + shut(R, Y);
  if (mood === "shock") return dot(L, Y) + dot(R, Y);
  return open(L, Y, -1) + open(R, Y, 1);
}
function mouthOf(mood) {
  switch (mood) {
    case "joy": case "wow": return `<path d="M91 129Q100 144 109 129Z" fill="#f27e92" ${st(2.4)}/>`;
    case "shock": return `<ellipse cx="100" cy="134" rx="4.5" ry="5.5" fill="#f27e92" ${st(2.2)}/>`;
    case "sad": return `<path d="M94 135Q100 129 106 135" fill="none" ${st(2.6)}/>`;
    case "angry": return `<path d="M93 133Q100 129 107 133" fill="none" ${st(2.6)}/>`;
    case "sleep": return `<ellipse cx="100" cy="133" rx="3" ry="2.4" fill="#f27e92" ${st(1.8)}/>`;
    case "cat": return `<path d="M91 129Q95.5 135 100 129Q104.5 135 109 129" fill="none" ${st(2.5)}/>`;
  }
  return `<path d="M93 130Q100 137 107 130" fill="none" ${st(2.6)}/>`;
}
function browsOf(mood) {
  if (mood === "angry") return `<path d="M67 90L87 97M133 90L113 97" fill="none" ${st(3.4)}/>`;
  if (mood === "sad") return `<path d="M68 97L86 91M132 97L114 91" fill="none" ${st(3.2)}/>`;
  return "";
}
function outfitOf(c) {
  const body = `<path d="M74 158Q100 150 126 158L139 206Q100 218 61 206Z" fill="${c.cloth}" ${st()}/>`;
  const hem = (col) => `<path d="M63 199Q100 210 137 199" fill="none" stroke="${col}" stroke-width="5"/>`;
  switch (c.outfit) {
    case "hoodie": return body + hem(c.cloth2) + `<path d="M76 158C82 172 118 172 124 158" fill="${c.cloth2}" ${st(2.2)}/><path d="M94 166V180M106 166V180" ${st(2)}/><circle cx="94" cy="182" r="2.4" fill="#fff" ${st(1.6)}/><circle cx="106" cy="182" r="2.4" fill="#fff" ${st(1.6)}/><path d="M84 190H116V200Q100 204 84 200Z" fill="${c.cloth2}" ${st(2)}/>`;
    case "sailor": return body + hem(c.cloth2) + `<path d="M74 158L100 186 126 158Q114 168 100 168 86 168 74 158Z" fill="${c.cloth2}" ${st(2.2)}/><path d="M92 176L100 188 108 176 100 182Z" fill="#ef6f7f" ${st(2)}/><path d="M66 194Q100 204 134 194" fill="none" stroke="#fff" stroke-width="2"/>`;
    case "jacket": return body + hem(c.cloth2) + `<path d="M100 158V210" ${st(2.2)}/><path d="M76 160L96 176 100 160M124 160L104 176 100 160" fill="${c.cloth2}" ${st(2)}/><path d="M82 192H92M88 188l4 4-4 4M108 192H118M114 188l4 4-4 4" fill="none" stroke="${c.cloth2}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "bell": return body + hem(c.cloth2) + `<path d="M78 160Q100 172 122 160" fill="none" stroke="${c.cloth2}" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="171" r="6" fill="#f4c94f" ${st(2.2)}/><path d="M97 173h6" ${st(1.6)}/><path d="M70 196Q100 206 130 196" fill="none" stroke="#fff" stroke-width="2.4" stroke-dasharray="3 5"/>`;
    case "sweater": return body + `<path d="M68 176Q100 184 132 176M66 188Q100 196 134 188" fill="none" stroke="${c.cloth2}" stroke-width="5"/>` + hem(c.cloth2) + `<path d="M84 158Q100 168 116 158" fill="none" stroke="${c.cloth2}" stroke-width="6" stroke-linecap="round"/>`;
    case "frill": return `<path d="M60 202Q66 214 74 206 80 216 88 208 94 218 100 208 106 218 112 208 120 216 126 206 134 214 140 202Z" fill="#fff" ${st(2.2)}/>` + body + hem(c.cloth2) + `<path d="M100 172L86 164 86 180ZM100 172L114 164 114 180Z" fill="${c.cloth2}" ${st(2)}/><circle cx="100" cy="172" r="3.6" fill="#ffe27a" ${st(1.8)}/>`;
    case "cape": return body + hem(c.cloth2) + `<path d="M78 160Q100 176 122 160" fill="none" stroke="${c.cloth2}" stroke-width="3"/><circle cx="100" cy="178" r="3" fill="${c.cloth2}" ${st(1.6)}/><circle cx="100" cy="190" r="3" fill="${c.cloth2}" ${st(1.6)}/>`;
    case "coat": return body + `<path d="M74 158L94 186 100 160 106 186 126 158" fill="#dff3ef" ${st(2.2)}/><path d="M100 160V212" ${st(2)}/><path d="M80 196H90M110 196H120" stroke="${c.cloth2}" stroke-width="3" stroke-linecap="round"/><path d="M112 168h8v10h-8z" fill="#fff" ${st(1.6)}/><path d="M115 166v-4" stroke="${c.cloth2}" stroke-width="2"/>`;
  }
  return body;
}
function behindBody(c) {
  if (c.outfit === "cape") return `<path d="M76 158L44 226Q100 242 156 226L124 158Z" fill="#5d4db0" ${st()}/><path d="M76 158L60 150 70 168ZM124 158L140 150 130 168Z" fill="#f2c661" ${st(2)}/>`;
  if (c.acc === "coil") return `<path d="M128 204C150 210 162 196 154 186 146 178 136 190 146 196 158 202 170 188 164 176" fill="none" stroke="${SB_INK}" stroke-width="10" stroke-linecap="round"/><path d="M128 204C150 210 162 196 154 186 146 178 136 190 146 196 158 202 170 188 164 176" fill="none" stroke="${c.hair}" stroke-width="5.5" stroke-linecap="round"/><circle cx="164" cy="174" r="6" fill="${c.hair2}" ${st(2.2)}/>`;
  return "";
}
function accOf(c) {
  switch (c.acc) {
    case "resistor": return `<g transform="translate(150 78) rotate(38)"><path d="M-20 0H20" ${st(2.6)}/><rect x="-12" y="-6.5" width="24" height="13" rx="6.5" fill="#f4dca8" ${st(2.2)}/><path d="M-6 -6V6M-1 -6V6M5 -6V6" stroke-width="3" stroke="#d64541"/><path d="M5 -6V6" stroke-width="3" stroke="#8a5a3c"/></g>`;
    case "capacitor": return `<g transform="translate(56 76) rotate(-24)"><path d="M-14 0H-3M3 0H14" ${st(2.6)}/><path d="M-3 -10V10M3 -10V10" stroke="#3d5f9e" stroke-width="4.4" stroke-linecap="round"/><path d="M-11 -9h5M-8.5 -11.5v5" stroke="#ef6f7f" stroke-width="2.2" stroke-linecap="round"/></g><path d="M140 140q8 4 8 12-6-2-8-12zM140 140q-8 4-8 12 6-2 8-12z" fill="#ef6f7f" ${st(1.8)}/><path d="M60 140q8 4 8 12-6-2-8-12zM60 140q-8 4-8 12 6-2 8-12z" fill="#ef6f7f" ${st(1.8)}/>`;
    case "arrow": return `<path d="M102 34C98 22 104 12 116 8" fill="none" stroke="${SB_INK}" stroke-width="8" stroke-linecap="round"/><path d="M102 34C98 22 104 12 116 8" fill="none" stroke="${c.hair}" stroke-width="4" stroke-linecap="round"/><path d="M110 0L126 6 114 16Z" fill="${c.hair}" ${st(2.2)}/>`;
    case "coil": return `<path d="M54 70L48 24 84 46Z" fill="${c.hair}" ${st()}/><path d="M58 62L55 36 74 49Z" fill="#ffc4d4"/><path d="M146 70L152 24 116 46Z" fill="${c.hair}" ${st()}/><path d="M142 62L145 36 126 49Z" fill="#ffc4d4"/>`;
    case "beret": return `<path d="M54 64C54 40 132 28 152 50 156 60 142 66 122 64L74 68C62 70 54 70 54 64Z" fill="#ec8696" ${st()}/><circle cx="106" cy="38" r="4.5" fill="#ec8696" ${st(2)}/><path d="M118 48h6a5 5 0 0 1 0 10h-6z" fill="#fff" ${st(1.6)}/>`;
    case "led": return `<g transform="translate(100 36)"><path d="M-18 6L-14 -9-5 1 0-14 5 1 14-9 18 6Z" fill="#ffe17a" ${st(2.2)}/><circle cx="0" cy="-15" r="3" fill="#ff8fb0" ${st(1.6)}/></g><g transform="translate(140 52) rotate(18)"><path d="M-6 -7L6 0-6 7Z" fill="#ff8fb0" ${st(2)}/><path d="M6 -8V8M-12 0h-4M6 0h8" ${st(2.2)}/><path d="M2 -12l4 -6M8 -10l6 -4" stroke="#f0bd3e" stroke-width="2.2" stroke-linecap="round"/></g>`;
    case "transistor": return `<g transform="translate(60 66) rotate(-22)"><circle r="10" fill="#2c2447" stroke="#fff" stroke-width="2.4"/><path d="M-3 -6V6M-3 0H-12M-3 -3L6 -9M-3 3L6 9" stroke="#f2c661" stroke-width="2.2" stroke-linecap="round"/><path d="M3 6.5l3 2.5-4 .8" fill="#f2c661"/></g>`;
    case "opamp": return `<g transform="translate(142 62) rotate(14)"><path d="M-11 -13L15 0-11 13Z" fill="#fff" ${st(2.2)}/><path d="M-8 -5h5M-5.5 -7.5v5M-8 5h5" stroke="${c.cloth2}" stroke-width="2" stroke-linecap="round"/></g>`;
  }
  return "";
}
function chibi(id, { mood = "happy", cls = "" } = {}) {
  const c = ART[id]; if (!c) return "";
  const gid = "ce" + (++svgN);
  const [dk, lt] = c.eye;
  const glasses = c.acc === "beret" ? `<circle cx="78" cy="113" r="17" fill="#fff" fill-opacity=".18" ${st(2.6)}/><circle cx="122" cy="113" r="17" fill="#fff" fill-opacity=".18" ${st(2.6)}/><path d="M95 110Q100 106 105 110" fill="none" ${st(2.4)}/>` : "";
  return `<svg class="chibi ${cls}" viewBox="0 -6 200 256" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dk}"/><stop offset="1" stop-color="${lt}"/></linearGradient></defs>
<ellipse cx="100" cy="243" rx="46" ry="6.5" fill="${SB_INK}" opacity=".13"/>${behindBody(c)}${hairBack(c)}
${limb("M90 204L89 228", c.leg, 12)}${limb("M110 204L111 228", c.leg, 12)}<ellipse cx="87" cy="233" rx="10.5" ry="6.5" fill="${c.shoe}" ${st(2.4)}/><ellipse cx="113" cy="233" rx="10.5" ry="6.5" fill="${c.shoe}" ${st(2.4)}/>
${outfitOf(c)}${limb("M77 166Q63 180 66 195", c.cloth, 12)}${limb("M123 166Q137 180 134 195", c.cloth, 12)}<circle cx="66" cy="198" r="7" fill="${SKIN}" ${st(2.3)}/><circle cx="134" cy="198" r="7" fill="${SKIN}" ${st(2.3)}/>
<rect x="93" y="146" width="14" height="14" rx="5" fill="${SKIN_SH}"/><path d="M46 102C46 66 70 46 100 46S154 66 154 102C154 134 130 154 100 154S46 134 46 102Z" fill="${SKIN}" ${st()}/>
<ellipse cx="70" cy="128" rx="9.5" ry="5.6" fill="#ff8fab" opacity=".42"/><ellipse cx="130" cy="128" rx="9.5" ry="5.6" fill="#ff8fab" opacity=".42"/><path d="M64 127l3-4M69.5 128l3-4M75 129l3-4M125 129l3-4M130.5 128l3-4M136 127l3-4" stroke="#ef6f8f" stroke-width="1.5" stroke-linecap="round"/>
${eyesOf(c, mood, gid)}${mouthOf(mood)}${hairFront(c)}${browsOf(mood)}${glasses}${accOf(c)}${mood === "sleep" ? `<text x="150" y="40" font-family="Baloo 2, sans-serif" font-weight="800" font-size="22" fill="${SB_INK}">z</text><text x="166" y="22" font-family="Baloo 2, sans-serif" font-weight="800" font-size="15" fill="${SB_INK}">z</text>` : ""}</svg>`;
}

const STAR_P = "M7 .8l1.9 3.9 4.3.6-3.1 3 .7 4.3L7 10.6 3.2 12.6l.7-4.3-3.1-3 4.3-.6z";
const starsSvg = (n, cls = "stars") => `<span class="${cls}" role="img" aria-label="${n} sao">${`<svg viewBox="0 0 14 14" aria-hidden="true"><path d="${STAR_P}" fill="#f6c445" stroke="${SB_INK}" stroke-width="1.2" stroke-linejoin="round"/></svg>`.repeat(n)}</span>`;

// --- quái vật (Nhiễu Trắng và đồng bọn) ---
function bossArt(id, cls = "") {
  const W = (s, vb = "0 0 200 200") => `<svg class="chibi ${cls}" viewBox="${vb}" aria-hidden="true">${s}</svg>`;
  const angryEyes = (y = 92, col = "#ff5d7a") => `<path d="M62 ${y - 14}L88 ${y - 4}M138 ${y - 14}L112 ${y - 4}" fill="none" ${st(4)}/><ellipse cx="76" cy="${y + 4}" rx="10" ry="11" fill="#fff" ${st(2.6)}/><ellipse cx="124" cy="${y + 4}" rx="10" ry="11" fill="#fff" ${st(2.6)}/><circle cx="78" cy="${y + 6}" r="4.6" fill="${col}"/><circle cx="122" cy="${y + 6}" r="4.6" fill="${col}"/>`;
  if (id === "nhieu") {
    let dots = "";
    for (let i = 0; i < 46; i++) { const x = 46 + ((i * 37) % 108), y = 58 + ((i * 53) % 96); dots += `<rect x="${x}" y="${y}" width="${3 + (i % 3) * 2}" height="3" rx="1" fill="${i % 2 ? "#fff" : "#9c95ad"}" opacity=".8"/>`; }
    return W(`<ellipse cx="100" cy="186" rx="56" ry="7" fill="${SB_INK}" opacity=".15"/><path d="M100 12L94 30 106 30Z" fill="#f2c661" ${st(2)}/><path d="M100 30V48" ${st(3)}/>
<path d="M40 120C24 112 26 86 44 82 40 60 62 46 80 54 88 38 114 38 122 54 140 46 162 62 156 84 174 90 176 116 160 124 168 146 148 166 128 156 118 172 84 172 74 158 52 166 34 146 40 120Z" fill="#d6d1e2" ${st(3)}/>${dots}
${angryEyes(96)}<path d="M80 136L88 130 96 138 104 130 112 138 120 130" fill="none" ${st(3.2)}/><path d="M28 70l8 6-6 4 8 6M172 70l-8 6 6 4-8 6" fill="none" stroke="#f2c661" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  if (id === "roi") {
    const loops = [["#ef6f7f", 0], ["#5d9fd3", 40], ["#f2c661", 80], ["#5aac70", 120], ["#9c84e0", 160]].map(([c, r]) => `<ellipse cx="100" cy="104" rx="62" ry="30" transform="rotate(${r} 100 104)" fill="none" stroke="${SB_INK}" stroke-width="9"/><ellipse cx="100" cy="104" rx="62" ry="30" transform="rotate(${r} 100 104)" fill="none" stroke="${c}" stroke-width="5"/>`).join("");
    return W(`<ellipse cx="100" cy="186" rx="56" ry="7" fill="${SB_INK}" opacity=".15"/><circle cx="100" cy="104" r="50" fill="#3d3458" ${st(3)}/>${loops}<path d="M152 150L172 172M48 150L30 174" ${st(4)}/><rect x="164" y="166" width="16" height="12" rx="3" fill="#f2c661" ${st(2.2)} transform="rotate(42 172 172)"/><rect x="20" y="168" width="16" height="12" rx="3" fill="#f2c661" ${st(2.2)} transform="rotate(-48 28 174)"/>
<circle cx="100" cy="104" r="34" fill="#3d3458"/>${angryEyes(94, "#ff5d7a")}<path d="M86 124Q100 116 114 124" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`);
  }
  if (id === "xa") {
    return W(`<ellipse cx="100" cy="190" rx="50" ry="6" fill="${SB_INK}" opacity=".12"/><path d="M48 172C38 116 50 40 100 36S162 116 152 172L138 160 124 176 110 160 96 176 82 160 68 176Z" fill="#dff4ff" fill-opacity=".92" ${st(3)}/>
<path d="M44 96H22M22 80V112M14 80V112M156 96H178M178 80V112M186 80V112" fill="none" ${st(4)}/><path d="M60 54C70 44 84 40 96 42" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
<ellipse cx="80" cy="96" rx="11" ry="15" fill="${SB_INK}"/><ellipse cx="120" cy="96" rx="11" ry="15" fill="${SB_INK}"/><circle cx="76" cy="90" r="4" fill="#fff"/><circle cx="116" cy="90" r="4" fill="#fff"/><path d="M84 128Q100 146 116 128Q100 136 84 128Z" fill="${SB_INK}"/><path d="M28 58l6 8-6 2 6 8M172 58l-6 8 6 2-6 8" fill="none" stroke="#6fc3ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  if (id === "dm") {
    return W(`<ellipse cx="100" cy="192" rx="58" ry="7" fill="${SB_INK}" opacity=".15"/><path d="M58 112L22 186Q100 204 178 186L142 112Z" fill="#3b2d63" ${st(3)}/><path d="M58 112L40 96 60 132ZM142 112L160 96 140 132Z" fill="#7d5fd6" ${st(2.4)}/>
<path d="M62 132Q100 120 138 132L146 182Q100 194 54 182Z" fill="#4c3b80" ${st(2.6)}/><path d="M100 132V186" stroke="#f2c661" stroke-width="3"/>
<path d="M56 84C56 54 76 40 100 40S144 54 144 84C144 108 124 124 100 124S56 108 56 84Z" fill="#efe6fb" ${st(3)}/>
<path d="M48 48H152L146 40H54Z" fill="#2a2045" ${st(2.6)}/><rect x="66" y="-2" width="68" height="44" rx="6" fill="#2a2045" ${st(2.6)}/><rect x="66" y="26" width="68" height="9" fill="#9c6cf0"/><path d="M104 2L94 20H102L96 36 110 16H102L108 2Z" fill="#f2c661" ${st(1.8)}/>
<path d="M66 70L88 78M134 70L112 78" fill="none" ${st(4)}/><ellipse cx="80" cy="86" rx="8" ry="9" fill="#fff" ${st(2.4)}/><ellipse cx="120" cy="86" rx="8" ry="9" fill="#fff" ${st(2.4)}/><circle cx="81" cy="88" r="4" fill="#b03cff"/><circle cx="119" cy="88" r="4" fill="#b03cff"/><circle cx="120" cy="86" r="12" fill="none" stroke="#f2c661" stroke-width="2.4"/>
<path d="M72 104L86 98 92 106 100 98 108 106 114 98 128 104 112 108 100 104 88 108Z" fill="#f2c661" ${st(2)}/>`, "0 -14 200 214");
  }
  if (id === "fuzo") {
    return W(`<ellipse cx="100" cy="186" rx="44" ry="6" fill="${SB_INK}" opacity=".13"/><rect x="58" y="50" width="84" height="120" rx="34" fill="#eaf6ff" fill-opacity=".85" ${st(3)}/><rect x="54" y="30" width="92" height="30" rx="10" fill="#d9dde4" ${st(3)}/><rect x="54" y="152" width="92" height="30" rx="10" fill="#d9dde4" ${st(3)}/><path d="M100 60C92 80 108 92 100 104M100 118C108 130 92 140 100 152" fill="none" stroke="#c9844b" stroke-width="3" stroke-linecap="round"/>
<path d="M76 92Q82 86 88 92M112 92Q118 86 124 92" fill="none" ${st(3)}/><path d="M92 112Q100 106 108 112" fill="none" ${st(2.6)}/><ellipse cx="74" cy="104" rx="7" ry="4" fill="#ff8fab" opacity=".45"/><ellipse cx="126" cy="104" rx="7" ry="4" fill="#ff8fab" opacity=".45"/><path d="M118 62l14 10-4 4-14-10z" fill="#fff1bd" ${st(1.8)}/>`);
  }
  return "";
}

// --- phông nền các cảnh ---
function sceneArt(kind, { dark = false } = {}) {
  const u = "sg" + (++svgN);
  const sv = (s) => `<svg class="bg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${s}${dark ? `<defs><linearGradient id="${u}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1238" stop-opacity=".72"/><stop offset="1" stop-color="#4a2f7a" stop-opacity=".45"/></linearGradient></defs><rect width="400" height="300" fill="url(#${u}d)"/>` : ""}</svg>`;
  const heart = (x, y, s, o = 0.6) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 6C-6 1.6-10-1.8-10-5.8a5 5 0 0 1 10-1.2 5 5 0 0 1 10 1.2C10-1.8 6 1.6 0 6z" fill="#fff" opacity="${o}"/>`;
  const stars = (n, seed = 3) => { let s = ""; for (let i = 0; i < n; i++) { const x = (i * 97 + seed * 31) % 400, y = (i * 53 + seed * 17) % 150; s += `<circle cx="${x}" cy="${y}" r="${1 + (i % 3) * 0.6}" fill="#fff" opacity="${0.5 + (i % 4) * 0.12}"/>`; } return s; };
  const tower = (lit, x = 238) => { let w = ""; for (let r = 0; r < 9; r++) for (let c = 0; c < 4; c++) w += `<rect x="${x + 8 + c * 13}" y="${70 + r * 17}" width="8" height="10" rx="1.5" fill="${lit ? ((r + c) % 3 ? "#fff6d6" : "#ffe08a") : "#3a3560"}"/>`; return `<rect x="${x}" y="58" width="64" height="170" rx="4" fill="${lit ? "#f3e6da" : "#56507e"}" stroke="${SB_INK}" stroke-width="2.5"/>${w}<rect x="${x - 4}" y="50" width="72" height="10" rx="3" fill="${lit ? "#e8d3c3" : "#46406c"}" stroke="${SB_INK}" stroke-width="2.5"/>`; };
  const gril = (lit) => { let s = ""; for (let i = 0; i < 4; i++) { const x = 18 + i * 56; s += `<rect x="${x}" y="178" width="50" height="34" rx="3" fill="${lit ? "#f7ece2" : "#4a4472"}" stroke="${SB_INK}" stroke-width="2"/><path d="M${x + 6} 212v18M${x + 44} 212v18" stroke="${SB_INK}" stroke-width="3"/>`; for (let k = 0; k < 4; k++) s += `<rect x="${x + 5 + k * 11}" y="186" width="7" height="8" rx="1" fill="${lit ? "#bfe1f5" : "#2f2a50"}"/>`; } return s; };
  const tree = (x, y, s = 1, col = "#a9d98b") => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0v22" stroke="${SB_INK}" stroke-width="4"/><circle cx="0" cy="-6" r="18" fill="${col}" stroke="${SB_INK}" stroke-width="2.5"/><circle cx="-8" cy="-12" r="5" fill="#fff" opacity=".4"/></g>`;
  if (kind === "campus" || kind === "night") {
    const lit = kind === "campus";
    return sv(`<defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lit ? "#ffd3df" : "#241d4a"}"/><stop offset="1" stop-color="${lit ? "#fff3df" : "#5b4a8a"}"/></linearGradient></defs><rect width="400" height="300" fill="url(#${u})"/>
${lit ? `<circle cx="340" cy="56" r="26" fill="#fff1a8" stroke="${SB_INK}" stroke-width="2.5"/>${heart(60, 50, 1.6)}${heart(140, 30, 1)}${heart(330, 120, 1.2)}<path d="M40 100q14-16 30 0 12-10 22 4H40z" fill="#fff" stroke="${SB_INK}" stroke-width="2"/>` : `${stars(36)}<path d="M346 40a22 22 0 1 0 14 38 18 18 0 1 1-14-38z" fill="#fff1bd" stroke="${SB_INK}" stroke-width="2"/>`}
${tower(lit)}${gril(lit)}${tree(320, 214, 1.1, lit ? "#a9d98b" : "#4f6f7f")}${tree(360, 222, 0.8, lit ? "#c3e6a0" : "#476574")}<rect y="228" width="400" height="72" fill="${lit ? "#d6efb9" : "#3c3a66"}" stroke="${SB_INK}" stroke-width="2.5"/><path d="M0 252H400" stroke="${lit ? "#bfe39a" : "#33305a"}" stroke-width="10" stroke-dasharray="26 18"/>`);
  }
  if (kind === "metro") {
    let tiles = ""; for (let r = 0; r < 8; r++) for (let c = 0; c < 14; c++) tiles += `<rect x="${c * 30 + (r % 2) * 15 - 15}" y="${40 + r * 18}" width="27" height="15" rx="5" fill="#fbf6ef" stroke="#e4d8cb" stroke-width="1.5"/>`;
    return sv(`<rect width="400" height="300" fill="#efe6dc"/>${tiles}<path d="M0 40Q200 -30 400 40V0H0Z" fill="#d9cbbd" stroke="${SB_INK}" stroke-width="2.5"/>
<rect x="120" y="70" width="160" height="38" rx="10" fill="#2f4a8a" stroke="${SB_INK}" stroke-width="3"/><rect x="126" y="76" width="148" height="26" rx="6" fill="none" stroke="#fff" stroke-width="1.6"/><text x="200" y="96" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="20" fill="#fff">Jussieu</text>
<circle cx="60" cy="88" r="10" fill="#ff6b7f" opacity=".85"/><circle cx="340" cy="88" r="10" fill="#ff6b7f" opacity=".85"/><rect y="186" width="400" height="16" fill="#f2c661" stroke="${SB_INK}" stroke-width="2.5"/><rect y="202" width="400" height="98" fill="#6b5d78"/><path d="M0 240H400M0 270H400" stroke="#c9bfd3" stroke-width="5"/><path d="M20 232v46M80 232v46M140 232v46M200 232v46M260 232v46M320 232v46M380 232v46" stroke="#4f4560" stroke-width="7"/>`);
  }
  if (kind === "lab") {
    const wave = Array.from({ length: 21 }, (_, i) => `${148 + i * 5},${118 - Math.sin(i / 3.2) * 13}`).join(" ");
    return sv(`<rect width="400" height="300" fill="#e3f2e6"/><path d="M0 60H400M0 120H400" stroke="#d2e8d6" stroke-width="2"/><rect x="26" y="34" width="92" height="104" rx="10" fill="#2e2a55" stroke="${SB_INK}" stroke-width="3"/>${stars(9, 5).replace(/cx="(\d+)"/g, (m, x) => `cx="${30 + (+x % 84)}"`).replace(/cy="(\d+)"/g, (m, y) => `cy="${40 + (+y % 92)}"`)}<path d="M72 34V138M26 86H118" stroke="${SB_INK}" stroke-width="3"/>
<rect x="138" y="88" width="118" height="62" rx="10" fill="#d9d3e3" stroke="${SB_INK}" stroke-width="3"/><rect x="146" y="96" width="102" height="44" rx="6" fill="#1f3b33" stroke="${SB_INK}" stroke-width="2"/><polyline points="${wave}" fill="none" stroke="#8ff0a4" stroke-width="2.6"/><circle cx="270" cy="104" r="6" fill="#f2c661" stroke="${SB_INK}" stroke-width="2"/><circle cx="270" cy="128" r="6" fill="#ef6f7f" stroke="${SB_INK}" stroke-width="2"/>
<path d="M300 150v-36l-10-24h30l-10 24v36z" fill="#d9ecf8" stroke="${SB_INK}" stroke-width="2.5"/><path d="M296 150v-22h18v22z" fill="#ffb6ca" opacity=".8"/><path d="M338 150v-22a12 12 0 0 1 24 0v22z" fill="#fff1bd" stroke="${SB_INK}" stroke-width="2.5"/>
<rect y="150" width="400" height="22" fill="#e2b98f" stroke="${SB_INK}" stroke-width="2.5"/><rect y="172" width="400" height="128" fill="#c99a70"/><path d="M40 172v128M360 172v128" stroke="#b5845c" stroke-width="8"/><rect x="40" y="128" width="80" height="22" rx="3" fill="#fffaf2" stroke="${SB_INK}" stroke-width="2"/><path d="M48 136h64M48 142h64" stroke="#d9cbbd" stroke-width="2" stroke-dasharray="2 3"/>`);
  }
  if (kind === "roof") {
    let city = ""; [[0, 40, 58], [36, 30, 76], [62, 44, 50], [104, 26, 88], [128, 50, 62], [176, 34, 72], [208, 42, 54], [248, 30, 92], [276, 48, 58], [322, 36, 70], [356, 44, 60]].forEach(([x, w, h]) => { city += `<rect x="${x}" y="${230 - h}" width="${w}" height="${h}" fill="#3d3366"/>`; for (let k = 0; k < 3; k++) city += `<rect x="${x + 6 + (k % 2) * 12}" y="${236 - h + k * 14}" width="5" height="6" fill="#ffe08a" opacity=".7"/>`; });
    return sv(`<defs><linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2152"/><stop offset=".7" stop-color="#8f5c9e"/><stop offset="1" stop-color="#ffb3c1"/></linearGradient></defs><rect width="400" height="300" fill="url(#${u})"/>${stars(40, 7)}
<circle cx="80" cy="64" r="30" fill="#fff4cc" stroke="${SB_INK}" stroke-width="2.5"/><circle cx="70" cy="56" r="6" fill="#f3e3a8"/><circle cx="90" cy="74" r="4" fill="#f3e3a8"/>${city}
<path d="M318 230L330 108 342 230M322 186H338M326 150H334" fill="none" stroke="#2c2447" stroke-width="5" stroke-linejoin="round"/><circle cx="330" cy="104" r="3" fill="#ffe08a"/>
<rect y="230" width="400" height="70" fill="#9b8fb0" stroke="${SB_INK}" stroke-width="2.5"/><path d="M0 218H400" stroke="${SB_INK}" stroke-width="3"/>${Array.from({ length: 21 }, (_, i) => `<path d="M${i * 20} 218V232" stroke="${SB_INK}" stroke-width="3"/>`).join("")}`);
  }
  return sv(`<rect width="400" height="300" fill="#ffe0e8"/>${heart(80, 80, 2)}${heart(300, 60, 1.4)}${heart(200, 200, 1.8)}`);
}
