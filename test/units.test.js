import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "copilot-"));
const store = await import("../src/db.js");
const { review, addCards } = await import("../src/srs.js");
const { parseDigest } = await import("../src/digest.js");
const { mergeEvents, toICS } = await import("../src/agenda.js");
store.load();

test("SM-2: quên thì ôn lại hôm nay, nhớ thì giãn khoảng cách", () => {
  const [c] = addCards([{ front: "Q", back: "A" }], "x");
  review(c, 4); assert.equal(c.interval, 1);
  review(c, 4); assert.equal(c.interval, 4);
  review(c, 4); assert.ok(c.interval >= 9);
  review(c, 0); assert.equal(c.interval, 0); assert.equal(c.due, store.todayParis());
  assert.ok(c.ef >= 1.3);
});

test("parseDigest đọc VERDICT và RESUME", () => {
  const d = parseDigest("VERDICT: NON\nRESUME: Campus bloqué jusqu'à jeudi.\n## 🏫 Campus\nFermé.");
  assert.equal(d.verdict, "NON");
  assert.equal(d.resume, "Campus bloqué jusqu'à jeudi.");
  assert.match(d.markdown, /^## 🏫 Campus/);
});

test("mergeEvents gộp trùng lặp và bổ sung trường trống; ICS hợp lệ", () => {
  const e = { type: "exam", title: "Partiel d'Électronique", date: "2026-12-15", time: "", location: "", course: "", details: "", to_submit: "", exam_content: "", requires_presence: "oui" };
  assert.equal(mergeEvents([e], "mail").length, 1);
  assert.equal(mergeEvents([{ ...e, title: "partiel d’electronique", time: "09:00" }], "verify").length, 0);
  const item = store.get().agenda[0];
  assert.equal(item.time, "09:00");
  const ics = toICS();
  assert.match(ics, /DTSTART;TZID=Europe\/Paris:20261215T090000/);
  assert.match(ics, /^BEGIN:VCALENDAR/);
});
