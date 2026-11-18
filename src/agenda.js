// Agenda: gộp sự kiện trích xuất, tránh trùng lặp, xuất file .ics cho lịch điện thoại.
import * as store from "./db.js";

const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\W+/g, " ").trim();

export function mergeEvents(events, source) {
  const db = store.get();
  const added = [];
  for (const e of events || []) {
    if (!e.title) continue;
    const dup = db.agenda.find((a) => a.date === e.date && norm(a.title) === norm(e.title));
    if (dup) {
      // bổ sung các trường còn trống
      for (const k of ["time", "location", "course", "details", "to_submit", "exam_content"]) if (!dup[k] && e[k]) dup[k] = e[k];
      continue;
    }
    const item = { id: store.newId(), ...e, source, done: false, createdAt: new Date().toISOString() };
    db.agenda.push(item);
    added.push(item);
  }
  db.agenda.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  store.save();
  return added;
}

export function upcoming(days = 21) {
  const today = store.todayParis();
  const end = store.addDays(today, days);
  return store.get().agenda.filter((a) => !a.done && (!a.date || (a.date >= today && a.date <= end)));
}

export function formatForPrompt(items) {
  if (!items.length) return "(agenda vide)";
  return items
    .map((a) =>
      [`- [${a.type}] ${a.date || "date ?"} ${a.time || ""} — ${a.title}`,
        a.course && `  UE: ${a.course}`, a.location && `  Lieu: ${a.location}`,
        a.to_submit && `  À rendre: ${a.to_submit}`, a.exam_content && `  Programme: ${a.exam_content}`,
        a.details && `  Détails: ${a.details}`].filter(Boolean).join("\n"))
    .join("\n");
}

const icsEscape = (s) => (s || "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export function toICS() {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//sorbonne-copilot//FR", "CALSCALE:GREGORIAN"];
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  for (const a of store.get().agenda) {
    if (!a.date) continue;
    const d = a.date.replace(/-/g, "");
    lines.push("BEGIN:VEVENT", `UID:${a.id}@sorbonne-copilot`, `DTSTAMP:${stamp}`);
    if (/^\d\d:\d\d$/.test(a.time || "")) {
      lines.push(`DTSTART;TZID=Europe/Paris:${d}T${a.time.replace(":", "")}00`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${d}`);
    }
    const desc = [a.details, a.to_submit && `À rendre: ${a.to_submit}`, a.exam_content && `Programme: ${a.exam_content}`].filter(Boolean).join("\n");
    lines.push(`SUMMARY:${icsEscape(`[${a.type}] ${a.title}`)}`, `DESCRIPTION:${icsEscape(desc)}`, `LOCATION:${icsEscape(a.location)}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
