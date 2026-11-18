import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import cron from "node-cron";
import Anthropic from "@anthropic-ai/sdk";
import * as store from "./db.js";
import { ClaudeRefusal } from "./claude.js";
import { verify } from "./verify.js";
import { runDigest } from "./digest.js";
import { syncMail, mailConfigured } from "./mail.js";
import { mergeEvents, toICS, upcoming, formatForPrompt } from "./agenda.js";
import { chat, makeFlashcards, revisionPlan, FRENCH_DECK } from "./tutor.js";
import { review, dueCards } from "./srs.js";

store.load();
const app = express();
app.use(express.json({ limit: "2mb" }));

// Bảo vệ bằng mật khẩu (Basic Auth) nếu đặt APP_PASSWORD — nên bật khi đưa lên mạng.
if (process.env.APP_PASSWORD) {
  app.use((req, res, next) => {
    const [, b64] = (req.headers.authorization || "").split(" ");
    const pass = b64 ? Buffer.from(b64, "base64").toString().split(":").slice(1).join(":") : "";
    if (pass === process.env.APP_PASSWORD) return next();
    res.set("WWW-Authenticate", 'Basic realm="sorbonne-copilot"').status(401).send("Mật khẩu?");
  });
}

const here = path.dirname(new URL(import.meta.url).pathname);
app.use(express.static(path.join(here, "..", "public")));
app.use("/vendor/marked", express.static(path.join(here, "..", "node_modules/marked/lib")));
app.use("/vendor/dompurify", express.static(path.join(here, "..", "node_modules/dompurify/dist")));
app.use("/vendor/katex", express.static(path.join(here, "..", "node_modules/katex/dist")));

const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 10 } });
const diskUpload = multer({
  storage: multer.diskStorage({
    destination: store.UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, store.newId() + path.extname(file.originalname)),
  }),
  limits: { fileSize: 30 * 1024 * 1024, files: 10 },
});

// latin1 → utf8 cho tên file tiếng Việt/Pháp
const fixName = (n) => Buffer.from(n, "latin1").toString("utf8");

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    console.error(e);
    const status = e instanceof ClaudeRefusal ? 422 : e instanceof Anthropic.APIError ? e.status || 502 : 400;
    if (!res.headersSent) res.status(status).json({ error: errorText(e) });
  }
};
function errorText(e) {
  if (e instanceof Anthropic.AuthenticationError) return "Sai hoặc thiếu ANTHROPIC_API_KEY.";
  if (e instanceof Anthropic.RateLimitError) return "Claude đang bị giới hạn tốc độ, thử lại sau 1 phút.";
  if (e instanceof Anthropic.APIError) return `Lỗi Claude API (${e.status}): ${e.message}`;
  return e.message;
}

// ---------- Tổng quan ----------
app.get("/api/status", (_req, res) => {
  const db = store.get();
  res.json({
    today: store.todayParis(),
    mailConfigured: mailConfigured(),
    notifications: { ntfy: Boolean(process.env.NTFY_TOPIC), email: Boolean(process.env.SMTP_HOST && process.env.NOTIFY_EMAIL_TO) },
    digestCron: process.env.DIGEST_CRON || "30 7 * * *",
    latestDigest: db.digests.at(-1) || null,
    upcoming: upcoming(14),
    dueCards: dueCards().length,
  });
});

app.get("/api/settings", (_req, res) => res.json(store.get().settings));
app.put("/api/settings", (req, res) => {
  const db = store.get();
  const allowed = ["studentProfile", "watchSources", "courses", "mailFilters", "digestLang", "tutorLang"];
  for (const k of allowed) if (req.body[k] !== undefined) db.settings[k] = req.body[k];
  store.save();
  res.json(db.settings);
});

// ---------- Bản tin ----------
app.get("/api/digests", (_req, res) => res.json(store.get().digests.slice().reverse()));
app.post("/api/digest/run", wrap(async (req, res) => {
  res.json(await runDigest({ sendNotification: req.body?.notify !== false }));
}));

// ---------- Kiểm chứng ----------
app.post("/api/verify", memUpload.array("files"), wrap(async (req, res) => {
  const files = (req.files || []).map((f) => ({
    name: fixName(f.originalname),
    mime: f.mimetype,
    base64: f.buffer.toString("base64"),
    text: f.mimetype.startsWith("text/") ? f.buffer.toString("utf8") : undefined,
  }));
  res.json(await verify({ text: req.body.text, files, lang: req.body.lang || "vi" }));
}));
app.get("/api/verifications", (_req, res) => res.json(store.get().verifications.slice().reverse()));

// ---------- Mail ----------
app.post("/api/mail/sync", wrap(async (req, res) => {
  res.json(await syncMail({ days: Number(req.body?.days || 7), lang: store.get().settings.digestLang }));
}));
app.get("/api/mails", (_req, res) =>
  res.json(store.get().mails.slice().reverse().map(({ text, ...m }) => ({ ...m, preview: text.slice(0, 300) }))));

// ---------- Agenda ----------
app.get("/api/agenda", (_req, res) => res.json(store.get().agenda));
app.post("/api/agenda", (req, res) => res.json(mergeEvents([req.body], "manuel")));
app.patch("/api/agenda/:id", (req, res) => {
  const item = store.get().agenda.find((a) => a.id === req.params.id);
  if (!item) return res.status(404).json({ error: "not found" });
  Object.assign(item, req.body, { id: item.id });
  store.save();
  res.json(item);
});
app.delete("/api/agenda/:id", (req, res) => {
  const db = store.get();
  db.agenda = db.agenda.filter((a) => a.id !== req.params.id);
  store.save();
  res.json({ ok: true });
});
app.get("/agenda.ics", (_req, res) => res.type("text/calendar").send(toICS()));
app.post("/api/revision-plan", wrap(async (req, res) => {
  const agendaText = formatForPrompt(store.get().agenda.filter((a) => !a.done && (!a.date || a.date >= store.todayParis())));
  res.json({ markdown: await revisionPlan({ lang: req.body?.lang || store.get().settings.digestLang, agendaText }) });
}));

