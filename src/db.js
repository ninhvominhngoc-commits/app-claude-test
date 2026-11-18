// Lưu trữ đơn giản bằng một file JSON (đủ cho 1 người dùng).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const DATA_DIR = process.env.DATA_DIR || path.resolve("data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const FILE = path.join(DATA_DIR, "db.json");

export const DEFAULT_SETTINGS = {
  studentProfile:
    "Étudiant·e en L1 EEA (Électronique, Énergie électrique, Automatique), Sorbonne Université, " +
    "Faculté des Sciences et Ingénierie, campus Pierre et Marie Curie (Jussieu, 4 place Jussieu, 75005 Paris). " +
    "Suit la formation en grande partie à distance.",
  // Comptes / sites à surveiller en priorité (l'utilisateur peut en ajouter).
  watchSources: [
    "sorbonne-universite.fr (actualités, page 'campus Pierre et Marie Curie')",
    "sciences.sorbonne-universite.fr",
    "Instagram @sorbonne_univ (compte officiel de Sorbonne Université)",
    "Instagram @sorbonne_sciences_vieetudiante (vie étudiante, Faculté des Sciences et Ingénierie)",
    "Autres comptes Facebook / X officiels de Sorbonne Université et de la Faculté des Sciences et Ingénierie",
    "Syndicats et collectifs étudiants de Jussieu (assemblées générales, appels au blocage)",
    "Préfecture de police de Paris (parcours des manifestations déclarées)",
    "RATP (stations Jussieu, lignes 7 et 10)",
  ],
  courses: ["Mathématiques", "Physique", "Électronique", "Informatique"],
  mailFilters: ["sorbonne-universite.fr", "moodle", "examen", "partiel", "blocage", "blocus"],
  digestLang: "vi", // "vi" | "fr"
  tutorLang: "fr",
};

const EMPTY = {
  settings: DEFAULT_SETTINGS,
  agenda: [],
  cards: [],
  courses: [],
  digests: [],
  mails: [],
  verifications: [],
};

let db;

export function load() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (fs.existsSync(FILE)) {
    db = JSON.parse(fs.readFileSync(FILE, "utf8"));
    for (const [k, v] of Object.entries(EMPTY)) if (db[k] === undefined) db[k] = structuredClone(v);
    db.settings = { ...DEFAULT_SETTINGS, ...db.settings };
  } else {
    db = structuredClone(EMPTY);
    save();
  }
  return db;
}

export function get() {
  return db ?? load();
}

export function save() {
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE);
}

export const newId = () => crypto.randomUUID();

export const todayParis = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date()); // YYYY-MM-DD

export function addDays(isoDate, n) {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
