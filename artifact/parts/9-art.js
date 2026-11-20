// ================= biểu tượng tối giản: bé mèo Elec nét mảnh =================
// Không vẽ mặt: một nét mèo và tia chớp trên nền tròn nhạt, thêm dấu nhỏ theo tâm trạng (nghĩ, vui, ngủ).
const SB_INK = "#6b4e42";
const glyphLine = (d, c, w = 4.2) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const spark = (x, y, r, c) => { const q = r * 0.22; return `<path d="M${x} ${y - r}Q${x + q} ${y - q} ${x + r} ${y}Q${x + q} ${y + q} ${x} ${y + r}Q${x - q} ${y + q} ${x - r} ${y}Q${x - q} ${y - q} ${x} ${y - r}Z" fill="${c}"/>`; };
function moodMark(mood, c) {
  if (mood === "sleep") return `<text x="90" y="30" font-family="Nunito, sans-serif" font-weight="800" font-size="15" fill="${c}">z</text><text x="101" y="19" font-family="Nunito, sans-serif" font-weight="800" font-size="11" fill="${c}">z</text>`;
  if (mood === "party") return spark(20, 22, 7, "#e9b949") + spark(102, 18, 5, c);
  if (mood === "think") return `<circle cx="94" cy="24" r="3" fill="${c}"/><circle cx="103" cy="15" r="4.2" fill="${c}"/>`;
  return "";
}
function kitten(mood = "happy", cls = "") {
  const c = "#cf6f45";
  return `<svg class="mascot kitten ${cls}" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" fill="#fbe7dc"/>`
    + glyphLine("M38 62L35 31L55 45Q60 44 65 45L85 31L82 62Q88 72 84 81Q76 95 60 95Q44 95 36 81Q32 72 38 62Z", c)
    + `<path d="M62 55l-8 13h7l-4 11 12-15h-7l4-9z" fill="${c}"/>${moodMark(mood, c)}</svg>`;
}