// ---------- Khoá học / gia sư ----------
const publicCourse = (c) => ({
  id: c.id, title: c.title, examContent: c.examContent, createdAt: c.createdAt,
  files: c.files.map((f) => ({ name: f.name, mime: f.mime })),
  transcript: c.transcript || [], cards: store.get().cards.filter((k) => k.deck === c.id).length,
});
app.get("/api/courses", (_req, res) => res.json(store.get().courses.map(publicCourse)));
app.post("/api/courses", diskUpload.array("files"), (req, res) => {
  const files = (req.files || []).map((f) => ({ name: fixName(f.originalname), mime: f.mimetype, path: f.path }));
  if (!files.length) return res.status(400).json({ error: "Hãy upload ít nhất một file (PDF, ảnh, .txt/.md)." });
  const bad = files.find((f) => !/^(application\/pdf|image\/(png|jpeg|gif|webp)|text\/)/.test(f.mime) && !/\.(md|txt|tex)$/i.test(f.name));
  if (bad) {
    files.forEach((f) => fs.rmSync(f.path, { force: true }));
    return res.status(400).json({ error: `"${bad.name}" chưa hỗ trợ. Với PowerPoint/Word, hãy "Xuất ra PDF" rồi upload lại.` });
  }
  const course = {
    id: store.newId(), title: req.body.title || files[0].name, examContent: req.body.examContent || "",
    files, messages: [], transcript: [], createdAt: new Date().toISOString(),
  };
  store.get().courses.push(course);
  store.save();
  res.json(publicCourse(course));
});
app.patch("/api/courses/:id", (req, res) => {
  const c = store.get().courses.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: "not found" });
  if (req.body.title !== undefined) c.title = req.body.title;
  if (req.body.examContent !== undefined) c.examContent = req.body.examContent;
  store.save();
  res.json(publicCourse(c));
});
app.post("/api/courses/:id/reset", (req, res) => {
  const c = store.get().courses.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: "not found" });
  c.messages = []; c.transcript = []; delete c.lastLang;
  store.save();
  res.json(publicCourse(c));
});
app.delete("/api/courses/:id", (req, res) => {
  const db = store.get();
  const c = db.courses.find((x) => x.id === req.params.id);
  if (c) c.files.forEach((f) => fs.rmSync(f.path, { force: true }));
  db.courses = db.courses.filter((x) => x.id !== req.params.id);
  db.cards = db.cards.filter((k) => k.deck !== req.params.id);
  store.save();
  res.json({ ok: true });
});

// Chat dạng stream (Server-Sent Events qua fetch)
const busy = new Set();
app.post("/api/courses/:id/chat", async (req, res) => {
  const course = store.get().courses.find((x) => x.id === req.params.id);
  if (!course) return res.status(404).json({ error: "not found" });
  if (busy.has(course.id)) return res.status(409).json({ error: "Đang trả lời câu trước, đợi chút nhé." });
  const message = String(req.body?.message || "").trim();
  if (!message) return res.status(400).json({ error: "Tin nhắn trống" });
  busy.add(course.id);
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  res.flushHeaders();
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  try {
    const out = await chat({ course, message, lang: req.body.lang === "vi" ? "vi" : "fr", onText: (t) => send("text", t) });
    send("grammar", out.grammar);
    send("done", { sources: out.sources });
  } catch (e) {
    console.error(e);
    send("error", { error: errorText(e) });
  } finally {
    busy.delete(course.id);
    res.end();
  }
});

app.post("/api/courses/:id/flashcards", wrap(async (req, res) => {
  const course = store.get().courses.find((x) => x.id === req.params.id);
  if (!course) return res.status(404).json({ error: "not found" });
  res.json(await makeFlashcards({ course, focus: req.body?.focus, count: Number(req.body?.count || 12) }));
}));

// ---------- Flashcards ----------
app.get("/api/cards", (req, res) => {
  const db = store.get();
  const decks = [{ id: FRENCH_DECK, title: "🇫🇷 Ngữ pháp tiếng Pháp" }, ...db.courses.map((c) => ({ id: c.id, title: c.title }))]
    .map((d) => ({ ...d, total: db.cards.filter((k) => k.deck === d.id).length, due: dueCards(d.id).length }));
  res.json({ decks, due: dueCards(req.query.deck || undefined) });
});
app.post("/api/cards/:id/review", (req, res) => {
  const card = store.get().cards.find((k) => k.id === req.params.id);
  if (!card) return res.status(404).json({ error: "not found" });
  review(card, Math.max(0, Math.min(5, Number(req.body.grade))));
  store.save();
  res.json(card);
});
app.delete("/api/cards/:id", (req, res) => {
  const db = store.get();
  db.cards = db.cards.filter((k) => k.id !== req.params.id);
  store.save();
  res.json({ ok: true });
});

// ---------- Lịch chạy bản tin mỗi sáng ----------
const CRON = process.env.DIGEST_CRON || "30 7 * * *";
if (process.env.DIGEST_CRON !== "off") {
  cron.schedule(CRON, () => {
    console.log("[cron] Chạy bản tin hằng ngày…");
    runDigest().then((d) => console.log("[cron] Xong:", d.verdict)).catch((e) => console.error("[cron] Lỗi:", e.message));
  }, { timezone: "Europe/Paris" });
}

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`Sorbonne Copilot chạy tại http://localhost:${PORT} (bản tin: "${CRON}" giờ Paris)`));
