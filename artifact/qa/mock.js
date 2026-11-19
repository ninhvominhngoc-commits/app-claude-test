// Giả lập window.claude (db, user, sample, mcp). Cấu hình qua sessionStorage "__cfg"; dữ liệu giữ qua reload trong "__store".
(() => {
  const cfg = JSON.parse(sessionStorage.getItem("__cfg") || "{}");
  if (cfg.noClaude) return;
  const load = () => new Map(JSON.parse(sessionStorage.getItem("__store") || "[]"));
  const store = load();
  const persist = () => sessionStorage.setItem("__store", JSON.stringify([...store]));
  window.__store = store;
  window.__calls = [];
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const docRef = (path) => ({ id: path.split("/").pop(), path,
    get: async () => ({ exists: store.has(path), data: () => clone(store.get(path) || {}) }),
    set: async (d) => { const s = JSON.stringify(d); if (s.length > 262144) throw { code: "invalid_argument", message: "too big " + path }; store.set(path, JSON.parse(s)); persist(); },
    delete: async () => { store.delete(path); persist(); } });
  const db = { collection: (p) => ({ doc: (id) => docRef(p + "/" + id),
    get: async () => { if (cfg.dbFail) throw { code: "unavailable" }; return { docs: [...store.keys()].filter((k) => k.startsWith(p + "/") && !k.slice(p.length + 1).includes("/")).map((k) => ({ id: k.slice(p.length + 1), data: () => clone(store.get(k)) })) }; } }) };
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const plus = (n) => { const d = new Date(today + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const answer = cfg.answer || "## La diode, un clapet anti-retour\nImagine une **porte de métro** qui ne tourne que dans un sens [p. 2]. Le courant passe si $V_D > 0{,}6\\,V$.\n\n$$I = I_s\\left(e^{V/V_T}-1\\right)$$\n\n- Sens passant : ça conduit\n- Sens bloqué : presque rien\n\n> Astuce : pense au clapet d'une pompe à vélo.\n\nÀ toi : explique-moi avec tes mots ?";
  const wait = (ms, signal) => new Promise((res, rej) => { const t = setTimeout(res, ms); signal?.addEventListener("abort", () => { clearTimeout(t); rej({ code: "cancelled" }); }); });
  async function sample(input, opts = {}) {
    window.__calls.push({ kind: "sample", input: clone(input), opts: { cache: opts.cache, modelTier: opts.modelTier } });
    if (cfg.sampleFail) throw { code: cfg.sampleFail, message: "mock" };
    let acc = "";
    try {
      for (const part of answer.match(/.{1,10}/gs)) { await wait(cfg.slow ? 120 : 12, opts.signal); acc += part; opts.onText?.({ text: acc, delta: part }); }
    } catch (e) { throw { code: "cancelled", text: acc }; }
    return { text: answer, truncated: !!cfg.truncated };
  }
  sample.json = async (input, opts = {}) => {
    const s = typeof input === "string" ? input : input[input.length - 1].content;
    window.__calls.push({ kind: "json", head: s.slice(0, 80), images: opts.images ? (opts.images.length ?? 1) : 0 });
    await wait(60);
    if (cfg.jsonFail) throw { code: cfg.jsonFail, message: "mock" };
    if (s.includes("correcteur de français")) return /comprends pas/.test(s) ? { is_french: true, errors: [{ original: "je comprends pas", correction: "je ne comprends pas", rule: "La négation a deux parties : ne … pas.", vi: "Phủ định cần cả ne và pas.", astuce: "ne et pas, inséparables comme un sandwich" }], encouragement: "Presque !" } : { is_french: true, errors: [], encouragement: "" };
    if (s.includes("mails universitaires")) return { mails: [{ ref: 0, resume_vi: "AG Jussieu kêu gọi biểu tình chiều nay.", importance: "haute", action_vi: "Tránh khu Panthéon từ 13h" }, { ref: "1", resume_vi: "Phòng TP đổi lịch.", importance: "moyenne", action_vi: "" }],
      events: [{ type: "event", title: "Manifestation 10 améliorable", date: today, time: "13:00" }, { type: "exam", title: "Partiel de Maths", date: plus(9), time: "14:00", exam_content: "Suites" }, { type: "deadline", title: "Ngày sai", date: "2026-13-45" }, { title: "" }] };
    if (s.includes("flashcards")) return [{ front: "Que fait une diode ?", back: "Elle laisse passer le courant dans **un seul sens**.", mnemonic: "Porte de métro" }, { front: "Seuil d'une diode Si ?", back: "$\\approx 0{,}6\\,V$", mnemonic: "" }, { bad: 1 }];
    if (s.includes("briefing")) return { verdict: cfg.verdict || "stay", headline_vi: "Campus bị chặn cả ngày, cours chuyển online.", points_vi: ["Blocus toàn bộ Jussieu", "Biểu tình 13h"], events: [{ type: "closure", title: "Blocus Jussieu", date: today }] };
    if (s.includes("pages de cours")) { const n = (opts.images?.length) || 1; return Array.from({ length: n }, (_, i) => `Page scannée ${i + 1} : loi d'Ohm $U = RI$`); }
    if (s.includes("Analyse le contenu")) return { resume_vi: "Thông báo hoãn TD thứ Năm.", date_publication: "18/11", fiabilite: "rumeur", points_a_verifier: ["TD L1EE001 bị hoãn"], impact_vi: "Có thể không cần lên trường thứ Năm.", events: [{ type: "event", title: "TD reporté", date: plus(2) }] };
    return {};
  };
  sample.limits = async () => (cfg.noImages ? { maxPromptBytes: 262144 } : { maxPromptBytes: 262144, images: { maxCount: 5, maxInputBytes: 5e6, mediaTypes: ["image/png", "image/jpeg"] } });
  const mcp = { callTool: async (server, tool, input) => {
    window.__calls.push({ kind: "mcp", tool, input: clone(input) });
    await wait(40);
    if (cfg.mcpFail) throw { code: cfg.mcpFail };
    if (tool === "search_threads") return { payload: cfg.noMail ? {} : { threads: [{ id: "t1", messageCount: 1 }, { id: "t2", messageCount: 2 }] } };
    return { payload: { viewUrl: input.threadId === "t1" ? "https://mail.google.com/mail/u/0/#t1" : "javascript:alert(1)", messages: [{ subject: input.threadId === "t1" ? "[etudiants] Manifestation <b>10</b> améliorable !" : "Salle TP", sender: "x@sorbonne-universite.fr", date: new Date().toISOString(), plaintextBody: "Bonjour, manif demain 13h", attachments: [{ filename: "plan.pdf" }] }] } };
  } };
  const caps = { db: cfg.noDb ? null : db, user: { id: async () => "u1" }, sample, mcp };
  window.claude = { use: (n) => Promise.resolve(caps[n] || null) };
  try { Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => { if (cfg.clipFail) throw new Error("no"); window.__clip = t; } } }); } catch {}
  window.__seed = () => {
    store.set("data/users/u1/agenda", { items: [
      { id: "e1", type: "exam", title: "Partiel d'Électronique", date: plus(3), time: "09:00", course: "L1EE001", location: "Jussieu", to_submit: "", exam_content: "Ch. 1 à 4", details: "", presence: "oui", done: false },
      { id: "e2", type: "deadline", title: "Compte rendu TP 2", date: plus(1), time: "23:59", course: "L1IN001", location: "Moodle", to_submit: "PDF sur Moodle", exam_content: "", details: "", presence: "non", done: false },
      { id: "e0", type: "holiday", title: "Toussaint", date: plus(-5), done: false } ] });
    store.set("data/users/u1/courses", { list: [{ id: "c1", title: "Électronique – semi-conducteurs", examContent: "Diodes", pageCount: 20, chunks: 1, createdAt: new Date().toISOString(), _pages: ["legacy"] }] });
    store.set("data/users/u1/text-c1-0", { pages: Array.from({ length: 20 }, (_, i) => "Page " + (i + 1) + " : la diode laisse passer le courant dans un seul sens.") });
    store.set("data/users/u1/deck-francais", { cards: [{ id: "k1", front: "Sửa câu này: « je comprends pas »", back: "**je ne comprends pas**", mnemonic: "sandwich", ef: 2.5, interval: 0, reps: 0, lapses: 0, due: today }] });
    store.set("data/users/u1/chat-c1", { turns: [{ role: "user", content: "Bonjour" }, { role: "assistant", content: "Salut ! **Prêt** ?", fix: { errors: [{ original: "a", correction: "b", rule: "r", vi: "v", astuce: "" }] } }] });
    persist();
  };
})();
