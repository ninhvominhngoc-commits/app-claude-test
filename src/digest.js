// Bản tin hằng ngày: research web về tình hình campus Jussieu + mail + agenda → "hôm nay có cần lên trường không?"
import * as store from "./db.js";
import { ask } from "./claude.js";
import { digestSystem } from "./prompts.js";
import { upcoming, formatForPrompt } from "./agenda.js";
import { syncMail, mailConfigured, recentMailsForPrompt } from "./mail.js";
import { notify } from "./notify.js";

export function parseDigest(text) {
  const verdict = (text.match(/VERDICT:\s*(OUI|NON|PARTIEL|INCERTAIN)/i)?.[1] || "INCERTAIN").toUpperCase();
  const resume = text.match(/RESUME:\s*(.+)/)?.[1]?.trim() || "";
  const markdown = text.replace(/^.*VERDICT:.*$/m, "").replace(/^.*RESUME:.*$/m, "").trim();
  return { verdict, resume, markdown };
}

export async function runDigest({ sendNotification = true } = {}) {
  const db = store.get();
  const lang = db.settings.digestLang;
  let mailNote = "";
  if (mailConfigured()) {
    try {
      await syncMail({ days: 2, lang });
    } catch (e) {
      mailNote = `(Synchronisation mail échouée : ${e.message})`;
    }
  }
  const recentChecks = db.verifications.slice(-5).map((v) => `- ${v.createdAt.slice(0, 10)} : ${v.summary || v.markdown.slice(0, 400)}`).join("\n");

  const user = `Date du jour : ${store.todayParis()} (Europe/Paris).
Profil : ${db.settings.studentProfile}
Sources à surveiller en priorité :
${db.settings.watchSources.map((s) => "- " + s).join("\n")}

Mails récents (résumés) ${mailNote}:
${recentMailsForPrompt(3)}

Agenda des 21 prochains jours :
${formatForPrompt(upcoming(21))}

Vérifications récentes faites par l'étudiant :
${recentChecks || "(aucune)"}

Prépare le briefing du jour.`;

  const res = await ask({ system: digestSystem(lang), messages: [{ role: "user", content: user }], web: true, effort: "high" });
  const parsed = parseDigest(res.text);
  const digest = { id: store.newId(), date: store.todayParis(), createdAt: new Date().toISOString(), ...parsed, sources: res.sources };
  db.digests.push(digest);
  db.digests = db.digests.slice(-60);
  store.save();

  if (sendNotification) {
    const icon = { OUI: "🏫", NON: "🏠", PARTIEL: "⚖️", INCERTAIN: "❓" }[parsed.verdict];
    const label = lang === "fr"
      ? { OUI: "Va au campus", NON: "Pas besoin d'aller au campus", PARTIEL: "Campus : partiellement", INCERTAIN: "Campus : incertain" }
      : { OUI: "Hôm nay cần lên trường", NON: "Hôm nay không cần lên trường", PARTIEL: "Lên trường một phần", INCERTAIN: "Chưa chắc chắn" };
    try {
      digest.notified = await notify({ title: `${icon} ${label[parsed.verdict]} — ${digest.date}`, body: parsed.resume || parsed.markdown.slice(0, 600), markdown: parsed.markdown });
    } catch (e) {
      digest.notified = [{ ok: false, error: e.message }];
    }
    store.save();
  }
  return digest;
}
