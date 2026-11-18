// Gia sư Feynman: học theo tài liệu upload, hỏi sâu (có web search học thuật), chấm phần tự giải thích,
// sửa ngữ pháp tiếng Pháp → flashcards lặp lại ngắt quãng.
import fs from "node:fs";
import * as store from "./db.js";
import { ask, fileToBlock } from "./claude.js";
import { tutorSystem, GRAMMAR_SYSTEM, GRAMMAR_SCHEMA, CARDS_SYSTEM, CARDS_SCHEMA } from "./prompts.js";
import { addCards } from "./srs.js";

export const FRENCH_DECK = "francais";

export function courseBlocks(course) {
  const blocks = course.files.map((f) => {
    const buf = fs.readFileSync(f.path);
    const isText = f.mime.startsWith("text/") || /\.(md|txt|tex)$/i.test(f.name);
    return fileToBlock({ mime: isText ? "text/plain" : f.mime, base64: buf.toString("base64"), text: isText ? buf.toString("utf8") : undefined, name: f.name });
  });
  return blocks;
}

const LANG_MSG = {
  fr: "Consigne de langue : réponds en français (clair, phrases simples).",
  vi: "Consigne de langue : l'étudiant ne comprend pas bien le français ici. Réponds en vietnamien, en gardant les termes techniques français entre parenthèses.",
};

/** Một lượt chat (stream). Lịch sử được lưu nguyên vẹn (append-only) để giữ cache + thinking. */
export async function chat({ course, message, lang, onText }) {
  const history = course.messages || (course.messages = []);
  const before = history.length;
  const prevLang = course.lastLang;
  const userContent = [];
  if (history.length === 0) {
    userContent.push(...courseBlocks(course));
    userContent.push({ type: "text", text: "Voici mes documents de cours. On va les étudier ensemble." });
  }
  userContent.push({ type: "text", text: message });
  history.push({ role: "user", content: userContent });
  if (course.lastLang !== lang) {
    history.push({ role: "system", content: LANG_MSG[lang] || LANG_MSG.fr });
    course.lastLang = lang;
  }

  const pushed = history.length - before;
  let res, grammar;
  try {
    [res, grammar] = await Promise.all([
      ask({ system: tutorSystem(course.title, course.examContent), messages: history, web: true, effort: "high", onText }),
      checkGrammar(message).catch((e) => ({ error: e.message, errors: [] })),
    ]);
  } catch (e) {
    // hoàn tác để lịch sử luôn hợp lệ (system message phải đi liền trước assistant)
    history.splice(history.length - pushed, pushed);
    course.lastLang = prevLang;
    if (history.length === 0) delete course.lastLang;
    throw e;
  }
  history.push({ role: "assistant", content: res.content }); // lưu nguyên vẹn, không cắt block nào
  // giữ bản chữ để hiển thị lại trong giao diện
  (course.transcript ||= []).push({ role: "user", text: message }, { role: "assistant", text: res.text, sources: res.sources });
  store.save();
  return { text: res.text, sources: res.sources, grammar };
}

export async function checkGrammar(message) {
  if (message.trim().length < 12) return { is_french: false, errors: [], encouragement: "" };
  const { json } = await ask({
    system: GRAMMAR_SYSTEM,
    messages: [{ role: "user", content: `Message de l'étudiant :\n"""${message}"""` }],
    format: GRAMMAR_SCHEMA,
    effort: "low",
    maxTokens: 8000,
  });
  if (json.is_french && json.errors.length) {
    addCards(json.errors.map((e) => ({
      front: `✏️ Corrige : « ${e.original} »`,
      back: `${e.correction}\n\n📘 ${e.rule}\n🇻🇳 ${e.explication_vi}`,
      mnemonic: e.astuce,
    })), FRENCH_DECK);
  }
  return json;
}

export async function makeFlashcards({ course, focus, count = 12 }) {
  const existing = store.get().cards.filter((c) => c.deck === course.id).map((c) => "- " + c.front).join("\n");
  const { json } = await ask({
    system: CARDS_SYSTEM,
    messages: [{
      role: "user",
      content: [...courseBlocks(course), {
        type: "text",
        text: `Cours : ${course.title}. ${course.examContent ? "Programme d'examen : " + course.examContent : ""}\n` +
          `Crée ${count} flashcards en français${focus ? ` centrées sur : ${focus}` : ""}.\nCartes existantes :\n${existing || "(aucune)"}`,
      }],
    }],
    format: CARDS_SCHEMA,
    effort: "medium",
  });
  return addCards(json.cards, course.id);
}

export async function revisionPlan({ lang = "vi", agendaText }) {
  const db = store.get();
  const courses = db.courses.map((c) => `- ${c.title}${c.examContent ? " — programme : " + c.examContent : ""} (${db.cards.filter((k) => k.deck === c.id).length} flashcards)`).join("\n");
  const res = await ask({
    system: "Tu es un coach de révision pour un·e étudiant·e de L1 EEA. Plans réalistes, découpés en sessions de 25-50 min, avec répétition espacée (J+1, J+3, J+7…), priorités selon les dates d'examen et le poids des matières. Markdown, ton motivant et drôle.",
    messages: [{ role: "user", content: `Date du jour : ${store.todayParis()}. Langue : ${lang === "fr" ? "français" : "vietnamien"}.\nÉchéances :\n${agendaText}\n\nCours importés :\n${courses || "(aucun)"}\n\nFais-moi un plan de révision jusqu'au dernier examen.` }],
    effort: "medium",
  });
  return res.text;
}
