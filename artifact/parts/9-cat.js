// ================= mèo đen ngồi ghế bành: bạn ngồi cùng khi tập trung (tranh vẽ riêng của app) =================
function catChair(mood = "idle", cls = "") {
  const ink = "rgba(58, 20, 32, .62)", C = "#f4896b", CD = "#df6f57", CL = "#ffa98d", DOT = "#ffd9c9", WOOD = "#9a6046";
  const K = "#2b1d24", EYE = "#ffcf5a", PINK = "#f28fa0", W = "#7a6470";
  const o = `stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"`;
  let dots = "";
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { const x = 62 + c * 19 + (r % 2) * 9.5, y = 56 + r * 16; if (x < 168) dots += `<circle cx="${x}" cy="${y}" r="2.3" fill="${DOT}"/>`; }
  const eyesOpen = `<g class="cc-eyes"><circle cx="99" cy="85" r="7.6" fill="${EYE}"/><circle cx="121" cy="85" r="7.6" fill="${EYE}"/>`
    + `<ellipse cx="99.6" cy="85.6" rx="2.3" ry="5.6" fill="${K}"/><ellipse cx="121.6" cy="85.6" rx="2.3" ry="5.6" fill="${K}"/>`
    + `<circle cx="101.8" cy="81.6" r="1.9" fill="#fff"/><circle cx="123.8" cy="81.6" r="1.9" fill="#fff"/></g>`;
  const arcs = (up) => `<path d="${up ? "M92 87q7-8 14 0M114 87q7-8 14 0" : "M92 84q7 7 14 0M114 84q7 7 14 0"}" fill="none" stroke="${EYE}" stroke-width="3" stroke-linecap="round"/>`;
  const eyes = mood === "focus" ? arcs(false) : mood === "sleep" ? arcs(false) : mood === "done" ? arcs(true) : eyesOpen;
  const extra = mood === "done" ? `<path d="M64 34c-4-4-9-1-7 4l7 7 7-7c2-5-3-8-7-4z" fill="#ff7a8a"/><path d="M152 26c-3-3-7-1-5 3l5 5 5-5c2-4-2-6-5-3z" fill="#ffb37a"/>`
    : mood === "sleep" ? `<text x="140" y="56" font-family="Patrick Hand, cursive" font-size="18" fill="${ink}">z</text><text x="152" y="42" font-family="Patrick Hand, cursive" font-size="13" fill="${ink}">z</text>`
    : mood === "focus" ? `<g transform="translate(26 85) rotate(-5)"><rect width="30" height="7" rx="2" fill="#c9a2ff" ${o}/><rect x="2" y="-7" width="26" height="7" rx="2" fill="#ff9a7a" ${o}/></g>` : "";
  return `<svg class="cat-chair ${cls}" viewBox="0 0 220 190" aria-hidden="true">
<ellipse cx="110" cy="180" rx="84" ry="6" fill="rgba(58, 20, 32, .1)"/>
<rect x="44" y="160" width="10" height="17" rx="3" fill="${WOOD}" ${o}/><rect x="166" y="160" width="10" height="17" rx="3" fill="${WOOD}" ${o}/>
<rect x="34" y="140" width="152" height="27" rx="13" fill="${CD}" ${o}/>
<rect x="46" y="38" width="128" height="114" rx="46" fill="${C}" ${o}/>
<g opacity=".9">${dots}</g>
<rect x="46" y="118" width="128" height="34" rx="16" fill="${CL}" ${o}/>
<rect x="22" y="92" width="40" height="72" rx="20" fill="${C}" ${o}/><rect x="158" y="92" width="40" height="72" rx="20" fill="${C}" ${o}/>
<path d="M30 102q12-6 24 0M166 102q12-6 24 0" fill="none" stroke="${CL}" stroke-width="3" stroke-linecap="round"/>
<ellipse cx="110" cy="119" rx="30" ry="27" fill="${K}"/>
<path d="M88 74L91 50Q92 46 96 48L106 62ZM132 74L129 50Q128 46 124 48L114 62Z" fill="${K}" stroke="${K}" stroke-width="3" stroke-linejoin="round"/>
<path d="M92 66L93.5 54 101 61ZM128 66L126.5 54 119 61Z" fill="${PINK}" opacity=".85"/>
<circle cx="110" cy="84" r="25" fill="${K}"/>
<path d="M92 72Q100 64 112 64" fill="none" stroke="#4a3540" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>
${eyes}
<path d="M107.6 94.2h4.8l-2.4 2.8z" fill="${PINK}"/>
<path d="M105 99q2.5 2.4 5 0q2.5 2.4 5 0" fill="none" stroke="${W}" stroke-width="1.3" stroke-linecap="round"/>
<path d="M86 93l-12-2M86 97l-11 2M134 93l12-2M134 97l11 2" stroke="${W}" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>
<ellipse cx="100" cy="143" rx="7.5" ry="4.6" fill="${K}"/><ellipse cx="120" cy="143" rx="7.5" ry="4.6" fill="${K}"/>
<path class="cc-tail" d="M138 136C162 142 172 124 162 108" fill="none" stroke="${K}" stroke-width="8.5" stroke-linecap="round"/>
${extra}</svg>`;
}
