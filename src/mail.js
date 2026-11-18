// Đọc hộp thư qua IMAP, lọc mail liên quan tới trường, tóm tắt + trích deadline/thi vào agenda.
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import * as store from "./db.js";
import { ask } from "./claude.js";
import { MAIL_SCHEMA, EXTRACT_SYSTEM } from "./prompts.js";
import { mergeEvents } from "./agenda.js";

export const mailConfigured = () => Boolean(process.env.IMAP_HOST && process.env.IMAP_USER && process.env.IMAP_PASS);

const MAX_CHARS = 20000;

async function fetchRecent(days) {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT || 993),
    secure: true,
    auth: { user: process.env.IMAP_USER, pass: process.env.IMAP_PASS },
    logger: false,
  });
  await client.connect();
  const out = [];
  const lock = await client.getMailboxLock(process.env.IMAP_FOLDER || "INBOX");
  try {
    const since = new Date(Date.now() - days * 86400000);
    for await (const m of client.fetch({ since }, { uid: true, source: true })) {
      const parsed = await simpleParser(m.source);
      out.push({
        messageId: parsed.messageId || `uid-${m.uid}`,
        from: parsed.from?.text || "",
        subject: parsed.subject || "",
        date: parsed.date?.toISOString() || "",
        text: (parsed.text || "").trim(),
        attachments: (parsed.attachments || []).map((a) => a.filename).filter(Boolean),
      });
    }
  } finally {
    lock.release();
    await client.logout();
  }
  return out;
}

export async function syncMail({ days = 3, lang = "vi" } = {}) {
  if (!mailConfigured()) throw new Error("Chưa cấu hình IMAP (xem .env.example).");
  const db = store.get();
  const filters = (db.settings.mailFilters || []).map((f) => f.toLowerCase());
  const known = new Set(db.mails.map((m) => m.messageId));
  const fresh = (await fetchRecent(days))
    .filter((m) => !known.has(m.messageId))
    .filter((m) => !filters.length || filters.some((f) => `${m.from} ${m.subject} ${m.text.slice(0, 2000)}`.toLowerCase().includes(f)))
    .slice(-40);
  if (!fresh.length) return { processed: 0, events: [] };

  const body = fresh
    .map((m, i) => {
      const t = m.text.length > MAX_CHARS ? m.text.slice(0, MAX_CHARS) + "\n[... mail tronqué ...]" : m.text;
      return `[ref:${i}] De: ${m.from}\nDate: ${m.date}\nObjet: ${m.subject}\nPièces jointes: ${m.attachments.join(", ") || "aucune"}\n\n${t}`;
    })
    .join("\n\n=====\n\n");

  const { json } = await ask({
    system: EXTRACT_SYSTEM,
    messages: [{
      role: "user",
      content: `Date du jour : ${store.todayParis()}. Langue des résumés : ${lang === "fr" ? "français" : "vietnamien"}.\n` +
        `Résume chaque mail (ref) et extrais tous les événements / échéances.\n\n${body}`,
    }],
    format: MAIL_SCHEMA,
    effort: "medium",
  });

  for (const s of json.mails) {
    const m = fresh[Number(s.ref)];
    if (!m) continue;
    db.mails.push({ ...m, text: m.text.slice(0, MAX_CHARS), summary: s.summary, importance: s.importance, action: s.action, syncedAt: new Date().toISOString() });
  }
  // những mail Claude không liệt kê vẫn được đánh dấu là đã xử lý
  const listed = new Set(json.mails.map((s) => Number(s.ref)));
  fresh.forEach((m, i) => { if (!listed.has(i)) db.mails.push({ ...m, text: m.text.slice(0, MAX_CHARS), summary: "", importance: "basse", action: "" }); });
  db.mails = db.mails.slice(-300);
  store.save();
  const added = mergeEvents(json.events, "mail");
  return { processed: fresh.length, events: added };
}

export function recentMailsForPrompt(days = 3) {
  const since = Date.now() - days * 86400000;
  const mails = store.get().mails.filter((m) => new Date(m.date || m.syncedAt).getTime() >= since);
  if (!mails.length) return "(aucun mail récent synchronisé)";
  return mails.map((m) => `- ${m.date?.slice(0, 10)} | ${m.from} | ${m.subject}\n  ${m.summary || m.text.slice(0, 500)}${m.action ? `\n  Action: ${m.action}` : ""}`).join("\n");
}
