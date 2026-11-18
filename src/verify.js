// Kiểm chứng tin: ảnh mail / ảnh tin tức / nội dung dán vào → research web → verdict + bổ sung + đưa vào agenda.
import * as store from "./db.js";
import { ask, fileToBlock } from "./claude.js";
import { VERIFY_SYSTEM, EXTRACT_SYSTEM, EXTRACT_SCHEMA } from "./prompts.js";
import { mergeEvents } from "./agenda.js";

export async function verify({ text, files, lang = "vi" }) {
  const blocks = files.map(fileToBlock);
  if (!blocks.length && !text?.trim()) throw new Error("Hãy dán nội dung hoặc gửi ít nhất một ảnh.");
  const langName = lang === "fr" ? "français" : "vietnamien (garde les noms officiels en français)";
  const intro = `Date du jour : ${store.todayParis()}. Langue de réponse : ${langName}.\n` +
    `Profil : ${store.get().settings.studentProfile}\n\nContenu à vérifier :\n${text || "(voir les images / documents joints)"}`;

  const check = await ask({
    system: VERIFY_SYSTEM,
    messages: [{ role: "user", content: [...blocks, { type: "text", text: intro }] }],
    web: true,
    effort: "high",
  });

  // Bước 2: trích các mốc thời gian (thi, deadline, đóng cửa) từ nội dung gốc + kết quả kiểm chứng.
  let extracted = { summary: "", events: [] };
  try {
    const r = await ask({
      system: EXTRACT_SYSTEM,
      messages: [{
        role: "user",
        content: [...blocks, {
          type: "text",
          text: `Date du jour : ${store.todayParis()}. Langue du résumé : ${lang === "fr" ? "français" : "vietnamien"}.\n` +
            `Contenu original :\n${text || "(images)"}\n\nRésultat du fact-check (ne garde que les événements confirmés ou officiels) :\n${check.text}`,
        }],
      }],
      format: EXTRACT_SCHEMA,
      effort: "low",
    });
    extracted = r.json;
  } catch (e) {
    console.warn("Extraction échouée:", e.message);
  }
  const added = mergeEvents(extracted.events, "verify");
  const record = {
    id: store.newId(), createdAt: new Date().toISOString(), input: (text || "").slice(0, 5000),
    fileCount: files.length, markdown: check.text, summary: extracted.summary, sources: check.sources, eventsAdded: added.length,
  };
  const db = store.get();
  db.verifications.push(record);
  db.verifications = db.verifications.slice(-100);
  store.save();
  return { ...record, events: added };
}
